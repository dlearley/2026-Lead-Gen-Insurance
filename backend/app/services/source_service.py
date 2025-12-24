from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import LeadSource, LeadSourceType
from app.schemas import LeadSourceCreate, LeadSourceUpdate


class LeadSourceService:
    """Service for lead source management operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_source(self, source_data: LeadSourceCreate) -> LeadSource:
        """Create a new lead source."""
        source = LeadSource(
            name=source_data.name,
            type=source_data.type,
            description=source_data.description
        )
        self.db.add(source)
        await self.db.commit()
        await self.db.refresh(source)
        return source
    
    async def get_source_by_id(self, source_id: int) -> Optional[LeadSource]:
        """Get lead source by ID."""
        result = await self.db.execute(
            select(LeadSource)
            .options(selectinload(LeadSource.leads))
            .where(LeadSource.id == source_id)
        )
        return result.scalar_one_or_none()
    
    async def get_all_sources(self, active_only: bool = True) -> List[LeadSource]:
        """Get all lead sources."""
        query = select(LeadSource)
        if active_only:
            query = query.where(LeadSource.is_active == True)
        query = query.order_by(LeadSource.name)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_source(self, source_id: int, source_data: LeadSourceUpdate) -> Optional[LeadSource]:
        """Update a lead source."""
        source = await self.get_source_by_id(source_id)
        if not source:
            return None
        
        update_data = source_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(source, field, value)
        
        await self.db.commit()
        await self.db.refresh(source)
        return source
    
    async def delete_source(self, source_id: int) -> bool:
        """Delete a lead source (soft delete by setting is_active=False)."""
        source = await self.get_source_by_id(source_id)
        if not source:
            return False
        
        source.is_active = False
        await self.db.commit()
        return True
    
    async def get_source_with_count(self, source_id: int) -> Optional[dict]:
        """Get lead source with lead count."""
        source = await self.get_source_by_id(source_id)
        if not source:
            return None
        
        result = await self.db.execute(
            select(func.count()).select_from(LeadSource.leads.property.entity)
            .where(LeadSource.id == source_id)
        )
        lead_count = result.scalar()
        
        return {
            **source.__dict__,
            "lead_count": lead_count
        }
