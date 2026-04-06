from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.models import Analysis, ContributorMetrics
from core.schemas.analysis import AnalysisCreate


async def get_analyses_by_repo(
    session: AsyncSession, repository_id: int
) -> Sequence[Analysis]:
    stmt = (
        select(Analysis)
        .where(Analysis.repository_id == repository_id)
        .order_by(Analysis.id.desc())
    )
    result = await session.scalars(stmt)
    return result.all()


async def get_all_analyses_for_user_repos(
    session: AsyncSession, repo_ids: list[int]
) -> Sequence[Analysis]:
    if not repo_ids:
        return []
    stmt = (
        select(Analysis)
        .where(Analysis.repository_id.in_(repo_ids))
        .order_by(Analysis.id.desc())
    )
    result = await session.scalars(stmt)
    return result.all()


async def get_analysis_by_id(
    session: AsyncSession, analysis_id: int
) -> Analysis | None:
    stmt = (
        select(Analysis)
        .where(Analysis.id == analysis_id)
        .options(selectinload(Analysis.contributors))
    )
    result = await session.scalars(stmt)
    return result.one_or_none()


async def create_analysis(
    session: AsyncSession,
    repo_id: int,
    analysis_create: AnalysisCreate,
) -> Analysis:
    analysis = Analysis(
        repository_id=repo_id,
        start_date=analysis_create.start_date,
        end_date=analysis_create.end_date,
        status="pending",
    )
    session.add(analysis)
    await session.commit()
    await session.refresh(analysis)
    return analysis


async def update_analysis_status(
    session: AsyncSession,
    analysis: Analysis,
    status: str,
    ai_report: str | None = None,
) -> Analysis:
    analysis.status = status
    if ai_report is not None:
        analysis.ai_report = ai_report
    session.add(analysis)
    await session.commit()
    await session.refresh(analysis)
    return analysis


async def save_contributor_metrics(
    session: AsyncSession,
    analysis_id: int,
    contributors_data: list[dict],
) -> None:
    for c in contributors_data:
        cm = ContributorMetrics(
            analysis_id=analysis_id,
            github_login=c["github_login"],
            avatar_url=c.get("avatar_url", ""),
            commits_count=c.get("commits_count", 0),
            additions=c.get("additions", 0),
            deletions=c.get("deletions", 0),
            prs_opened=c.get("prs_opened", 0),
            prs_merged=c.get("prs_merged", 0),
            reviews_given=c.get("reviews_given", 0),
            score=c.get("score", 0.0),
        )
        session.add(cm)
    await session.commit()


async def delete_analysis(
    session: AsyncSession,
    analysis: Analysis,
) -> None:
    await session.delete(analysis)
    await session.commit()
