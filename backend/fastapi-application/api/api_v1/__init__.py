from core.config import settings
from fastapi import APIRouter

from .auth import router as auth_router
from .users import router as users_router
from .repositories import router as repositories_router
from .analyses import router as analyses_router

router = APIRouter(
    prefix=settings.api.v1.prefix,
)

router.include_router(auth_router, prefix=settings.api.v1.auth)
router.include_router(users_router, prefix=settings.api.v1.users)
router.include_router(repositories_router, prefix=settings.api.v1.repositories)

# Analyses have two mount points:
#   GET/POST /repositories/{id}/analyses  — nested under repositories
#   GET      /analyses/{id}               — top-level for polling
router.include_router(analyses_router, prefix="")
