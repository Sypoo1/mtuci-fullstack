from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import CurrentUser
from core.models import db_helper
from core.schemas.repository import RepositoryCreate, RepositoryRead
from crud import repositories as repos_crud

router = APIRouter(tags=["Repositories"])


@router.get("", response_model=list[RepositoryRead])
async def list_repositories(
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(db_helper.session_getter)],
):
    return await repos_crud.get_repositories_by_user(session, current_user.id)


@router.get("/{repo_id}", response_model=RepositoryRead)
async def get_repository(
    repo_id: int,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(db_helper.session_getter)],
):
    repo = await repos_crud.get_repository_by_id(session, repo_id)
    if repo is None or repo.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    return repo


@router.post("", response_model=RepositoryRead, status_code=status.HTTP_201_CREATED)
async def create_repository(
    repo_create: RepositoryCreate,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(db_helper.session_getter)],
):
    return await repos_crud.create_repository(session, repo_create, current_user.id)


@router.delete("/{repo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_repository(
    repo_id: int,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(db_helper.session_getter)],
):
    repo = await repos_crud.get_repository_by_id(session, repo_id)
    if repo is None or repo.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    await repos_crud.delete_repository(session, repo)
