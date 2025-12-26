from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    organization_id: int

class TeamCreate(TeamBase):
    member_ids: List[int] = []

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    member_ids: Optional[List[int]] = None

class TeamResponse(TeamBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
