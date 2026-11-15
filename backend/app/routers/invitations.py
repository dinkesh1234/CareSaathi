"""Family Circle Invitations API Router."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user_id
from app.repository import repository
from app.schemas import (
    FamilyInvitation,
    InvitationCreateRequest,
    Role,
)
from app.services.resend_service import resend_service

router = APIRouter(prefix="/api/family/invitations", tags=["Family Invitations"])


def _resolve_authenticated_user(user_id: str):
    user = repository.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or expired.",
        )
    return user


@router.get("", response_model=List[FamilyInvitation])
async def list_family_invitations(user_id: str = Depends(get_current_user_id)) -> List[FamilyInvitation]:
    """List pending and historical invitations for the authenticated user's family."""
    user = _resolve_authenticated_user(user_id)
    return repository.list_invitations(user.family_id)


@router.post("", response_model=FamilyInvitation, status_code=status.HTTP_201_CREATED)
async def create_family_invitation(
    req: InvitationCreateRequest,
    user_id: str = Depends(get_current_user_id),
) -> FamilyInvitation:
    """Invite a family member or caregiver by email (Family Owner & Guardians only)."""
    user = _resolve_authenticated_user(user_id)
    if user.role not in (Role.FAMILY_OWNER, Role.PARENT_GUARDIAN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only Family Owners or Guardians can send invitations.",
        )

    # Determine family name (e.g., from owner or user's last name)
    family_name = f"{user.full_name.split()[-1]} Care Circle" if user.full_name else "Family Care Circle"

    inv = repository.create_invitation(
        family_id=user.family_id,
        family_name=family_name,
        invited_by_user_id=user.user_id,
        invited_by_name=user.full_name,
        invitee_email=str(req.invitee_email),
        role=req.role,
        target_profile_id=req.target_profile_id,
        relationship=req.relationship or "Family Member",
    )

    # Try sending email notification via Resend service
    if resend_service.is_configured:
        try:
            await resend_service.send_invitation_email(
                to_email=str(req.invitee_email),
                inviter_name=user.full_name,
                family_name=family_name,
                invitation_link=inv.invitation_link,
                role=req.role.value,
            )
        except Exception:
            pass

    return inv


@router.get("/{token}", response_model=FamilyInvitation)
async def get_invitation_details(token: str) -> FamilyInvitation:
    """Public endpoint to inspect invitation details before accepting."""
    inv = repository.get_invitation_by_token(token)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation token not found or invalid.",
        )
    return inv


@router.post("/{token}/accept", response_model=FamilyInvitation)
async def accept_family_invitation(
    token: str,
    user_id: str = Depends(get_current_user_id),
) -> FamilyInvitation:
    """Accept an invitation to join a family care circle."""
    user = _resolve_authenticated_user(user_id)
    inv = repository.get_invitation_by_token(token)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation token not found.",
        )

    if inv.status.value != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This invitation is already {inv.status.value}.",
        )

    # Verify that the authenticated user's email matches the invitee email
    if user.email.lower().strip() != inv.invitee_email.lower().strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Signed-in email ({user.email}) does not match the invited address ({inv.invitee_email}).",
        )

    accepted_inv = repository.accept_invitation(token, user.user_id, user.email)
    if not accepted_inv:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to accept invitation. Please check token or permissions.",
        )

    return accepted_inv


@router.delete("/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invitation(
    invitation_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Cancel a pending invitation (Family Owner only)."""
    user = _resolve_authenticated_user(user_id)
    if user.role != Role.FAMILY_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only Family Owners can cancel invitations.",
        )

    success = repository.cancel_invitation(invitation_id, user.family_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
