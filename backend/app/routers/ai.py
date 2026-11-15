"""AI Assistant API Router for CareSaathi.

Provides endpoints for conversational family care coordination and capability discovery.
Strictly enforces Role-Based Access Control and multi-tenant isolation.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user_id
from app.rbac import enforce_profile_view_access
from app.repository import repository
from app.schemas import (
    AICapabilitiesResponse,
    AIChatRequest,
    AIChatResponse,
    FamilyMemberProfile,
)
from app.services.ai_service import DISCLAIMER_TEXT
from app.services.gemini_service import get_ai_service

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])


def _resolve_authenticated_user(user_id: str):
    """Helper to fetch and validate authenticated user."""
    user = repository.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session belongs to a user account that no longer exists.",
        )
    return user


def _get_authorized_profiles_for_user(user) -> List[FamilyMemberProfile]:
    """Retrieve only the profiles that the authenticated user has RBAC permission to view."""
    family_profiles = repository.list_family_profiles(user.family_id)
    authorized = []
    for profile in family_profiles:
        try:
            enforce_profile_view_access(user, profile)
            authorized.append(profile)
        except HTTPException:
            # Skip profiles where access is denied (e.g. child profiles for unassigned caregivers)
            continue
    return authorized


@router.post("/chat", response_model=AIChatResponse)
async def chat_with_assistant(
    request: AIChatRequest,
    user_id: str = Depends(get_current_user_id),
) -> AIChatResponse:
    """Submit a conversational query to CareSaathi AI Assistant.

    Enforces backend authorization: Only records belonging to the caller's family
    and permitted under their specific role are made accessible to the AI service.
    """
    user = _resolve_authenticated_user(user_id)
    authorized_profiles = _get_authorized_profiles_for_user(user)

    ai_service = get_ai_service()
    response = ai_service.generate_response(
        user=user,
        authorized_profiles=authorized_profiles,
        query=request.message,
        history=request.history,
    )
    return response


@router.get("/capabilities", response_model=AICapabilitiesResponse)
async def get_ai_capabilities() -> AICapabilitiesResponse:
    """Discover AI Assistant capabilities, readiness state, and clinical boundaries."""
    ai_service = get_ai_service()
    return AICapabilitiesResponse(
        status="operational",
        provider=ai_service.provider_id,
        is_mock="mock" in ai_service.provider_id,
        capabilities=[
            "Daily Family Care Summary",
            "Authorized Family Health Summary",
            "Medication Schedule Overview",
            "Upcoming Appointment Summary",
            "Pending Care Tasks Summary",
            "Questions about authorized family records",
            "Simple explanations of recorded health information",
        ],
        disclaimer=DISCLAIMER_TEXT,
    )
