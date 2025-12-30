from typing import Any, List, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_active_user
from app.db.models.user import User
from app.db.models.organization import Organization
from app.services.organization_service import OrganizationService, get_organization_service
from app.services.auth_service import AuthService, get_auth_service
from app.schemas.organization import (
    OrganizationCreate, 
    OrganizationUpdate, 
    OrganizationResponse,
    OrganizationSetupWizard,
    OrganizationBrandingSettings
)
from app.schemas.auth import TokenResponse

router = APIRouter()

@router.get("", response_model=List[OrganizationResponse])
async def read_organizations(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get list of organizations (superuser: all, regular: user's org only)."""
    
    org_service = get_organization_service(db)
    orgs = await org_service.get_user_organizations(user_id=current_user.id)
    
    return orgs


@router.post("", response_model=OrganizationResponse)
async def create_organization(
    request: Request,
    org_in: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new organization for the authenticated user."""
    
    try:
        org_service = get_organization_service(db)
        auth_service = get_auth_service(db)
        
        organization, user = await org_service.create_organization(
            user_id=current_user.id,
            org_data=org_in,
            ip_address=request.client.host if request.client else None
        )
        
        return organization
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=OrganizationResponse)
async def get_current_organization(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get the current user's organization."""
    
    if not current_user.organization_id:
        raise HTTPException(
            status_code=404, 
            detail="User is not part of an organization"
        )
    
    org_service = get_organization_service(db)
    organization = await org_service.get_organization_by_id(current_user.organization_id)
    
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return organization


@router.get("/setup-status", response_model=Dict[str, Any])
async def get_organization_setup_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get current user's organization setup status and progress."""
    
    if not current_user.organization_id:
        return {
            "organization_id": None,
            "setup_complete": False,
            "onboarding_step": 0,
            "completion_percentage": 0,
            "next_steps": [{"step": 0, "title": "Create organization", "description": "Start by creating your organization"}]
        }
    
    try:
        org_service = get_organization_service(db)
        status_data = await org_service.get_setup_status(
            organization_id=current_user.organization_id,
            user_id=current_user.id
        )
        
        return status_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/setup-wizard", response_model=Dict[str, Any])
async def organization_setup_wizard(
    request: Request,
    wizard_data: OrganizationSetupWizard,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Process organization setup wizard steps."""
    
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User is not part of an organization")
    
    try:
        org_service = get_organization_service(db)
        organization, setup_status = await org_service.setup_organization_wizard(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            wizard_data=wizard_data,
            ip_address=request.client.host if request.client else None
        )
        
        return {
            "success": True,
            "organization": organization,
            "setup_status": setup_status,
            "message": f"Setup step {wizard_data.step} completed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{organization_id}", response_model=OrganizationResponse)
async def get_organization(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get organization details by ID."""
    
    try:
        org_service = get_organization_service(db)
        
        # Verify user has access to this organization
        organization = await org_service.get_organization_by_id(organization_id)
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Check if user belongs to organization or is superuser
        if current_user.organization_id != organization_id and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Not authorized to view this organization")
        
        return organization
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{organization_id}", response_model=OrganizationResponse)
async def update_organization(
    request: Request,
    organization_id: str,
    org_update: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update organization settings."""
    
    try:
        org_service = get_organization_service(db)
        
        organization = await org_service.update_organization(
            organization_id=organization_id,
            user_id=current_user.id,
            org_update=org_update,
            ip_address=request.client.host if request.client else None
        )
        
        return organization
        
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{organization_id}/branding", response_model=OrganizationResponse)
async def update_organization_branding(
    request: Request,
    organization_id: str,
    branding_data: OrganizationBrandingSettings,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update organization branding (logo, colors, etc.)."""
    
    try:
        org_service = get_organization_service(db)
        
        organization = await org_service.update_branding(
            organization_id=organization_id,
            user_id=current_user.id,
            branding_data=branding_data,
            ip_address=request.client.host if request.client else None
        )
        
        return organization
        
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{organization_id}/generate-api-key", response_model=Dict[str, Any])
async def generate_api_key(
    request: Request,
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Generate new API key for organization."""
    
    try:
        org_service = get_organization_service(db)
        
        api_key, org_id = await org_service.generate_new_api_key(
            organization_id=organization_id,
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None
        )
        
        return {
            "api_key": api_key,
            "organization_id": org_id,
            "message": "API key generated successfully. Save this key - it won't be shown again!",
            "warning": "Keep this API key secure and do not share it"
        }
        
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
