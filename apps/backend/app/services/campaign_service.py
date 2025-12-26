from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Campaign, LeadSource
from app.schemas import CampaignCreate, CampaignUpdate, CampaignStatus


class CampaignService:
    """Service for campaign management operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_campaign(self, campaign_data: CampaignCreate) -> Campaign:
        """Create a new campaign."""
        campaign = Campaign(
            name=campaign_data.name,
            description=campaign_data.description,
            source_id=campaign_data.source_id,
            team_id=campaign_data.team_id,
            start_date=campaign_data.start_date,
            end_date=campaign_data.end_date,
            budget=campaign_data.budget,
            status=campaign_data.status.value if isinstance(campaign_data.status, CampaignStatus) else campaign_data.status
        )
        self.db.add(campaign)
        await self.db.commit()
        await self.db.refresh(campaign)
        return campaign
    
    async def get_campaign_by_id(self, campaign_id: int) -> Optional[Campaign]:
        """Get campaign by ID."""
        result = await self.db.execute(
            select(Campaign)
            .options(
                selectinload(Campaign.source),
                selectinload(Campaign.team),
                selectinload(Campaign.leads)
            )
            .where(Campaign.id == campaign_id)
        )
        return result.scalar_one_or_none()
    
    async def get_campaigns(
        self,
        active_only: bool = True,
        source_id: Optional[int] = None,
        team_id: Optional[int] = None
    ) -> List[Campaign]:
        """Get all campaigns with optional filters."""
        query = select(Campaign).options(
            selectinload(Campaign.source),
            selectinload(Campaign.team)
        )
        
        if active_only:
            query = query.where(Campaign.is_active == True)
        
        if source_id:
            query = query.where(Campaign.source_id == source_id)
        
        if team_id:
            query = query.where(Campaign.team_id == team_id)
        
        query = query.order_by(Campaign.created_at.desc())
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_campaign(self, campaign_id: int, campaign_data: CampaignUpdate) -> Optional[Campaign]:
        """Update a campaign."""
        campaign = await self.get_campaign_by_id(campaign_id)
        if not campaign:
            return None
        
        update_data = campaign_data.model_dump(exclude_unset=True)
        
        # Handle enum conversion for status
        if 'status' in update_data and update_data['status']:
            status = update_data['status']
            if isinstance(status, CampaignStatus):
                update_data['status'] = status.value
        
        for field, value in update_data.items():
            setattr(campaign, field, value)
        
        await self.db.commit()
        await self.db.refresh(campaign)
        return campaign
    
    async def delete_campaign(self, campaign_id: int) -> bool:
        """Delete a campaign (soft delete by setting is_active=False)."""
        campaign = await self.get_campaign_by_id(campaign_id)
        if not campaign:
            return False
        
        campaign.is_active = False
        await self.db.commit()
        return True
    
    async def get_campaign_performance(self, campaign_id: int) -> dict:
        """Get campaign performance metrics."""
        campaign = await self.get_campaign_by_id(campaign_id)
        if not campaign:
            return None
        
        total_leads = len(campaign.leads) if campaign.leads else 0
        
        # Calculate status breakdown
        status_counts = {}
        for lead in campaign.leads or []:
            status_value = lead.status.value if lead.status else "unknown"
            status_counts[status_value] = status_counts.get(status_value, 0) + 1
        
        # Calculate total value
        total_value = sum(lead.value_estimate for lead in (campaign.leads or []))
        
        return {
            "campaign_id": campaign.id,
            "campaign_name": campaign.name,
            "total_leads": total_leads,
            "by_status": status_counts,
            "total_value": total_value,
            "budget": campaign.budget,
            "budget_remaining": campaign.budget - total_value if campaign.budget else None
        }
