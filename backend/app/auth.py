"""Authentication and security utilities for CareSaathi.

Provides password hashing via scrypt, token generation via secrets,
and FastAPI dependencies for user session extraction.
"""

import base64
import hashlib
import hmac
import secrets
from typing import Dict, Optional

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


# In-memory Token Store mapping token string -> user_id
_ACTIVE_SESSIONS: Dict[str, str] = {}


def create_access_token(user_id: str) -> str:
    """Generate a cryptographically secure session token."""
    token = f"cs_{secrets.token_urlsafe(32)}"
    _ACTIVE_SESSIONS[token] = user_id
    return token


def invalidate_token(token: str) -> bool:
    """Revoke an active session token."""
    return _ACTIVE_SESSIONS.pop(token, None) is not None


def get_token_user_id(token: str) -> Optional[str]:
    """Resolve token to user_id."""
    return _ACTIVE_SESSIONS.get(token)


# Fast dependency to extract and validate Bearer token
async def get_current_user_id(authorization: Optional[str] = Header(None, alias="Authorization")) -> str:
    """FastAPI dependency to extract user_id from Bearer token."""
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

    token = parts[1].strip()
    user_id = get_token_user_id(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please re-authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id
