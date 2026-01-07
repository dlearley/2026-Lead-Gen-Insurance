"""
Authentication schemas for onboarding system
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenResponse(BaseModel):
    """Enhanced token response with metadata."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    scope: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request data."""
    email: EmailStr
    password: str
    remember_me: bool = False
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class SocialLoginRequest(BaseModel):
    """Social login request data."""
    provider: str = Field(..., regex="^(google|microsoft)$")
    token: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


class EmailVerificationRequest(BaseModel):
    """Email verification request."""
    token: str
    user_id: Optional[str] = None


class PasswordResetRequest(BaseModel):
    """Password reset request."""
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str

    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str
    scope: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    """Password change request for authenticated users."""
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str

    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class UserCreate(BaseModel):
    """User registration data."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone: Optional[str] = None
    role: str = "USER"
    recaptcha_token: Optional[str] = None

    @validator('password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if not any(c in '!@#$%^&*(),.?":{}|<>" for c in v):
            raise ValueError('Password must contain at least one special character')
        return v


class UserUpdate(BaseModel):
    """User profile update data."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    marketing_emails: Optional[bool] = None
    timezone: Optional[str] = None


class OrganizationCreate(BaseModel):
    """Organization creation data."""
    name: str = Field(..., min_length=3, max_length=100)
    slug: str = Field(..., regex=r'^[a-z0-9-]+$')
    domain: Optional[str] = None
    company_size: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    subscription_plan: Optional[str] = "trial"


class OrganizationUpdate(BaseModel):
    """Organization update data."""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    slug: Optional[str] = Field(None, regex=r'^[a-z0-9-]+$')
    domain: Optional[str] = None
    company_size: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    subscription_plan: Optional[str] = None
    webhook_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    setup_complete: Optional[bool] = None


class OrganizationSetupWizard(BaseModel):
    """Organization setup wizard step data."""
    step: int = Field(..., ge=1, le=6)
    # Step 1: Company Information
    company_size: Optional[str] = None
    industry: Optional[str] = None
    target_markets: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    lead_preferences: Optional[Dict[str, Any]] = None
    
    # Step 2: Target Regions
    target_regions: Optional[List[str]] = None
    region_preferences: Optional[Dict[str, Any]] = None
    
    # Step 3: Lead Sources
    lead_sources: Optional[List[str]] = None
    integration_methods: Optional[List[str]] = None
    lead_routing_rules: Optional[Dict[str, Any]] = None
    
    # Step 4: Integration Settings
    crm_integration: Optional[Dict[str, Any]] = None
    api_webhook_setup: Optional[Dict[str, Any]] = None
    automation_preferences: Optional[Dict[str, Any]] = None
    
    # Step 5: Team Setup
    team_structure: Optional[Dict[str, Any]] = None
    role_assignments: Optional[Dict[str, Any]] = None
    notification_settings: Optional[Dict[str, Any]] = None
    
    # Step 6: Confirmation
    confirmation: Optional[Dict[str, bool]] = None
    subscription_plan: Optional[str] = None


class OrganizationBrandingSettings(BaseModel):
    """Organization branding settings."""
    logo_url: Optional[str] = None
    primary_color: Optional[str] = Field(None, regex=r'^#[0-9A-Fa-f]{6}$')
    secondary_color: Optional[str] = Field(None, regex=r'^#[0-9A-Fa-f]{6}$')
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None


class OrganizationPreferences(BaseModel):
    """Organization preferences."""
    notifications: Optional[Dict[str, Any]] = None
    email_settings: Optional[Dict[str, Any]] = None
    integration_settings: Optional[Dict[str, Any]] = None
    privacy_settings: Optional[Dict[str, Any]] = None


class TeamInvitationCreate(BaseModel):
    """Team invitation creation data."""
    email: EmailStr
    organization_id: str
    role: str = Field(..., regex="^(USER|AGENT|MANAGER|ADMIN|VIEWER)$")
    permissions: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class TeamInvitationUpdate(BaseModel):
    """Team invitation update data."""
    status: str = Field(..., regex="^(ACCEPTED|DECLINED|REVOKED)$")
    token: Optional[str] = None
    user_data: Optional[Dict[str, Any]] = None


class TeamInvitationResponse(BaseModel):
    """Team invitation response data."""
    id: str
    email: EmailStr
    organization_id: str
    role: str
    permissions: Optional[Dict[str, Any]] = None
    status: str
    expires_at: datetime
    created_at: datetime
    created_by: Optional[str] = None


class APIKeyResponse(BaseModel):
    """API key generation response."""
    api_key: str
    api_key_id: str
    organization_id: str
    created_at: datetime
    expires_at: Optional[datetime] = None


class SetupStatusResponse(BaseModel):
    """Organization setup status response."""
    organization_id: str
    organization_name: str
    setup_complete: bool
    status: str
    subscription_plan: str
    subscription_status: str
    onboarding_step: int
    team_members: int
    completion_percentage: float
    api_key_configured: bool
    branding_configured: bool
    preferences_set: bool
    next_steps: List[Dict[str, Any]]


class BulkImportResult(BaseModel):
    """CSV bulk import result."""
    total: int
    success: int
    failed: int
    errors: List[str]


class ErrorResponse(BaseModel):
    """Standard error response."""
    success: bool = False
    error: str
    details: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None


class SuccessResponse(BaseModel):
    """Standard success response."""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None