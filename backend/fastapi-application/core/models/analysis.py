from datetime import datetime

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins.int_id_pk import IntIdPkMixin


class Analysis(IntIdPkMixin, Base):
    __tablename__ = "analyses"

    repository_id: Mapped[int] = mapped_column(
        ForeignKey("repositories.id", ondelete="CASCADE")
    )
    start_date: Mapped[str]
    end_date: Mapped[str]
    status: Mapped[str] = mapped_column(default="pending")
    ai_report: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    repository: Mapped["Repository"] = relationship(back_populates="analyses")  # noqa: F821
    contributors: Mapped[list["ContributorMetrics"]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan"
    )


class ContributorMetrics(IntIdPkMixin, Base):
    __tablename__ = "contributor_metrics"

    analysis_id: Mapped[int] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE")
    )
    github_login: Mapped[str]
    avatar_url: Mapped[str] = mapped_column(default="")
    commits_count: Mapped[int] = mapped_column(default=0)
    additions: Mapped[int] = mapped_column(default=0)
    deletions: Mapped[int] = mapped_column(default=0)
    prs_opened: Mapped[int] = mapped_column(default=0)
    prs_merged: Mapped[int] = mapped_column(default=0)
    reviews_given: Mapped[int] = mapped_column(default=0)
    score: Mapped[float] = mapped_column(default=0.0)

    analysis: Mapped["Analysis"] = relationship(back_populates="contributors")
