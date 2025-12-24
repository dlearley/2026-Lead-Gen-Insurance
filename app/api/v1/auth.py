from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from jose import jwt, JWTError
from pydantic import ValidationError

from app.db.session import get_db
from app.services.user_service import UserService
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.schemas.auth import Token, LoginRequest, TokenData
from app.schemas.user import UserCreate, UserResponse
from app.core.config import settings

router = APIRouter()


@router.post("/register", response_model=UserResponse)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    user = await UserService.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user = await UserService.create_user(db, user_data=user_in)
    await db.commit()
    return user


@router.post("/login", response_model=Token)
async def login(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    user = await UserService.get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    try:
        payload = jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if not payload.get("refresh"):
            raise HTTPException(status_code=400, detail="Invalid refresh token")
        user_id = payload.get("sub")
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    user = await UserService.get_user(db, user_id=int(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout() -> Any:
    # In a real app with Redis, you'd blacklist the token here
    return {"detail": "Successfully logged out"}


@router.post("/password-reset")
async def password_reset(email: str) -> Any:
    # Logic for sending password reset email
    return {"detail": "If the email exists, a reset link has been sent"}
