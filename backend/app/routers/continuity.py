"""Care Continuity Engine & Handoffs Router for CareSaathi.

Enforces continuity of care by detecting care gaps from stored data (pending medications,
unaccompanied appointments, unacknowledged caregiver shifts) and coordinating responsibilities.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.auth import get_current_user_id
from app.rbac import enforce_profile_view_access
from app.repository import repository
from app.schemas import (
    CareActivityRecord,
    CaregiverHandoff,
    CaregiverHandoffCreateRequest,
    CareContinuityOverview,
)

router = APIRouter(prefix="/api/continuity", tags=["Care Continuity Engine"])


class GapResolveRequest(BaseModel):
    notes: Optional[str] = None


def _resolve_authenticated_user(user_id: str):
    user = repository.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
        )
    return user


@router.get("/overview", response_model=CareContinuityOverview)
async def get_care_continuity_overview(
    user_id: str = Depends(get_current_user_id),
) -> CareContinuityOverview:
    """Retrieve the live Care Continuity overview computed directly from stored family data."""
    user = _resolve_authenticated_user(user_id)
    overview = repository.get_care_continuity_overview(user.family_id)
    return overview


@router.get("/handoffs", response_model=List[CaregiverHandoff])
async def list_handoffs(
    profile_id: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id),
) -> List[CaregiverHandoff]:
    """List caregiver shift handoffs for the user's family."""
    user = _resolve_authenticated_user(user_id)
    return repository.list_handoffs(user.family_id, profile_id=profile_id)


@router.post("/handoffs", response_model=CaregiverHandoff, status_code=status.HTTP_201_CREATED)
async def create_handoff(
    payload: CaregiverHandoffCreateRequest,
    user_id: str = Depends(get_current_user_id),
) -> CaregiverHandoff:
    """Log a new caregiver shift handoff note."""
    user = _resolve_authenticated_user(user_id)
    profile = repository.get_profile_by_id(payload.profile_id)
    if not profile or profile.family_id != user.family_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family profile not found.")

    enforce_profile_view_access(user, profile)

    return repository.create_handoff(
        family_id=user.family_id,
        profile_id=payload.profile_id,
        shift_type=payload.shift_type,
        from_caregiver_name=payload.from_caregiver_name,
        to_caregiver_name=payload.to_caregiver_name,
        to_caregiver_id=payload.to_caregiver_id,
        priority=payload.priority,
        handoff_notes=payload.handoff_notes,
    )


@router.post("/handoffs/{handoff_id}/acknowledge", response_model=CaregiverHandoff)
async def acknowledge_handoff(
    handoff_id: str,
    user_id: str = Depends(get_current_user_id),
) -> CaregiverHandoff:
    """Acknowledge acceptance of a caregiver shift handoff."""
    user = _resolve_authenticated_user(user_id)
    updated = repository.acknowledge_handoff(handoff_id, user.user_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handoff record not found.")
    return updated


@router.post("/handoffs/{handoff_id}/complete", response_model=CaregiverHandoff)
async def complete_handoff(
    handoff_id: str,
    user_id: str = Depends(get_current_user_id),
) -> CaregiverHandoff:
    """Mark a caregiver shift handoff completed."""
    user = _resolve_authenticated_user(user_id)
    updated = repository.complete_handoff(handoff_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handoff record not found.")
    return updated


@router.post("/gaps/{alert_id}/resolve")
async def resolve_care_gap(
    alert_id: str,
    payload: GapResolveRequest,
    user_id: str = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """Resolve/dismiss an active care gap alert with audit trail."""
    user = _resolve_authenticated_user(user_id)
    success = repository.resolve_care_gap(alert_id, user.user_id, payload.notes)
    return {
        "success": success,
        "alert_id": alert_id,
        "status": "resolved",
        "resolved_by": user.full_name,
    }


@router.get("/activity", response_model=List[CareActivityRecord])
async def list_activity_history(
    limit: int = Query(default=15, ge=1, le=50),
    user_id: str = Depends(get_current_user_id),
) -> List[CareActivityRecord]:
    """Retrieve chronological family care activity history."""
    user = _resolve_authenticated_user(user_id)
    return repository.list_activities(user.family_id, limit=limit)
