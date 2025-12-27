from typing import List, Optional, TYPE_CHECKING
from datetime import datetime, timedelta
import json

from sqlalchemy import String, Text, Boolean, ForeignKey, DateTime, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.lead import Lead
    from app.models.campaign import Campaign


class AutomationTriggerType(str, Enum):
    LEAD_CREATED = "lead_created"
    LEAD_STATUS_CHANGED = "lead_status_changed"
    LEAD_PRIORITY_CHANGED = "lead_priority_changed"
    LEAD_ASSIGNED = "lead_assigned"
    LEAD_VALUE_CHANGED = "lead_value_changed"
    TIME_BASED = "time_based"
    SEGMENT_ENTERED = "segment_entered"
    SEGMENT_EXITED = "segment_exited"


class AutomationActionType(str, Enum):
    SEND_EMAIL = "send_email"
    UPDATE_LEAD_STATUS = "update_lead_status"
    UPDATE_LEAD_PRIORITY = "update_lead_priority"
    ASSIGN_LEAD = "assign_lead"
    ADD_TAG = "add_tag"
    REMOVE_TAG = "remove_tag"
    CREATE_TASK = "create_task"
    SEND_NOTIFICATION = "send_notification"


class AutomationAction(Base, TimestampMixin):
    __tablename__ = "automation_actions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    automation_id: Mapped[int] = mapped_column(ForeignKey("automations.id", ondelete="CASCADE"), index=True)
    action_type: Mapped[str] = mapped_column(Enum(AutomationActionType), nullable=False)
    action_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    configuration: Mapped[dict] = mapped_column(JSON, default={}, nullable=False)

    automation: Mapped["Automation"] = relationship("Automation", back_populates="actions")


class Automation(Base, TimestampMixin):
    __tablename__ = "automations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    trigger_type: Mapped[str] = mapped_column(Enum(AutomationTriggerType), nullable=False)
    trigger_configuration: Mapped[dict] = mapped_column(JSON, default={}, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    run_immediately: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    campaign_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="automations"
    )

    campaign: Mapped[Optional["Campaign"]] = relationship(
        "Campaign",
        back_populates="automations"
    )

    actions: Mapped[List["AutomationAction"]] = relationship(
        "AutomationAction",
        back_populates="automation",
        order_by="AutomationAction.action_order",
        cascade="all, delete-orphan"
    )

    automation_runs: Mapped[List["AutomationRun"]] = relationship(
        "AutomationRun",
        back_populates="automation"
    )

    def get_trigger_config(self) -> dict:
        """Get trigger configuration as dictionary."""
        return self.trigger_configuration or {}

    def get_actions_config(self) -> List[dict]:
        """Get actions configuration as list of dictionaries."""
        return [
            {
                "action_type": action.action_type,
                "configuration": action.configuration
            }
            for action in self.actions
        ]


class AutomationRun(Base, TimestampMixin):
    __tablename__ = "automation_runs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    automation_id: Mapped[int] = mapped_column(ForeignKey("automations.id", ondelete="CASCADE"), index=True)
    lead_id: Mapped[Optional[int]] = mapped_column(ForeignKey("leads.id", ondelete="SET NULL"), index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    trigger_data: Mapped[dict] = mapped_column(JSON, default={}, nullable=False)
    execution_log: Mapped[dict] = mapped_column(JSON, default={}, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    automation: Mapped["Automation"] = relationship("Automation", back_populates="automation_runs")
    lead: Mapped[Optional["Lead"]] = relationship("Lead")


class EmailTemplate(Base, TimestampMixin):
    __tablename__ = "email_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    template_type: Mapped[str] = mapped_column(String(100), nullable=False, default="marketing")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="email_templates"
    )


class ScheduledTask(Base, TimestampMixin):
    __tablename__ = "scheduled_tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    task_type: Mapped[str] = mapped_column(String(100), nullable=False)
    task_data: Mapped[dict] = mapped_column(JSON, default={}, nullable=False)
    scheduled_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="scheduled_tasks"
    )
