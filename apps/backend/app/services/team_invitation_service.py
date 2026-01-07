"""
Team Invitation Service
Handles team member invitations, role management, and bulk imports
"""

import asyncio
import csv
import io
import json
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from email_validator import validate_email, EmailNotValidError

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from app.db.models.user import User
from app.db.models.organization import Organization
from app.db.models.team_invitation import TeamInvitation
from app.services.audit_service import AuditService
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService
from app.schemas.team_invitation import (
    TeamInvitationCreate,
    TeamInvitationResponse,
    TeamInvitationUpdate,
    InvitationFilterParams,
    BulkImportResult
)
from app.core.config import settings
from app.core.exceptions import (
    ValidationError,
    NotFoundError,
    PermissionError,
    RateLimitError,
    EmailAlreadyExistsError
)


class TeamInvitationService:
    """Service for managing team invitations and member onboarding."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_service = AuditService(db)
        self.email_service = EmailService()
        self.notification_service = NotificationService()
    
    async def create_invitation(
        self,
        inviter_id: str,
        invitation_data: TeamInvitationCreate,
        ip_address: Optional[str] = None
    ) -> TeamInvitation:
        """Create a new team invitation."""
        
        # Validate email format
        try:
            valid = validate_email(invitation_data.email)
            normalized_email = valid.email
        except EmailNotValidError:
            raise ValidationError("Invalid email format")
        
        # Check if inviter has permission
        inviter = await self._get_user_by_id(inviter_id)
        if not inviter:
            raise NotFoundError("Inviter not found")
        
        # Check if inviter belongs to the organization
        if inviter.organization_id != invitation_data.organization_id:
            raise PermissionError("You can only invite members to your own organization")
        
        # Verify inviter has sufficient permissions (must be admin or manager)
        await self._verify_invitation_permissions(
            inviter_id,
            invitation_data.organization_id,
            invitation_data.role
        )
        
        # Check if user already exists in organization
        existing_user = await self._get_user_by_email(normalized_email)
        if existing_user and existing_user.organization_id == invitation_data.organization_id:
            raise EmailAlreadyExistsError("User is already a member of this organization")
        
        # Check if invitation already exists
        existing_invitation = await self._get_pending_invitation(
            normalized_email,
            invitation_data.organization_id
        )
        if existing_invitation:
            raise ValidationError("An active invitation already exists for this email")
        
        # Generate invitation token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=settings.INVITATION_EXPIRE_DAYS)
        
        # Create invitation
        invitation = TeamInvitation(
            email=normalized_email,
            organization_id=invitation_data.organization_id,
            role=invitation_data.role,
            permissions=invitation_data.permissions,
            status="PENDING",
            expires_at=expires_at,
            inviter_id=inviter_id,
            token=token
        )
        
        self.db.add(invitation)
        await self.db.flush()
        
        # Get organization details for email
        organization = await self._get_organization_by_id(invitation_data.organization_id)
        
        # Send invitation email
        await self.email_service.send_team_invitation_email(
            email=normalized_email,
            inviter_name=f"{inviter.first_name} {inviter.last_name}",
            organization_name=organization.name,
            role=invitation_data.role,
            token=token
        )
        
        # Create audit log
        await self.audit_service.log_action(
            user_id=inviter_id,
            organization_id=invitation_data.organization_id,
            action="TEAM_INVITATION_CREATED",
            entity_type="team_invitation",
            entity_id=invitation.id,
            ip_address=ip_address,
            metadata={
                "invited_email": normalized_email,
                "role": invitation_data.role,
                "expires_at": expires_at.isoformat()
            }
        )
        
        return invitation
    
    async def accept_invitation(
        self,
        token: str,
        user_data: Dict[str, Any],
        ip_address: Optional[str] = None
    ) -> Tuple[User, TeamInvitation]:
        """Accept a team invitation and create user account."""
        
        # Find valid invitation
        invitation = await self._get_valid_invitation(token)
        if not invitation:
            raise ValidationError("Invalid or expired invitation")
        
        # Check if email matches invitation
        if user_data.get("email") != invitation.email:
            raise ValidationError("Email does not match invitation")
        
        # Check if user already exists
        existing_user = await self._get_user_by_email(invitation.email)
        if existing_user:
            # User exists - add to organization if not already a member
            if not existing_user.organization_id:
                existing_user.organization_id = invitation.organization_id
                existing_user.role = invitation.role
                existing_user.permissions = invitation.permissions
                existing_user.is_active = True
                
                invitation.status = "ACCEPTED"
                invitation.accepted_at = datetime.utcnow()
                
                # Log acceptance
                await self.audit_service.log_action(
                    user_id=existing_user.id,
                    organization_id=invitation.organization_id,
                    action="INVITATION_ACCEPTED_EXISTING_USER",
                    entity_type="team_invitation",
                    entity_id=invitation.id,
                    ip_address=ip_address
                )
                
                return existing_user, invitation
            else:
                raise ValidationError("User is already part of an organization")
        
        # Create new user
        password_hash = self._hash_password(user_data["password"])
        
        user = User(
            email=invitation.email,
            first_name=user_data.get("first_name", ""),
            last_name=user_data.get("last_name", ""),
            password_hash=password_hash,
            organization_id=invitation.organization_id,
            role=invitation.role,
            permissions=invitation.permissions,
            is_active=True,
            email_verified=True,  # Email is verified by invitation acceptance
            onboarding_step=0
        )
        
        self.db.add(user)
        await self.db.flush()
        
        # Update invitation
        invitation.status = "ACCEPTED"
        invitation.accepted_at = datetime.utcnow()
        
        # Send welcome email
        await self.email_service.send_welcome_email(
            email=user.email,
            first_name=user.first_name,
            organization_name=invitation.organization.name
        )
        
        # Log acceptance
        await self.audit_service.log_action(
            user_id=user.id,
            organization_id=invitation.organization_id,
            action="INVITATION_ACCEPTED_NEW_USER",
            entity_type="team_invitation",
            entity_id=invitation.id,
            ip_address=ip_address
        )
        
        # Notify inviter
        await self.notification_service.send_notification(
            user_id=invitation.inviter_id,
            type="team_invitation_accepted",
            title="Team Member Joined",
            message=f"{user.first_name} {user.last_name} has joined your organization",
            metadata={
                "joined_user_id": user.id,
                "invitation_id": invitation.id
            }
        )
        
        return user, invitation
    
    async def revoke_invitation(
        self,
        invitation_id: str,
        revoked_by: str,
        ip_address: Optional[str] = None
    ) -> TeamInvitation:
        """Revoke a pending team invitation."""
        
        invitation = await self._get_invitation_by_id(invitation_id)
        if not invitation:
            raise NotFoundError("Invitation not found")
        
        # Verify permission to revoke
        await self._verify_invitation_permissions(
            revoked_by,
            invitation.organization_id,
            "ADMIN"  # Need admin to revoke
        )
        
        if invitation.status != "PENDING":
            raise ValidationError("Only pending invitations can be revoked")
        
        # Revoke invitation
        invitation.status = "REVOKED"
        invitation.updated_at = datetime.utcnow()
        
        await self.audit_service.log_action(
            user_id=revoked_by,
            organization_id=invitation.organization_id,
            action="INVITATION_REVOKED",
            entity_type="team_invitation",
            entity_id=invitation.id,
            ip_address=ip_address,
            metadata={"email": invitation.email}
        )
        
        return invitation
    
    async def resend_invitation(
        self,
        invitation_id: str,
        requested_by: str,
        ip_address: Optional[str] = None
    ) -> TeamInvitation:
        """Resend a pending invitation with new token."""
        
        invitation = await self._get_invitation_by_id(invitation_id)
        if not invitation:
            raise NotFoundError("Invitation not found")
        
        # Verify permission
        user = await self._get_user_by_id(requested_by)
        if user.organization_id != invitation.organization_id:
            raise PermissionError("You can only resend invitations from your organization")
        
        if invitation.status != "PENDING":
            raise ValidationError("Only pending invitations can be resent")
        
        # Generate new token and extend expiration
        invitation.token = secrets.token_urlsafe(32)
        invitation.expires_at = datetime.utcnow() + timedelta(days=settings.INVITATION_EXPIRE_DAYS)
        invitation.updated_at = datetime.utcnow()
        
        # Get organization and inviter details for email
        organization = await self._get_organization_by_id(invitation.organization_id)
        inviter = await self._get_user_by_id(invitation.inviter_id)
        
        # Resend invitation email
        await self.email_service.send_team_invitation_email(
            email=invitation.email,
            inviter_name=f"{inviter.first_name} {inviter.last_name}",
            organization_name=organization.name,
            role=invitation.role,
            token=invitation.token
        )
        
        await self.audit_service.log_action(
            user_id=requested_by,
            organization_id=invitation.organization_id,
            action="INVITATION_RESENT",
            entity_type="team_invitation",
            entity_id=invitation.id,
            ip_address=ip_address,
            metadata={"email": invitation.email}
        )
        
        return invitation
    
    async def bulk_import_from_csv(
        self,
        organization_id: str,
        inviter_id: str,
        csv_content: bytes,
        ip_address: Optional[str] = None
    ) -> BulkImportResult:
        """Import team members from CSV file."""
        
        # Verify permissions
        await self._verify_invitation_permissions(inviter_id, organization_id, "MANAGER")
        
        # Parse CSV
        csv_file = io.StringIO(csv_content.decode('utf-8'))
        reader = csv.DictReader(csv_file)
        
        results = BulkImportResult(total=0, success=0, failed=0, errors=[])
        
        for row_num, row in enumerate(reader, start=2):  # Start at 2 to account for header row
            try:
                # Validate required fields
                if not row.get('email'):
                    raise ValidationError("Email is required")
                
                if not row.get('role'):
                    raise ValidationError("Role is required")
                
                # Create invitation
                invitation_data = TeamInvitationCreate(
                    email=row['email'].strip(),
                    organization_id=organization_id,
                    role=row['role'].strip().upper(),
                    permissions=json.loads(row.get('permissions', '{}')) if row.get('permissions') else None
                )
                
                await self.create_invitation(
                    inviter_id=inviter_id,
                    invitation_data=invitation_data,
                    ip_address=ip_address
                )
                
                results.success += 1
                
            except Exception as e:
                results.failed += 1
                results.errors.append(f"Row {row_num}: {str(e)}")
            
            results.total += 1
        
        # Log bulk import
        await self.audit_service.log_action(
            user_id=inviter_id,
            organization_id=organization_id,
            action="BULK_TEAM_IMPORT",
            entity_type="organization",
            entity_id=organization_id,
            ip_address=ip_address,
            metadata={
                "total": results.total,
                "success": results.success,
                "failed": results.failed
            }
        )
        
        return results
    
    async def list_team_members(
        self,
        organization_id: str,
        requested_by: str,
        filters: Optional[InvitationFilterParams] = None
    ) -> List[Dict[str, Any]]:
        """List all team members and their invitation status."""
        
        # Verify access
        await self._verify_invitation_permissions(requested_by, organization_id, "USER")
        
        # Get organization users
        result = await self.db.execute(
            select(User).where(
                and_(
                    User.organization_id == organization_id,
                    User.is_active == True
                )
            ).order_by(User.created_at.desc())
        )
        users = result.scalars().all()
        
        # Get pending invitations
        result = await self.db.execute(
            select(TeamInvitation).where(
                and_(
                    TeamInvitation.organization_id == organization_id,
                    TeamInvitation.status == "PENDING",
                    TeamInvitation.expires_at > datetime.utcnow()
                )
            ).order_by(TeamInvitation.created_at.desc())
        )
        pending_invitations = result.scalars().all()
        
        # Combine users and pending invitations
        team_members = []
        
        for user in users:
            team_members.append({
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "is_active": user.is_active,
                "status": "ACTIVE",
                "joined_at": user.created_at,
                "last_login_at": user.last_login_at,
                "avatar_url": user.avatar_url,
                "department": user.department,
                "job_title": user.job_title
            })
        
        for invitation in pending_invitations:
            team_members.append({
                "id": invitation.id,
                "email": invitation.email,
                "first_name": None,
                "last_name": None,
                "role": invitation.role,
                "is_active": False,
                "status": "PENDING_INVITATION",
                "invited_at": invitation.created_at,
                "invited_by": invitation.inviter_id,
                "expires_at": invitation.expires_at
            })
        
        return team_members
    
    async def update_team_member_role(
        self,
        user_id: str,
        target_user_id: str,
        new_role: str,
        ip_address: Optional[str] = None
    ) -> User:
        """Update team member role (requires admin permissions)."""
        
        # Get users
        requesting_user = await self._get_user_by_id(user_id)
        target_user = await self._get_user_by_id(target_user_id)
        
        if not requesting_user or not target_user:
            raise NotFoundError("User not found")
        
        # Verify both users are in same organization
        if requesting_user.organization_id != target_user.organization_id:
            raise PermissionError("Users must be in the same organization")
        
        # Verify requesting user has permission (must be admin)
        if requesting_user.role != "ADMIN":
            raise PermissionError("Only admins can change user roles")
        
        # Cannot change own role
        if requesting_user.id == target_user_id:
            raise BadRequestError("Cannot change your own role")
        
        # Update role
        old_role = target_user.role
        target_user.role = new_role.upper()
        
        # Log role change
        await self.audit_service.log_action(
            user_id=user_id,
            organization_id=requesting_user.organization_id,
            action="USER_ROLE_CHANGED",
            entity_type="user",
            entity_id=target_user_id,
            ip_address=ip_address,
            old_values={"role": old_role},
            new_values={"role": new_role.upper()}
        )
        
        # Send notification to affected user
        await self.notification_service.send_notification(
            user_id=target_user_id,
            type="role_changed",
            title="Role Updated",
            message=f"Your role has been changed to {new_role.upper()}",
            metadata={
                "changed_by": user_id,
                "old_role": old_role,
                "new_role": new_role.upper()
            }
        )
        
        return target_user
    
    async def remove_team_member(
        self,
        user_id: str,
        target_user_id: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Remove team member from organization (soft delete)."""
        
        requesting_user = await self._get_user_by_id(user_id)
        target_user = await self._get_user_by_id(target_user_id)
        
        if not requesting_user or not target_user:
            raise NotFoundError("User not found")
        
        # Verify permissions
        if requesting_user.organization_id != target_user.organization_id:
            raise PermissionError("Users must be in the same organization")
        
        # Admin can remove anyone, manager can only remove users/agents, users can only remove themselves
        can_remove = False
        
        if requesting_user.role == "ADMIN":
            can_remove = True
        elif requesting_user.role == "MANAGER":
            can_remove = target_user.role in ["USER", "AGENT", "VIEWER"]
        elif requesting_user.id == target_user_id:
            can_remove = True
        
        if not can_remove:
            raise PermissionError("Insufficient permissions to remove this user")
        
        # Soft delete - deactivate user and remove from organization
        target_user.is_active = False
        target_user.organization_id = None
        target_user.role = "USER"
        target_user.permissions = None
        
        await self.audit_service.log_action(
            user_id=user_id,
            action="USER_REMOVED_FROM_ORGANIZATION",
            entity_type="user",
            entity_id=target_user_id,
            ip_address=ip_address,
            metadata={
                "organization_id": requesting_user.organization_id,
                "removed_by": user_id
            }
        )
        
        return {
            "success": True,
            "user_id": target_user_id,
            "message": "User has been removed from the organization"
        }
    
    # Helper methods
    
    async def _get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    
    async def _get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
    
    async def _get_organization_by_id(self, organization_id: str) -> Optional[Organization]:
        """Get organization by ID."""
        result = await self.db.execute(select(Organization).where(Organization.id == organization_id))
        return result.scalar_one_or_none()
    
    async def _get_invitation_by_id(self, invitation_id: str) -> Optional[TeamInvitation]:
        """Get invitation by ID."""
        result = await self.db.execute(
            select(TeamInvitation).where(TeamInvitation.id == invitation_id)
        )
        return result.scalar_one_or_none()
    
    async def _get_valid_invitation(self, token: str) -> Optional[TeamInvitation]:
        """Get valid (non-expired) invitation by token."""
        result = await self.db.execute(
            select(TeamInvitation).where(
                and_(
                    TeamInvitation.token == token,
                    TeamInvitation.status == "PENDING",
                    TeamInvitation.expires_at > datetime.utcnow()
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def _get_pending_invitation(self, email: str, organization_id: str) -> Optional[TeamInvitation]:
        """Get pending invitation by email and organization."""
        result = await self.db.execute(
            select(TeamInvitation).where(
                and_(
                    TeamInvitation.email == email,
                    TeamInvitation.organization_id == organization_id,
                    TeamInvitation.status == "PENDING",
                    TeamInvitation.expires_at > datetime.utcnow()
                )
            )
        )
        return result.scalar_one_or_none()
    
    def _hash_password(self, password: str) -> str:
        """Hash password."""
        # Import here to avoid circular dependency
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.hash(password)
    
    async def _verify_invitation_permissions(
        self,
        user_id: str,
        organization_id: str,
        target_role: str
    ):
        """Verify user has permission to invite with given role."""
        
        user = await self._get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        if user.organization_id != organization_id:
            raise PermissionError("User not part of this organization")
        
        # Role hierarchy - who can invite whom
        role_hierarchy = {
            "ADMIN": ["ADMIN", "MANAGER", "AGENT", "USER", "VIEWER"],
            "MANAGER": ["AGENT", "USER", "VIEWER"],
            "AGENT": ["USER", "VIEWER"],
            "USER": ["VIEWER"],
            "VIEWER": []
        }
        
        user_permissions = role_hierarchy.get(user.role, [])
        
        if target_role.upper() not in [role.upper() for role in user_permissions]:
            raise PermissionError(f"You don't have permission to invite users with role '{target_role}'")
    
    async def get_invitation_stats(self, organization_id: str, user_id: str) -> Dict[str, Any]:
        """Get invitation statistics for organization."""
        
        await self._verify_invitation_permissions(user_id, organization_id, "USER")
        
        # Count invitations by status
        result = await self.db.execute(
            select(
                TeamInvitation.status,
                func.count(TeamInvitation.id).label("count")
            ).where(TeamInvitation.organization_id == organization_id)
            .group_by(TeamInvitation.status)
        )
        
        stats = result.all()
        invitation_counts = {row.status: row.count for row in stats}
        
        return {
            "total": sum(invitation_counts.values()),
            "pending": invitation_counts.get("PENDING", 0),
            "accepted": invitation_counts.get("ACCEPTED", 0),
            "declined": invitation_counts.get("DECLINED", 0),
            "expired": invitation_counts.get("EXPIRED", 0),
            "revoked": invitation_counts.get("REVOKED", 0)
        }


def get_team_invitation_service(db: AsyncSession) -> TeamInvitationService:
    return TeamInvitationService(db)