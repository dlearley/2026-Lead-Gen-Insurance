from typing import List, Optional, TYPE_CHECKING
from datetime import datetime
import json

from sqlalchemy import String, Text, Boolean, ForeignKey, DateTime, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.lead import Lead


class SegmentOperator(str, Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    IN = "in"
    NOT_IN = "not_in"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"


class SegmentField(str, Enum):
    STATUS = "status"
    PRIORITY = "priority"
    SOURCE = "source"
    INSURANCE_TYPE = "insurance_type"
    STATE = "state"
    CITY = "city"
    VALUE_ESTIMATE = "value_estimate"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    TAGS = "tags"


class SegmentRule(Base, TimestampMixin):
    __tablename__ = "segment_rules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    segment_id: Mapped[int] = mapped_column(ForeignKey("segments.id", ondelete="CASCADE"), index=True)
    field: Mapped[str] = mapped_column(Enum(SegmentField), nullable=False)
    operator: Mapped[str] = mapped_column(Enum(SegmentOperator), nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rule_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    segment: Mapped["Segment"] = relationship("Segment", back_populates="rules")


class Segment(Base, TimestampMixin):
    __tablename__ = "segments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_dynamic: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    match_all_rules: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="segments"
    )
    rules: Mapped[List["SegmentRule"]] = relationship(
        "SegmentRule",
        back_populates="segment",
        order_by="SegmentRule.rule_order",
        cascade="all, delete-orphan"
    )
    leads: Mapped[List["Lead"]] = relationship(
        "Lead",
        secondary="lead_segments",
        back_populates="segments"
    )

    def get_rules_dict(self) -> List[dict]:
        """Convert rules to dictionary format for easier processing."""
        return [
            {
                "field": rule.field,
                "operator": rule.operator,
                "value": rule.value
            }
            for rule in self.rules
        ]


class LeadSegment(Base, TimestampMixin):
    __tablename__ = "lead_segments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"), index=True)
    segment_id: Mapped[int] = mapped_column(ForeignKey("segments.id", ondelete="CASCADE"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lead: Mapped["Lead"] = relationship("Lead", back_populates="lead_segments")
    segment: Mapped["Segment"] = relationship("Segment", back_populates="lead_segments")
