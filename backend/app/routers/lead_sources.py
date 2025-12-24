from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    LeadSourceCreate, LeadSourceUpdate, LeadSourceResponse
)
from app.services import LeadSourceService


router = APIRouter(prefix="/lead-sources", tags=["Lead Sources"])


@router.post("", response_model=LeadSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_source(
    source: LeadSourceCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new lead source."""
    service = LeadSourceService(db)
    return await service.create_source(source)


@router.get("", response_model=List[LeadSourceResponse])
async def get_sources(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    """Get all lead sources."""
    service = LeadSourceService(db)
    sources = await service.get_all_sources(active_only)
    
    # Get lead counts for each source
    results = []
    for source in sources:
        result = await service.get_source_with_count(source.id)
        results.append(LeadSourceResponse(
            id=result["id"],
            name=result["name"],
            type=result["type"],
            description=result["description"],
            is_active=result["is_active"],
            created_at=result["created_at"],
            updated_at=result["updated_at"],
            lead_count=result["lead_count"]
        ))
    
    return results


@router.get("/{source_id}", response_model=LeadSourceResponse)
async def get_source(
    source_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get lead source by ID."""
    service = LeadSourceService(db)
    result = await service.get_source_with_count(source_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Lead source not found")
    
    return LeadSourceResponse(
        id=result["id"],
        name=result["name"],
        type=result["type"],
        description=result["description"],
        is_active=result["is_active"],
        created_at=result["created_at"],
        updated_at=result["updated_at"],
        lead_count=result["lead_count"]
    )


@router.put("/{source_id}", response_model=LeadSourceResponse)
async def update_source(
    source_id: int,
    source: LeadSourceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a lead source."""
    service = LeadSourceService(db)
    updated_source = await service.update_source(source_id, source)
    
    if not updated_source:
        raise HTTPException(status_code=404, detail="Lead source not found")
    
    result = await service.get_source_with_count(updated_source.id)
    
    return LeadSourceResponse(
        id=result["id"],
        name=result["name"],
        type=result["type"],
        description=result["description"],
        is_active=result["is_active"],
        created_at=result["created_at"],
        updated_at=result["updated_at"],
        lead_count=result["lead_count"]
    )


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(
    source_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a lead source (soft delete)."""
    service = LeadSourceService(db)
    deleted = await service.delete_source(source_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Lead source not found")
