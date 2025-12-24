from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from enum import Enum


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, max_length=200)


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str = Field(..., min_length=8)
    is_admin: bool = False
    team_id: Optional[int] = None


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, max_length=200)
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    team_id: Optional[int] = None


class UserInDB(UserBase):
    """Schema for user in database."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    hashed_password: str
    is_active: bool
    is_admin: bool
    team_id: Optional[int]
    created_at: datetime
    updated_at: datetime


class UserResponse(UserInDB):
    """Schema for user response."""
    team_name: Optional[str] = None


# ==================== Team Schemas ====================

class TeamBase(BaseModel):
    """Base team schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class TeamCreate(TeamBase):
    """Schema for creating a team."""
    pass


class TeamUpdate(BaseModel):
    """Schema for updating a team."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class TeamInDB(TeamBase):
    """Schema for team in database."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TeamResponse(TeamInDB):
    """Schema for team response."""
    member_count: int = 0


# ==================== Lead Source Schemas ====================

class LeadSourceTypeEnum(str, Enum):
    WEB_FORM = "web_form"
    CALL = "call"
    REFERRAL = "referral"
    PAID_ADS = "paid_ads"
    ORGANIC = "organic"
    SOCIAL_MEDIA = "social_media"
    EMAIL = "email"
    PARTNER = "partner"
    OTHER = "other"


class LeadSourceBase(BaseModel):
    """Base lead source schema."""
    name: str = Field(..., min_length=1, max_length=100)
    type: LeadSourceTypeEnum
    description: Optional[str] = None


class LeadSourceCreate(LeadSourceBase):
    """Schema for creating a lead source."""
    pass


class LeadSourceUpdate(BaseModel):
    """Schema for updating a lead source."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[LeadSourceTypeEnum] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class LeadSourceInDB(LeadSourceBase):
    """Schema for lead source in database."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class LeadSourceResponse(LeadSourceInDB):
    """Schema for lead source response."""
    lead_count: int = 0


# ==================== Campaign Schemas ====================

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CampaignBase(BaseModel):
    """Base campaign schema."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: float = Field(default=0.0, ge=0)
    status: CampaignStatus = CampaignStatus.DRAFT


class CampaignCreate(CampaignBase):
    """Schema for creating a campaign."""
    source_id: Optional[int] = None
    team_id: Optional[int] = None


class CampaignUpdate(BaseModel):
    """Schema for updating a campaign."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    source_id: Optional[int] = None
    team_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = Field(None, ge=0)
    status: Optional[CampaignStatus] = None
    is_active: Optional[bool] = None


class CampaignInDB(CampaignBase):
    """Schema for campaign in database."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    source_id: Optional[int]
    team_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CampaignResponse(CampaignInDB):
    """Schema for campaign response."""
    source_name: Optional[str] = None
    team_name: Optional[str] = None
    lead_count: int = 0
