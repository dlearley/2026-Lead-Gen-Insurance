from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse, LeadListResponse
from app.services.lead_service import LeadService
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_data: LeadCreate,
    db: AsyncSession = Depends(get_db)
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


@router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db)
) -> LeadResponse:
    lead = await LeadService.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with ID {lead_id} not found"
        )
    return LeadResponse.model_validate(lead)


@router.get("/leads", response_model=LeadListResponse)
async def list_leads(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    organization_id: Optional[int] = Query(None, description="Filter by organization ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db)
) -> LeadListResponse:
    skip = (page - 1) * page_size
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


@router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    db: AsyncSession = Depends(get_db)
) -> LeadResponse:
    lead = await LeadService.update_lead(db, lead_id, lead_data)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with ID {lead_id} not found"
        )
    return LeadResponse.model_validate(lead)


@router.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db)
) -> None:
    success = await LeadService.delete_lead(db, lead_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with ID {lead_id} not found"
        )
