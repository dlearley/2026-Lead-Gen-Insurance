from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.segmentation import (
    SegmentCreate, SegmentUpdate, SegmentResponse, SegmentListResponse,
    SegmentRuleCreate, SegmentRuleUpdate, SegmentRuleResponse,
    LeadSegmentCreate, LeadSegmentResponse, SegmentEvaluationRequest, SegmentEvaluationResponse
)
from app.services.segmentation_service import SegmentationService
from app.core.logging import get_logger
from app.api.deps import get_current_user
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter()


@router.post("", response_model=SegmentResponse, status_code=status.HTTP_201_CREATED)
async def create_segment(
    segment_data: SegmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SegmentResponse:
    try:
        segment = await SegmentationService(db).create_segment(
            segment_data, 
            current_user.organization_id
        )
        return SegmentResponse.model_validate(segment)
    except Exception as e:
        logger.error(f"Error creating segment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create segment"
        )


@router.get("/{segment_id}", response_model=SegmentResponse)
async def get_segment(
    segment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SegmentResponse:
    segment = await SegmentationService(db).get_segment_by_id(segment_id)
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Segment with ID {segment_id} not found"
        )
    if segment.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this segment"
        )
    return SegmentResponse.model_validate(segment)


@router.get("", response_model=SegmentListResponse)
async def list_segments(
    active_only: bool = Query(True, description="Filter by active segments only"),
    is_dynamic: Optional[bool] = Query(None, description="Filter by dynamic/static segments"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SegmentListResponse:
    segments = await SegmentationService(db).get_segments(
        organization_id=current_user.organization_id,
        active_only=active_only,
        is_dynamic=is_dynamic
    )
    
    return SegmentListResponse(
        total=len(segments),
        segments=[SegmentResponse.model_validate(segment) for segment in segments],
        page=1,
        page_size=len(segments)
    )


@router.put("/{segment_id}", response_model=SegmentResponse)
async def update_segment(
    segment_id: int,
    segment_data: SegmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SegmentResponse:
    segment = await SegmentationService(db).get_segment_by_id(segment_id)
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Segment with ID {segment_id} not found"
        )
    if segment.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this segment"
        )
    
    segment = await SegmentationService(db).update_segment(segment_id, segment_data)
    return SegmentResponse.model_validate(segment)


@router.delete("/{segment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_segment(
    segment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    segment = await SegmentationService(db).get_segment_by_id(segment_id)
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Segment with ID {segment_id} not found"
        )
    if segment.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this segment"
        )
    
    await SegmentationService(db).delete_segment(segment_id)


@router.post("/{segment_id}/evaluate", response_model=SegmentEvaluationResponse)
async def evaluate_segment(
    segment_id: int,
    evaluation_request: SegmentEvaluationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SegmentEvaluationResponse:
    segment = await SegmentationService(db).get_segment_by_id(segment_id)
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Segment with ID {segment_id} not found"
        )
    if segment.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this segment"
        )
    
    evaluation = await SegmentationService(db).evaluate_segment(
        segment_id,
        evaluation_request.lead_ids
    )
    
    return SegmentEvaluationResponse(**evaluation)


@router.post("/{segment_id}/leads", response_model=List[LeadSegmentResponse])
async def add_leads_to_segment(
    segment_id: int,
    lead_segment_data: List[LeadSegmentCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[LeadSegmentResponse]:
    segment = await SegmentationService(db).get_segment_by_id(segment_id)
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Segment with ID {segment_id} not found"
        )
    if segment.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this segment"
        )
    
    lead_ids = [ls.lead_id for ls in lead_segment_data]
    added_count = await SegmentationService(db).add_leads_to_segment(segment_id, lead_ids)
    
    # Return the updated lead segment associations
    result = await SegmentationService(db).get_segment_leads(segment_id)
    
    return [LeadSegmentResponse(
        id=0,  # Placeholder
        lead_id=lead.id,
        segment_id=segment_id,
        is_active=True,
        added_at=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now()
    ) for lead in result]


@router.delete("/{segment_id}/leads", status_code=status.HTTP_204_NO_CONTENT)
async def remove_leads_from_segment(
    segment_id: int,
    lead_ids: List[int],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    segment = await SegmentationService(db).get_segment_by_id(segment_id)
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Segment with ID {segment_id} not found"
        )
    if segment.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this segment"
        )
    
    await SegmentationService(db).remove_leads_from_segment(segment_id, lead_ids)


@router.get("/{segment_id}/leads", response_model=List[LeadSegmentResponse])
async def get_segment_leads(
    segment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[LeadSegmentResponse]:
    segment = await SegmentationService(db).get_segment_by_id(segment_id)
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Segment with ID {segment_id} not found"
        )
    if segment.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this segment"
        )
    
    leads = await SegmentationService(db).get_segment_leads(segment_id)
    
    return [LeadSegmentResponse(
        id=0,  # Placeholder
        lead_id=lead.id,
        segment_id=segment_id,
        is_active=True,
        added_at=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now()
    ) for lead in leads]


@router.get("/leads/{lead_id}", response_model=List[SegmentResponse])
async def get_lead_segments(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[SegmentResponse]:
    # Check if lead belongs to current user's organization
    lead_result = await db.execute(
        select(Lead).where(Lead.id == lead_id)
    )
    lead = lead_result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with ID {lead_id} not found"
        )
    
    if lead.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this lead"
        )
    
    segments = await SegmentationService(db).get_lead_segments(lead_id)
    
    return [SegmentResponse.model_validate(segment) for segment in segments]


@router.post("/{segment_id}/update-memberships", response_model=dict)
async def update_segment_memberships(
    segment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    segment = await SegmentationService(db).get_segment_by_id(segment_id)
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Segment with ID {segment_id} not found"
        )
    if segment.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this segment"
        )
    
    updated_count = await SegmentationService(db).update_segment_memberships(segment_id)
    
    return {
        "success": True,
        "segment_id": segment_id,
        "updated_count": updated_count,
        "message": f"Updated {updated_count} segment memberships"
    }