"""
Comprehensive Authentication Service with Onboarding Support
"""

import asyncio
import hashlib
import json
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from jose import jwt
import bcrypt
import re

from app.db.models.user import User
from app.db.models.organization import Organization
from app.db.models.team_invitation import TeamInvitation
from app.core.security import (
    create_access_token, 
    create_refresh_token, 
    verify_password,
    create_email_verification_token,
    create_password_reset_token
)
from app.core.config import settings
from app.schemas.auth import (
    TokenResponse,
    LoginRequest,
    SocialLoginRequest,
    EmailVerificationRequest,
    PasswordResetRequest,
    RefreshTokenRequest
)
from app.schemas.user import UserCreate, UserResponse
from app.services.email_service import EmailService
from app.services.audit_service import AuditService
from app.core.rate_limiter import RateLimiter
from app.core.exceptions import (
    AuthenticationError,
    ValidationError,
    NotFoundError,
    RateLimitError,
    EmailAlreadyExistsError
)


class AuthService:
    """Handles authentication, authorization, and user onboarding."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService()
        self.audit_service = AuditService(db)
        self.rate_limiter = RateLimiter()
    
    async def register(
        self,
        user_data: UserCreate,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        recaptcha_token: Optional[str] = None
    ) -> Tuple[User, str]:
        """Register a new user with email verification."""
        
        # Validate reCAPTCHA if enabled
        if settings.RECAPTCHA_ENABLED and recaptcha_token:
            await self._verify_recaptcha(recaptcha_token)
        
        # Check rate limiting
        await self._check_rate_limit("registration", ip_address)
        
        # Validate email format
        if not self._is_valid_email(user_data.email):
            raise ValidationError("Invalid email format")
        
        # Check if user already exists
        existing_user = await self._get_user_by_email(user_data.email)
        if existing_user:
            raise EmailAlreadyExistsError("Email already registered")
        
        # Hash password
        password_hash = self._hash_password(user_data.password)
        
        # Create verification token
        verification_token = secrets.token_urlsafe(32)
        verification_expires = datetime.utcnow() + timedelta(hours=24)
        
        # Create user
        user = User(
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            password_hash=password_hash,
            email_verification_token=verification_token,
            email_verification_expires=verification_expires,
            role="USER",
            is_active=False,
            email_verified=False,
            onboarding_step=0
        )
        
        self.db.add(user)
        await self.db.flush()
        
        # Send verification email
        await self.email_service.send_verification_email(
            email=user.email,
            token=verification_token,
            first_name=user.first_name
        )
        
        # Create audit log
        await self.audit_service.log_action(
            user_id=user.id,
            action="USER_REGISTERED",
            entity_type="user",
            entity_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"email_verified": False}
        )
        
        # Generate access token for immediate use (but account not active yet)
        access_token = create_access_token(user.id)
        
        return user, access_token
    
    async def login(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> TokenResponse:
        """Authenticate user and return tokens."""
        
        # Check rate limiting
        await self._check_rate_limit(f"login:{email}", ip_address)
        
        # Find user
        user = await self._get_user_by_email(email)
        if not user:
            # Log failed attempt
            await self.audit_service.log_action(
                action="LOGIN_FAILED",
                entity_type="user",
                metadata={"email": email, "reason": "user_not_found"}
            )
            raise AuthenticationError("Invalid credentials")
        
        # Check account lockout
        if user.lockout_until and user.lockout_until > datetime.utcnow():
            raise AuthenticationError("Account temporarily locked due to too many failed attempts")
        
        # Verify password
        if not verify_password(password, user.password_hash):
            await self._handle_failed_login(user, ip_address)
            raise AuthenticationError("Invalid credentials")
        
        # Check if account is active
        if not user.is_active:
            raise AuthenticationError("Account is not active")
        
        # Check if email is verified
        if not user.email_verified:
            raise AuthenticationError("Email not verified. Please check your email for verification link.")
        
        # Reset failed login attempts
        user.failed_login_count = 0
        user.lockout_until = None
        user.last_login_at = datetime.utcnow()
        
        # Generate tokens
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        
        # Log successful login
        await self.audit_service.log_action(
            user_id=user.id,
            action="LOGIN_SUCCESS",
            entity_type="user",
            entity_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    async def social_login(
        self,
        social_login: SocialLoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[User, TokenResponse]:
        """Handle social login (Google/Microsoft)."""
        
        await self._check_rate_limit("social_login", ip_address)
        
        # Verify social token with provider
        provider_user_info = await self._verify_social_token(
            social_login.provider,
            social_login.token
        )
        
        if not provider_user_info:
            raise AuthenticationError("Invalid social token")
        
        # Try to find existing user
        user = await self._get_user_by_social_id(
            social_login.provider,
            provider_user_info["id"]
        )
        
        if user:
            # Existing user - update social info and login
            await self._update_social_user(user, social_login.provider, provider_user_info)
        else:
            # New user - create account
            user = await self._create_social_user(social_login.provider, provider_user_info)
            
            # Send welcome email
            await self.email_service.send_welcome_email(
                email=user.email,
                first_name=user.first_name
            )
        
        # Generate tokens
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        
        return user, TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    async def verify_email(
        self,
        verification_request: EmailVerificationRequest,
        ip_address: Optional[str] = None
    ) -> User:
        """Verify email address using token."""
        
        # Find user by verification token
        user = await self._get_user_by_verification_token(verification_request.token)
        if not user:
            raise ValidationError("Invalid or expired verification token")
        
        # Check token expiration
        if user.email_verification_expires < datetime.utcnow():
            raise ValidationError("Verification token has expired")
        
        # Mark email as verified and activate account
        user.email_verified = True
        user.is_active = True
        user.email_verification_token = None
        user.email_verification_expires = None
        user.onboarding_step = 1  # Move to first onboarding step
        
        # Create default organization if user is first in their "domain"
        if "@" in user.email:
            domain = user.email.split("@")[1]
            await self._create_default_organization(user, domain)
        
        await self.audit_service.log_action(
            user_id=user.id,
            action="EMAIL_VERIFIED",
            entity_type="user",
            entity_id=user.id,
            ip_address=ip_address
        )
        
        # Send welcome email
        await self.email_service.send_welcome_email(
            email=user.email,
            first_name=user.first_name
        )
        
        return user
    
    async def request_password_reset(
        self,
        email: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate and send password reset token."""
        
        user = await self._get_user_by_email(email)
        if not user:
            # Don't reveal if user exists
            return {"message": "If the email exists, a reset link has been sent"}
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        reset_expires = datetime.utcnow() + timedelta(hours=1)
        
        user.reset_password_token = reset_token
        user.reset_password_expires = reset_expires
        
        # Send reset email
        await self.email_service.send_password_reset_email(
            email=user.email,
            token=reset_token,
            first_name=user.first_name
        )
        
        await self.audit_service.log_action(
            user_id=user.id,
            action="PASSWORD_RESET_REQUESTED",
            entity_type="user",
            entity_id=user.id,
            ip_address=ip_address
        )
        
        return {"message": "If the email exists, a reset link has been sent"}
    
    async def reset_password(
        self,
        reset_request: PasswordResetRequest,
        ip_address: Optional[str] = None
    ) -> User:
        """Reset password using valid token."""
        
        user = await self._get_user_by_reset_token(reset_request.token)
        if not user:
            raise ValidationError("Invalid or expired reset token")
        
        # Check token expiration
        if user.reset_password_expires < datetime.utcnow():
            raise ValidationError("Reset token has expired")
        
        # Validate password strength
        if not self._is_strong_password(reset_request.new_password):
            raise ValidationError("Password must be at least 8 characters with letters, numbers, and special characters")
        
        # Update password
        user.password_hash = self._hash_password(reset_request.new_password)
        user.reset_password_token = None
        user.reset_password_expires = None
        
        await self.audit_service.log_action(
            user_id=user.id,
            action="PASSWORD_RESET_COMPLETED",
            entity_type="user",
            entity_id=user.id,
            ip_address=ip_address
        )
        
        return user
    
    async def refresh_access_token(
        self,
        refresh_token: str,
        ip_address: Optional[str] = None
    ) -> TokenResponse:
        """Generate new access token using refresh token."""
        
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            if not payload.get("refresh"):
                raise AuthenticationError("Invalid refresh token")
            user_id = payload.get("sub")
        except jwt.JWTError:
            raise AuthenticationError("Invalid refresh token")
        
        user = await self._get_user_by_id(user_id)
        if not user or not user.is_active:
            raise AuthenticationError("Invalid user")
        
        access_token = create_access_token(user.id)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,  # Return same refresh token
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    async def resend_verification_email(
        self,
        email: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Resend email verification token."""
        
        user = await self._get_user_by_email(email)
        if not user or user.email_verified:
            return {"message": "If email exists and is not verified, a new verification link has been sent"}
        
        # Generate new verification token
        verification_token = secrets.token_urlsafe(32)
        verification_expires = datetime.utcnow() + timedelta(hours=24)
        
        user.email_verification_token = verification_token
        user.email_verification_expires = verification_expires
        
        # Send verification email
        await self.email_service.send_verification_email(
            email=user.email,
            token=verification_token,
            first_name=user.first_name
        )
        
        await self.audit_service.log_action(
            user_id=user.id,
            action="VERIFICATION_EMAIL_RESENT",
            entity_type="user",
            entity_id=user.id,
            ip_address=ip_address
        )
        
        return {"message": "If email exists and is not verified, a new verification link has been sent"}
    
    # Helper Methods
    
    async def _get_user_by_email(self, email: str) -> Optional[User]:
        """Retrieve user by email address."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
    
    async def _get_user_by_id(self, user_id: str) -> Optional[User]:
        """Retrieve user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    
    async def _get_user_by_verification_token(self, token: str) -> Optional[User]:
        """Retrieve user by verification token."""
        result = await self.db.execute(
            select(User).where(
                and_(
                    User.email_verification_token == token,
                    User.email_verification_expires > datetime.utcnow()
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def _get_user_by_reset_token(self, token: str) -> Optional[User]:
        """Retrieve user by password reset token."""
        result = await self.db.execute(
            select(User).where(
                and_(
                    User.reset_password_token == token,
                    User.reset_password_expires > datetime.utcnow()
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def _get_user_by_social_id(self, provider: str, social_id: str) -> Optional[User]:
        """Retrieve user by social provider ID."""
        if provider == "google":
            result = await self.db.execute(select(User).where(User.google_id == social_id))
        elif provider == "microsoft":
            result = await self.db.execute(select(User).where(User.microsoft_id == social_id))
        else:
            return None
        return result.scalar_one_or_none()
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt."""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def _is_valid_email(self, email: str) -> bool:
        """Validate email format."""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def _is_strong_password(self, password: str) -> bool:
        """Check password strength."""
        if len(password) < 8:
            return False
        
        has_letter = bool(re.search(r'[a-zA-Z]', password))
        has_number = bool(re.search(r'\d', password))
        has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
        
        return has_letter and has_number and has_special
    
    async def _verify_recaptcha(self, token: str) -> bool:
        """Verify reCAPTCHA token."""
        # Implementation would call Google reCAPTCHA API
        # For now, return True (mock implementation)
        return True
    
    async def _check_rate_limit(self, key: str, identifier: Optional[str] = None) -> None:
        """Check rate limiting for given operation."""
        if settings.RATE_LIMITING_ENABLED:
            rate_key = f"{key}:{identifier}" if identifier else key
            if not await self.rate_limiter.check_limit(rate_key):
                raise RateLimitError("Too many requests")
    
    async def _handle_failed_login(self, user: User, ip_address: Optional[str] = None):
        """Handle failed login attempt with lockout logic."""
        user.failed_login_count += 1
        
        # Lock account after 5 failed attempts
        if user.failed_login_count >= 5:
            user.lockout_until = datetime.utcnow() + timedelta(minutes=15)
            
            await self.audit_service.log_action(
                user_id=user.id,
                action="ACCOUNT_LOCKED",
                entity_type="user",
                entity_id=user.id,
                ip_address=ip_address,
                metadata={"failed_attempts": user.failed_login_count}
            )
        
        await self.audit_service.log_action(
            user_id=user.id,
            action="LOGIN_FAILED",
            entity_type="user",
            entity_id=user.id,
            ip_address=ip_address,
            metadata={"failed_attempt": user.failed_login_count}
        )
    
    async def _verify_social_token(self, provider: str, token: str) -> Optional[Dict[str, Any]]:
        """Verify token with social provider."""
        # Implementation would verify token with Google/Microsoft APIs
        # Mock implementation for now
        return {
            "id": f"{provider}_12345",
            "email": f"test@{provider}.com",
            "first_name": "Test",
            "last_name": "User",
            "picture": "https://example.com/avatar.jpg"
        }
    
    async def _create_social_user(self, provider: str, user_info: Dict[str, Any]) -> User:
        """Create new user from social login data."""
        user = User(
            email=user_info["email"],
            first_name=user_info.get("first_name", ""),
            last_name=user_info.get("last_name", ""),
            google_id=user_info.get("id") if provider == "google" else None,
            microsoft_id=user_info.get("id") if provider == "microsoft" else None,
            avatar_url=user_info.get("picture"),
            is_active=True,
            email_verified=True,
            onboarding_step=1
        )
        
        self.db.add(user)
        await self.db.flush()
        
        return user
    
    async def _update_social_user(self, user: User, provider: str, user_info: Dict[str, Any]):
        """Update existing user with social login data."""
        if provider == "google":
            user.google_id = user_info["id"]
        elif provider == "microsoft":
            user.microsoft_id = user_info["id"]
        
        if not user.avatar_url:
            user.avatar_url = user_info.get("picture")
        
        user.last_login_at = datetime.utcnow()
    
    async def _create_default_organization(self, user: User, domain: str):
        """Create default organization for new verified user."""
        # Check if organization with this domain already exists
        existing_org = await self.db.execute(
            select(Organization).where(Organization.domain == domain)
        )
        
        if not existing_org.scalar_one_or_none():
            # Create new organization
            org_name = f"{user.first_name}'s Organization"
            org_slug = domain.split(".")[0]  # Use domain as slug
            
            organization = Organization(
                name=org_name,
                slug=org_slug,
                domain=domain,
                status="PENDING",
                is_active=False,
                setup_complete=False,
                subscription_plan="trial"
            )
            
            self.db.add(organization)
            await self.db.flush()
            
            # Link user to organization
            user.organization_id = organization.id
            user.role = "ADMIN"  # First user becomes admin


# Initialize service instance
def get_auth_service(db: AsyncSession) -> AuthService:
    return AuthService(db)