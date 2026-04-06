import asyncio
import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.ai_scorer import compute_scores, generate_ai_report
from core.dependencies import CurrentUser
from core.models import db_helper
from core.schemas.analysis import AnalysisCreate, AnalysisRead, AnalysisResultRead
from crud import analyses as analyses_crud
from crud import repositories as repos_crud

log = logging.getLogger(__name__)

router = APIRouter(tags=["Analyses"])


# ─── Global analyses list (across all user repos) ────────────────────────────


@router.get("/analyses", response_model=list[AnalysisRead])
async def list_all_analyses(
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(db_helper.session_getter)],
):
    repos = await repos_crud.get_repositories_by_user(session, current_user.id)
    repo_ids = [r.id for r in repos]
    return await analyses_crud.get_all_analyses_for_user_repos(session, repo_ids)


# ─── Per-repository analyses ──────────────────────────────────────────────────


@router.get("/repositories/{repo_id}/analyses", response_model=list[AnalysisRead])
async def list_repo_analyses(
    repo_id: int,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(db_helper.session_getter)],
):
    repo = await repos_crud.get_repository_by_id(session, repo_id)
    if repo is None or repo.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    return await analyses_crud.get_analyses_by_repo(session, repo_id)


@router.post(
    "/repositories/{repo_id}/analyses",
    response_model=AnalysisRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_analysis(
    repo_id: int,
    analysis_create: AnalysisCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(db_helper.session_getter)],
):
    repo = await repos_crud.get_repository_by_id(session, repo_id)
    if repo is None or repo.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    analysis = await analyses_crud.create_analysis(session, repo_id, analysis_create)

    background_tasks.add_task(
        _run_analysis,
        analysis_id=analysis.id,
        owner=repo.owner,
        name=repo.name,
        github_token=repo.github_token,
        start_date=analysis_create.start_date,
        end_date=analysis_create.end_date,
    )

    return analysis


# ─── Single analysis result ───────────────────────────────────────────────────


@router.get("/analyses/{analysis_id}", response_model=AnalysisResultRead)
async def get_analysis(
    analysis_id: int,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(db_helper.session_getter)],
):
    analysis = await analyses_crud.get_analysis_by_id(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    repo = await repos_crud.get_repository_by_id(session, analysis.repository_id)
    if repo is None or repo.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    return analysis


@router.delete("/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(
    analysis_id: int,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(db_helper.session_getter)],
):
    analysis = await analyses_crud.get_analysis_by_id(session, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    repo = await repos_crud.get_repository_by_id(session, analysis.repository_id)
    if repo is None or repo.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    await analyses_crud.delete_analysis(session, analysis)


# ─── Background task ─────────────────────────────────────────────────────────

# Hard cap: if GitHub API doesn't respond within this many seconds, mark failed.
_PARSE_TIMEOUT_SECONDS = 5 * 60  # 5 minutes


async def _run_analysis(
    analysis_id: int,
    owner: str,
    name: str,
    github_token: str,
    start_date: str,
    end_date: str,
) -> None:
    from core.models import db_helper as _db_helper

    async with _db_helper.session_factory() as session:
        analysis = await analyses_crud.get_analysis_by_id(session, analysis_id)
        if analysis is None:
            return

        await analyses_crud.update_analysis_status(session, analysis, "running")

        try:
            since = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
            until = datetime.fromisoformat(end_date).replace(
                hour=23, minute=59, second=59, tzinfo=timezone.utc
            )

            from core.github_parser.parser import parse_repository

            loop = asyncio.get_event_loop()

            # Wrap the blocking GitHub API call in a timeout so that slow /
            # unresponsive GitHub endpoints don't leave the analysis stuck in
            # "running" forever.
            try:
                parse_result = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        lambda: parse_repository(
                            owner=owner,
                            name=name,
                            since=since,
                            until=until,
                            github_token=github_token or None,
                        ),
                    ),
                    timeout=_PARSE_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                log.error(
                    "Analysis %d timed out after %ds while parsing %s/%s",
                    analysis_id,
                    _PARSE_TIMEOUT_SECONDS,
                    owner,
                    name,
                )
                analysis = await analyses_crud.get_analysis_by_id(session, analysis_id)
                if analysis:
                    await analyses_crud.update_analysis_status(session, analysis, "failed")
                return

            raw_contributors = [
                {
                    "github_login": c.github_login,
                    "avatar_url": c.avatar_url,
                    "commits_count": c.commits_count,
                    "additions": c.additions,
                    "deletions": c.deletions,
                    "prs_opened": c.prs_opened,
                    "prs_merged": c.prs_merged,
                    "reviews_given": c.reviews_given,
                }
                for c in parse_result.contributors
            ]

            scored = compute_scores(raw_contributors)
            ai_report = await generate_ai_report(scored, start_date, end_date)

            contributors_dicts = [
                {
                    "github_login": c.github_login,
                    "avatar_url": c.avatar_url,
                    "commits_count": c.commits_count,
                    "additions": c.additions,
                    "deletions": c.deletions,
                    "prs_opened": c.prs_opened,
                    "prs_merged": c.prs_merged,
                    "reviews_given": c.reviews_given,
                    "score": c.score,
                }
                for c in scored
            ]
            await analyses_crud.save_contributor_metrics(session, analysis_id, contributors_dicts)

            analysis = await analyses_crud.get_analysis_by_id(session, analysis_id)
            if analysis:
                await analyses_crud.update_analysis_status(
                    session, analysis, "completed", ai_report=ai_report
                )

        except Exception as exc:
            log.exception("Analysis %d failed: %s", analysis_id, exc)
            analysis = await analyses_crud.get_analysis_by_id(session, analysis_id)
            if analysis:
                await analyses_crud.update_analysis_status(session, analysis, "failed")
