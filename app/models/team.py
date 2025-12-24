from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.user import User

team_members = Table(
    "team_members",
    Base.metadata,
    Column("team_id", ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)

class Team(Base, TimestampMixin):
    __tablename__ = "teams"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    
    organization: Mapped["Organization"] = relationship("Organization", back_populates="teams")
    members: Mapped[List["User"]] = relationship(
        "User", 
        secondary=team_members, 
        back_populates="teams"
    )
