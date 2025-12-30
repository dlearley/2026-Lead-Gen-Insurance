from typing import Any, List, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.db.models.user import User
from app.services.team_invitation_service import TeamInvitationService, get_team_invitation_service
from app.services.organization_service import OrganizationService, get_organization_service
from app.schemas.team_invitation import (
    TeamInvitationCreate,
    TeamInvitationUpdate,
    TeamInvitationResponse,
    InvitationFilterParams,
    BulkImportResult
)

router = APIRouter()


@router.get("/invitations", response_model=List[TeamInvitationResponse])
async def list_team_invitations(
    organization_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List team invitations with optional filtering."""
    
    team_service = get_team_invitation_service(db)
    
    # Use current user's organization if not specified
    if not organization_id:
        if not current_user.organization_id:
            raise HTTPException(
                status_code=400, 
                detail="User is not part of an organization"
            )
        organization_id = current_user.organization_id
    
    filters = InvitationFilterParams(
        organization_id=organization_id,
        status=status_filter
    )
    
    try:
        invitations = await team_service.list_invitations(filters, requested_by=current_user.id)
        return invitations
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invitations", response_model=TeamInvitationResponse)
async def create_team_invitation(
    request: Request,
    invitation_data: TeamInvitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new team invitation."""
    
    team_service = get_team_invitation_service(db)
    
    try:
        invitation = await team_service.create_invitation(
            inviter_id=current_user.id,
            invitation_data=invitation_data,
            ip_address=request.client.host if request.client else None
        )
        
        return invitation
        
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/invitations/{invitation_id}", response_model=TeamInvitationResponse)
async def update_invitation_status(
    request: Request,
    invitation_id: str,
    status_update: TeamInvitationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update invitation status (accept/decline)."""
    
    team_service = get_team_invitation_service(db)
    
    try:
        if status_update.status == "ACCEPTED":
            invitation = await team_service.accept_invitation(
                token=status_update.token,
                user_data=status_update.user_data,
                ip_address=request.client.host if request.client else None
            )
        else:
            invitation = await team_service.revoke_invitation(
                invitation_id=invitation_id,
                revoked_by=current_user.id,
                ip_address=request.client.host if request.client else None
            )
        
        return invitation
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invitations/resend/{invitation_id}", response_model=TeamInvitationResponse)
async def resend_invitation(
    request: Request,
    invitation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Resend a pending invitation with new token."""
    
    team_service = get_team_invitation_service(db)
    
    try:
        invitation = await team_service.resend_invitation(
            invitation_id=invitation_id,
            requested_by=current_user.id,
            ip_address=request.client.host if request.client else None
        )
        
        return invitation
        
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/members", response_model=List[Dict[str, Any]])
async def list_team_members(
    organization_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all team members and pending invitations."""
    
    team_service = get_team_invitation_service(db)
    
    # Use current user's organization if not specified
    if not organization_id:
        if not current_user.organization_id:
            raise HTTPException(
                status_code=400, 
                detail="User is not part of an organization"
            )
        organization_id = current_user.organization_id
    
    try:
        members = await team_service.list_team_members(
            organization_id=organization_id,
            requested_by=current_user.id
        )
        
        return members
        
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/members/{user_id}/role", response_model=Dict[str, Any])
async def update_team_member_role(
    request: Request,
    user_id: str,
    new_role: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update team member role (requires admin permissions)."""
    
    team_service = get_team_invitation_service(db)
    
    try:
        updated_user = await team_service.update_team_member_role(
            user_id=current_user.id,
            target_user_id=user_id,
            new_role=new_role,
            ip_address=request.client.host if request.client else None
        )
        
        return {
            "success": True,
            "user_id": updated_user.id,
            "role": updated_user.role,
            "message": "User role updated successfully"
        }
        
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/members/{user_id}", response_model=Dict[str, Any])
async def remove_team_member(
    request: Request,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Remove team member from organization."""
    
    team_service = get_team_invitation_service(db)
    
    try:
        result = await team_service.remove_team_member(
            user_id=current_user.id,
            target_user_id=user_id,
            ip_address=request.client.host if request.client else None
        )
        
        return result
        
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk-import", response_model=BulkImportResult)
async def bulk_import_team_members(
    request: Request,
    file: UploadFile = File(...),
    organization_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Bulk import team members from CSV file."""
    
    team_service = get_team_invitation_service(db)
    
    # Use current user's organization if not specified
    if not organization_id:
        if not current_user.organization_id:
            raise HTTPException(
                status_code=400, 
                detail="User is not part of an organization"
            )
        organization_id = current_user.organization_id
    
    try:
        # Read and process CSV file
        contents = await file.read()
        
        result = await team_service.bulk_import_from_csv(
            organization_id=organization_id,
            inviter_id=current_user.id,
            csv_content=contents,
            ip_address=request.client.host if request.client else None
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invitation-stats", response_model=Dict[str, Any])
async def get_invitation_statistics(
    organization_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get invitation statistics for the organization."""
    
    team_service = get_team_invitation_service(db)
    
    # Use current user's organization if not specified
    if not organization_id:
        if not current_user.organization_id:
            raise HTTPException(
                status_code=400, 
                detail="User is not part of an organization"
            )
        organization_id = current_user.organization_id
    
    try:
        stats = await team_service.get_invitation_stats(
            organization_id=organization_id,
            user_id=current_user.id
        )
        
        return stats
        
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))