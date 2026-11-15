"""Healthcare Appointments Router for CareSaathi.

Manages consultations, doctor clinic visits, confirmed family escorts, and
synchronization with calendar services.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user_id
from app.rbac import enforce_profile_edit_access, enforce_profile_view_access
from app.repository import repository
from app.schemas import (
    AppointmentCreateRequest,
    AppointmentEscortRequest,
    AppointmentUpdateRequest,
    HealthcareAppointment,
    Role,
)

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


def _resolve_authenticated_user(user_id: str):
    user = repository.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
        )
    return user


@router.get("", response_model=List[HealthcareAppointment])
async def list_appointments(
    profile_id: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id),
) -> List[HealthcareAppointment]:
    """List appointments for the user's family circle with RBAC filtering."""
    user = _resolve_authenticated_user(user_id)
    all_apts = repository.list_appointments(user.family_id, profile_id=profile_id)

    permitted = []
    for apt in all_apts:
        profile = repository.get_profile_by_id(apt.profile_id)
        if not profile:
            continue
        try:
            enforce_profile_view_access(user, profile)
            permitted.append(apt)
        except HTTPException:
            continue
    return permitted


@router.get("/{appointment_id}", response_model=HealthcareAppointment)
async def get_appointment(
    appointment_id: str,
    user_id: str = Depends(get_current_user_id),
) -> HealthcareAppointment:
    """Retrieve details for a single healthcare appointment."""
    user = _resolve_authenticated_user(user_id)
    apt = repository.get_appointment(appointment_id)
    if not apt or apt.family_id != user.family_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    profile = repository.get_profile_by_id(apt.profile_id)
    if profile:
        enforce_profile_view_access(user, profile)
    return apt


@router.post("", response_model=HealthcareAppointment, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreateRequest,
    user_id: str = Depends(get_current_user_id),
) -> HealthcareAppointment:
    """Schedule a healthcare consultation."""
    user = _resolve_authenticated_user(user_id)
    profile = repository.get_profile_by_id(payload.profile_id)
    if not profile or profile.family_id != user.family_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family profile not found.")

    enforce_profile_edit_access(user, profile)

    return repository.create_appointment(
        family_id=user.family_id,
        profile_id=payload.profile_id,
        doctor_name=payload.doctor_name,
        specialty=payload.specialty,
        appointment_date=payload.appointment_date,
        location=payload.location,
        notes=payload.notes,
        escort_user_id=payload.escort_user_id,
    )


@router.put("/{appointment_id}", response_model=HealthcareAppointment)
async def update_appointment(
    appointment_id: str,
    payload: AppointmentUpdateRequest,
    user_id: str = Depends(get_current_user_id),
) -> HealthcareAppointment:
    """Update details of an existing appointment."""
    user = _resolve_authenticated_user(user_id)
    apt = repository.get_appointment(appointment_id)
    if not apt or apt.family_id != user.family_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    profile = repository.get_profile_by_id(apt.profile_id)
    if profile:
        enforce_profile_edit_access(user, profile)

    updated = repository.update_appointment(appointment_id, payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    return updated


@router.post("/{appointment_id}/confirm-escort", response_model=HealthcareAppointment)
async def confirm_escort(
    appointment_id: str,
    payload: AppointmentEscortRequest,
    user_id: str = Depends(get_current_user_id),
) -> HealthcareAppointment:
    """Confirm family member or caregiver accompaniment for an appointment."""
    user = _resolve_authenticated_user(user_id)
    apt = repository.get_appointment(appointment_id)
    if not apt or apt.family_id != user.family_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    updated = repository.confirm_appointment_escort(
        appointment_id=appointment_id,
        escort_user_id=payload.escort_user_id,
        escort_name=payload.escort_name,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    return updated


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Cancel and remove an appointment."""
    user = _resolve_authenticated_user(user_id)
    apt = repository.get_appointment(appointment_id)
    if not apt or apt.family_id != user.family_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    profile = repository.get_profile_by_id(apt.profile_id)
    if profile:
        enforce_profile_edit_access(user, profile)

    repository.delete_appointment(appointment_id)
    return None
