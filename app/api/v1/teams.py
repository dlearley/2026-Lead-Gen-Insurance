from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.team import Team
from app.schemas.team import TeamResponse, TeamCreate

router = APIRouter()

@router.get("", response_model=List[TeamResponse])
async def read_teams(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    query = select(Team)
    if not current_user.is_superuser:
        if current_user.organization_id:
            query = query.where(Team.organization_id == current_user.organization_id)
        else:
            return []
            
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

@router.post("", response_model=TeamResponse)
async def create_team(
    team_in: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    # Check if user belongs to the organization
    if not current_user.is_superuser and current_user.organization_id != team_in.organization_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    team = Team(**team_in.model_dump())
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return team
