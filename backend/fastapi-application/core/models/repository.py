from datetime import datetime

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins.int_id_pk import IntIdPkMixin


class Repository(IntIdPkMixin, Base):
    __tablename__ = "repositories"

    owner: Mapped[str]
    name: Mapped[str]
    github_token: Mapped[str] = mapped_column(default="")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # owner FK
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    analyses: Mapped[list["Analysis"]] = relationship(  # noqa: F821
        back_populates="repository", cascade="all, delete-orphan"
    )
