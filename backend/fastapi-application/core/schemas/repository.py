from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RepositoryCreate(BaseModel):
    owner: str
    name: str
    github_token: str = ""


class RepositoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner: str
    name: str
    created_at: datetime


class RepositoryUpdate(BaseModel):
    github_token: str | None = None
