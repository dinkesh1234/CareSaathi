"""Role-Based Access Control (RBAC) authorization policies for CareSaathi.

Enforces strict backend authorization rules:
1. Cross-family isolation (anti-IDOR)
2. Family Owner administrative supremacy
3. Guardian-controlled access over Child profiles
4. Whitelist-based assigned access for Caregivers
5. Explicit permission delegation and revocation
"""

from fastapi import HTTPException, status

from app.auth import AuthenticatedUser
from app.schemas import AgeGroup, FamilyMemberProfile, Role


def enforce_profile_view_access(user: AuthenticatedUser, profile: FamilyMemberProfile) -> None:
    """Enforce read permission on a family member profile.

    Raises:
        HTTPException(403): If the user lacks authorization.
    """
    # Rule 1: Strict Cross-Family Isolation (Prevents IDOR)
    if user.family_id != profile.family_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cross-family profile access is prohibited.",
        )

    # Rule 2: Family Owner has oversight over all family profiles
    if user.role == Role.FAMILY_OWNER:
        return

    # Rule 3: Child Profile Access Protection
    if profile.age_group == AgeGroup.CHILD:
        is_guardian = (
            user.role == Role.PARENT_GUARDIAN or
            user.user_id in profile.guardian_user_ids
        )
        is_assigned_caregiver = (
            user.role == Role.CAREGIVER and
            user.user_id in profile.assigned_caregiver_ids
        )
        if not (is_guardian or is_assigned_caregiver):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Children's profiles require guardian-controlled authorization.",
            )
        return

    # Rule 4: Caregiver Scope (Whitelist only)
    if user.role == Role.CAREGIVER:
        if user.user_id not in profile.assigned_caregiver_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Caregiver is not assigned to this family profile.",
            )
        return

    # Rule 5: Parent/Guardian & Adult Member can view adult/senior profiles in same family
    if user.role in (Role.PARENT_GUARDIAN, Role.ADULT_MEMBER):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: Insufficient role permissions to view this profile.",
    )


def enforce_profile_edit_access(user: AuthenticatedUser, profile: FamilyMemberProfile) -> None:
    """Enforce write/update permission on a family member profile."""
    # Cross-family check
    if user.family_id != profile.family_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cross-family profile modification is prohibited.",
        )

    # Family Owner can edit any profile in family
    if user.role == Role.FAMILY_OWNER:
        return

    # Child profile can only be edited by authorized Guardian or assigned Caregiver
    if profile.age_group == AgeGroup.CHILD:
        is_guardian = (
            user.role == Role.PARENT_GUARDIAN or
            user.user_id in profile.guardian_user_ids
        )
        is_assigned_caregiver = (
            user.role == Role.CAREGIVER and
            user.user_id in profile.assigned_caregiver_ids
        )
        if not (is_guardian or is_assigned_caregiver):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Only guardians or assigned caregivers can update child records.",
            )
        return

    # Caregivers can update only assigned profiles
    if user.role == Role.CAREGIVER:
        if user.user_id not in profile.assigned_caregiver_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Caregiver lacks assigned edit permissions for this profile.",
            )
        return

    # Adult members / guardians can edit profiles in family
    if user.role in (Role.PARENT_GUARDIAN, Role.ADULT_MEMBER):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: Insufficient permissions to modify this profile.",
    )


def enforce_profile_create_access(user: AuthenticatedUser, age: int) -> None:
    """Enforce profile creation permissions."""
    if user.role not in (Role.FAMILY_OWNER, Role.PARENT_GUARDIAN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only Family Owners or Parent/Guardians can create family profiles.",
        )


def enforce_profile_delete_access(user: AuthenticatedUser, profile: FamilyMemberProfile) -> None:
    """Enforce profile deletion permissions."""
    if user.family_id != profile.family_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cross-family profile deletion is prohibited.",
        )

    # Only Family Owner or Guardian of child profile can delete
    if user.role == Role.FAMILY_OWNER:
        return

    if profile.age_group == AgeGroup.CHILD and (
        user.role == Role.PARENT_GUARDIAN or user.user_id in profile.guardian_user_ids
    ):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: Only Family Owners or Child Guardians can delete profiles.",
    )


def enforce_caregiver_permission_management(user: AuthenticatedUser, profile: FamilyMemberProfile) -> None:
    """Enforce permission to assign or revoke caregiver access."""
    if user.family_id != profile.family_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cross-family permission management is prohibited.",
        )

    # Caregivers cannot manage caregiver permissions
    if user.role == Role.CAREGIVER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Caregivers cannot grant or revoke access permissions.",
        )

    if user.role == Role.FAMILY_OWNER:
        return

    if profile.age_group == AgeGroup.CHILD and (
        user.role == Role.PARENT_GUARDIAN or user.user_id in profile.guardian_user_ids
    ):
        return

    if user.role == Role.PARENT_GUARDIAN:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: Only Family Owners or Guardians can manage caregiver access.",
    )
