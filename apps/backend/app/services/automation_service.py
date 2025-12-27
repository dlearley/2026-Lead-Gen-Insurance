from typing import List, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
import json

from app.models import (
    Automation, AutomationAction, AutomationRun, 
    EmailTemplate, ScheduledTask, Lead, Segment
)
from app.schemas import (
    AutomationCreate, AutomationUpdate, AutomationActionCreate, 
    AutomationActionUpdate, EmailTemplateCreate, EmailTemplateUpdate,
    ScheduledTaskCreate, ScheduledTaskUpdate, AutomationTriggerRequest
)
from app.core.logging import get_logger

logger = get_logger(__name__)


class AutomationService:
    """Service for marketing automation operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_automation(self, automation_data: AutomationCreate, organization_id: int) -> Automation:
        """Create a new automation with actions."""
        automation = Automation(
            name=automation_data.name,
            description=automation_data.description,
            slug=automation_data.slug,
            trigger_type=automation_data.trigger_type,
            trigger_configuration=automation_data.trigger_configuration or {},
            is_active=automation_data.is_active,
            run_immediately=automation_data.run_immediately,
            organization_id=organization_id,
            campaign_id=automation_data.campaign_id
        )
        
        # Create actions
        actions = []
        for action_data in automation_data.actions:
            action = AutomationAction(
                action_type=action_data.action_type,
                action_order=action_data.action_order,
                is_active=action_data.is_active,
                configuration=action_data.configuration or {}
            )
            actions.append(action)
        
        automation.actions = actions
        self.db.add(automation)
        await self.db.commit()
        await self.db.refresh(automation)
        
        return automation

    async def get_automation_by_id(self, automation_id: int) -> Optional[Automation]:
        """Get automation by ID with actions."""
        result = await self.db.execute(
            select(Automation)
            .options(
                selectinload(Automation.actions),
                selectinload(Automation.campaign)
            )
            .where(Automation.id == automation_id)
        )
        return result.scalar_one_or_none()

    async def get_automations(
        self,
        organization_id: int,
        active_only: bool = True,
        campaign_id: Optional[int] = None
    ) -> List[Automation]:
        """Get all automations for an organization with optional filters."""
        query = select(Automation).options(
            selectinload(Automation.actions),
            selectinload(Automation.campaign)
        ).where(Automation.organization_id == organization_id)
        
        if active_only:
            query = query.where(Automation.is_active == True)
        
        if campaign_id:
            query = query.where(Automation.campaign_id == campaign_id)
        
        query = query.order_by(Automation.created_at.desc())
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_automation(self, automation_id: int, automation_data: AutomationUpdate) -> Optional[Automation]:
        """Update an automation."""
        automation = await self.get_automation_by_id(automation_id)
        if not automation:
            return None
        
        update_data = automation_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "actions" and value is not None:
                # Handle actions update separately
                continue
            setattr(automation, field, value)
        
        # Handle actions update
        if automation_data.actions is not None:
            await self._update_automation_actions(automation, automation_data.actions)
        
        await self.db.commit()
        await self.db.refresh(automation)
        return automation

    async def _update_automation_actions(self, automation: Automation, actions_data: List[AutomationActionUpdate]):
        """Update automation actions."""
        # Remove old actions
        for action in automation.actions[:]:
            await self.db.delete(action)
        
        # Add new actions
        new_actions = []
        for action_data in actions_data:
            action = AutomationAction(
                automation_id=automation.id,
                action_type=action_data.action_type or automation.actions[0].action_type if automation.actions else "send_email",
                action_order=action_data.action_order if action_data.action_order is not None else 0,
                is_active=action_data.is_active if action_data.is_active is not None else True,
                configuration=action_data.configuration or automation.actions[0].configuration if automation.actions else {}
            )
            new_actions.append(action)
        
        automation.actions = new_actions

    async def delete_automation(self, automation_id: int) -> bool:
        """Delete an automation (soft delete by setting is_active=False)."""
        automation = await self.get_automation_by_id(automation_id)
        if not automation:
            return False
        
        automation.is_active = False
        await self.db.commit()
        return True

    async def trigger_automation(self, trigger_data: AutomationTriggerRequest) -> Dict[str, Any]:
        """Trigger an automation based on an event."""
        automation = await self.get_automation_by_id(trigger_data.automation_id)
        if not automation or not automation.is_active:
            return {
                "success": False,
                "message": "Automation not found or inactive"
            }
        
        # Create automation run record
        automation_run = AutomationRun(
            automation_id=automation.id,
            lead_id=trigger_data.lead_id,
            status="processing",
            trigger_data=trigger_data.trigger_data or {},
            execution_log={}
        )
        self.db.add(automation_run)
        await self.db.commit()
        await self.db.refresh(automation_run)
        
        # Execute automation actions
        triggered_actions = []
        execution_log = {}
        
        try:
            for action in automation.actions:
                if not action.is_active:
                    continue
                
                action_result = await self._execute_automation_action(
                    action, 
                    trigger_data.lead_id, 
                    trigger_data.trigger_data
                )
                
                triggered_actions.append(action.action_type)
                execution_log[action.action_type] = action_result
            
            automation_run.status = "completed"
            automation_run.completed_at = datetime.now()
            automation_run.execution_log = execution_log
            
            await self.db.commit()
            
            return {
                "success": True,
                "automation_run_id": automation_run.id,
                "message": "Automation triggered successfully",
                "triggered_actions": triggered_actions
            }
        
        except Exception as e:
            logger.error(f"Error executing automation {automation.id}: {str(e)}")
            automation_run.status = "failed"
            automation_run.execution_log = {
                "error": str(e),
                "executed_actions": triggered_actions,
                "execution_log": execution_log
            }
            automation_run.completed_at = datetime.now()
            
            await self.db.commit()
            
            return {
                "success": False,
                "automation_run_id": automation_run.id,
                "message": f"Automation failed: {str(e)}",
                "triggered_actions": triggered_actions
            }

    async def _execute_automation_action(
        self, 
        action: AutomationAction, 
        lead_id: Optional[int], 
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a single automation action."""
        action_type = action.action_type
        config = action.configuration or {}
        
        try:
            if action_type == "send_email":
                return await self._execute_send_email_action(action, lead_id, config, trigger_data)
            
            elif action_type == "update_lead_status":
                return await self._execute_update_lead_status_action(action, lead_id, config, trigger_data)
            
            elif action_type == "update_lead_priority":
                return await self._execute_update_lead_priority_action(action, lead_id, config, trigger_data)
            
            elif action_type == "assign_lead":
                return await self._execute_assign_lead_action(action, lead_id, config, trigger_data)
            
            elif action_type == "add_tag":
                return await self._execute_add_tag_action(action, lead_id, config, trigger_data)
            
            elif action_type == "remove_tag":
                return await self._execute_remove_tag_action(action, lead_id, config, trigger_data)
            
            elif action_type == "create_task":
                return await self._execute_create_task_action(action, lead_id, config, trigger_data)
            
            elif action_type == "send_notification":
                return await self._execute_send_notification_action(action, lead_id, config, trigger_data)
            
            else:
                return {"success": False, "error": f"Unknown action type: {action_type}"}
        
        except Exception as e:
            logger.error(f"Error executing action {action.id} ({action_type}): {str(e)}")
            return {"success": False, "error": str(e)}

    async def _execute_send_email_action(
        self, 
        action: AutomationAction, 
        lead_id: Optional[int], 
        config: Dict[str, Any], 
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute send email action."""
        # Get email template
        template_id = config.get("template_id")
        if not template_id:
            return {"success": False, "error": "No email template specified"}
        
        template = await self.get_email_template_by_id(template_id)
        if not template:
            return {"success": False, "error": "Email template not found"}
        
        # Get lead for personalization
        lead = None
        if lead_id:
            lead_result = await self.db.execute(
                select(Lead).where(Lead.id == lead_id)
            )
            lead = lead_result.scalar_one_or_none()
        
        # TODO: Implement actual email sending logic
        # This would integrate with an email service
        
        return {
            "success": True,
            "action": "send_email",
            "template_id": template_id,
            "template_name": template.name,
            "lead_id": lead_id,
            "lead_email": lead.email if lead else None,
            "message": "Email would be sent (implementation required)"
        }

    async def _execute_update_lead_status_action(
        self, 
        action: AutomationAction, 
        lead_id: Optional[int], 
        config: Dict[str, Any], 
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute update lead status action."""
        if not lead_id:
            return {"success": False, "error": "No lead specified"}
        
        new_status = config.get("status")
        if not new_status:
            return {"success": False, "error": "No status specified"}
        
        # Get lead and update status
        lead_result = await self.db.execute(
            select(Lead).where(Lead.id == lead_id)
        )
        lead = lead_result.scalar_one_or_none()
        
        if not lead:
            return {"success": False, "error": "Lead not found"}
        
        lead.status = new_status
        await self.db.commit()
        
        return {
            "success": True,
            "action": "update_lead_status",
            "lead_id": lead_id,
            "old_status": trigger_data.get("old_status"),
            "new_status": new_status
        }

    async def _execute_update_lead_priority_action(
        self, 
        action: AutomationAction, 
        lead_id: Optional[int], 
        config: Dict[str, Any], 
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute update lead priority action."""
        if not lead_id:
            return {"success": False, "error": "No lead specified"}
        
        new_priority = config.get("priority")
        if not new_priority:
            return {"success": False, "error": "No priority specified"}
        
        # Get lead and update priority
        lead_result = await self.db.execute(
            select(Lead).where(Lead.id == lead_id)
        )
        lead = lead_result.scalar_one_or_none()
        
        if not lead:
            return {"success": False, "error": "Lead not found"}
        
        lead.priority = new_priority
        await self.db.commit()
        
        return {
            "success": True,
            "action": "update_lead_priority",
            "lead_id": lead_id,
            "old_priority": trigger_data.get("old_priority"),
            "new_priority": new_priority
        }

    async def _execute_assign_lead_action(
        self, 
        action: AutomationAction, 
        lead_id: Optional[int], 
        config: Dict[str, Any], 
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute assign lead action."""
        if not lead_id:
            return {"success": False, "error": "No lead specified"}
        
        agent_id = config.get("agent_id")
        if not agent_id:
            return {"success": False, "error": "No agent specified"}
        
        # Get lead and update assignee
        lead_result = await self.db.execute(
            select(Lead).where(Lead.id == lead_id)
        )
        lead = lead_result.scalar_one_or_none()
        
        if not lead:
            return {"success": False, "error": "Lead not found"}
        
        lead.assignee_id = agent_id
        await self.db.commit()
        
        return {
            "success": True,
            "action": "assign_lead",
            "lead_id": lead_id,
            "agent_id": agent_id,
            "old_agent_id": trigger_data.get("old_agent_id")
        }

    async def _execute_add_tag_action(
        self, 
        action: AutomationAction, 
        lead_id: Optional[int], 
        config: Dict[str, Any], 
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute add tag action."""
        if not lead_id:
            return {"success": False, "error": "No lead specified"}
        
        tag = config.get("tag")
        if not tag:
            return {"success": False, "error": "No tag specified"}
        
        # Get lead and add tag
        lead_result = await self.db.execute(
            select(Lead).where(Lead.id == lead_id)
        )
        lead = lead_result.scalar_one_or_none()
        
        if not lead:
            return {"success": False, "error": "Lead not found"}
        
        # Add tag to existing tags
        current_tags = lead.tags or ""
        tags_list = [t.strip() for t in current_tags.split(",") if t.strip()]
        
        if tag not in tags_list:
            tags_list.append(tag)
            lead.tags = ", ".join(tags_list)
            await self.db.commit()
        
        return {
            "success": True,
            "action": "add_tag",
            "lead_id": lead_id,
            "tag": tag,
            "current_tags": lead.tags
        }

    async def _execute_remove_tag_action(
        self, 
        action: AutomationAction, 
        lead_id: Optional[int], 
        config: Dict[str, Any], 
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute remove tag action."""
        if not lead_id:
            return {"success": False, "error": "No lead specified"}
        
        tag = config.get("tag")
        if not tag:
            return {"success": False, "error": "No tag specified"}
        
        # Get lead and remove tag
        lead_result = await self.db.execute(
            select(Lead).where(Lead.id == lead_id)
        )
        lead = lead_result.scalar_one_or_none()
        
        if not lead:
            return {"success": False, "error": "Lead not found"}
        
        # Remove tag from existing tags
        current_tags = lead.tags or ""
        tags_list = [t.strip() for t in current_tags.split(",") if t.strip()]
        
        if tag in tags_list:
            tags_list.remove(tag)
            lead.tags = ", ".join(tags_list)
            await self.db.commit()
        
        return {
            "success": True,
            "action": "remove_tag",
            "lead_id": lead_id,
            "tag": tag,
            "current_tags": lead.tags
        }

    async def _execute_create_task_action(
        self, 
        action: AutomationAction, 
        lead_id: Optional[int], 
        config: Dict[str, Any], 
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute create task action."""
        task_type = config.get("task_type", "follow_up")
        task_title = config.get("title", "Automated Task")
        task_description = config.get("description", "Task created by automation")
        due_date = config.get("due_date")
        assignee_id = config.get("assignee_id")
        
        # TODO: Implement actual task creation
        # This would integrate with a task management system
        
        return {
            "success": True,
            "action": "create_task",
            "lead_id": lead_id,
            "task_type": task_type,
            "task_title": task_title,
            "message": "Task would be created (implementation required)"
        }

    async def _execute_send_notification_action(
        self, 
        action: AutomationAction, 
        lead_id: Optional[int], 
        config: Dict[str, Any], 
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute send notification action."""
        notification_type = config.get("notification_type", "email")
        message = config.get("message", "Automated notification")
        recipient_id = config.get("recipient_id")
        
        # TODO: Implement actual notification sending
        # This would integrate with a notification system
        
        return {
            "success": True,
            "action": "send_notification",
            "lead_id": lead_id,
            "notification_type": notification_type,
            "message": "Notification would be sent (implementation required)"
        }

    async def get_automation_runs(
        self,
        automation_id: Optional[int] = None,
        lead_id: Optional[int] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[AutomationRun]:
        """Get automation runs with optional filters."""
        query = select(AutomationRun).options(
            selectinload(AutomationRun.automation)
        )
        
        if automation_id:
            query = query.where(AutomationRun.automation_id == automation_id)
        
        if lead_id:
            query = query.where(AutomationRun.lead_id == lead_id)
        
        if status:
            query = query.where(AutomationRun.status == status)
        
        query = query.order_by(AutomationRun.created_at.desc()).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    # Email Template Services

    async def create_email_template(self, template_data: EmailTemplateCreate, organization_id: int) -> EmailTemplate:
        """Create a new email template."""
        template = EmailTemplate(
            name=template_data.name,
            slug=template_data.slug,
            subject=template_data.subject,
            body_html=template_data.body_html,
            body_text=template_data.body_text,
            template_type=template_data.template_type,
            is_active=template_data.is_active,
            organization_id=organization_id
        )
        
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        
        return template

    async def get_email_template_by_id(self, template_id: int) -> Optional[EmailTemplate]:
        """Get email template by ID."""
        result = await self.db.execute(
            select(EmailTemplate)
            .where(EmailTemplate.id == template_id)
        )
        return result.scalar_one_or_none()

    async def get_email_templates(
        self,
        organization_id: int,
        active_only: bool = True,
        template_type: Optional[str] = None
    ) -> List[EmailTemplate]:
        """Get all email templates for an organization."""
        query = select(EmailTemplate).where(EmailTemplate.organization_id == organization_id)
        
        if active_only:
            query = query.where(EmailTemplate.is_active == True)
        
        if template_type:
            query = query.where(EmailTemplate.template_type == template_type)
        
        query = query.order_by(EmailTemplate.created_at.desc())
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_email_template(self, template_id: int, template_data: EmailTemplateUpdate) -> Optional[EmailTemplate]:
        """Update an email template."""
        template = await self.get_email_template_by_id(template_id)
        if not template:
            return None
        
        update_data = template_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(template, field, value)
        
        await self.db.commit()
        await self.db.refresh(template)
        return template

    async def delete_email_template(self, template_id: int) -> bool:
        """Delete an email template (soft delete)."""
        template = await self.get_email_template_by_id(template_id)
        if not template:
            return False
        
        template.is_active = False
        await self.db.commit()
        return True

    # Scheduled Task Services

    async def create_scheduled_task(self, task_data: ScheduledTaskCreate, organization_id: int) -> ScheduledTask:
        """Create a new scheduled task."""
        task = ScheduledTask(
            task_type=task_data.task_type,
            task_data=task_data.task_data or {},
            scheduled_for=task_data.scheduled_for,
            status=task_data.status,
            priority=task_data.priority,
            retry_count=task_data.retry_count,
            max_retries=task_data.max_retries,
            organization_id=organization_id
        )
        
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        
        return task

    async def get_scheduled_task_by_id(self, task_id: int) -> Optional[ScheduledTask]:
        """Get scheduled task by ID."""
        result = await self.db.execute(
            select(ScheduledTask)
            .where(ScheduledTask.id == task_id)
        )
        return result.scalar_one_or_none()

    async def get_scheduled_tasks(
        self,
        organization_id: int,
        status: Optional[str] = None,
        task_type: Optional[str] = None,
        limit: int = 100
    ) -> List[ScheduledTask]:
        """Get scheduled tasks with filters."""
        query = select(ScheduledTask).where(ScheduledTask.organization_id == organization_id)
        
        if status:
            query = query.where(ScheduledTask.status == status)
        
        if task_type:
            query = query.where(ScheduledTask.task_type == task_type)
        
        query = query.order_by(ScheduledTask.scheduled_for.asc()).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_scheduled_task(self, task_id: int, task_data: ScheduledTaskUpdate) -> Optional[ScheduledTask]:
        """Update a scheduled task."""
        task = await self.get_scheduled_task_by_id(task_id)
        if not task:
            return None
        
        update_data = task_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(task, field, value)
        
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def delete_scheduled_task(self, task_id: int) -> bool:
        """Delete a scheduled task."""
        task = await self.get_scheduled_task_by_id(task_id)
        if not task:
            return False
        
        await self.db.delete(task)
        await self.db.commit()
        return True

    async def process_due_tasks(self) -> int:
        """Process tasks that are due to run."""
        now = datetime.now()
        
        result = await self.db.execute(
            select(ScheduledTask)
            .where(ScheduledTask.scheduled_for <= now)
            .where(ScheduledTask.status == "pending")
            .order_by(ScheduledTask.priority.desc())
            .limit(100)
        )
        
        due_tasks = result.scalars().all()
        processed_count = 0
        
        for task in due_tasks:
            try:
                # TODO: Implement actual task processing logic
                # This would execute the task based on task_type and task_data
                
                task.status = "completed"
                task.retry_count = 0
                processed_count += 1
                
            except Exception as e:
                logger.error(f"Error processing task {task.id}: {str(e)}")
                task.retry_count += 1
                
                if task.retry_count >= task.max_retries:
                    task.status = "failed"
                else:
                    # Schedule retry (e.g., 5 minutes later)
                    task.scheduled_for = now + timedelta(minutes=5)
                    task.status = "retry_scheduled"
            
            await self.db.commit()
        
        return processed_count

    async def check_segment_automations(self, lead_id: int, entered_segments: List[int], exited_segments: List[int]) -> int:
        """Check and trigger automations based on segment changes."""
        triggered_count = 0
        
        # Check for segment entered automations
        for segment_id in entered_segments:
            automations = await self.get_automations_by_trigger(
                trigger_type="segment_entered",
                segment_id=segment_id
            )
            
            for automation in automations:
                trigger_data = {
                    "segment_id": segment_id,
                    "lead_id": lead_id,
                    "action": "entered"
                }
                
                trigger_request = AutomationTriggerRequest(
                    automation_id=automation.id,
                    trigger_data=trigger_data,
                    lead_id=lead_id
                )
                
                result = await self.trigger_automation(trigger_request)
                if result.get("success"):
                    triggered_count += 1
        
        # Check for segment exited automations
        for segment_id in exited_segments:
            automations = await self.get_automations_by_trigger(
                trigger_type="segment_exited",
                segment_id=segment_id
            )
            
            for automation in automations:
                trigger_data = {
                    "segment_id": segment_id,
                    "lead_id": lead_id,
                    "action": "exited"
                }
                
                trigger_request = AutomationTriggerRequest(
                    automation_id=automation.id,
                    trigger_data=trigger_data,
                    lead_id=lead_id
                )
                
                result = await self.trigger_automation(trigger_request)
                if result.get("success"):
                    triggered_count += 1
        
        return triggered_count

    async def get_automations_by_trigger(
        self,
        trigger_type: str,
        segment_id: Optional[int] = None,
        campaign_id: Optional[int] = None
    ) -> List[Automation]:
        """Get automations by trigger type and optional filters."""
        query = select(Automation).options(
            selectinload(Automation.actions)
        ).where(Automation.trigger_type == trigger_type)
        
        if segment_id:
            # Filter by segment in trigger configuration
            query = query.where(Automation.trigger_configuration["segment_id"].as_string() == str(segment_id))
        
        if campaign_id:
            query = query.where(Automation.campaign_id == campaign_id)
        
        result = await self.db.execute(query)
        return result.scalars().all()