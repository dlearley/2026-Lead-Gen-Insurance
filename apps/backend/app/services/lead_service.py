import json
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Lead, LeadSource, Campaign, LeadActivity, LeadAssignment, LeadStatusHistory,
    User, Team, LeadStatus, LeadPriority, ActivityType
)
from app.schemas import (
    LeadCreate, LeadUpdate, LeadAssign, LeadStatusUpdate,
    LeadFilterParams, LeadSearchParams, ExportFormat,
    ActivityTypeEnum
)


class LeadService:
    """Service for lead management operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_lead(self, lead_data: LeadCreate, created_by_id: Optional[int] = None) -> Lead:
        """Create a new lead."""
        lead = Lead(
            first_name=lead_data.first_name,
            last_name=lead_data.last_name,
            email=lead_data.email,
            phone=lead_data.phone,
            company=lead_data.company,
            job_title=lead_data.job_title,
            source_id=lead_data.source_id,
            campaign_id=lead_data.campaign_id,
            status=lead_data.status,
            priority=lead_data.priority,
            assignee_id=lead_data.assignee_id,
            notes=lead_data.notes,
            follow_up_date=lead_data.follow_up_date,
            value_estimate=lead_data.value_estimate,
            insurance_type=lead_data.insurance_type,
            address=lead_data.address,
            city=lead_data.city,
            state=lead_data.state,
            zip_code=lead_data.zip_code,
            country=lead_data.country,
            tags=lead_data.tags,
            created_by_id=created_by_id
        )
        
        self.db.add(lead)
        await self.db.flush()
        
        # Log activity
        await self._log_activity(
            lead_id=lead.id,
            user_id=created_by_id,
            activity_type=ActivityTypeEnum.CREATED,
            description=f"Lead created: {lead.full_name}"
        )
        
        await self.db.commit()
        await self.db.refresh(lead)
        return lead
    
    async def get_lead_by_id(self, lead_id: int) -> Optional[Lead]:
        """Get lead by ID with all relationships."""
        result = await self.db.execute(
            select(Lead)
            .options(
                selectinload(Lead.source),
                selectinload(Lead.campaign),
                selectinload(Lead.assignee),
                selectinload(Lead.creator),
                selectinload(Lead.activities).selectinload(LeadActivity.user),
                selectinload(Lead.status_history),
                selectinload(Lead.assignments).selectinload(User)
            )
            .where(Lead.id == lead_id)
        )
        return result.scalar_one_or_none()
    
    async def get_leads(
        self,
        filters: Optional[LeadFilterParams] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> tuple[List[Lead], int]:
        """Get leads with filtering, pagination, and sorting."""
        # Build base query
        query = select(Lead).options(
            selectinload(Lead.source),
            selectinload(Lead.campaign),
            selectinload(Lead.assignee)
        )
        
        # Apply filters
        if filters:
            query = self._apply_filters(query, filters)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()
        
        # Apply sorting
        sort_column = getattr(Lead, sort_by, Lead.created_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Apply pagination
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        # Execute query
        result = await self.db.execute(query)
        leads = result.scalars().all()
        
        return leads, total
    
    def _apply_filters(self, query, filters: LeadFilterParams):
        """Apply filter conditions to query."""
        conditions = []
        
        if filters.status:
            conditions.append(Lead.status.in_(filters.status))
        
        if filters.priority:
            conditions.append(Lead.priority.in_(filters.priority))
        
        if filters.source_id:
            conditions.append(Lead.source_id == filters.source_id)
        
        if filters.campaign_id:
            conditions.append(Lead.campaign_id == filters.campaign_id)
        
        if filters.assignee_id:
            conditions.append(Lead.assignee_id == filters.assignee_id)
        
        if filters.unassigned is True:
            conditions.append(Lead.assignee_id.is_(None))
        
        if filters.date_from:
            conditions.append(Lead.created_at >= filters.date_from)
        
        if filters.date_to:
            conditions.append(Lead.created_at <= filters.date_to)
        
        if filters.search:
            search_term = f"%{filters.search}%"
            conditions.append(
                or_(
                    Lead.first_name.ilike(search_term),
                    Lead.last_name.ilike(search_term),
                    Lead.email.ilike(search_term),
                    Lead.phone.ilike(search_term),
                    Lead.company.ilike(search_term)
                )
            )
        
        if filters.insurance_type:
            conditions.append(Lead.insurance_type == filters.insurance_type)
        
        if filters.tags:
            conditions.append(Lead.tags.ilike(f"%{filters.tags}%"))
        
        if conditions:
            query = query.where(and_(*conditions))
        
        return query
    
    async def update_lead(self, lead_id: int, lead_data: LeadUpdate, user_id: Optional[int] = None) -> Optional[Lead]:
        """Update a lead."""
        lead = await self.get_lead_by_id(lead_id)
        if not lead:
            return None
        
        update_data = lead_data.model_dump(exclude_unset=True)
        
        # Track changes for activity log
        changes = []
        for field, new_value in update_data.items():
            old_value = getattr(lead, field)
            if old_value != new_value:
                changes.append(f"{field}: {old_value} -> {new_value}")
                setattr(lead, field, new_value)
        
        # Log activity if there were changes
        if changes:
            await self._log_activity(
                lead_id=lead.id,
                user_id=user_id,
                activity_type=ActivityTypeEnum.UPDATED,
                description=f"Lead updated: {', '.join(changes)}"
            )
        
        await self.db.commit()
        await self.db.refresh(lead)
        return lead
    
    async def delete_lead(self, lead_id: int, user_id: Optional[int] = None) -> bool:
        """Delete a lead."""
        lead = await self.get_lead_by_id(lead_id)
        if not lead:
            return False
        
        lead_email = lead.email
        
        # Log activity before deletion
        await self._log_activity(
            lead_id=lead.id,
            user_id=user_id,
            activity_type=ActivityTypeEnum.DELETED,
            description=f"Lead deleted: {lead.full_name} ({lead_email})"
        )
        
        await self.db.delete(lead)
        await self.db.commit()
        return True
    
    async def assign_lead(self, lead_id: int, assignment: LeadAssign, user_id: Optional[int] = None) -> Optional[Lead]:
        """Assign a lead to an agent."""
        lead = await self.get_lead_by_id(lead_id)
        if not lead:
            return None
        
        old_assignee_id = lead.assignee_id
        lead.assignee_id = assignment.reason
        
        # Create assignment history
        assignment_record = LeadAssignment(
            lead_id=lead_id,
            agent_id=assignment.assignee_id,
            assigned_by_id=user_id,
            assignment_type="manual",
            reason=assignment.reason
        )
        self.db.add(assignment_record)
        
        # Log activity
        await self._log_activity(
            lead_id=lead.id,
            user_id=user_id,
            activity_type=ActivityTypeEnum.ASSIGNED,
            description=f"Lead assigned to agent {assignment.assignee_id}",
            old_value=str(old_assignee_id),
            new_value=str(assignment.assignee_id)
        )
        
        await self.db.commit()
        await self.db.refresh(lead)
        return lead
    
    async def update_status(
        self, 
        lead_id: int, 
        status_update: LeadStatusUpdate, 
        user_id: Optional[int] = None
    ) -> Optional[Lead]:
        """Update lead status with history tracking."""
        lead = await self.get_lead_by_id(lead_id)
        if not lead:
            return None
        
        old_status = lead.status.value if lead.status else None
        lead.status = status_update.status
        
        # Create status history
        status_history = LeadStatusHistory(
            lead_id=lead_id,
            old_status=old_status,
            new_status=status_update.status.value,
            changed_by_id=user_id,
            reason=status_update.reason
        )
        self.db.add(status_history)
        
        # Log activity
        await self._log_activity(
            lead_id=lead.id,
            user_id=user_id,
            activity_type=ActivityTypeEnum.STATUS_CHANGED,
            description=f"Status changed from {old_status} to {status_update.status.value}",
            old_value=old_status,
            new_value=status_update.status.value
        )
        
        await self.db.commit()
        await self.db.refresh(lead)
        return lead
    
    async def search_leads(self, search_params: LeadSearchParams) -> tuple[List[Lead], int]:
        """Search leads with query and filters."""
        filters = search_params.filters or LeadFilterParams()
        filters.search = search_params.query
        
        return await self.get_leads(
            filters=filters,
            page=search_params.page,
            page_size=search_params.page_size
        )
    
    async def bulk_update(
        self, 
        lead_ids: List[int], 
        updates: LeadUpdate, 
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Bulk update leads."""
        success = []
        failed = []
        
        update_data = updates.model_dump(exclude_unset=True)
        
        for lead_id in lead_ids:
            try:
                lead = await self.get_lead_by_id(lead_id)
                if lead:
                    for field, value in update_data.items():
                        setattr(lead, field, value)
                    
                    await self._log_activity(
                        lead_id=lead.id,
                        user_id=user_id,
                        activity_type=ActivityTypeEnum.BULK_UPDATED,
                        description=f"Bulk update: {', '.join(update_data.keys())}"
                    )
                    
                    success.append(lead_id)
                else:
                    failed.append({"id": lead_id, "error": "Lead not found"})
            except Exception as e:
                failed.append({"id": lead_id, "error": str(e)})
        
        await self.db.commit()
        
        return {
            "success": success,
            "failed": failed,
            "message": f"Updated {len(success)} leads, {len(failed)} failed"
        }
    
    async def bulk_assign(
        self, 
        lead_ids: List[int], 
        assignee_id: int, 
        reason: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Bulk assign leads to an agent."""
        success = []
        failed = []
        
        for lead_id in lead_ids:
            try:
                lead = await self.get_lead_by_id(lead_id)
                if lead:
                    old_assignee_id = lead.assignee_id
                    lead.assignee_id = assignee_id
                    
                    # Create assignment history
                    assignment_record = LeadAssignment(
                        lead_id=lead_id,
                        agent_id=assignee_id,
                        assigned_by_id=user_id,
                        assignment_type="bulk",
                        reason=reason
                    )
                    self.db.add(assignment_record)
                    
                    await self._log_activity(
                        lead_id=lead.id,
                        user_id=user_id,
                        activity_type=ActivityTypeEnum.REASSIGNED,
                        description=f"Bulk assignment to agent {assignee_id}",
                        old_value=str(old_assignee_id),
                        new_value=str(assignee_id)
                    )
                    
                    success.append(lead_id)
                else:
                    failed.append({"id": lead_id, "error": "Lead not found"})
            except Exception as e:
                failed.append({"id": lead_id, "error": str(e)})
        
        await self.db.commit()
        
        return {
            "success": success,
            "failed": failed,
            "message": f"Assigned {len(success)} leads, {len(failed)} failed"
        }
    
    async def bulk_status_update(
        self, 
        lead_ids: List[int], 
        status: LeadStatus, 
        reason: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Bulk update lead status."""
        success = []
        failed = []
        
        for lead_id in lead_ids:
            try:
                lead = await self.get_lead_by_id(lead_id)
                if lead:
                    old_status = lead.status.value if lead.status else None
                    lead.status = status
                    
                    # Create status history
                    status_history = LeadStatusHistory(
                        lead_id=lead_id,
                        old_status=old_status,
                        new_status=status.value,
                        changed_by_id=user_id,
                        reason=reason
                    )
                    self.db.add(status_history)
                    
                    await self._log_activity(
                        lead_id=lead.id,
                        user_id=user_id,
                        activity_type=ActivityTypeEnum.STATUS_CHANGED,
                        description=f"Bulk status change to {status.value}",
                        old_value=old_status,
                        new_value=status.value
                    )
                    
                    success.append(lead_id)
                else:
                    failed.append({"id": lead_id, "error": "Lead not found"})
            except Exception as e:
                failed.append({"id": lead_id, "error": str(e)})
        
        await self.db.commit()
        
        return {
            "success": success,
            "failed": failed,
            "message": f"Updated status for {len(success)} leads, {len(failed)} failed"
        }
    
    async def bulk_delete(
        self, 
        lead_ids: List[int], 
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Bulk delete leads."""
        success = []
        failed = []
        
        for lead_id in lead_ids:
            try:
                deleted = await self.delete_lead(lead_id, user_id)
                if deleted:
                    success.append(lead_id)
                else:
                    failed.append({"id": lead_id, "error": "Lead not found"})
            except Exception as e:
                failed.append({"id": lead_id, "error": str(e)})
        
        return {
            "success": success,
            "failed": failed,
            "message": f"Deleted {len(success)} leads, {len(failed)} failed"
        }
    
    async def export_leads(
        self, 
        filters: Optional[LeadFilterParams] = None,
        format: ExportFormat = ExportFormat.CSV
    ) -> tuple[str, List[Dict[str, Any]]]:
        """Export leads to CSV or JSON format."""
        leads, _ = await self.get_leads(filters=filters, page=1, page_size=10000)
        
        data = []
        for lead in leads:
            lead_dict = {
                "id": lead.id,
                "first_name": lead.first_name,
                "last_name": lead.last_name,
                "email": lead.email,
                "phone": lead.phone,
                "company": lead.company,
                "job_title": lead.job_title,
                "status": lead.status.value if lead.status else None,
                "priority": lead.priority.value if lead.priority else None,
                "source": lead.source.name if lead.source else None,
                "campaign": lead.campaign.name if lead.campaign else None,
                "assignee": f"{lead.assignee.first_name} {lead.assignee.last_name}" if lead.assignee else None,
                "insurance_type": lead.insurance_type,
                "value_estimate": lead.value_estimate,
                "notes": lead.notes,
                "follow_up_date": str(lead.follow_up_date) if lead.follow_up_date else None,
                "city": lead.city,
                "state": lead.state,
                "zip_code": lead.zip_code,
                "tags": lead.tags,
                "created_at": lead.created_at.isoformat() if lead.created_at else None,
                "updated_at": lead.updated_at.isoformat() if lead.updated_at else None
            }
            data.append(lead_dict)
        
        if format == ExportFormat.JSON:
            return "json", data
        
        # Convert to CSV
        if data:
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
            csv_content = output.getvalue()
            return "csv", csv_content
        
        return "csv", []
    
    async def get_lead_stats(self) -> Dict[str, Any]:
        """Get lead statistics."""
        # Total leads
        total_result = await self.db.execute(select(func.count()).select_from(Lead))
        total = total_result.scalar()
        
        # Status counts
        status_counts = {}
        for status in LeadStatus:
            result = await self.db.execute(
                select(func.count()).where(Lead.status == status)
            )
            status_counts[status.value] = result.scalar()
        
        # Priority counts
        priority_counts = {}
        for priority in LeadPriority:
            result = await self.db.execute(
                select(func.count()).where(Lead.priority == priority)
            )
            priority_counts[priority.value] = result.scalar()
        
        # Unassigned leads
        unassigned_result = await self.db.execute(
            select(func.count()).where(Lead.assignee_id.is_(None))
        )
        unassigned = unassigned_result.scalar()
        
        # Source counts
        source_counts = {}
        result = await self.db.execute(
            select(LeadSource.name, func.count())
            .outerjoin(Lead, Lead.source_id == LeadSource.id)
            .group_by(LeadSource.id)
        )
        for source_name, count in result.all():
            source_counts[source_name] = count
        
        return {
            "total": total,
            "by_status": status_counts,
            "by_priority": priority_counts,
            "unassigned": unassigned,
            "by_source": source_counts
        }
    
    async def _log_activity(
        self,
        lead_id: int,
        user_id: Optional[int],
        activity_type: ActivityTypeEnum,
        description: str,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a lead activity."""
        activity = LeadActivity(
            lead_id=lead_id,
            user_id=user_id,
            activity_type=activity_type,
            description=description,
            old_value=old_value,
            new_value=new_value,
            metadata=json.dumps(metadata) if metadata else None
        )
        self.db.add(activity)
