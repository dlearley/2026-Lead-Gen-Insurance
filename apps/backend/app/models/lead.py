from typing import Optional, TYPE_CHECKING
from datetime import datetime, date

from sqlalchemy import String, Text, Boolean, ForeignKey, DateTime, Date, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.lead_source import LeadSource
    from app.models.campaign import Campaign
    from app.models.insurance_product import InsuranceProduct


class Lead(Base, TimestampMixin):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    zip_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False, default="USA")
    
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="new", index=True)
    priority: Mapped[str] = mapped_column(String(50), nullable=False, default="medium", index=True)
    score: Mapped[Optional[int]] = mapped_column(nullable=True, index=True)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    estimated_value: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    
    last_contact_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_follow_up_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    lead_source_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("lead_sources.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    campaign_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    insurance_product_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("insurance_products.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="leads"
    )
    lead_source: Mapped[Optional["LeadSource"]] = relationship(
        "LeadSource",
        back_populates="leads"
    )
    campaign: Mapped[Optional["Campaign"]] = relationship(
        "Campaign",
        back_populates="leads"
    )
    insurance_product: Mapped[Optional["InsuranceProduct"]] = relationship(
        "InsuranceProduct",
        back_populates="leads"
    )
