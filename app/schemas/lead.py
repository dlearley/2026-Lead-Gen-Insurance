from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict, Field


class LeadBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    
    date_of_birth: Optional[date] = None
    address: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=50)
    zip_code: Optional[str] = Field(None, max_length=20)
    country: str = Field(default="USA", max_length=100)
    
    status: str = Field(default="new", max_length=50)
    priority: str = Field(default="medium", max_length=50)
    score: Optional[int] = Field(None, ge=0, le=100)
    
    notes: Optional[str] = None
    
    estimated_value: Optional[float] = Field(None, ge=0)
    
    last_contact_date: Optional[datetime] = None
    next_follow_up_date: Optional[datetime] = None
    
    organization_id: int
    lead_source_id: Optional[int] = None
    campaign_id: Optional[int] = None
    insurance_product_id: Optional[int] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    
    date_of_birth: Optional[date] = None
    address: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=50)
    zip_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    
    status: Optional[str] = Field(None, max_length=50)
    priority: Optional[str] = Field(None, max_length=50)
    score: Optional[int] = Field(None, ge=0, le=100)
    
    notes: Optional[str] = None
    
    estimated_value: Optional[float] = Field(None, ge=0)
    
    last_contact_date: Optional[datetime] = None
    next_follow_up_date: Optional[datetime] = None
    
    lead_source_id: Optional[int] = None
    campaign_id: Optional[int] = None
    insurance_product_id: Optional[int] = None


class LeadResponse(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class LeadListResponse(BaseModel):
    total: int
    leads: List[LeadResponse]
    page: int
    page_size: int
