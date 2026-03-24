from typing import Annotated

from core.models import db_helper
from core.schemas.user import UserCreate, UserRead, UserUpdate
from crud import users as users_crud
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Users"])


@router.get("", response_model=list[UserRead])
async def get_users(
    session: Annotated[
        AsyncSession,
        Depends(db_helper.session_getter),
    ],
):
    users = await users_crud.get_all_users(session=session)
    return users


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    session: Annotated[AsyncSession, Depends(db_helper.session_getter)],
    user_id: int = Path(
        ..., gt=0, lt=2147483648, title="User ID", description="ID of user to get"
    ),
):
    user = await users_crud.get_user_by_id(session=session, user_id=user_id)

    if user is None:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")

    return user


@router.post("", response_model=UserRead)
async def create_user(
    session: Annotated[
        AsyncSession,
        Depends(db_helper.session_getter),
    ],
    user_create: UserCreate,
):
    user = await users_crud.create_user(
        session=session,
        user_create=user_create,
    )
    return user


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    session: Annotated[
        AsyncSession,
        Depends(db_helper.session_getter),
    ],
    user_update: UserUpdate,
    user_id: int = Path(
        ..., gt=0, lt=2147483648, title="User ID", description="ID of user to update"
    ),
):
    user = await users_crud.get_user_by_id(session=session, user_id=user_id)

    if user is None:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")

    new_user = await users_crud.update_user(
        session=session, user=user, user_update=user_update
    )

    return new_user
