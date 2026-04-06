from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AnalysisCreate(BaseModel):
    start_date: str  # "YYYY-MM-DD"
    end_date: str


class ContributorMetricsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    github_login: str
    avatar_url: str
    commits_count: int
    additions: int
    deletions: int
    prs_opened: int
    prs_merged: int
    reviews_given: int
    score: float


class AnalysisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    repository_id: int
    start_date: str
    end_date: str
    status: str
    created_at: datetime


class AnalysisResultRead(AnalysisRead):
    contributors: list[ContributorMetricsRead] = []
    ai_report: str | None = None
