from typing import List, Optional
from datetime import datetime

from sqlalchemy import String, Text, Boolean, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class InsuranceProduct(Base, TimestampMixin):
    __tablename__ = "insurance_products"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    product_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    coverage_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    premium_range_min: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    premium_range_max: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    leads: Mapped[List["Lead"]] = relationship(
        "Lead",
        back_populates="insurance_product"
    )
