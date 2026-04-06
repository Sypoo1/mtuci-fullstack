"""
GitHub repository parser.

Collects per-contributor metrics for a given date range:
  - commits_count
  - additions / deletions (line-level stats)
  - prs_opened / prs_merged
  - reviews_given

Returns a list of ContributorData dataclasses that map 1-to-1 onto the
frontend ContributorMetrics interface (score is left at 0 — the AI scorer
fills it in later).
"""

from __future__ import annotations

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
    max_commits: int,
) -> dict[str, ContributorData]:
    """
    Iterate commits in [since, until] and accumulate per-author stats.

    PyGitHub's ``get_commits`` accepts ``since`` / ``until`` as UTC-aware
    datetimes and returns commits newest-first.  We stop early once we exceed
    *max_commits* to avoid hammering the API on huge repos.
    """
    stats: dict[str, ContributorData] = {}

    commits = repo.get_commits(since=since, until=until)

    processed = 0
    for commit in commits:
        if processed >= max_commits:
            break
        processed += 1

        author = commit.author  # GithubUser | None
        login: str = author.login if author else "unknown"
        avatar: str = author.avatar_url if author else ""

        if login not in stats:
            stats[login] = ContributorData(github_login=login, avatar_url=avatar)

        stats[login].commits_count += 1

        # Line-level stats live on commit.stats (one extra API call per commit
        # when accessed; PyGitHub lazily fetches them).
        try:
            commit_stats = commit.stats
            if commit_stats:
                stats[login].additions += commit_stats.additions
                stats[login].deletions += commit_stats.deletions
        except Exception:
            # stats may be unavailable for merge commits or very large diffs
            pass

    return stats


def _collect_pr_stats(
    repo: GHRepository,
    since: datetime,
    until: datetime,
    max_prs: int,
    contributor_stats: dict[str, ContributorData],
) -> None:
    """
    Iterate closed+open PRs created in [since, until] and update
    *contributor_stats* in-place with prs_opened / prs_merged counts.
    """
    pulls = repo.get_pulls(state="all", sort="created", direction="desc")

    processed = 0
    for pr in pulls:
        pr_created = _ensure_utc(pr.created_at)

        # PRs are sorted newest-first; stop once we go before *since*
        if pr_created < since:
            break
        if pr_created > until:
            continue
        if processed >= max_prs:
            break
        processed += 1

        login: str = pr.user.login if pr.user else "unknown"
        avatar: str = pr.user.avatar_url if pr.user else ""

        if login not in contributor_stats:
            contributor_stats[login] = ContributorData(
                github_login=login, avatar_url=avatar
            )

        contributor_stats[login].prs_opened += 1
        if pr.merged:
            contributor_stats[login].prs_merged += 1


def _collect_review_stats(
    repo: GHRepository,
    since: datetime,
    until: datetime,
    max_prs: int,
    contributor_stats: dict[str, ContributorData],
) -> None:
    """
    For each PR in [since, until] fetch its reviews and count per-reviewer.
    Only PRs up to *max_prs* are inspected to stay within rate limits.
    """
    pulls = repo.get_pulls(state="all", sort="created", direction="desc")

    processed = 0
    for pr in pulls:
        pr_created = _ensure_utc(pr.created_at)

        if pr_created < since:
            break
        if pr_created > until:
            continue
        if processed >= max_prs:
            break
        processed += 1

        try:
            for review in pr.get_reviews():
                reviewer = review.user
                if reviewer is None:
                    continue
                login = reviewer.login
                if login not in contributor_stats:
                    contributor_stats[login] = ContributorData(
                        github_login=login, avatar_url=reviewer.avatar_url
                    )
                contributor_stats[login].reviews_given += 1
        except Exception:
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
    max_commits: int = 500,
    max_prs: int = 100,
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
    max_commits:
        Hard cap on commits fetched (avoids exhausting rate limits on large
        repos).
    max_prs:
        Hard cap on PRs fetched for PR + review stats.

    Returns
    -------
    RepoParseResult
        Aggregated metrics ready to be persisted or forwarded to the AI scorer.
    """
    since = _ensure_utc(since)
    until = _ensure_utc(until)

    # --- authenticate ---
    if github_token:
        auth = Auth.Token(github_token)
        gh = Github(auth=auth)
    else:
        gh = Github()

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

        # --- per-contributor metrics ---
        contributor_stats: dict[str, ContributorData] = _collect_commit_stats(
            repo, since, until, max_commits
        )

        _collect_pr_stats(repo, since, until, max_prs, contributor_stats)

        _collect_review_stats(repo, since, until, max_prs, contributor_stats)

        # Sort by commits desc so the most active contributor comes first
        result.contributors = sorted(
            contributor_stats.values(),
            key=lambda c: c.commits_count,
            reverse=True,
        )

        return result

    finally:
        gh.close()
