from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean, Date, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    UNQUALIFIED = "unqualified"
    CONVERTED = "converted"
    LOST = "lost"


class LeadPriority(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class LeadSourceType(str, enum.Enum):
    WEB_FORM = "web_form"
    CALL = "call"
    REFERRAL = "referral"
    PAID_ADS = "paid_ads"
    ORGANIC = "organic"
    SOCIAL_MEDIA = "social_media"
    EMAIL = "email"
    PARTNER = "partner"
    OTHER = "other"


class ActivityType(str, enum.Enum):
    CREATED = "created"
    UPDATED = "updated"
    ASSIGNED = "assigned"
    STATUS_CHANGED = "status_changed"
    DELETED = "deleted"
    VIEWED = "viewed"
    EXPORTED = "exported"
    BULK_UPDATED = "bulk_updated"
    REASSIGNED = "reassigned"


class User(Base):
    """Basic user model for lead assignment."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    team = relationship("Team", back_populates="members")
    assigned_leads = relationship("Lead", back_populates="assignee")
    activities = relationship("LeadActivity", back_populates="user")
    lead_assignments = relationship("LeadAssignment", back_populates="agent")


class Team(Base):
    """Team model for team-based lead assignment."""
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    members = relationship("User", back_populates="team")
    campaigns = relationship("Campaign", back_populates="team")


class LeadSource(Base):
    """Lead source model for tracking where leads come from."""
    __tablename__ = "lead_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(Enum(LeadSourceType), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    leads = relationship("Lead", back_populates="source")
    campaigns = relationship("Campaign", back_populates="source")


class Campaign(Base):
    """Campaign model for marketing campaign tracking."""
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    source_id = Column(Integer, ForeignKey("lead_sources.id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    start_date = Column(Date)
    end_date = Column(Date)
    budget = Column(Float, default=0.0)
    status = Column(String(50), default="active")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    source = relationship("LeadSource", back_populates="campaigns")
    team = relationship("Team", back_populates="campaigns")
    leads = relationship("Lead", back_populates="campaign")


class Lead(Base):
    """Main lead model with all required fields."""
    __tablename__ = "leads"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic contact information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    phone = Column(String(50))
    company = Column(String(200))
    job_title = Column(String(100))
    
    # Lead classification
    source_id = Column(Integer, ForeignKey("lead_sources.id"), index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), index=True, nullable=True)
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW, index=True)
    priority = Column(Enum(LeadPriority), default=LeadPriority.MEDIUM, index=True)
    
    # Assignment
    assignee_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    # Additional information
    notes = Column(Text)
    follow_up_date = Column(Date)
    value_estimate = Column(Float, default=0.0)
    insurance_type = Column(String(100))  # e.g., auto, home, life, health
    
    # Address information
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    country = Column(String(100), default="USA")
    
    # Tracking
    created_by_id = Column(Integer, ForeignKey("users.id"))
    tags = Column(Text)  # Comma-separated tags
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    source = relationship("LeadSource", back_populates="leads")
    campaign = relationship("Campaign", back_populates="leads")
    assignee = relationship("User", back_populates="assigned_leads")
    creator = relationship("User", foreign_keys=[created_by_id])
    activities = relationship("LeadActivity", back_populates="lead", order_by="LeadActivity.created_at.desc()")
    status_history = relationship("LeadStatusHistory", back_populates="lead", order_by="LeadStatusHistory.created_at.desc()")
    assignments = relationship("LeadAssignment", back_populates="lead", order_by="LeadAssignment.created_at.desc()")
    segments = relationship("Segment", secondary="lead_segments", back_populates="leads")
    lead_segments = relationship("LeadSegment", back_populates="lead")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    @property
    def name(self) -> str:
        return self.full_name


class LeadActivity(Base):
    """Audit trail for lead activities."""
    __tablename__ = "lead_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    activity_type = Column(Enum(ActivityType), nullable=False)
    description = Column(Text)
    old_value = Column(Text)
    new_value = Column(Text)
    metadata = Column(Text)  # JSON string for additional data
    created_at = Column(DateTime(timezone=True), server_default(func.now()), index=True)
    
    # Relationships
    lead = relationship("Lead", back_populates="activities")
    user = relationship("User", back_populates="activities")


class LeadAssignment(Base):
    """History of lead assignments for tracking."""
    __tablename__ = "lead_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), index=True, nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assignment_type = Column(String(50))  # manual, automatic, bulk
    reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default(func.now()), index=True)
    
    # Relationships
    lead = relationship("Lead", back_populates="assignments")
    agent = relationship("User", back_populates="lead_assignments", foreign_keys=[agent_id])


class LeadStatusHistory(Base):
    """History of status changes for leads."""
    __tablename__ = "lead_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), index=True, nullable=False)
    old_status = Column(String(50))
    new_status = Column(String(50), nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default(func.now()), index=True)
    
    # Relationships
    lead = relationship("Lead", back_populates="status_history")
    changed_by = relationship("User")
