from typing import List, Optional, Tuple
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from app.core.logging import get_logger

logger = get_logger(__name__)


class UserService:
    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
        data = user_data.model_dump()
        password = data.pop("password")
        data["hashed_password"] = get_password_hash(password)
        
        user = User(**data)
        db.add(user)
        await db.flush()
        await db.refresh(user)
        logger.info(f"Created user with ID: {user.id}")
        return user

    @staticmethod
    async def get_user(db: AsyncSession, user_id: int) -> Optional[User]:
        result = await db.execute(
            select(User)
            .where(User.id == user_id)
            .where(User.deleted_at == None)
            .options(selectinload(User.roles).selectinload(Role.permissions))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(
            select(User)
            .where(User.email == email)
            .where(User.deleted_at == None)
            .options(selectinload(User.roles).selectinload(Role.permissions))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_users(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        organization_id: Optional[int] = None
    ) -> Tuple[List[User], int]:
        query = select(User).where(User.deleted_at == None)
        
        if organization_id:
            query = query.where(User.organization_id == organization_id)
        
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()
        
        query = query.offset(skip).limit(limit).order_by(User.id)
        query = query.options(selectinload(User.roles).selectinload(Role.permissions))
        result = await db.execute(query)
        users = list(result.scalars().all())
        
        return users, total

    @staticmethod
    async def update_user(
        db: AsyncSession,
        user_id: int,
        user_data: UserUpdate
    ) -> Optional[User]:
        user = await UserService.get_user(db, user_id)
        if not user:
            return None
        
        update_data = user_data.model_dump(exclude_unset=True)
        if "password" in update_data:
            password = update_data.pop("password")
            user.hashed_password = get_password_hash(password)
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        await db.flush()
        await db.refresh(user)
        logger.info(f"Updated user with ID: {user.id}")
        return user

    @staticmethod
    async def soft_delete_user(db: AsyncSession, user_id: int) -> bool:
        user = await UserService.get_user(db, user_id)
        if not user:
            return False
        
        user.deleted_at = datetime.utcnow()
        user.is_active = False
        await db.flush()
        logger.info(f"Soft deleted user with ID: {user_id}")
        return True
        
    @staticmethod
    async def assign_role(db: AsyncSession, user_id: int, role_id: int) -> bool:
        user = await UserService.get_user(db, user_id)
        if not user:
            return False
        
        result = await db.execute(select(Role).where(Role.id == role_id))
        role = result.scalar_one_or_none()
        if not role:
            return False
            
        if role not in user.roles:
            user.roles.append(role)
            await db.flush()
            logger.info(f"Assigned role {role.name} to user {user_id}")
            
        return True
