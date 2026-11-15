"""Authentication routes for CareSaathi."""

from typing import Optional
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse

from app.auth import (
    AuthenticatedUser,
    create_access_token,
    get_current_user_id,
    hash_password,
    verify_password,
)
from app.config import settings
from app.repository import repository
from app.schemas import LoginRequest, Role, TokenResponse, UserResponse
from app.services.google_auth_service import google_oauth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest) -> TokenResponse:
    """Authenticate user with email and password, returning a secure session token."""
    user = repository.get_user_by_email(credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials.",
        )

    if not verify_password(credentials.password, user.password_hash, user.salt):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials.",
        )

    token = create_access_token(user.user_id)
    return TokenResponse(
        access_token=token,
        token_type="Bearer",
        user=UserResponse(
            user_id=user.user_id,
            email=user.email,
            full_name=user.full_name,
            family_id=user.family_id,
            role=user.role,
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user_id: str = Depends(get_current_user_id)) -> UserResponse:
    """Retrieve the currently authenticated user's profile and active role."""
    user = repository.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        full_name=user.full_name,
        family_id=user.family_id,
        role=user.role,
    )


@router.get("/demo-tokens")
async def get_demo_tokens():
    """Retrieve pre-authenticated demonstration tokens for instant role-switching in testing."""
    users = [
        ("user_anil_01", "Anil Sharma (Family Owner)"),
        ("user_sunita_02", "Sunita Sharma (Parent/Guardian)"),
        ("user_caregiver_priya_03", "Nurse Priya Nair (Caregiver)"),
        ("user_rajesh_99", "Rajesh Verma (Cross-Family Malicious Attacker)"),
    ]
    tokens = []
    for uid, label in users:
        u = repository.get_user_by_id(uid)
        if u:
            tok = create_access_token(uid)
            tokens.append({
                "label": label,
                "user_id": uid,
                "email": u.email,
                "role": u.role,
                "family_id": u.family_id,
                "token": tok,
            })
    return {"demo_tokens": tokens}


@router.get("/google/url")
async def get_google_auth_url(return_state: Optional[str] = Query(None)):
    """Generate Google OAuth 2.0 authorization URL for frontend redirect."""
    if not google_oauth_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on the backend.",
        )
    return google_oauth_service.generate_authorization_url(return_state=return_state)


@router.get("/google/callback")
async def google_auth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    request: Request = None,
):
    """Handle Google OAuth 2.0 callback, exchange code for tokens, and create or login user."""
    if error:
        redirect_target = f"{settings.FRONTEND_ORIGIN}/#settings?oauth_error={error}"
        return RedirectResponse(url=redirect_target)

    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing authorization code.")

    try:
        token_data = await google_oauth_service.exchange_code_for_tokens(code)
        access_token = token_data.get("access_token")
        profile = await google_oauth_service.get_user_profile(access_token)
    except Exception as err:
        redirect_target = f"{settings.FRONTEND_ORIGIN}/#settings?oauth_error=token_exchange_failed"
        return RedirectResponse(url=redirect_target)

    email = profile.get("email")
    full_name = profile.get("name", "Google User")

    # Match existing user by email, or create new user under a demo family account
    existing_user = repository.get_user_by_email(email)
    if not existing_user:
        # Create user with adult_member role under Sharma family for seamless testing
        pw_hash, salt = hash_password("GoogleAuthUser123!")
        existing_user = AuthenticatedUser(
            user_id=f"user_google_{profile.get('id', 'ext')[:8]}",
            email=email,
            full_name=full_name,
            family_id="fam_sharma_01",
            role=Role.ADULT_MEMBER,
            password_hash=pw_hash,
            salt=salt,
        )
        repository.users[existing_user.user_id] = existing_user

    # Store OAuth tokens on server for Calendar operations
    google_oauth_service.store_user_tokens(existing_user.user_id, token_data, email)

    # Issue CareSaathi session Bearer token
    session_token = create_access_token(existing_user.user_id)

    # Redirect to frontend settings with success token
    redirect_target = (
        f"{settings.FRONTEND_ORIGIN}/#settings?oauth=success"
        f"&token={session_token}"
        f"&user_id={existing_user.user_id}"
        f"&email={urllib.parse.quote(email)}"
    )
    return RedirectResponse(url=redirect_target)
