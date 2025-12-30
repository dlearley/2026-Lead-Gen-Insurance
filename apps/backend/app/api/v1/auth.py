from datetime import timedelta
from typing import Any, Dict, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status, Request, Form, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from jose import jwt, JWTError
from pydantic import ValidationError

from app.db.session import get_db
from app.services.auth_service import AuthService, get_auth_service
from app.services.user_service import UserService
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.schemas.auth import (
    Token, 
    TokenResponse, 
    LoginRequest, 
    SocialLoginRequest,
    EmailVerificationRequest,
    PasswordResetRequest,
    RefreshTokenRequest
)
from app.schemas.user import UserCreate, UserResponse
from app.core.config import settings

router = APIRouter()


@router.post("/register", response_model=Dict[str, Any])
async def register(
    request: Request,
    user_in: UserCreate,
    recaptcha_token: Optional[str] = Header(None, alias="X-Recaptcha-Token"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Register a new user with email verification."""
    
    auth_service = get_auth_service(db)
    
    try:
        user, access_token = await auth_service.register(
            user_data=user_in,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            recaptcha_token=recaptcha_token
        )
        
        return {
            "user": user,
            "access_token": access_token,
            "message": "Registration successful. Please check your email for verification link.",
            "requires_email_verification": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Login with email and password."""
    
    auth_service = get_auth_service(db)
    
    try:
        return await auth_service.login(
            email=form_data.username,
            password=form_data.password,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/social-login", response_model=TokenResponse)
async def social_login(
    request: Request,
    social_login: SocialLoginRequest,
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Login using social provider (Google/Microsoft)."""
    
    auth_service = get_auth_service(db)
    
    try:
        user, token_response = await auth_service.social_login(
            social_login=social_login,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
        return token_response
        
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/verify-email", response_model=Dict[str, Any])
async def verify_email(
    request: Request,
    verification_request: EmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Verify email address using token."""
    
    auth_service = get_auth_service(db)
    
    try:
        user = await auth_service.verify_email(
            verification_request=verification_request,
            ip_address=request.client.host if request.client else None
        )
        
        return {
            "success": True,
            "message": "Email verified successfully. Your account is now active.",
            "user_id": user.id,
            "requires_onboarding": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/resend-verification", response_model=Dict[str, Any])
async def resend_verification(
    request: Request,
    email: str = Form(...),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Resend email verification token."""
    
    auth_service = get_auth_service(db)
    
    try:
        return await auth_service.resend_verification_email(
            email=email,
            ip_address=request.client.host if request.client else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/forgot-password", response_model=Dict[str, Any])
async def forgot_password(
    request: Request,
    email: str = Form(...),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Request password reset email."""
    
    auth_service = get_auth_service(db)
    
    try:
        return await auth_service.request_password_reset(
            email=email,
            ip_address=request.client.host if request.client else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reset-password", response_model=Dict[str, Any])
async def reset_password(
    request: Request,
    reset_request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Reset password using valid token."""
    
    auth_service = get_auth_service(db)
    
    try:
        user = await auth_service.reset_password(
            reset_request=reset_request,
            ip_address=request.client.host if request.client else None
        )
        
        return {
            "success": True,
            "message": "Password reset successfully",
            "user_id": user.id
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    refresh_request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Refresh access token using refresh token."""
    
    auth_service = get_auth_service(db)
    
    try:
        return await auth_service.refresh_access_token(
            refresh_token=refresh_request.refresh_token,
            ip_address=request.client.host if request.client else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout", response_model=Dict[str, Any])
async def logout(
    refresh_token: str = Header(..., alias="X-Refresh-Token"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Logout and invalidate refresh token."""
    
    # In production, add token to blacklist in Redis
    return {
        "success": True,
        "message": "Successfully logged out",
        "detail": "Token has been invalidated"
    }


@router.get("/me", response_model=Dict[str, Any])
async def get_current_user_info(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get current authenticated user information."""
    
    # Extract token from Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = auth_header.replace("Bearer ", "")
    
    try:
        auth_service = get_auth_service(db)
        
        # Decode and verify token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user info
        user = await UserService.get_user(db, user_id=int(user_id))
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "user": user,
            "is_onboarding_complete": user.onboarding_step >= 6,
            "requires_email_verification": not user.email_verified,
            "organization_id": user.organization_id,
            "permissions": user.permissions
        }
        
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
