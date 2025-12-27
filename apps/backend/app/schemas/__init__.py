from app.schemas.lead import (
    LeadBase, LeadCreate, LeadUpdate, LeadAssign, LeadStatusUpdate,
    LeadInDB, LeadResponse, LeadDetailResponse,
    LeadStatusEnum, LeadPriorityEnum, LeadSourceTypeEnum, ActivityTypeEnum,
    PaginationParams, PaginatedResponse, LeadPaginatedResponse,
    LeadFilterParams, LeadFilterRequest,
    BulkUpdateRequest, BulkAssignRequest, BulkStatusUpdateRequest, BulkDeleteRequest,
    BulkOperationResponse,
    LeadSearchParams, ExportRequest, ExportFormat,
    ActivityResponse, LeadActivityCreate,
    StatusHistoryResponse, AssignmentHistoryResponse,
    MessageResponse, ErrorResponse
)

from app.schemas.user import (
    UserBase, UserCreate, UserUpdate, UserInDB, UserResponse, UserStatus,
    TeamBase, TeamCreate, TeamUpdate, TeamInDB, TeamResponse,
    LeadSourceBase, LeadSourceCreate, LeadSourceUpdate, LeadSourceInDB, LeadSourceResponse, LeadSourceTypeEnum,
    CampaignBase, CampaignCreate, CampaignUpdate, CampaignInDB, CampaignResponse, CampaignStatus
)

from app.schemas.segmentation import (
    SegmentBase, SegmentCreate, SegmentUpdate, SegmentResponse, SegmentListResponse,
    SegmentRuleBase, SegmentRuleCreate, SegmentRuleUpdate, SegmentRuleResponse,
    LeadSegmentBase, LeadSegmentCreate, LeadSegmentResponse,
    SegmentEvaluationRequest, SegmentEvaluationResponse,
    SegmentOperatorEnum, SegmentFieldEnum
)

from app.schemas.automation import (
    AutomationBase, AutomationCreate, AutomationUpdate, AutomationResponse, AutomationListResponse,
    AutomationActionBase, AutomationActionCreate, AutomationActionUpdate, AutomationActionResponse,
    AutomationRunBase, AutomationRunCreate, AutomationRunResponse,
    EmailTemplateBase, EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse, EmailTemplateListResponse,
    ScheduledTaskBase, ScheduledTaskCreate, ScheduledTaskUpdate, ScheduledTaskResponse, ScheduledTaskListResponse,
    AutomationTriggerRequest, AutomationTriggerResponse,
    AutomationTriggerTypeEnum, AutomationActionTypeEnum
)

__all__ = [
    # Lead schemas
    "LeadBase", "LeadCreate", "LeadUpdate", "LeadAssign", "LeadStatusUpdate",
    "LeadInDB", "LeadResponse", "LeadDetailResponse",
    "LeadStatusEnum", "LeadPriorityEnum", "LeadSourceTypeEnum", "ActivityTypeEnum",
    "PaginationParams", "PaginatedResponse", "LeadPaginatedResponse",
    "LeadFilterParams", "LeadFilterRequest",
    "BulkUpdateRequest", "BulkAssignRequest", "BulkStatusUpdateRequest", "BulkDeleteRequest",
    "BulkOperationResponse",
    "LeadSearchParams", "ExportRequest", "ExportFormat",
    "ActivityResponse", "LeadActivityCreate",
    "StatusHistoryResponse", "AssignmentHistoryResponse",
    "MessageResponse", "ErrorResponse",
    # User schemas
    "UserBase", "UserCreate", "UserUpdate", "UserInDB", "UserResponse", "UserStatus",
    "TeamBase", "TeamCreate", "TeamUpdate", "TeamInDB", "TeamResponse",
    "LeadSourceBase", "LeadSourceCreate", "LeadSourceUpdate", "LeadSourceInDB", "LeadSourceResponse", "LeadSourceTypeEnum",
    "CampaignBase", "CampaignCreate", "CampaignUpdate", "CampaignInDB", "CampaignResponse", "CampaignStatus",
    # Segmentation schemas
    "SegmentBase", "SegmentCreate", "SegmentUpdate", "SegmentResponse", "SegmentListResponse",
    "SegmentRuleBase", "SegmentRuleCreate", "SegmentRuleUpdate", "SegmentRuleResponse",
    "LeadSegmentBase", "LeadSegmentCreate", "LeadSegmentResponse",
    "SegmentEvaluationRequest", "SegmentEvaluationResponse",
    "SegmentOperatorEnum", "SegmentFieldEnum",
    # Automation schemas
    "AutomationBase", "AutomationCreate", "AutomationUpdate", "AutomationResponse", "AutomationListResponse",
    "AutomationActionBase", "AutomationActionCreate", "AutomationActionUpdate", "AutomationActionResponse",
    "AutomationRunBase", "AutomationRunCreate", "AutomationRunResponse",
    "EmailTemplateBase", "EmailTemplateCreate", "EmailTemplateUpdate", "EmailTemplateResponse", "EmailTemplateListResponse",
    "ScheduledTaskBase", "ScheduledTaskCreate", "ScheduledTaskUpdate", "ScheduledTaskResponse", "ScheduledTaskListResponse",
    "AutomationTriggerRequest", "AutomationTriggerResponse",
    "AutomationTriggerTypeEnum", "AutomationActionTypeEnum"
]
