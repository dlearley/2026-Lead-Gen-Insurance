from typing import Optional, TYPE_CHECKING, List
from datetime import datetime

from sqlalchemy import String, Boolean, ForeignKey, Table, Column, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.role import Role
    from app.models.team import Team


user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False) # active, inactive, suspended
    
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    organization_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    organization: Mapped[Optional["Organization"]] = relationship(
        "Organization",
        back_populates="users"
    )
    
    roles: Mapped[List["Role"]] = relationship(
        "Role", secondary=user_roles, back_populates="users"
    )
    
    teams: Mapped[List["Team"]] = relationship(
        "Team", secondary="team_members", back_populates="members"
    )
