from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_, or_, cast, String, Float, DateTime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime
import json

from app.models import Segment, SegmentRule, LeadSegment, Lead
from app.schemas import SegmentCreate, SegmentUpdate, SegmentRuleCreate, SegmentRuleUpdate
from app.core.logging import get_logger

logger = get_logger(__name__)


class SegmentationService:
    """Service for lead segmentation and targeting operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_segment(self, segment_data: SegmentCreate, organization_id: int) -> Segment:
        """Create a new segment with rules."""
        segment = Segment(
            name=segment_data.name,
            description=segment_data.description,
            slug=segment_data.slug,
            is_active=segment_data.is_active,
            is_dynamic=segment_data.is_dynamic,
            match_all_rules=segment_data.match_all_rules,
            organization_id=organization_id
        )
        
        # Create rules
        rules = []
        for rule_data in segment_data.rules:
            rule = SegmentRule(
                field=rule_data.field,
                operator=rule_data.operator,
                value=rule_data.value,
                is_active=rule_data.is_active,
                rule_order=rule_data.rule_order
            )
            rules.append(rule)
        
        segment.rules = rules
        self.db.add(segment)
        await self.db.commit()
        await self.db.refresh(segment)
        
        return segment

    async def get_segment_by_id(self, segment_id: int) -> Optional[Segment]:
        """Get segment by ID with rules."""
        result = await self.db.execute(
            select(Segment)
            .options(
                selectinload(Segment.rules),
                selectinload(Segment.leads)
            )
            .where(Segment.id == segment_id)
        )
        return result.scalar_one_or_none()

    async def get_segments(
        self,
        organization_id: int,
        active_only: bool = True,
        is_dynamic: Optional[bool] = None
    ) -> List[Segment]:
        """Get all segments for an organization with optional filters."""
        query = select(Segment).options(
            selectinload(Segment.rules)
        ).where(Segment.organization_id == organization_id)
        
        if active_only:
            query = query.where(Segment.is_active == True)
        
        if is_dynamic is not None:
            query = query.where(Segment.is_dynamic == is_dynamic)
        
        query = query.order_by(Segment.created_at.desc())
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_segment(self, segment_id: int, segment_data: SegmentUpdate) -> Optional[Segment]:
        """Update a segment."""
        segment = await self.get_segment_by_id(segment_id)
        if not segment:
            return None
        
        update_data = segment_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "rules" and value is not None:
                # Handle rules update separately
                continue
            setattr(segment, field, value)
        
        # Handle rules update
        if segment_data.rules is not None:
            await self._update_segment_rules(segment, segment_data.rules)
        
        await self.db.commit()
        await self.db.refresh(segment)
        return segment

    async def _update_segment_rules(self, segment: Segment, rules_data: List[SegmentRuleUpdate]):
        """Update segment rules."""
        # Remove old rules
        for rule in segment.rules[:]:
            await self.db.delete(rule)
        
        # Add new rules
        new_rules = []
        for rule_data in rules_data:
            rule = SegmentRule(
                segment_id=segment.id,
                field=rule_data.field or segment.rules[0].field if segment.rules else "status",
                operator=rule_data.operator or segment.rules[0].operator if segment.rules else "equals",
                value=rule_data.value or segment.rules[0].value if segment.rules else "new",
                is_active=rule_data.is_active if rule_data.is_active is not None else True,
                rule_order=rule_data.rule_order if rule_data.rule_order is not None else 0
            )
            new_rules.append(rule)
        
        segment.rules = new_rules

    async def delete_segment(self, segment_id: int) -> bool:
        """Delete a segment (soft delete by setting is_active=False)."""
        segment = await self.get_segment_by_id(segment_id)
        if not segment:
            return False
        
        segment.is_active = False
        await self.db.commit()
        return True

    async def evaluate_segment(self, segment_id: int, lead_ids: Optional[List[int]] = None) -> Dict[str, Any]:
        """Evaluate which leads match a segment's rules."""
        segment = await self.get_segment_by_id(segment_id)
        if not segment:
            return {"error": "Segment not found"}
        
        start_time = datetime.now()
        
        # Build query based on segment rules
        query = select(Lead.id)
        
        if segment.rules:
            conditions = []
            for rule in segment.rules:
                if not rule.is_active:
                    continue
                
                field_conditions = self._build_rule_condition(rule)
                if field_conditions:
                    conditions.append(field_conditions)
            
            if conditions:
                if segment.match_all_rules:
                    query = query.where(and_(*conditions))
                else:
                    query = query.where(or_(*conditions))
        
        # Filter by specific lead IDs if provided
        if lead_ids:
            query = query.where(Lead.id.in_(lead_ids))
        
        # Filter by organization
        query = query.where(Lead.organization_id == segment.organization_id)
        
        result = await self.db.execute(query)
        matching_lead_ids = [row[0] for row in result.all()]
        
        end_time = datetime.now()
        evaluation_time = (end_time - start_time).total_seconds()
        
        return {
            "segment_id": segment.id,
            "segment_name": segment.name,
            "matching_leads": matching_lead_ids,
            "total_matching": len(matching_lead_ids),
            "evaluation_time": evaluation_time
        }

    def _build_rule_condition(self, rule: SegmentRule):
        """Build SQLAlchemy condition for a segment rule."""
        field = rule.field
        operator = rule.operator
        value = rule.value
        
        try:
            if field == "status":
                return self._build_status_condition(operator, value)
            elif field == "priority":
                return self._build_priority_condition(operator, value)
            elif field == "source":
                return self._build_source_condition(operator, value)
            elif field == "insurance_type":
                return self._build_insurance_type_condition(operator, value)
            elif field == "state":
                return self._build_state_condition(operator, value)
            elif field == "city":
                return self._build_city_condition(operator, value)
            elif field == "value_estimate":
                return self._build_value_estimate_condition(operator, value)
            elif field == "created_at":
                return self._build_created_at_condition(operator, value)
            elif field == "updated_at":
                return self._build_updated_at_condition(operator, value)
            elif field == "tags":
                return self._build_tags_condition(operator, value)
            else:
                return None
        except Exception as e:
            logger.error(f"Error building condition for rule {rule.id}: {str(e)}")
            return None

    def _build_status_condition(self, operator: str, value: str):
        """Build condition for status field."""
        if operator == "equals":
            return Lead.status == value
        elif operator == "not_equals":
            return Lead.status != value
        elif operator == "in":
            values = value.split(",")
            return Lead.status.in_(values)
        elif operator == "not_in":
            values = value.split(",")
            return ~Lead.status.in_(values)
        else:
            return None

    def _build_priority_condition(self, operator: str, value: str):
        """Build condition for priority field."""
        if operator == "equals":
            return Lead.priority == value
        elif operator == "not_equals":
            return Lead.priority != value
        elif operator == "in":
            values = value.split(",")
            return Lead.priority.in_(values)
        elif operator == "not_in":
            values = value.split(",")
            return ~Lead.priority.in_(values)
        else:
            return None

    def _build_source_condition(self, operator: str, value: str):
        """Build condition for source field."""
        if operator == "equals":
            return Lead.source_id == int(value)
        elif operator == "not_equals":
            return Lead.source_id != int(value)
        elif operator == "in":
            values = [int(v.strip()) for v in value.split(",")]
            return Lead.source_id.in_(values)
        elif operator == "not_in":
            values = [int(v.strip()) for v in value.split(",")]
            return ~Lead.source_id.in_(values)
        else:
            return None

    def _build_insurance_type_condition(self, operator: str, value: str):
        """Build condition for insurance_type field."""
        if operator == "equals":
            return Lead.insurance_type == value
        elif operator == "not_equals":
            return Lead.insurance_type != value
        elif operator == "contains":
            return Lead.insurance_type.contains(value)
        elif operator == "starts_with":
            return Lead.insurance_type.startswith(value)
        elif operator == "ends_with":
            return Lead.insurance_type.endswith(value)
        elif operator == "in":
            values = value.split(",")
            return Lead.insurance_type.in_(values)
        elif operator == "not_in":
            values = value.split(",")
            return ~Lead.insurance_type.in_(values)
        else:
            return None

    def _build_state_condition(self, operator: str, value: str):
        """Build condition for state field."""
        if operator == "equals":
            return Lead.state == value
        elif operator == "not_equals":
            return Lead.state != value
        elif operator == "contains":
            return Lead.state.contains(value)
        elif operator == "starts_with":
            return Lead.state.startswith(value)
        elif operator == "ends_with":
            return Lead.state.endswith(value)
        elif operator == "in":
            values = value.split(",")
            return Lead.state.in_(values)
        elif operator == "not_in":
            values = value.split(",")
            return ~Lead.state.in_(values)
        else:
            return None

    def _build_city_condition(self, operator: str, value: str):
        """Build condition for city field."""
        if operator == "equals":
            return Lead.city == value
        elif operator == "not_equals":
            return Lead.city != value
        elif operator == "contains":
            return Lead.city.contains(value)
        elif operator == "starts_with":
            return Lead.city.startswith(value)
        elif operator == "ends_with":
            return Lead.city.endswith(value)
        elif operator == "in":
            values = value.split(",")
            return Lead.city.in_(values)
        elif operator == "not_in":
            values = value.split(",")
            return ~Lead.city.in_(values)
        else:
            return None

    def _build_value_estimate_condition(self, operator: str, value: str):
        """Build condition for value_estimate field."""
        try:
            float_value = float(value)
            if operator == "equals":
                return Lead.value_estimate == float_value
            elif operator == "not_equals":
                return Lead.value_estimate != float_value
            elif operator == "greater_than":
                return Lead.value_estimate > float_value
            elif operator == "less_than":
                return Lead.value_estimate < float_value
            else:
                return None
        except ValueError:
            return None

    def _build_created_at_condition(self, operator: str, value: str):
        """Build condition for created_at field."""
        try:
            # Parse ISO format datetime
            datetime_value = datetime.fromisoformat(value)
            if operator == "greater_than":
                return Lead.created_at > datetime_value
            elif operator == "less_than":
                return Lead.created_at < datetime_value
            elif operator == "equals":
                # For exact date matching, compare date part only
                return func.date(Lead.created_at) == func.date(datetime_value)
            else:
                return None
        except ValueError:
            return None

    def _build_updated_at_condition(self, operator: str, value: str):
        """Build condition for updated_at field."""
        try:
            # Parse ISO format datetime
            datetime_value = datetime.fromisoformat(value)
            if operator == "greater_than":
                return Lead.updated_at > datetime_value
            elif operator == "less_than":
                return Lead.updated_at < datetime_value
            elif operator == "equals":
                # For exact date matching, compare date part only
                return func.date(Lead.updated_at) == func.date(datetime_value)
            else:
                return None
        except ValueError:
            return None

    def _build_tags_condition(self, operator: str, value: str):
        """Build condition for tags field."""
        if operator == "contains":
            return Lead.tags.contains(value)
        elif operator == "not_contains":
            return ~Lead.tags.contains(value)
        elif operator == "equals":
            return Lead.tags == value
        elif operator == "not_equals":
            return Lead.tags != value
        else:
            return None

    async def add_leads_to_segment(self, segment_id: int, lead_ids: List[int]) -> int:
        """Add leads to a segment."""
        segment = await self.get_segment_by_id(segment_id)
        if not segment:
            return 0
        
        existing_lead_segments = await self.db.execute(
            select(LeadSegment)
            .where(LeadSegment.segment_id == segment_id)
            .where(LeadSegment.lead_id.in_(lead_ids))
        )
        existing_lead_segments = existing_lead_segments.scalars().all()
        
        existing_lead_ids = {ls.lead_id for ls in existing_lead_segments}
        new_lead_ids = [lid for lid in lead_ids if lid not in existing_lead_ids]
        
        # Update existing ones to active
        for ls in existing_lead_segments:
            ls.is_active = True
        
        # Create new lead segment associations
        new_associations = []
        for lead_id in new_lead_ids:
            association = LeadSegment(
                lead_id=lead_id,
                segment_id=segment_id,
                is_active=True
            )
            new_associations.append(association)
        
        self.db.add_all(new_associations)
        await self.db.commit()
        
        return len(new_lead_ids) + len(existing_lead_segments)

    async def remove_leads_from_segment(self, segment_id: int, lead_ids: List[int]) -> int:
        """Remove leads from a segment."""
        result = await self.db.execute(
            select(LeadSegment)
            .where(LeadSegment.segment_id == segment_id)
            .where(LeadSegment.lead_id.in_(lead_ids))
        )
        lead_segments = result.scalars().all()
        
        for ls in lead_segments:
            ls.is_active = False
        
        await self.db.commit()
        return len(lead_segments)

    async def get_segment_leads(self, segment_id: int, active_only: bool = True) -> List[Lead]:
        """Get all leads in a segment."""
        segment = await self.get_segment_by_id(segment_id)
        if not segment:
            return []
        
        if segment.is_dynamic:
            # For dynamic segments, evaluate rules
            evaluation = await self.evaluate_segment(segment_id)
            lead_ids = evaluation.get("matching_leads", [])
            
            if not lead_ids:
                return []
            
            result = await self.db.execute(
                select(Lead)
                .where(Lead.id.in_(lead_ids))
                .where(Lead.organization_id == segment.organization_id)
            )
            return result.scalars().all()
        else:
            # For static segments, get from lead_segments table
            query = select(Lead).join(LeadSegment).where(LeadSegment.segment_id == segment_id)
            
            if active_only:
                query = query.where(LeadSegment.is_active == True)
            
            result = await self.db.execute(query)
            return result.scalars().all()

    async def get_lead_segments(self, lead_id: int) -> List[Segment]:
        """Get all segments a lead belongs to."""
        result = await self.db.execute(
            select(Segment)
            .join(LeadSegment)
            .where(LeadSegment.lead_id == lead_id)
            .where(LeadSegment.is_active == True)
            .options(selectinload(Segment.rules))
        )
        return result.scalars().all()

    async def update_segment_memberships(self, segment_id: int) -> int:
        """Update segment memberships based on current rules (for dynamic segments)."""
        segment = await self.get_segment_by_id(segment_id)
        if not segment or not segment.is_dynamic:
            return 0
        
        # Evaluate current rules
        evaluation = await self.evaluate_segment(segment_id)
        matching_lead_ids = evaluation.get("matching_leads", [])
        
        # Get current segment members
        current_members = await self.db.execute(
            select(LeadSegment)
            .where(LeadSegment.segment_id == segment_id)
            .where(LeadSegment.is_active == True)
        )
        current_members = current_members.scalars().all()
        current_lead_ids = {m.lead_id for m in current_members}
        
        # Find leads to add
        leads_to_add = [lid for lid in matching_lead_ids if lid not in current_lead_ids]
        
        # Find leads to remove
        leads_to_remove = [lid for lid in current_lead_ids if lid not in matching_lead_ids]
        
        # Add new leads
        if leads_to_add:
            await self.add_leads_to_segment(segment_id, leads_to_add)
        
        # Remove old leads
        if leads_to_remove:
            await self.remove_leads_from_segment(segment_id, leads_to_remove)
        
        return len(leads_to_add) + len(leads_to_remove)
