from typing import List, Optional, TYPE_CHECKING
from datetime import datetime

from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.lead import Lead
    from app.models.campaign import Campaign
    from app.models.team import Team
    from app.models.segmentation import Segment
    from app.models.automation import Automation, EmailTemplate, ScheduledTask


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    users: Mapped[List["User"]] = relationship(
        "User",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    leads: Mapped[List["Lead"]] = relationship(
        "Lead",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    campaigns: Mapped[List["Campaign"]] = relationship(
        "Campaign",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    teams: Mapped[List["Team"]] = relationship(
        "Team",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    segments: Mapped[List["Segment"]] = relationship(
        "Segment",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    automations: Mapped[List["Automation"]] = relationship(
        "Automation",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    email_templates: Mapped[List["EmailTemplate"]] = relationship(
        "EmailTemplate",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
    scheduled_tasks: Mapped[List["ScheduledTask"]] = relationship(
        "ScheduledTask",
        back_populates="organization",
        cascade="all, delete-orphan"
    )
