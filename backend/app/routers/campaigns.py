from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    CampaignCreate, CampaignUpdate, CampaignResponse, CampaignStatus
)
from app.services import CampaignService


router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign: CampaignCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new campaign."""
    service = CampaignService(db)
    return await service.create_campaign(campaign)


@router.get("", response_model=List[CampaignResponse])
async def get_campaigns(
    active_only: bool = Query(True),
    source_id: Optional[int] = None,
    team_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all campaigns with optional filters."""
    service = CampaignService(db)
    campaigns = await service.get_campaigns(active_only, source_id, team_id)
    
    results = []
    for campaign in campaigns:
        results.append(CampaignResponse(
            id=campaign.id,
            name=campaign.name,
            description=campaign.description,
            source_id=campaign.source_id,
            team_id=campaign.team_id,
            start_date=campaign.start_date,
            end_date=campaign.end_date,
            budget=campaign.budget,
            status=campaign.status,
            is_active=campaign.is_active,
            created_at=campaign.created_at,
            updated_at=campaign.updated_at,
            source_name=campaign.source.name if campaign.source else None,
            team_name=campaign.team.name if campaign.team else None,
            lead_count=len(campaign.leads) if campaign.leads else 0
        ))
    
    return results


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get campaign by ID."""
    service = CampaignService(db)
    campaign = await service.get_campaign_by_id(campaign_id)
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        description=campaign.description,
        source_id=campaign.source_id,
        team_id=campaign.team_id,
        start_date=campaign.start_date,
        end_date=campaign.end_date,
        budget=campaign.budget,
        status=campaign.status,
        is_active=campaign.is_active,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        source_name=campaign.source.name if campaign.source else None,
        team_name=campaign.team.name if campaign.team else None,
        lead_count=len(campaign.leads) if campaign.leads else 0
    )


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int,
    campaign: CampaignUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a campaign."""
    service = CampaignService(db)
    updated_campaign = await service.update_campaign(campaign_id, campaign)
    
    if not updated_campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return CampaignResponse(
        id=updated_campaign.id,
        name=updated_campaign.name,
        description=updated_campaign.description,
        source_id=updated_campaign.source_id,
        team_id=updated_campaign.team_id,
        start_date=updated_campaign.start_date,
        end_date=updated_campaign.end_date,
        budget=updated_campaign.budget,
        status=updated_campaign.status,
        is_active=updated_campaign.is_active,
        created_at=updated_campaign.created_at,
        updated_at=updated_campaign.updated_at,
        source_name=updated_campaign.source.name if updated_campaign.source else None,
        team_name=updated_campaign.team.name if updated_campaign.team else None,
        lead_count=len(updated_campaign.leads) if updated_campaign.leads else 0
    )


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a campaign (soft delete)."""
    service = CampaignService(db)
    deleted = await service.delete_campaign(campaign_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Campaign not found")


@router.get("/{campaign_id}/performance")
async def get_campaign_performance(
    campaign_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get campaign performance metrics."""
    service = CampaignService(db)
    performance = await service.get_campaign_performance(campaign_id)
    
    if not performance:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return performance
