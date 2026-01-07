"""
Organization Management Service
Handles organization creation, configuration, and multi-tenancy
"""

import hashlib
import json
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import joinedload
import re

from app.db.models.organization import Organization
from app.db.models.user import User
from app.db.models.audit_log import AuditLog
from app.services.audit_service import AuditService
from app.services.email_service import EmailService
from app.core.security import generate_api_key
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationSetupWizard,
    OrganizationBrandingSettings,
    OrganizationPreferences,
    APIKeyResponse
)
from app.core.config import settings
from app.core.exceptions import (
    NotFoundError,
    ValidationError,
    BadRequestError,
    PermissionError,
    UniqueConstraintError
)


class OrganizationService:
    """Service for managing organizations and multi-tenant functionality."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_service = AuditService(db)
        self.email_service = EmailService()
    
    async def create_organization(
        self,
        user_id: str,
        org_data: OrganizationCreate,
        ip_address: Optional[str] = None
    ) -> Tuple[Organization, User]:
        """Create a new organization and assign admin user."""
        
        # Validate organization data
        await self._validate_organization_data(org_data)
        
        # Check if user exists
        user = await self._get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        # Check if organization with this name or slug already exists
        if await self._organization_exists(org_data.name, org_data.slug):
            raise UniqueConstraintError("Organization with this name or slug already exists")
        
        # Create organization
        organization = Organization(
            name=org_data.name,
            slug=org_data.slug,
            domain=org_data.domain,
            company_size=org_data.company_size,
            industry=org_data.industry,
            address=org_data.address,
            city=org_data.city,
            state=org_data.state,
            zip_code=org_data.zip_code,
            country=org_data.country,
            phone=org_data.phone,
            status="PENDING",
            is_active=False,
            setup_complete=False,
            subscription_plan=org_data.subscription_plan or "trial",
            subscription_status="PENDING"
        )
        
        # Generate API key for the organization
        api_key, api_key_hash = await self._generate_api_key_pair()
        organization.api_key_hash = api_key_hash
        
        self.db.add(organization)
        await self.db.flush()
        
        # Assign user to organization as admin
        user.organization_id = organization.id
        user.role = "ADMIN"
        
        # Create audit log
        await self.audit_service.log_action(
            user_id=user.id,
            organization_id=organization.id,
            action="ORGANIZATION_CREATED",
            entity_type="organization",
            entity_id=organization.id,
            ip_address=ip_address,
            metadata={
                "name": organization.name,
                "plan": organization.subscription_plan
            }
        )
        
        # Send welcome email to organization admin
        await self.email_service.send_organization_welcome_email(
            email=user.email,
            organization_name=organization.name,
            api_key=api_key  # Send API key to admin
        )
        
        return organization, user
    
    async def setup_organization_wizard(
        self,
        organization_id: str,
        user_id: str,
        wizard_data: OrganizationSetupWizard,
        ip_address: Optional[str] = None
    ) -> Tuple[Organization, Dict[str, Any]]:
        """Process organization setup wizard data."""
        
        organization = await self._get_organization_by_id(organization_id)
        if not organization:
            raise NotFoundError("Organization not found")
        
        # Verify user has permission
        await self._verify_organization_access(user_id, organization_id, required_role="ADMIN")
        
        # Update organization with wizard data
        if wizard_data.step == 1:
            # Step 1: Company Information
            organization.company_size = wizard_data.company_size
            organization.industry = wizard_data.industry
            await self._log_setup_step(organization_id, user_id, 1, wizard_data.dict(), ip_address)
        
        elif wizard_data.step == 2:
            # Step 2: Industry & Markets
            organization.preferences = {
                **(organization.preferences or {}),
                "target_regions": wizard_data.target_regions,
                "specializations": wizard_data.specializations,
                "lead_preferences": wizard_data.lead_preferences
            }
            await self._log_setup_step(organization_id, user_id, 2, wizard_data.dict(), ip_address)
        
        elif wizard_data.step == 3:
            # Step 3: Lead Sources
            organization.preferences = {
                **(organization.preferences or {}),
                "lead_sources": wizard_data.lead_sources,
                "integration_methods": wizard_data.integration_methods
            }
            await self._log_setup_step(organization_id, user_id, 3, wizard_data.dict(), ip_address)
        
        elif wizard_data.step == 4:
            # Step 4: Integration Settings
            organization.preferences = {
                **(organization.preferences or {}),
                "crm_integration": wizard_data.crm_integration,
                "api_webhook_setup": wizard_data.api_webhook_setup,
                "automation_preferences": wizard_data.automation_preferences
            }
            await self._log_setup_step(organization_id, user_id, 4, wizard_data.dict(), ip_address)
        
        elif wizard_data.step == 5:
            # Step 5: Team Setup
            organization.preferences = {
                **(organization.preferences or {}),
                "team_structure": wizard_data.team_structure,
                "role_assignments": wizard_data.role_assignments,
                "notification_settings": wizard_data.notification_settings
            }
            await self._log_setup_step(organization_id, user_id, 5, wizard_data.dict(), ip_address)
        
        elif wizard_data.step == 6:
            # Step 6: Confirmation & Activation
            organization.setup_complete = True
            organization.status = "ACTIVE"
            organization.is_active = True
            organization.subscription_status = "ACTIVE"
            
            # Initialize onboarding for all organization users
            await self._initialize_team_onboarding(organization_id)
            
            await self._log_setup_step(organization_id, user_id, 6, wizard_data.dict(), ip_address)
            
            # Send setup completion email
            user = await self._get_user_by_id(user_id)
            await self.email_service.send_setup_complete_email(
                email=user.email,
                organization_name=organization.name
            )
        
        # Update onboarding step for user
        user = await self._get_user_by_id(user_id)
        user.onboarding_step = wizard_data.step
        
        await self.db.flush()
        
        # Check if setup is complete
        setup_status = await self.get_setup_status(organization_id, user_id)
        
        return organization, setup_status
    
    async def update_organization(
        self,
        organization_id: str,
        user_id: str,
        org_update: OrganizationUpdate,
        ip_address: Optional[str] = None
    ) -> Organization:
        """Update organization settings."""
        
        organization = await self._get_organization_by_id(organization_id)
        if not organization:
            raise NotFoundError("Organization not found")
        
        # Verify user has permission (only admin or above)
        await self._verify_organization_access(user_id, organization_id, required_role="ADMIN")
        
        # Update organization fields
        if org_update.name:
            organization.name = org_update.name
        if org_update.slug:
            organization.slug = org_update.slug
        if org_update.domain:
            organization.domain = org_update.domain
        if org_update.logo_url:
            organization.logo_url = org_update.logo_url
        if org_update.primary_color:
            organization.primary_color = org_update.primary_color
        if org_update.secondary_color:
            organization.secondary_color = org_update.secondary_color
        if org_update.address:
            organization.address = org_update.address
        if org_update.city:
            organization.city = org_update.city
        if org_update.state:
            organization.state = org_update.state
        if org_update.zip_code:
            organization.zip_code = org_update.zip_code
        if org_update.country:
            organization.country = org_update.country
        if org_update.phone:
            organization.phone = org_update.phone
        if org_update.webhook_url:
            organization.webhook_url = org_update.webhook_url
        if org_update.preferences:
            organization.preferences = org_update.preferences
        if org_update.custom_fields:
            organization.custom_fields = org_update.custom_fields
        if org_update.is_active is not None:
            organization.is_active = org_update.is_active
        if org_update.setup_complete is not None:
            organization.setup_complete = org_update.setup_complete
        if org_update.subscription_plan:
            organization.subscription_plan = org_update.subscription_plan
        
        await self.db.flush()
        
        # Log the update
        await self.audit_service.log_action(
            user_id=user_id,
            organization_id=organization_id,
            action="ORGANIZATION_UPDATED",
            entity_type="organization",
            entity_id=organization_id,
            ip_address=ip_address,
            metadata=org_update.dict(exclude_unset=True)
        )
        
        return organization
    
    async def update_branding(
        self,
        organization_id: str,
        user_id: str,
        branding_data: OrganizationBrandingSettings,
        ip_address: Optional[str] = None
    ) -> Organization:
        """Update organization branding settings."""
        
        organization = await self._get_organization_by_id(organization_id)
        if not organization:
            raise NotFoundError("Organization not found")
        
        await self._verify_organization_access(user_id, organization_id, required_role="ADMIN")
        
        # Update branding fields
        if branding_data.logo_url is not None:
            organization.logo_url = branding_data.logo_url
        if branding_data.primary_color:
            organization.primary_color = branding_data.primary_color
        if branding_data.secondary_color:
            organization.secondary_color = branding_data.secondary_color
        if branding_data.custom_css:
            organization.preferences = {
                **(organization.preferences or {}),
                "custom_css": branding_data.custom_css
            }
        if branding_data.custom_js:
            organization.preferences = {
                **(organization.preferences or {}),
                "custom_js": branding_data.custom_js
            }
        
        await self.db.flush()
        
        await self.audit_service.log_action(
            user_id=user_id,
            organization_id=organization_id,
            action="BRANDING_UPDATED",
            entity_type="organization",
            entity_id=organization_id,
            ip_address=ip_address
        )
        
        return organization
    
    async def generate_new_api_key(
        self,
        organization_id: str,
        user_id: str,
        ip_address: Optional[str] = None
    ) -> Tuple[str, str]:
        """Generate new API key for organization."""
        
        organization = await self._get_organization_by_id(organization_id)
        if not organization:
            raise NotFoundError("Organization not found")
        
        await self._verify_organization_access(user_id, organization_id, required_role="ADMIN")
        
        # Generate new API key pair
        api_key, api_key_hash = await self._generate_api_key_pair()
        
        # Store the hash (but return the actual key to user)
        old_api_key_hash = organization.api_key_hash
        organization.api_key_hash = api_key_hash
        
        await self.db.flush()
        
        # Log API key generation (but don't log the actual key!)
        await self.audit_service.log_action(
            user_id=user_id,
            organization_id=organization_id,
            action="API_KEY_GENERATED",
            entity_type="organization",
            entity_id=organization_id,
            ip_address=ip_address,
            metadata={"api_key_changed": True}
        )
        
        return api_key, organization.id
    
    async def get_setup_status(
        self,
        organization_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Get organization setup status and progress."""
        
        organization = await self._get_organization_by_id(organization_id)
        if not organization:
            raise NotFoundError("Organization not found")
        
        # Get user onboarding step
        user = await self._get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        # Get team members count
        team_members = await self._get_organization_user_count(organization_id)
        
        # Get setup completion percentage
        completion_percentage = await self._calculate_setup_completion(organization, user)
        
        return {
            "organization_id": organization.id,
            "organization_name": organization.name,
            "setup_complete": organization.setup_complete,
            "status": organization.status,
            "subscription_plan": organization.subscription_plan,
            "subscription_status": organization.subscription_status,
            "onboarding_step": user.onboarding_step,
            "team_members": team_members,
            "completion_percentage": completion_percentage,
            "api_key_configured": bool(organization.api_key_hash),
            "branding_configured": bool(organization.logo_url or organization.primary_color),
            "preferences_set": bool(organization.preferences),
            "next_steps": await self._get_next_setup_steps(organization, user)
        }
    
    async def get_organization_by_api_key(self, api_key: str) -> Optional[Organization]:
        """Retrieve organization by API key (used for API authentication)."""
        
        # Hash the provided API key and look up organization
        api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        result = await self.db.execute(
            select(Organization).where(Organization.api_key_hash == api_key_hash)
        )
        return result.scalar_one_or_none()
    
    # Helper methods
    
    async def _get_organization_by_id(self, organization_id: str) -> Optional[Organization]:
        """Get organization by ID."""
        result = await self.db.execute(
            select(Organization).where(Organization.id == organization_id)
        )
        return result.scalar_one_or_none()
    
    async def _get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    
    async def _get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    
    async def _organization_exists(self, name: str, slug: str) -> bool:
        """Check if organization with given name or slug exists."""
        result = await self.db.execute(
            select(Organization).where(
                or_(
                    Organization.name == name,
                    Organization.slug == slug
                )
            )
        )
        return result.scalar_one_or_none() is not None
    
    async def _validate_organization_data(self, org_data: OrganizationCreate):
        """Validate organization creation data."""
        if not org_data.name or len(org_data.name.strip()) < 3:
            raise ValidationError("Organization name must be at least 3 characters")
        
        if not org_data.slug or not re.match(r'^[a-z0-9-]+$', org_data.slug):
            raise ValidationError("Organization slug must contain only lowercase letters, numbers, and hyphens")
        
        # Validate domain if provided
        if org_data.domain and not self._is_valid_domain(org_data.domain):
            raise ValidationError("Invalid domain format")
    
    def _is_valid_domain(self, domain: str) -> bool:
        """Validate domain format."""
        pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$'
        return re.match(pattern, domain) is not None
    
    async def _verify_organization_access(
        self,
        user_id: str,
        organization_id: str,
        required_role: str = "USER"
    ):
        """Verify user has access to organization with required role."""
        
        user = await self._get_user_by_id(user_id)
        if not user:
            raise PermissionError("User not found")
        
        if user.organization_id != organization_id:
            raise PermissionError("User not part of this organization")
        
        # Check role hierarchy
        role_hierarchy = {
            "VIEWER": 0,
            "USER": 1,
            "AGENT": 2,
            "MANAGER": 3,
            "ADMIN": 4,
            "SUPER_ADMIN": 5
        }
        
        user_role_level = role_hierarchy.get(user.role, -1)
        required_role_level = role_hierarchy.get(required_role, 0)
        
        if user_role_level < required_role_level:
            raise PermissionError(f"Insufficient permissions. Required role: {required_role}")
    
    async def _generate_api_key_pair(self) -> Tuple[str, str]):
        """Generate API key and hash pair."""
        # Generate random API key
        alphabet = string.ascii_letters + string.digits
        api_key = ''.join(secrets.choice(alphabet) for _ in range(64))
        
        # Hash the key (store only hash in database)
        api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        return api_key, api_key_hash
    
    async def _log_setup_step(
        self,
        organization_id: str,
        user_id: str,
        step: int,
        data: Dict[str, Any],
        ip_address: Optional[str] = None
    ):
        """Log organization setup step."""
        await self.audit_service.log_action(
            user_id=user_id,
            organization_id=organization_id,
            action=f"ONBOARDING_STEP_{step}",
            entity_type="organization",
            entity_id=organization_id,
            ip_address=ip_address,
            metadata={"step": step, **data}
        )
    
    async def _get_organization_user_count(self, organization_id: str) -> int:
        """Get count of users in organization."""
        result = await self.db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.organization_id == organization_id,
                    User.is_active == True
                )
            )
        )
        return result.scalar()
    
    async def _calculate_setup_completion(
        self,
        organization: Organization,
        user: User
    ) -> float:
        """Calculate setup completion percentage."""
        
        if organization.setup_complete:
            return 100.0
        
        total_steps = 6
        completed_steps = 0
        
        # Check each step completion
        if user.onboarding_step >= 1 and organization.company_size:
            completed_steps += 1
        if user.onboarding_step >= 2:
            completed_steps += 1
        if user.onboarding_step >= 3 and organization.preferences and organization.preferences.get("lead_sources"):
            completed_steps += 1
        if user.onboarding_step >= 4 and organization.preferences and organization.preferences.get("crm_integration"):
            completed_steps += 1
        if user.onboarding_step >= 5 and organization.preferences and organization.preferences.get("team_structure"):
            completed_steps += 1
        if organization.setup_complete or user.onboarding_step >= 6:
            completed_steps += 1
        
        return (completed_steps / total_steps) * 100
    
    async def _initialize_team_onboarding(self, organization_id: str):
        """Initialize onboarding for all team members."""
        # Implementation would set onboarding steps for all team members
        pass
    
    async def _get_next_setup_steps(
        self,
        organization: Organization,
        user: User
    ) -> List[Dict[str, str]]:
        """Get list of next steps for completing setup."""
        
        next_steps = []
        
        if not user.onboarding_step:
            next_steps.append({"step": 0, "title": "Verify your email", "description": "Check your email for verification link"})
        
        if user.onboarding_step < 1:
            next_steps.append({"step": 1, "title": "Set up company profile", "description": "Provide basic company information"})
        
        if user.onboarding_step < 2:
            next_steps.append({"step": 2, "title": "Configure industry settings", "description": "Select your industry and specializations"})
        
        if user.onboarding_step < 3:
            next_steps.append({"step": 3, "title": "Connect lead sources", "description": "Configure how you receive leads"})
        
        if user.onboarding_step < 4:
            next_steps.append({"step": 4, "title": "Set up integrations", "description": "Connect your CRM and other tools"})
        
        if user.onboarding_step < 5:
            next_steps.append({"step": 5, "title": "Invite team members", "description": "Add your team to the platform"})
        
        if not organization.setup_complete and user.onboarding_step >= 5:
            next_steps.append({"step": 6, "title": "Complete setup", "description": "Review and activate your organization"})
        
        return next_steps


# Service factory
def get_organization_service(db: AsyncSession) -> OrganizationService:
    return OrganizationService(db)