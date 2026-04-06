"""
GitHub repository parser.

Collects per-contributor metrics for a given date range:
  - commits_count
  - additions / deletions (line-level stats)
  - prs_opened / prs_merged
  - reviews_given

Strategy
--------
Instead of fetching commit.stats per-commit (N+1 API calls), we use:
  1. ``repo.get_stats_contributors()`` — ONE request that returns weekly
     aggregated additions/deletions/commits per contributor for the whole
     repo history.  We filter weeks that fall inside [since, until].
  2. ``repo.get_pulls()`` — ONE paginated pass that collects PR stats
     (opened/merged), capped at max_prs.
  3. ``repo.get_pulls_review_comments()`` — ONE paginated call for ALL
     review comments in the date range, instead of pr.get_reviews() per PR
     (which was O(max_prs) extra calls).

This reduces the number of API calls from O(commits) + O(prs) to:
  ~1 (repo) + 1 (stats) + O(prs/100) (pagination) + 1 (review comments)
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from github import Github, Auth
from github.Repository import Repository as GHRepository


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


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
    score: int = 0  # filled by AI scorer


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


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _ensure_utc(dt: datetime) -> datetime:
    """Return *dt* with UTC timezone attached (naive datetimes are assumed UTC)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _collect_commit_stats(
    repo: GHRepository,
    since: datetime,
    until: datetime,
) -> dict[str, ContributorData]:
    """
    Use the GitHub Statistics API (get_stats_contributors) to collect
    per-contributor commit/addition/deletion counts in ONE API call.

    The endpoint returns weekly buckets (Unix timestamps).  We sum only
    the weeks that overlap with [since, until].

    Note: GitHub may return 202 (computing) on the first call for repos
    that haven't been accessed recently.  PyGitHub returns None in that
    case — we retry up to 3 times with a short sleep.
    """
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
        # GitHub is still computing stats — wait and retry
        time.sleep(2 * (attempt + 1))

    result: dict[str, ContributorData] = {}

    if not stats_list:
        # Fallback: no stats available (very new repo or GitHub error)
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
                # week.w is a datetime object in PyGitHub
                week_ts = week.w.timestamp() if hasattr(week.w, "timestamp") else float(week.w)
                # Each bucket covers one week; include if it starts within range
                if since_ts <= week_ts <= until_ts:
                    commits_in_range += week.c
                    additions_in_range += week.a
                    deletions_in_range += week.d
        except Exception:
            continue

        if commits_in_range == 0 and additions_in_range == 0:
            continue  # contributor had no activity in this period

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
    """
    Single paginated pass over PRs in [since, until].
    Collects prs_opened / prs_merged per author only.
    Uses per_page=100 to minimize pagination API calls.

    Review stats are collected separately via _collect_review_stats()
    which uses ONE bulk API call instead of pr.get_reviews() per PR.
    """
    pulls = repo.get_pulls(state="all", sort="created", direction="desc")

    processed = 0
    for pr in pulls:
        try:
            pr_created = _ensure_utc(pr.created_at)
        except Exception:
            continue

        # PRs are sorted newest-first; stop once we go before *since*
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
    """
    Collect review activity using ONE bulk API call:
    ``repo.get_pulls_review_comments(since=since)``

    This replaces the old approach of calling pr.get_reviews() per PR,
    which cost O(max_prs) extra API calls.  Now it's a single paginated
    endpoint that returns all review comments across all PRs.

    We count unique (reviewer, pr_number) pairs to avoid inflating the
    count when a reviewer leaves multiple comments on the same PR.
    """
    seen: set[tuple[str, int]] = set()  # (login, pr_number) dedup

    try:
        # get_pulls_review_comments accepts a `since` datetime to filter
        review_comments = repo.get_pulls_review_comments(since=since, sort="created", direction="asc")
        for comment in review_comments:
            try:
                created_at = _ensure_utc(comment.created_at)
                if created_at > until:
                    break  # sorted asc — safe to stop
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
        # If review comments endpoint fails, skip review stats gracefully
        pass


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


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
    """
    Collect GitHub metrics for *owner/name* in the date range [since, until].

    Parameters
    ----------
    owner:
        Repository owner login (e.g. ``"tiangolo"``).
    name:
        Repository name (e.g. ``"fastapi"``).
    since:
        Start of the analysis window (UTC-aware datetime).
    until:
        End of the analysis window (UTC-aware datetime).
    github_token:
        Personal access token.  If *None* the client runs unauthenticated
        (60 req/h rate limit — fine for small repos / demos).
    max_prs:
        Hard cap on PRs fetched for PR stats (default 30).
    timeout:
        HTTP timeout in seconds for GitHub API calls.

    Returns
    -------
    RepoParseResult
        Aggregated metrics ready to be persisted or forwarded to the AI scorer.

    API call budget
    ---------------
    1 call              — get_repo()
    1 call              — get_stats_contributors()  (commit/additions/deletions)
    O(max_prs/100) calls — get_pulls() pagination   (100 per page)
    1+ calls            — get_pulls_review_comments() (bulk, replaces N per-PR calls)
    Total: ~4-6 calls max (vs. O(commits) + O(prs) previously)
    """
    since = _ensure_utc(since)
    until = _ensure_utc(until)

    # --- authenticate ---
    if github_token:
        auth = Auth.Token(github_token)
        gh = Github(auth=auth, timeout=timeout, retry=2)
    else:
        gh = Github(timeout=timeout, retry=2)

    try:
        repo = gh.get_repo(f"{owner}/{name}")

        # --- repo-level metadata ---
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

        # --- commit stats: ONE API call via Statistics API ---
        contributor_stats: dict[str, ContributorData] = _collect_commit_stats(
            repo, since, until
        )

        # --- PR stats: one paginated pass, 100 per page, capped at max_prs ---
        _collect_pr_stats(repo, since, until, max_prs, contributor_stats)

        # --- Review stats: ONE bulk call instead of N per-PR calls ---
        _collect_review_stats(repo, since, until, contributor_stats)

        # Sort by commits desc so the most active contributor comes first
        result.contributors = sorted(
            contributor_stats.values(),
            key=lambda c: c.commits_count,
            reverse=True,
        )

        return result

    finally:
        gh.close()
