from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.models import Repository
from core.schemas.repository import RepositoryCreate


async def get_repositories_by_user(
    session: AsyncSession, user_id: int
) -> Sequence[Repository]:
    stmt = select(Repository).where(Repository.user_id == user_id).order_by(Repository.id)
    result = await session.scalars(stmt)
    return result.all()


async def get_repository_by_id(
    session: AsyncSession, repo_id: int
) -> Repository | None:
    stmt = select(Repository).where(Repository.id == repo_id)
    result = await session.scalars(stmt)
    return result.one_or_none()


async def create_repository(
    session: AsyncSession,
    repo_create: RepositoryCreate,
    user_id: int,
) -> Repository:
    repo = Repository(
        owner=repo_create.owner,
        name=repo_create.name,
        github_token=repo_create.github_token,
        user_id=user_id,
    )
    session.add(repo)
    await session.commit()
    await session.refresh(repo)
    return repo


async def delete_repository(session: AsyncSession, repo: Repository) -> None:
    await session.delete(repo)
    await session.commit()
