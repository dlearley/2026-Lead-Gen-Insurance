from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.automation import (
    AutomationCreate, AutomationUpdate, AutomationResponse, AutomationListResponse,
    AutomationActionCreate, AutomationActionUpdate, AutomationActionResponse,
    AutomationRunResponse, AutomationTriggerRequest, AutomationTriggerResponse,
    EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse, EmailTemplateListResponse,
    ScheduledTaskCreate, ScheduledTaskUpdate, ScheduledTaskResponse, ScheduledTaskListResponse
)
from app.services.automation_service import AutomationService
from app.core.logging import get_logger
from app.api.deps import get_current_user
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter()


@router.post("", response_model=AutomationResponse, status_code=status.HTTP_201_CREATED)
async def create_automation(
    automation_data: AutomationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> AutomationResponse:
    try:
        automation = await AutomationService(db).create_automation(
            automation_data, 
            current_user.organization_id
        )
        return AutomationResponse.model_validate(automation)
    except Exception as e:
        logger.error(f"Error creating automation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create automation"
        )


@router.get("/{automation_id}", response_model=AutomationResponse)
async def get_automation(
    automation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> AutomationResponse:
    automation = await AutomationService(db).get_automation_by_id(automation_id)
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Automation with ID {automation_id} not found"
        )
    if automation.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this automation"
        )
    return AutomationResponse.model_validate(automation)


@router.get("", response_model=AutomationListResponse)
async def list_automations(
    active_only: bool = Query(True, description="Filter by active automations only"),
    campaign_id: Optional[int] = Query(None, description="Filter by campaign ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> AutomationListResponse:
    automations = await AutomationService(db).get_automations(
        organization_id=current_user.organization_id,
        active_only=active_only,
        campaign_id=campaign_id
    )
    
    return AutomationListResponse(
        total=len(automations),
        automations=[AutomationResponse.model_validate(automation) for automation in automations],
        page=1,
        page_size=len(automations)
    )


@router.put("/{automation_id}", response_model=AutomationResponse)
async def update_automation(
    automation_id: int,
    automation_data: AutomationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> AutomationResponse:
    automation = await AutomationService(db).get_automation_by_id(automation_id)
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Automation with ID {automation_id} not found"
        )
    if automation.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this automation"
        )
    
    automation = await AutomationService(db).update_automation(automation_id, automation_data)
    return AutomationResponse.model_validate(automation)


@router.delete("/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_automation(
    automation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    automation = await AutomationService(db).get_automation_by_id(automation_id)
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Automation with ID {automation_id} not found"
        )
    if automation.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this automation"
        )
    
    await AutomationService(db).delete_automation(automation_id)


@router.post("/{automation_id}/trigger", response_model=AutomationTriggerResponse)
async def trigger_automation(
    automation_id: int,
    trigger_data: AutomationTriggerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> AutomationTriggerResponse:
    automation = await AutomationService(db).get_automation_by_id(automation_id)
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Automation with ID {automation_id} not found"
        )
    if automation.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this automation"
        )
    
    result = await AutomationService(db).trigger_automation(trigger_data)
    
    return AutomationTriggerResponse(**result)


@router.get("/{automation_id}/runs", response_model=List[AutomationRunResponse])
async def get_automation_runs(
    automation_id: int,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[AutomationRunResponse]:
    automation = await AutomationService(db).get_automation_by_id(automation_id)
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Automation with ID {automation_id} not found"
        )
    if automation.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this automation"
        )
    
    runs = await AutomationService(db).get_automation_runs(automation_id=automation_id, limit=limit)
    
    return [AutomationRunResponse.model_validate(run) for run in runs]


# Email Template Endpoints

@router.post("/email-templates", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_email_template(
    template_data: EmailTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> EmailTemplateResponse:
    try:
        template = await AutomationService(db).create_email_template(
            template_data, 
            current_user.organization_id
        )
        return EmailTemplateResponse.model_validate(template)
    except Exception as e:
        logger.error(f"Error creating email template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create email template"
        )


@router.get("/email-templates/{template_id}", response_model=EmailTemplateResponse)
async def get_email_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> EmailTemplateResponse:
    template = await AutomationService(db).get_email_template_by_id(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email template with ID {template_id} not found"
        )
    if template.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this email template"
        )
    return EmailTemplateResponse.model_validate(template)


@router.get("/email-templates", response_model=EmailTemplateListResponse)
async def list_email_templates(
    active_only: bool = Query(True, description="Filter by active templates only"),
    template_type: Optional[str] = Query(None, description="Filter by template type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> EmailTemplateListResponse:
    templates = await AutomationService(db).get_email_templates(
        organization_id=current_user.organization_id,
        active_only=active_only,
        template_type=template_type
    )
    
    return EmailTemplateListResponse(
        total=len(templates),
        email_templates=[EmailTemplateResponse.model_validate(template) for template in templates],
        page=1,
        page_size=len(templates)
    )


@router.put("/email-templates/{template_id}", response_model=EmailTemplateResponse)
async def update_email_template(
    template_id: int,
    template_data: EmailTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> EmailTemplateResponse:
    template = await AutomationService(db).get_email_template_by_id(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email template with ID {template_id} not found"
        )
    if template.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this email template"
        )
    
    template = await AutomationService(db).update_email_template(template_id, template_data)
    return EmailTemplateResponse.model_validate(template)


@router.delete("/email-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_email_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    template = await AutomationService(db).get_email_template_by_id(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email template with ID {template_id} not found"
        )
    if template.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this email template"
        )
    
    await AutomationService(db).delete_email_template(template_id)


# Scheduled Task Endpoints

@router.post("/scheduled-tasks", response_model=ScheduledTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_scheduled_task(
    task_data: ScheduledTaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ScheduledTaskResponse:
    try:
        task = await AutomationService(db).create_scheduled_task(
            task_data, 
            current_user.organization_id
        )
        return ScheduledTaskResponse.model_validate(task)
    except Exception as e:
        logger.error(f"Error creating scheduled task: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create scheduled task"
        )


@router.get("/scheduled-tasks/{task_id}", response_model=ScheduledTaskResponse)
async def get_scheduled_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ScheduledTaskResponse:
    task = await AutomationService(db).get_scheduled_task_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scheduled task with ID {task_id} not found"
        )
    if task.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this scheduled task"
        )
    return ScheduledTaskResponse.model_validate(task)


@router.get("/scheduled-tasks", response_model=ScheduledTaskListResponse)
async def list_scheduled_tasks(
    status: Optional[str] = Query(None, description="Filter by task status"),
    task_type: Optional[str] = Query(None, description="Filter by task type"),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ScheduledTaskListResponse:
    tasks = await AutomationService(db).get_scheduled_tasks(
        organization_id=current_user.organization_id,
        status=status,
        task_type=task_type,
        limit=limit
    )
    
    return ScheduledTaskListResponse(
        total=len(tasks),
        scheduled_tasks=[ScheduledTaskResponse.model_validate(task) for task in tasks],
        page=1,
        page_size=len(tasks)
    )


@router.put("/scheduled-tasks/{task_id}", response_model=ScheduledTaskResponse)
async def update_scheduled_task(
    task_id: int,
    task_data: ScheduledTaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ScheduledTaskResponse:
    task = await AutomationService(db).get_scheduled_task_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scheduled task with ID {task_id} not found"
        )
    if task.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this scheduled task"
        )
    
    task = await AutomationService(db).update_scheduled_task(task_id, task_data)
    return ScheduledTaskResponse.model_validate(task)


@router.delete("/scheduled-tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scheduled_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    task = await AutomationService(db).get_scheduled_task_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scheduled task with ID {task_id} not found"
        )
    if task.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this scheduled task"
        )
    
    await AutomationService(db).delete_scheduled_task(task_id)


@router.post("/scheduled-tasks/process-due", response_model=dict)
async def process_due_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superusers can process due tasks"
        )
    
    processed_count = await AutomationService(db).process_due_tasks()
    
    return {
        "success": True,
        "processed_count": processed_count,
        "message": f"Processed {processed_count} due tasks"
    }