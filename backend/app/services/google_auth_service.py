"""Google OAuth 2.0 and token management service for CareSaathi.

Handles generation of the Google authorization URL with minimal required healthcare scopes,
exchange of authorization codes for access and refresh tokens, user profile retrieval,
and secure server-side token storage.
"""

import time
from typing import Any, Dict, Optional
import urllib.parse
import secrets
import httpx

from app.config import settings

# In-memory secure token store: user_id -> {access_token, refresh_token, expires_at, email}
_OAUTH_TOKEN_STORE: Dict[str, Dict[str, Any]] = {}
# Pending CSRF states: state -> created_timestamp
_PENDING_STATES: Dict[str, float] = {}

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo"

# Minimal necessary healthcare & identity scopes
SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar.events",
]


class GoogleOAuthService:
    """Service managing Google OAuth 2.0 authorization, token exchange, and refresh."""

    def __init__(self) -> None:
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI

    @property
    def is_configured(self) -> bool:
        """Check whether Google OAuth client ID and secret are configured."""
        return settings.is_google_oauth_configured

    def generate_authorization_url(
        self,
        return_state: Optional[str] = None,
        frontend_origin: Optional[str] = None,
    ) -> Dict[str, str]:
        """Generate Google OAuth 2.0 consent URL with CSRF state token."""
        if not self.is_configured:
            raise ValueError("Google OAuth credentials are not configured in backend/.env")

        state = return_state or secrets.token_urlsafe(16)
        _PENDING_STATES[state] = {
            "created_at": time.time(),
            "frontend_origin": frontend_origin or settings.FRONTEND_ORIGIN,
        }

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        auth_url = f"{GOOGLE_AUTH_ENDPOINT}?{urllib.parse.urlencode(params)}"
        return {"authorization_url": auth_url, "state": state}

    def get_state_origin(self, state: Optional[str]) -> Optional[str]:
        """Peek stored frontend origin for a state before consumption."""
        if state and state in _PENDING_STATES:
            entry = _PENDING_STATES[state]
            if isinstance(entry, dict):
                return entry.get("frontend_origin")
        return None

    def validate_and_consume_state(self, state: Optional[str]) -> bool:
        """Validate and consume CSRF state parameter to prevent replay attacks and CSRF."""
        if not state:
            return False
        # Clean expired states (> 15 minutes old)
        now = time.time()
        expired = [
            s
            for s, data in _PENDING_STATES.items()
            if (isinstance(data, dict) and now - data.get("created_at", 0) > 900)
            or (isinstance(data, (int, float)) and now - data > 900)
        ]
        for s in expired:
            _PENDING_STATES.pop(s, None)

        if state in _PENDING_STATES:
            _PENDING_STATES.pop(state, None)
            return True
        return False

    async def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """Exchange the received authorization code for OAuth access and refresh tokens."""
        if not self.is_configured:
            raise ValueError("Google OAuth is not configured.")

        data = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(GOOGLE_TOKEN_ENDPOINT, data=data)
            if response.status_code != 200:
                raise ValueError(f"Token exchange failed (HTTP {response.status_code}): {response.text}")
            return response.json()

    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        """Fetch user profile details (email, name, picture) using the Google access token."""
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.get(GOOGLE_USERINFO_ENDPOINT, headers=headers)
            if response.status_code != 200:
                raise ValueError(f"Failed to fetch user info (HTTP {response.status_code}): {response.text}")
            return response.json()

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Obtain a new access token using a stored refresh token."""
        if not self.is_configured:
            raise ValueError("Google OAuth is not configured.")

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }

        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.post(GOOGLE_TOKEN_ENDPOINT, data=data)
            if response.status_code != 200:
                raise ValueError(f"Token refresh failed (HTTP {response.status_code}): {response.text}")
            return response.json()

    def store_user_tokens(self, user_id: str, token_data: Dict[str, Any], email: str) -> None:
        """Securely store OAuth tokens on backend only (never returned to frontend)."""
        _OAUTH_TOKEN_STORE[user_id] = {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token") or _OAUTH_TOKEN_STORE.get(user_id, {}).get("refresh_token"),
            "expires_in": token_data.get("expires_in"),
            "email": email,
        }

    def get_user_tokens(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve stored Google OAuth tokens for a user."""
        return _OAUTH_TOKEN_STORE.get(user_id)

    def has_active_calendar_token(self, user_id: str) -> bool:
        """Check if user has an active Google OAuth token for Calendar operations."""
        tokens = self.get_user_tokens(user_id)
        return bool(tokens and tokens.get("access_token"))

    def clear_user_tokens(self, user_id: str) -> None:
        """Clear stored OAuth tokens for a user upon logout."""
        _OAUTH_TOKEN_STORE.pop(user_id, None)


google_oauth_service = GoogleOAuthService()
