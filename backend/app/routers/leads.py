from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    LeadCreate, LeadUpdate, LeadAssign, LeadStatusUpdate,
    LeadResponse, LeadDetailResponse, LeadPaginatedResponse,
    LeadFilterParams, LeadSearchParams,
    BulkUpdateRequest, BulkAssignRequest, BulkStatusUpdateRequest, BulkDeleteRequest,
    BulkOperationResponse,
    MessageResponse, ErrorResponse,
    ExportRequest, ExportFormat,
    ActivityResponse, StatusHistoryResponse, AssignmentHistoryResponse
)
from app.services import LeadService
from app.models import LeadStatus, LeadPriority


router = APIRouter(prefix="/leads", tags=["Leads"])


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead: LeadCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new lead."""
    service = LeadService(db)
    return await service.create_lead(lead)


@router.get("", response_model=LeadPaginatedResponse)
async def get_leads(
    status: Optional[List[LeadStatus]] = Query(None),
    priority: Optional[List[LeadPriority]] = Query(None),
    source_id: Optional[int] = None,
    campaign_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    unassigned: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    insurance_type: Optional[str] = None,
    tags: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_db)
):
    """Get leads with filtering, pagination, and sorting."""
    service = LeadService(db)
    
    filters = LeadFilterParams(
        status=status,
        priority=priority,
        source_id=source_id,
        campaign_id=campaign_id,
        assignee_id=assignee_id,
        unassigned=unassigned,
        date_from=date_from,
        date_to=date_to,
        search=search,
        insurance_type=insurance_type,
        tags=tags
    )
    
    leads, total = await service.get_leads(
        filters=filters,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    # Convert to response format
    items = []
    for lead in leads:
        items.append(LeadResponse(
            id=lead.id,
            first_name=lead.first_name,
            last_name=lead.last_name,
            email=lead.email,
            phone=lead.phone,
            company=lead.company,
            job_title=lead.job_title,
            source_id=lead.source_id,
            campaign_id=lead.campaign_id,
            status=lead.status,
            priority=lead.priority,
            assignee_id=lead.assignee_id,
            notes=lead.notes,
            follow_up_date=lead.follow_up_date,
            value_estimate=lead.value_estimate,
            insurance_type=lead.insurance_type,
            address=lead.address,
            city=lead.city,
            state=lead.state,
            zip_code=lead.zip_code,
            country=lead.country,
            tags=lead.tags,
            created_by_id=lead.created_by_id,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
            source_name=lead.source.name if lead.source else None,
            campaign_name=lead.campaign.name if lead.campaign else None,
            assignee_name=f"{lead.assignee.first_name} {lead.assignee.last_name}" if lead.assignee else None,
            full_name=lead.full_name
        ))
    
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    return LeadPaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )


@router.get("/search", response_model=LeadPaginatedResponse)
async def search_leads(
    q: str = Query(..., min_length=1),
    status: Optional[List[LeadStatus]] = Query(None),
    priority: Optional[List[LeadPriority]] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Search leads by query."""
    service = LeadService(db)
    
    filters = LeadFilterParams(status=status, priority=priority)
    search_params = LeadSearchParams(
        query=q,
        filters=filters,
        page=page,
        page_size=page_size
    )
    
    leads, total = await service.search_leads(search_params)
    
    items = []
    for lead in leads:
        items.append(LeadResponse(
            id=lead.id,
            first_name=lead.first_name,
            last_name=lead.last_name,
            email=lead.email,
            phone=lead.phone,
            company=lead.company,
            job_title=lead.job_title,
            source_id=lead.source_id,
            campaign_id=lead.campaign_id,
            status=lead.status,
            priority=lead.priority,
            assignee_id=lead.assignee_id,
            notes=lead.notes,
            follow_up_date=lead.follow_up_date,
            value_estimate=lead.value_estimate,
            insurance_type=lead.insurance_type,
            address=lead.address,
            city=lead.city,
            state=lead.state,
            zip_code=lead.zip_code,
            country=lead.country,
            tags=lead.tags,
            created_by_id=lead.created_by_id,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
            source_name=lead.source.name if lead.source else None,
            campaign_name=lead.campaign.name if lead.campaign else None,
            assignee_name=f"{lead.assignee.first_name} {lead.assignee.last_name}" if lead.assignee else None,
            full_name=lead.full_name
        ))
    
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    return LeadPaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )


@router.get("/{lead_id}", response_model=LeadDetailResponse)
async def get_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    """Get lead by ID with full details."""
    service = LeadService(db)
    lead = await service.get_lead_by_id(lead_id)
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Prepare activities
    activities = []
    for activity in lead.activities or []:
        activities.append(ActivityResponse(
            id=activity.id,
            lead_id=activity.lead_id,
            user_id=activity.user_id,
            activity_type=activity.activity_type,
            description=activity.description,
            old_value=activity.old_value,
            new_value=activity.new_value,
            created_at=activity.created_at,
            user_name=f"{activity.user.first_name} {activity.user.last_name}" if activity.user else None
        ))
    
    # Prepare status history
    status_history = []
    for sh in lead.status_history or []:
        status_history.append(StatusHistoryResponse(
            id=sh.id,
            lead_id=sh.lead_id,
            old_status=sh.old_status,
            new_status=sh.new_status,
            changed_by_id=sh.changed_by_id,
            reason=sh.reason,
            created_at=sh.created_at,
            changed_by_name=f"{sh.changed_by.first_name} {sh.changed_by.last_name}" if sh.changed_by else None
        ))
    
    # Prepare assignment history
    assignment_history = []
    for ah in lead.assignments or []:
        assignment_history.append(AssignmentHistoryResponse(
            id=ah.id,
            lead_id=ah.lead_id,
            agent_id=ah.agent_id,
            assigned_by_id=ah.assigned_by_id,
            assignment_type=ah.assignment_type,
            reason=ah.reason,
            created_at=ah.created_at,
            agent_name=f"{ah.agent.first_name} {ah.agent.last_name}" if ah.agent else None,
            assigned_by_name=f"{ah.agent.first_name} {ah.agent.last_name}" if ah.assigned_by_id and ah.agent else None
        ))
    
    return LeadDetailResponse(
        id=lead.id,
        first_name=lead.first_name,
        last_name=lead.last_name,
        email=lead.email,
        phone=lead.phone,
        company=lead.company,
        job_title=lead.job_title,
        source_id=lead.source_id,
        campaign_id=lead.campaign_id,
        status=lead.status,
        priority=lead.priority,
        assignee_id=lead.assignee_id,
        notes=lead.notes,
        follow_up_date=lead.follow_up_date,
        value_estimate=lead.value_estimate,
        insurance_type=lead.insurance_type,
        address=lead.address,
        city=lead.city,
        state=lead.state,
        zip_code=lead.zip_code,
        country=lead.country,
        tags=lead.tags,
        created_by_id=lead.created_by_id,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        source_name=lead.source.name if lead.source else None,
        campaign_name=lead.campaign.name if lead.campaign else None,
        assignee_name=f"{lead.assignee.first_name} {lead.assignee.last_name}" if lead.assignee else None,
        full_name=lead.full_name,
        activities=activities,
        status_history=status_history,
        assignment_history=assignment_history
    )


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: int,
    lead: LeadUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a lead."""
    service = LeadService(db)
    updated_lead = await service.update_lead(lead_id, lead)
    
    if not updated_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return LeadResponse(
        id=updated_lead.id,
        first_name=updated_lead.first_name,
        last_name=updated_lead.last_name,
        email=updated_lead.email,
        phone=updated_lead.phone,
        company=updated_lead.company,
        job_title=updated_lead.job_title,
        source_id=updated_lead.source_id,
        campaign_id=updated_lead.campaign_id,
        status=updated_lead.status,
        priority=updated_lead.priority,
        assignee_id=updated_lead.assignee_id,
        notes=updated_lead.notes,
        follow_up_date=updated_lead.follow_up_date,
        value_estimate=updated_lead.value_estimate,
        insurance_type=updated_lead.insurance_type,
        address=updated_lead.address,
        city=updated_lead.city,
        state=updated_lead.state,
        zip_code=updated_lead.zip_code,
        country=updated_lead.country,
        tags=updated_lead.tags,
        created_by_id=updated_lead.created_by_id,
        created_at=updated_lead.created_at,
        updated_at=updated_lead.updated_at,
        source_name=updated_lead.source.name if updated_lead.source else None,
        campaign_name=updated_lead.campaign.name if updated_lead.campaign else None,
        assignee_name=f"{updated_lead.assignee.first_name} {updated_lead.assignee.last_name}" if updated_lead.assignee else None,
        full_name=updated_lead.full_name
    )


@router.delete("/{lead_id}", response_model=MessageResponse)
async def delete_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a lead."""
    service = LeadService(db)
    deleted = await service.delete_lead(lead_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return MessageResponse(message="Lead deleted successfully")


@router.put("/{lead_id}/assign", response_model=LeadResponse)
async def assign_lead(
    lead_id: int,
    assignment: LeadAssign,
    db: AsyncSession = Depends(get_db)
):
    """Assign a lead to an agent."""
    service = LeadService(db)
    updated_lead = await service.assign_lead(lead_id, assignment)
    
    if not updated_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return LeadResponse(
        id=updated_lead.id,
        first_name=updated_lead.first_name,
        last_name=updated_lead.last_name,
        email=updated_lead.email,
        phone=updated_lead.phone,
        company=updated_lead.company,
        job_title=updated_lead.job_title,
        source_id=updated_lead.source_id,
        campaign_id=updated_lead.campaign_id,
        status=updated_lead.status,
        priority=updated_lead.priority,
        assignee_id=updated_lead.assignee_id,
        notes=updated_lead.notes,
        follow_up_date=updated_lead.follow_up_date,
        value_estimate=updated_lead.value_estimate,
        insurance_type=updated_lead.insurance_type,
        address=updated_lead.address,
        city=updated_lead.city,
        state=updated_lead.state,
        zip_code=updated_lead.zip_code,
        country=updated_lead.country,
        tags=updated_lead.tags,
        created_by_id=updated_lead.created_by_id,
        created_at=updated_lead.created_at,
        updated_at=updated_lead.updated_at,
        source_name=updated_lead.source.name if updated_lead.source else None,
        campaign_name=updated_lead.campaign.name if updated_lead.campaign else None,
        assignee_name=f"{updated_lead.assignee.first_name} {updated_lead.assignee.last_name}" if updated_lead.assignee else None,
        full_name=updated_lead.full_name
    )


@router.put("/{lead_id}/status", response_model=LeadResponse)
async def update_lead_status(
    lead_id: int,
    status_update: LeadStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update lead status."""
    service = LeadService(db)
    updated_lead = await service.update_status(lead_id, status_update)
    
    if not updated_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return LeadResponse(
        id=updated_lead.id,
        first_name=updated_lead.first_name,
        last_name=updated_lead.last_name,
        email=updated_lead.email,
        phone=updated_lead.phone,
        company=updated_lead.company,
        job_title=updated_lead.job_title,
        source_id=updated_lead.source_id,
        campaign_id=updated_lead.campaign_id,
        status=updated_lead.status,
        priority=updated_lead.priority,
        assignee_id=updated_lead.assignee_id,
        notes=updated_lead.notes,
        follow_up_date=updated_lead.follow_up_date,
        value_estimate=updated_lead.value_estimate,
        insurance_type=updated_lead.insurance_type,
        address=updated_lead.address,
        city=updated_lead.city,
        state=updated_lead.state,
        zip_code=updated_lead.zip_code,
        country=updated_lead.country,
        tags=updated_lead.tags,
        created_by_id=updated_lead.created_by_id,
        created_at=updated_lead.created_at,
        updated_at=updated_lead.updated_at,
        source_name=updated_lead.source.name if updated_lead.source else None,
        campaign_name=updated_lead.campaign.name if updated_lead.campaign else None,
        assignee_name=f"{updated_lead.assignee.first_name} {updated_lead.assignee.last_name}" if updated_lead.assignee else None,
        full_name=updated_lead.full_name
    )


@router.post("/bulk/update", response_model=BulkOperationResponse)
async def bulk_update_leads(
    request: BulkUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Bulk update multiple leads."""
    service = LeadService(db)
    result = await service.bulk_update(request.lead_ids, request.updates)
    return BulkOperationResponse(**result)


@router.post("/bulk/assign", response_model=BulkOperationResponse)
async def bulk_assign_leads(
    request: BulkAssignRequest,
    db: AsyncSession = Depends(get_db)
):
    """Bulk assign multiple leads to an agent."""
    service = LeadService(db)
    result = await service.bulk_assign(
        request.lead_ids,
        request.assignee_id,
        request.reason
    )
    return BulkOperationResponse(**result)


@router.post("/bulk/status", response_model=BulkOperationResponse)
async def bulk_update_status(
    request: BulkStatusUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Bulk update status for multiple leads."""
    service = LeadService(db)
    result = await service.bulk_status_update(
        request.lead_ids,
        request.status,
        request.reason
    )
    return BulkOperationResponse(**result)


@router.post("/bulk/delete", response_model=BulkOperationResponse)
async def bulk_delete_leads(
    request: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db)
):
    """Bulk delete multiple leads."""
    service = LeadService(db)
    result = await service.bulk_delete(request.lead_ids)
    return BulkOperationResponse(**result)


@router.post("/export")
async def export_leads(
    request: ExportRequest,
    db: AsyncSession = Depends(get_db)
):
    """Export leads to CSV or JSON format."""
    service = LeadService(db)
    format_type, data = await service.export_leads(request.filters, request.format)
    
    if format_type == "json":
        return {"data": data}
    
    # Return CSV as plain text
    return {"data": data}


@router.get("/stats")
async def get_lead_stats(db: AsyncSession = Depends(get_db)):
    """Get lead statistics."""
    service = LeadService(db)
    return await service.get_lead_stats()
