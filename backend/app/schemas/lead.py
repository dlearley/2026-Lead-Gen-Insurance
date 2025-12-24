from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from enum import Enum


class LeadStatusEnum(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    UNQUALIFIED = "unqualified"
    CONVERTED = "converted"
    LOST = "lost"


class LeadPriorityEnum(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


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


class ActivityTypeEnum(str, Enum):
    CREATED = "created"
    UPDATED = "updated"
    ASSIGNED = "assigned"
    STATUS_CHANGED = "status_changed"
    DELETED = "deleted"
    VIEWED = "viewed"
    EXPORTED = "exported"
    BULK_UPDATED = "bulk_updated"
    REASSIGNED = "reassigned"


# ==================== Base Schemas ====================

class LeadBase(BaseModel):
    """Base schema for lead with common fields."""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=200)
    job_title: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    value_estimate: float = Field(default=0.0, ge=0)
    insurance_type: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    zip_code: Optional[str] = Field(None, max_length=20)
    country: str = Field(default="USA", max_length=100)
    tags: Optional[str] = None


class LeadCreate(LeadBase):
    """Schema for creating a new lead."""
    source_id: Optional[int] = None
    campaign_id: Optional[int] = None
    status: LeadStatusEnum = LeadStatusEnum.NEW
    priority: LeadPriorityEnum = LeadPriorityEnum.MEDIUM
    assignee_id: Optional[int] = None


class LeadUpdate(BaseModel):
    """Schema for updating a lead."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=200)
    job_title: Optional[str] = Field(None, max_length=100)
    source_id: Optional[int] = None
    campaign_id: Optional[int] = None
    status: Optional[LeadStatusEnum] = None
    priority: Optional[LeadPriorityEnum] = None
    assignee_id: Optional[int] = None
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    value_estimate: Optional[float] = Field(None, ge=0)
    insurance_type: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    zip_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    tags: Optional[str] = None


class LeadAssign(BaseModel):
    """Schema for assigning a lead to an agent."""
    assignee_id: int
    reason: Optional[str] = None


class LeadStatusUpdate(BaseModel):
    """Schema for updating lead status."""
    status: LeadStatusEnum
    reason: Optional[str] = None


class LeadInDB(LeadBase):
    """Schema for lead in database."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    source_id: Optional[int]
    campaign_id: Optional[int]
    status: LeadStatusEnum
    priority: LeadPriorityEnum
    assignee_id: Optional[int]
    created_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime


class LeadResponse(LeadInDB):
    """Schema for lead response."""
    source_name: Optional[str] = None
    campaign_name: Optional[str] = None
    assignee_name: Optional[str] = None
    full_name: str


# ==================== Pagination Schemas ====================

class PaginationParams(BaseModel):
    """Pagination parameters."""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel):
    """Generic paginated response."""
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


class LeadPaginatedResponse(PaginatedResponse):
    """Paginated response for leads."""
    items: List[LeadResponse]


# ==================== Filter Schemas ====================

class LeadFilterParams(BaseModel):
    """Filter parameters for leads."""
    status: Optional[List[LeadStatusEnum]] = None
    priority: Optional[List[LeadPriorityEnum]] = None
    source_id: Optional[int] = None
    campaign_id: Optional[int] = None
    assignee_id: Optional[int] = None
    unassigned: Optional[bool] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    search: Optional[str] = None
    insurance_type: Optional[str] = None
    tags: Optional[str] = None


class LeadFilterRequest(BaseModel):
    """Request model for lead filtering."""
    filters: Optional[LeadFilterParams] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$")


# ==================== Bulk Operation Schemas ====================

class BulkUpdateRequest(BaseModel):
    """Request for bulk update of leads."""
    lead_ids: List[int]
    updates: LeadUpdate


class BulkAssignRequest(BaseModel):
    """Request for bulk assignment of leads."""
    lead_ids: List[int]
    assignee_id: int
    reason: Optional[str] = None


class BulkStatusUpdateRequest(BaseModel):
    """Request for bulk status update of leads."""
    lead_ids: List[int]
    status: LeadStatusEnum
    reason: Optional[str] = None


class BulkDeleteRequest(BaseModel):
    """Request for bulk deletion of leads."""
    lead_ids: List[int]


class BulkOperationResponse(BaseModel):
    """Response for bulk operations."""
    success: List[int]
    failed: List[Dict[str, Any]]
    message: str


# ==================== Search Schemas ====================

class LeadSearchParams(BaseModel):
    """Search parameters for leads."""
    query: str = Field(..., min_length=1)
    filters: Optional[LeadFilterParams] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


# ==================== Export Schemas ====================

class ExportFormat(str, Enum):
    CSV = "csv"
    JSON = "json"


class ExportRequest(BaseModel):
    """Request for lead export."""
    filters: Optional[LeadFilterParams] = None
    format: ExportFormat = ExportFormat.CSV
    include_activities: bool = False


# ==================== Activity Schemas ====================

class ActivityResponse(BaseModel):
    """Response schema for lead activity."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    lead_id: int
    user_id: Optional[int]
    activity_type: ActivityTypeEnum
    description: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    created_at: datetime
    user_name: Optional[str] = None


class LeadActivityCreate(BaseModel):
    """Schema for creating a lead activity."""
    activity_type: ActivityTypeEnum
    description: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# ==================== Status History Schemas ====================

class StatusHistoryResponse(BaseModel):
    """Response schema for status history."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    lead_id: int
    old_status: Optional[str]
    new_status: str
    changed_by_id: Optional[int]
    reason: Optional[str]
    created_at: datetime
    changed_by_name: Optional[str] = None


# ==================== Assignment History Schemas ====================

class AssignmentHistoryResponse(BaseModel):
    """Response schema for assignment history."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    lead_id: int
    agent_id: int
    assigned_by_id: Optional[int]
    assignment_type: Optional[str]
    reason: Optional[str]
    created_at: datetime
    agent_name: Optional[str] = None
    assigned_by_name: Optional[str] = None


# ==================== Detail View Schemas ====================

class LeadDetailResponse(LeadResponse):
    """Detailed lead response with activities and history."""
    activities: List[ActivityResponse] = []
    status_history: List[StatusHistoryResponse] = []
    assignment_history: List[AssignmentHistoryResponse] = []


# ==================== Message Schemas ====================

class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Error response schema."""
    detail: str
    error_code: Optional[str] = None
