"""Family Profiles API Router with Backend-Enforced Role-Based Access Control."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user_id
from app.rbac import (
    enforce_caregiver_permission_management,
    enforce_profile_create_access,
    enforce_profile_delete_access,
    enforce_profile_edit_access,
    enforce_profile_view_access,
)
from app.repository import repository
from app.schemas import (
    AgeGroup,
    CaregiverAssignmentRequest,
    FamilyMemberProfile,
    ProfileCreateRequest,
    ProfileUpdateRequest,
    Role,
)

router = APIRouter(prefix="/api/family/profiles", tags=["Family Profiles"])


def _resolve_authenticated_user(user_id: str):
    """Helper to fetch and validate authenticated user."""
    user = repository.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session belongs to a user account that no longer exists.",
        )
    return user


@router.get("", response_model=List[FamilyMemberProfile])
async def list_profiles(user_id: str = Depends(get_current_user_id)) -> List[FamilyMemberProfile]:
    """List family member profiles that the authenticated user is permitted to view."""
    user = _resolve_authenticated_user(user_id)
    family_profiles = repository.list_family_profiles(user.family_id)

    # Filter according to RBAC view rules
    authorized_profiles = []
    for profile in family_profiles:
        try:
            enforce_profile_view_access(user, profile)
            authorized_profiles.append(profile)
        except HTTPException:
            # User lacks permission for this specific profile (e.g. unassigned caregiver or child restriction)
            continue

    return authorized_profiles


@router.get("/{profile_id}", response_model=FamilyMemberProfile)
async def get_profile(profile_id: str, user_id: str = Depends(get_current_user_id)) -> FamilyMemberProfile:
    """Retrieve a single family profile with strict backend RBAC authorization."""
    user = _resolve_authenticated_user(user_id)
    profile = repository.get_profile_by_id(profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member profile not found.")

    # Enforce access policy
    enforce_profile_view_access(user, profile)
    return profile


@router.post("", response_model=FamilyMemberProfile, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_in: ProfileCreateRequest,
    user_id: str = Depends(get_current_user_id),
) -> FamilyMemberProfile:
    """Create a new family member profile (Restricted to Family Owner & Parent/Guardians)."""
    user = _resolve_authenticated_user(user_id)
    enforce_profile_create_access(user, profile_in.age)

    # If Child profile, ensure creating user is registered as a guardian
    guardians = profile_in.guardian_user_ids or []
    if profile_in.age < 18 and user.user_id not in guardians:
        guardians.append(user.user_id)

    return repository.create_profile(
        family_id=user.family_id,
        full_name=profile_in.full_name,
        age=profile_in.age,
        relationship=profile_in.relationship,
        blood_group=profile_in.blood_group,
        emergency_contact=profile_in.emergency_contact,
        allergies=profile_in.allergies,
        care_notes=profile_in.care_notes,
        guardian_user_ids=guardians,
    )


@router.put("/{profile_id}", response_model=FamilyMemberProfile)
async def update_profile(
    profile_id: str,
    updates: ProfileUpdateRequest,
    user_id: str = Depends(get_current_user_id),
) -> FamilyMemberProfile:
    """Update family profile details with backend permission check."""
    user = _resolve_authenticated_user(user_id)
    profile = repository.get_profile_by_id(profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member profile not found.")

    enforce_profile_edit_access(user, profile)

    updated = repository.update_profile(profile_id, updates.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update profile.")
    return updated


@router.delete("/{profile_id}", status_code=status.HTTP_200_OK)
async def delete_profile(profile_id: str, user_id: str = Depends(get_current_user_id)) -> dict:
    """Delete a family member profile (Restricted to Family Owner & Child Guardians)."""
    user = _resolve_authenticated_user(user_id)
    profile = repository.get_profile_by_id(profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member profile not found.")

    enforce_profile_delete_access(user, profile)
    repository.delete_profile(profile_id)
    return {"success": True, "message": f"Profile '{profile.full_name}' deleted successfully."}


@router.post("/{profile_id}/assign-caregiver", response_model=FamilyMemberProfile)
async def assign_caregiver(
    profile_id: str,
    req: CaregiverAssignmentRequest,
    user_id: str = Depends(get_current_user_id),
) -> FamilyMemberProfile:
    """Assign caregiver access to a profile (Restricted to Family Owner or Guardian)."""
    user = _resolve_authenticated_user(user_id)
    profile = repository.get_profile_by_id(profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member profile not found.")

    enforce_caregiver_permission_management(user, profile)

    caregiver = repository.get_user_by_id(req.caregiver_user_id)
    if not caregiver or caregiver.family_id != user.family_id or caregiver.role != Role.CAREGIVER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Designated user is not a recognized caregiver in this family.",
        )

    assigned = list(profile.assigned_caregiver_ids)
    if req.caregiver_user_id not in assigned:
        assigned.append(req.caregiver_user_id)

    updated = repository.update_profile(profile_id, {"assigned_caregiver_ids": assigned})
    return updated


@router.post("/{profile_id}/revoke-caregiver", response_model=FamilyMemberProfile)
async def revoke_caregiver(
    profile_id: str,
    req: CaregiverAssignmentRequest,
    user_id: str = Depends(get_current_user_id),
) -> FamilyMemberProfile:
    """Revoke caregiver access from a profile (Restricted to Family Owner or Guardian)."""
    user = _resolve_authenticated_user(user_id)
    profile = repository.get_profile_by_id(profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member profile not found.")

    enforce_caregiver_permission_management(user, profile)

    assigned = [cid for cid in profile.assigned_caregiver_ids if cid != req.caregiver_user_id]
    updated = repository.update_profile(profile_id, {"assigned_caregiver_ids": assigned})
    return updated
