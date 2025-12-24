from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse, LeadListResponse
from app.services.lead_service import LeadService
from app.core.logging import get_logger
from app.api.deps import get_current_user
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter()


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_data: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> LeadResponse:
    try:
        lead = await LeadService.create_lead(db, lead_data)
        return LeadResponse.model_validate(lead)
    except Exception as e:
        logger.error(f"Error creating lead: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create lead"
        )


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> LeadResponse:
    lead = await LeadService.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with ID {lead_id} not found"
        )
    if not current_user.is_superuser and lead.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this lead"
        )
    return LeadResponse.model_validate(lead)


@router.get("", response_model=LeadListResponse)
async def list_leads(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    organization_id: Optional[int] = Query(None, description="Filter by organization ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> LeadListResponse:
    skip = (page - 1) * page_size
    
    # Mandatory multi-tenant isolation
    if not current_user.is_superuser:
        organization_id = current_user.organization_id
        if organization_id is None:
            return LeadListResponse(total=0, leads=[], page=page, page_size=page_size)
            
    leads, total = await LeadService.get_leads(
        db,
        skip=skip,
        limit=page_size,
        organization_id=organization_id,
        status=status
    )
    
    return LeadListResponse(
        total=total,
        leads=[LeadResponse.model_validate(lead) for lead in leads],
        page=page,
        page_size=page_size
    )


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> LeadResponse:
    lead = await LeadService.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with ID {lead_id} not found"
        )
    if not current_user.is_superuser and lead.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this lead"
        )
    
    lead = await LeadService.update_lead(db, lead_id, lead_data)
    return LeadResponse.model_validate(lead)


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    lead = await LeadService.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with ID {lead_id} not found"
        )
    if not current_user.is_superuser and lead.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this lead"
        )
        
    await LeadService.delete_lead(db, lead_id)
