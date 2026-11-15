"""Medications API Router for CareSaathi.

Manages family medication schedules, dosages, refill intervals, and user-reported
status tracking with strict healthcare disclaimers and RBAC filtering.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user_id
from app.rbac import enforce_profile_edit_access, enforce_profile_view_access
from app.repository import repository
from app.schemas import (
    MedicationCreateRequest,
    MedicationItem,
    MedicationStatusUpdateRequest,
    MedicationUpdateRequest,
    Role,
)

router = APIRouter(prefix="/api/medications", tags=["Medications"])


def _resolve_authenticated_user(user_id: str):
    user = repository.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
        )
    return user


@router.get("", response_model=List[MedicationItem])
async def list_medications(
    profile_id: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id),
) -> List[MedicationItem]:
    """List scheduled medications for the authenticated user's family with RBAC filtering."""
    user = _resolve_authenticated_user(user_id)
    all_meds = repository.list_medications(user.family_id, profile_id=profile_id)

    # Filter according to RBAC view rules
    permitted = []
    for med in all_meds:
        profile = repository.get_profile_by_id(med.profile_id)
        if not profile:
            continue
        try:
            enforce_profile_view_access(user, profile)
            permitted.append(med)
        except HTTPException:
            continue
    return permitted


@router.post("", response_model=MedicationItem, status_code=status.HTTP_201_CREATED)
async def create_medication(
    payload: MedicationCreateRequest,
    user_id: str = Depends(get_current_user_id),
) -> MedicationItem:
    """Schedule a new medication for a family member (Owners and Guardians only)."""
    user = _resolve_authenticated_user(user_id)
    profile = repository.get_profile_by_id(payload.profile_id)
    if not profile or profile.family_id != user.family_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family profile not found.")

    enforce_profile_edit_access(user, profile)

    return repository.create_medication(
        family_id=user.family_id,
        profile_id=payload.profile_id,
        name=payload.name,
        dosage=payload.dosage,
        schedule_time=payload.schedule_time,
        frequency=payload.frequency,
        refill_days_left=payload.refill_days_left,
        instructions=payload.instructions,
    )


@router.put("/{medication_id}", response_model=MedicationItem)
async def update_medication(
    medication_id: str,
    payload: MedicationUpdateRequest,
    user_id: str = Depends(get_current_user_id),
) -> MedicationItem:
    """Update scheduled medication details."""
    user = _resolve_authenticated_user(user_id)
    med = repository.get_medication(medication_id)
    if not med or med.family_id != user.family_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication record not found.")

    profile = repository.get_profile_by_id(med.profile_id)
    if profile:
        enforce_profile_edit_access(user, profile)

    updated = repository.update_medication(medication_id, payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found.")
    return updated


@router.post("/{medication_id}/status", response_model=MedicationItem)
async def record_medication_status(
    medication_id: str,
    payload: MedicationStatusUpdateRequest,
    user_id: str = Depends(get_current_user_id),
) -> MedicationItem:
    """Record user-reported medication status with audit timestamp.
    
    Clinical Safety Rule: Records status as reported by the user or caregiver.
    CareSaathi does not verify actual clinical ingestion.
    """
    user = _resolve_authenticated_user(user_id)
    med = repository.get_medication(medication_id)
    if not med or med.family_id != user.family_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication record not found.")

    profile = repository.get_profile_by_id(med.profile_id)
    if profile:
        enforce_profile_view_access(user, profile)

    updated = repository.update_medication_status(
        medication_id=medication_id,
        status=payload.status,
        user_id=user.user_id,
        notes=payload.confirmation_notes,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found.")
    return updated


@router.delete("/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medication(
    medication_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Delete a scheduled medication entry."""
    user = _resolve_authenticated_user(user_id)
    med = repository.get_medication(medication_id)
    if not med or med.family_id != user.family_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication record not found.")

    profile = repository.get_profile_by_id(med.profile_id)
    if profile:
        enforce_profile_edit_access(user, profile)

    repository.delete_medication(medication_id)
    return None
