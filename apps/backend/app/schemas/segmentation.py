from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum

from app.schemas.base import BaseSchema
from app.models.segmentation import SegmentOperator, SegmentField


class SegmentOperatorEnum(str, Enum):
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


class SegmentFieldEnum(str, Enum):
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


class SegmentRuleBase(BaseSchema):
    field: SegmentFieldEnum
    operator: SegmentOperatorEnum
    value: str
    is_active: bool = Field(default=True)
    rule_order: int = Field(default=0, ge=0)


class SegmentRuleCreate(SegmentRuleBase):
    pass


class SegmentRuleUpdate(BaseSchema):
    field: Optional[SegmentFieldEnum] = None
    operator: Optional[SegmentOperatorEnum] = None
    value: Optional[str] = None
    is_active: Optional[bool] = None
    rule_order: Optional[int] = None


class SegmentRuleResponse(SegmentRuleBase):
    id: int
    segment_id: int
    created_at: datetime
    updated_at: datetime


class SegmentBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    slug: str = Field(..., min_length=1, max_length=255)
    is_active: bool = Field(default=True)
    is_dynamic: bool = Field(default=True)
    match_all_rules: bool = Field(default=True)


class SegmentCreate(SegmentBase):
    rules: List[SegmentRuleCreate] = Field(default_factory=list)


class SegmentUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    slug: Optional[str] = Field(None, min_length=1, max_length=255)
    is_active: Optional[bool] = None
    is_dynamic: Optional[bool] = None
    match_all_rules: Optional[bool] = None
    rules: Optional[List[SegmentRuleUpdate]] = None


class SegmentResponse(SegmentBase):
    id: int
    organization_id: int
    rules: List[SegmentRuleResponse]
    created_at: datetime
    updated_at: datetime


class SegmentListResponse(BaseSchema):
    total: int
    segments: List[SegmentResponse]
    page: int
    page_size: int


class LeadSegmentBase(BaseSchema):
    lead_id: int
    segment_id: int
    is_active: bool = Field(default=True)


class LeadSegmentCreate(LeadSegmentBase):
    pass


class LeadSegmentResponse(LeadSegmentBase):
    id: int
    added_at: datetime
    created_at: datetime
    updated_at: datetime


class SegmentEvaluationRequest(BaseSchema):
    segment_id: int
    lead_ids: List[int] = Field(default_factory=list)


class SegmentEvaluationResponse(BaseSchema):
    segment_id: int
    segment_name: str
    matching_leads: List[int]
    total_matching: int
    evaluation_time: float
