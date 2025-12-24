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
    "CampaignBase", "CampaignCreate", "CampaignUpdate", "CampaignInDB", "CampaignResponse", "CampaignStatus"
]
