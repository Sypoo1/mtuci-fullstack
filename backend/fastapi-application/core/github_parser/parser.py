from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from github import Github, Auth
from github.Repository import Repository as GHRepository


@dataclass
class ContributorData:
    github_login: str
    avatar_url: str = ""
    commits_count: int = 0
    additions: int = 0
    deletions: int = 0
    prs_opened: int = 0
    prs_merged: int = 0
    reviews_given: int = 0
    score: int = 0


@dataclass
class RepoParseResult:
    owner: str
    name: str
    full_name: str
    description: str
    stars: int
    forks: int
    language: str
    open_issues: int
    contributors: list[ContributorData] = field(default_factory=list)


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _collect_commit_stats(
    repo: GHRepository,
    since: datetime,
    until: datetime,
) -> dict[str, ContributorData]:
    since_ts = since.timestamp()
    until_ts = until.timestamp()

    stats_list = None
    for attempt in range(3):
        try:
            stats_list = repo.get_stats_contributors()
            if stats_list is not None:
                break
        except Exception:
            pass
        time.sleep(2 * (attempt + 1))

    result: dict[str, ContributorData] = {}

    if not stats_list:
        return result

    for contributor_stat in stats_list:
        try:
            author = contributor_stat.author
            if author is None:
                continue
            login = author.login
            avatar = author.avatar_url or ""
        except Exception:
            continue

        commits_in_range = 0
        additions_in_range = 0
        deletions_in_range = 0

        try:
            for week in contributor_stat.weeks:
                week_ts = week.w.timestamp() if isinstance(week.w, datetime) else float(week.w)  # type: ignore[arg-type]
                if since_ts <= week_ts <= until_ts:
                    commits_in_range += week.c
                    additions_in_range += week.a
                    deletions_in_range += week.d
        except Exception:
            continue

        if commits_in_range == 0 and additions_in_range == 0:
            continue

        result[login] = ContributorData(
            github_login=login,
            avatar_url=avatar,
            commits_count=commits_in_range,
            additions=additions_in_range,
            deletions=deletions_in_range,
        )

    return result


def _collect_pr_stats(
    repo: GHRepository,
    since: datetime,
    until: datetime,
    max_prs: int,
    contributor_stats: dict[str, ContributorData],
) -> None:
    pulls = repo.get_pulls(state="all", sort="created", direction="desc")

    processed = 0
    for pr in pulls:
        try:
            pr_created = _ensure_utc(pr.created_at)
        except Exception:
            continue

        if pr_created < since:
            break
        if pr_created > until:
            continue
        if processed >= max_prs:
            break
        processed += 1

        try:
            login: str = pr.user.login if pr.user else "unknown"
            avatar: str = pr.user.avatar_url if pr.user else ""

            if login not in contributor_stats:
                contributor_stats[login] = ContributorData(
                    github_login=login, avatar_url=avatar
                )
            contributor_stats[login].prs_opened += 1
            if pr.merged:
                contributor_stats[login].prs_merged += 1
        except Exception:
            pass


def _collect_review_stats(
    repo: GHRepository,
    since: datetime,
    until: datetime,
    contributor_stats: dict[str, ContributorData],
) -> None:
    seen: set[tuple[str, str]] = set()

    try:
        review_comments = repo.get_pulls_review_comments(since=since, sort="created", direction="asc")
        for comment in review_comments:
            try:
                created_at = _ensure_utc(comment.created_at)
                if created_at > until:
                    break
                reviewer = comment.user
                if reviewer is None:
                    continue
                r_login = reviewer.login
                pr_number = comment.pull_request_url.split("/")[-1]
                key = (r_login, pr_number)
                if key in seen:
                    continue
                seen.add(key)

                if r_login not in contributor_stats:
                    contributor_stats[r_login] = ContributorData(
                        github_login=r_login, avatar_url=reviewer.avatar_url or ""
                    )
                contributor_stats[r_login].reviews_given += 1
            except Exception:
                continue
    except Exception:
        pass


def parse_repository(
    owner: str,
    name: str,
    since: datetime,
    until: datetime,
    github_token: Optional[str] = None,
    *,
    max_prs: int = 30,
    timeout: int = 30,
) -> RepoParseResult:
    since = _ensure_utc(since)
    until = _ensure_utc(until)

    if github_token:
        auth = Auth.Token(github_token)
        gh = Github(auth=auth, timeout=timeout, retry=2)
    else:
        gh = Github(timeout=timeout, retry=2)

    try:
        repo = gh.get_repo(f"{owner}/{name}")

        result = RepoParseResult(
            owner=owner,
            name=name,
            full_name=repo.full_name,
            description=repo.description or "",
            stars=repo.stargazers_count,
            forks=repo.forks_count,
            language=repo.language or "",
            open_issues=repo.open_issues_count,
        )

        contributor_stats: dict[str, ContributorData] = _collect_commit_stats(
            repo, since, until
        )

        _collect_pr_stats(repo, since, until, max_prs, contributor_stats)

        _collect_review_stats(repo, since, until, contributor_stats)

        result.contributors = sorted(
            contributor_stats.values(),
            key=lambda c: c.commits_count,
            reverse=True,
        )

        return result

    finally:
        gh.close()
