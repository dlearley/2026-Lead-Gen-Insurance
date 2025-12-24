from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadUpdate
from app.core.logging import get_logger

logger = get_logger(__name__)


class LeadService:
    @staticmethod
    async def create_lead(db: AsyncSession, lead_data: LeadCreate) -> Lead:
        lead = Lead(**lead_data.model_dump())
        db.add(lead)
        await db.flush()
        await db.refresh(lead)
        logger.info(f"Created lead with ID: {lead.id}")
        return lead

    @staticmethod
    async def get_lead(db: AsyncSession, lead_id: int) -> Optional[Lead]:
        result = await db.execute(
            select(Lead).where(Lead.id == lead_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_leads(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        organization_id: Optional[int] = None,
        status: Optional[str] = None
    ) -> tuple[List[Lead], int]:
        query = select(Lead)
        
        if organization_id:
            query = query.where(Lead.organization_id == organization_id)
        
        if status:
            query = query.where(Lead.status == status)
        
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()
        
        query = query.offset(skip).limit(limit).order_by(Lead.created_at.desc())
        result = await db.execute(query)
        leads = list(result.scalars().all())
        
        return leads, total

    @staticmethod
    async def update_lead(
        db: AsyncSession,
        lead_id: int,
        lead_data: LeadUpdate
    ) -> Optional[Lead]:
        lead = await LeadService.get_lead(db, lead_id)
        if not lead:
            return None
        
        update_data = lead_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(lead, field, value)
        
        await db.flush()
        await db.refresh(lead)
        logger.info(f"Updated lead with ID: {lead.id}")
        return lead

    @staticmethod
    async def delete_lead(db: AsyncSession, lead_id: int) -> bool:
        lead = await LeadService.get_lead(db, lead_id)
        if not lead:
            return False
        
        await db.delete(lead)
        await db.flush()
        logger.info(f"Deleted lead with ID: {lead_id}")
        return True
