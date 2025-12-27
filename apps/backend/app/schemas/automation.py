from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum

from app.schemas.base import BaseSchema
from app.models.automation import AutomationTriggerType, AutomationActionType


class AutomationTriggerTypeEnum(str, Enum):
    LEAD_CREATED = "lead_created"
    LEAD_STATUS_CHANGED = "lead_status_changed"
    LEAD_PRIORITY_CHANGED = "lead_priority_changed"
    LEAD_ASSIGNED = "lead_assigned"
    LEAD_VALUE_CHANGED = "lead_value_changed"
    TIME_BASED = "time_based"
    SEGMENT_ENTERED = "segment_entered"
    SEGMENT_EXITED = "segment_exited"


class AutomationActionTypeEnum(str, Enum):
    SEND_EMAIL = "send_email"
    UPDATE_LEAD_STATUS = "update_lead_status"
    UPDATE_LEAD_PRIORITY = "update_lead_priority"
    ASSIGN_LEAD = "assign_lead"
    ADD_TAG = "add_tag"
    REMOVE_TAG = "remove_tag"
    CREATE_TASK = "create_task"
    SEND_NOTIFICATION = "send_notification"


class AutomationActionBase(BaseSchema):
    action_type: AutomationActionTypeEnum
    action_order: int = Field(default=0, ge=0)
    is_active: bool = Field(default=True)
    configuration: Dict[str, Any] = Field(default_factory=dict)


class AutomationActionCreate(AutomationActionBase):
    pass


class AutomationActionUpdate(BaseSchema):
    action_type: Optional[AutomationActionTypeEnum] = None
    action_order: Optional[int] = None
    is_active: Optional[bool] = None
    configuration: Optional[Dict[str, Any]] = None


class AutomationActionResponse(AutomationActionBase):
    id: int
    automation_id: int
    created_at: datetime
    updated_at: datetime


class AutomationBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    slug: str = Field(..., min_length=1, max_length=255)
    trigger_type: AutomationTriggerTypeEnum
    trigger_configuration: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = Field(default=True)
    run_immediately: bool = Field(default=False)


class AutomationCreate(AutomationBase):
    actions: List[AutomationActionCreate] = Field(default_factory=list)
    campaign_id: Optional[int] = None


class AutomationUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    slug: Optional[str] = Field(None, min_length=1, max_length=255)
    trigger_type: Optional[AutomationTriggerTypeEnum] = None
    trigger_configuration: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    run_immediately: Optional[bool] = None
    actions: Optional[List[AutomationActionUpdate]] = None
    campaign_id: Optional[int] = None


class AutomationResponse(AutomationBase):
    id: int
    organization_id: int
    campaign_id: Optional[int]
    actions: List[AutomationActionResponse]
    created_at: datetime
    updated_at: datetime


class AutomationListResponse(BaseSchema):
    total: int
    automations: List[AutomationResponse]
    page: int
    page_size: int


class AutomationRunBase(BaseSchema):
    automation_id: int
    lead_id: Optional[int] = None
    status: str = Field(default="pending")
    trigger_data: Dict[str, Any] = Field(default_factory=dict)
    execution_log: Dict[str, Any] = Field(default_factory=dict)


class AutomationRunCreate(AutomationRunBase):
    pass


class AutomationRunResponse(AutomationRunBase):
    id: int
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class EmailTemplateBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    subject: str = Field(..., min_length=1, max_length=255)
    body_html: str = Field(..., min_length=1)
    body_text: Optional[str] = Field(None)
    template_type: str = Field(default="marketing", min_length=1, max_length=100)
    is_active: bool = Field(default=True)


class EmailTemplateCreate(EmailTemplateBase):
    pass


class EmailTemplateUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=255)
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    body_html: Optional[str] = Field(None, min_length=1)
    body_text: Optional[str] = None
    template_type: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None


class EmailTemplateResponse(EmailTemplateBase):
    id: int
    organization_id: int
    created_at: datetime
    updated_at: datetime


class EmailTemplateListResponse(BaseSchema):
    total: int
    email_templates: List[EmailTemplateResponse]
    page: int
    page_size: int


class ScheduledTaskBase(BaseSchema):
    task_type: str = Field(..., min_length=1, max_length=100)
    task_data: Dict[str, Any] = Field(default_factory=dict)
    scheduled_for: datetime
    status: str = Field(default="pending")
    priority: int = Field(default=0)
    retry_count: int = Field(default=0, ge=0)
    max_retries: int = Field(default=3, ge=0)


class ScheduledTaskCreate(ScheduledTaskBase):
    pass


class ScheduledTaskUpdate(BaseSchema):
    task_type: Optional[str] = Field(None, min_length=1, max_length=100)
    task_data: Optional[Dict[str, Any]] = None
    scheduled_for: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    retry_count: Optional[int] = None
    max_retries: Optional[int] = None


class ScheduledTaskResponse(ScheduledTaskBase):
    id: int
    organization_id: int
    created_at: datetime
    updated_at: datetime


class ScheduledTaskListResponse(BaseSchema):
    total: int
    scheduled_tasks: List[ScheduledTaskResponse]
    page: int
    page_size: int


class AutomationTriggerRequest(BaseSchema):
    automation_id: int
    trigger_data: Dict[str, Any] = Field(default_factory=dict)
    lead_id: Optional[int] = None


class AutomationTriggerResponse(BaseSchema):
    success: bool
    automation_run_id: Optional[int] = None
    message: str
    triggered_actions: List[str]
