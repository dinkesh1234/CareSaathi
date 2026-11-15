"""Authentication and security utilities for CareSaathi.

Provides password hashing via scrypt, token generation via secrets,
and FastAPI dependencies for user session extraction.
"""

import base64
import hashlib
import hmac
import secrets
import time
from typing import Any, Dict, Optional, Tuple

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel

from app.schemas import Role, UserResponse


class AuthenticatedUser(BaseModel):
    """Internal representation of an authenticated user."""
    user_id: str
    email: str
    full_name: str
    family_id: str
    role: Role
    password_hash: str
    salt: str


def hash_password(password: str, salt: Optional[bytes] = None) -> tuple[str, str]:
    """Hash a plaintext password using standard library scrypt.

    Returns:
        tuple[str, str]: (hex_hash, base64_salt)
    """
    if salt is None:
        salt = secrets.token_bytes(16)
    key = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
    return key.hex(), base64.b64encode(salt).decode("utf-8")


def verify_password(plain_password: str, stored_hash: str, stored_salt_b64: str) -> bool:
    """Verify password match using constant-time comparison."""
    salt = base64.b64decode(stored_salt_b64.encode("utf-8"))
    computed_key = hashlib.scrypt(plain_password.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
    return hmac.compare_digest(computed_key.hex(), stored_hash)


# Session expiration duration: 24 hours (86,400 seconds)
SESSION_EXPIRATION_SECONDS = 86400

# In-memory Token Store mapping token string -> {"user_id": str, "created_at": float, "expires_at": float}
_ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}


def create_access_token(user_id: str, duration_seconds: int = SESSION_EXPIRATION_SECONDS) -> str:
    """Generate a cryptographically secure session token with expiration timestamp."""
    token = f"cs_{secrets.token_urlsafe(32)}"
    now = time.time()
    _ACTIVE_SESSIONS[token] = {
        "user_id": user_id,
        "created_at": now,
        "expires_at": now + duration_seconds,
    }
    return token


def invalidate_token(token: str) -> bool:
    """Revoke an active session token."""
    return _ACTIVE_SESSIONS.pop(token, None) is not None


def get_token_user_id(token: str) -> Optional[str]:
    """Resolve token to user_id, enforcing session expiration."""
    session = _ACTIVE_SESSIONS.get(token)
    if not session:
        return None
    now = time.time()
    if now > session.get("expires_at", 0):
        _ACTIVE_SESSIONS.pop(token, None)
        return None
    return session.get("user_id")


def clean_expired_sessions() -> int:
    """Purge expired session records from memory."""
    now = time.time()
    expired = [t for t, s in _ACTIVE_SESSIONS.items() if now > s.get("expires_at", 0)]
    for t in expired:
        _ACTIVE_SESSIONS.pop(t, None)
    return len(expired)


async def get_current_token(authorization: Optional[str] = Header(None, alias="Authorization")) -> str:
    """FastAPI dependency to extract raw bearer token from Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return parts[1].strip()


# Fast dependency to extract and validate Bearer token
async def get_current_user_id(authorization: Optional[str] = Header(None, alias="Authorization")) -> str:
    """FastAPI dependency to extract user_id from Bearer token."""
    token = await get_current_token(authorization)
    user_id = get_token_user_id(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please re-authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id
