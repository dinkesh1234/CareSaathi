"""Authentication routes for CareSaathi."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import (
    AuthenticatedUser,
    create_access_token,
    get_current_user_id,
    verify_password,
)
from app.repository import repository
from app.schemas import LoginRequest, TokenResponse, UserResponse

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
