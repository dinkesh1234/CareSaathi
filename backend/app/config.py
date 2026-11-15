"""Configuration and environment management for CareSaathi.

Loads environment variables from backend/.env (if present) and system environment,
providing typed access to external API credentials and integration state flags.
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Locate and load backend/.env
_BASE_DIR = Path(__file__).resolve().parent.parent
_ENV_PATH = _BASE_DIR / ".env"
if _ENV_PATH.exists():
    load_dotenv(dotenv_path=_ENV_PATH)
else:
    load_dotenv()


class Settings(BaseModel):
    """Platform configuration settings and external API credentials."""

    # Server Settings
    APP_ENV: str = Field(default="development")
    PORT: int = Field(default=8000)
    FRONTEND_ORIGIN: str = Field(default="http://127.0.0.1:3000")

    # Google OAuth 2.0 Credentials
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None)
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None)
    GOOGLE_REDIRECT_URI: str = Field(
        default="http://127.0.0.1:8000/api/auth/google/callback"
    )

    # Supabase PostgreSQL Database & Auth
    SUPABASE_URL: Optional[str] = Field(default=None)
    SUPABASE_ANON_KEY: Optional[str] = Field(default=None)
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = Field(default=None)

    # Google Gemini AI
    GEMINI_API_KEY: Optional[str] = Field(default=None)
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash")

    # Resend Transactional Email API
    RESEND_API_KEY: Optional[str] = Field(default=None)
    RESEND_FROM_EMAIL: str = Field(default="notifications@caresaathi.in")

    # Google Health API / Health Connect
    GOOGLE_HEALTH_PROJECT_NUMBER: Optional[str] = Field(default=None)

    @property
    def is_supabase_configured(self) -> bool:
        """Check if Supabase credentials are provided."""
        return bool(
            self.SUPABASE_URL
            and (self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_ANON_KEY)
        )

    @property
    def is_google_oauth_configured(self) -> bool:
        """Check if Google OAuth client ID and secret are configured."""
        return bool(self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET)

    @property
    def is_gemini_configured(self) -> bool:
        """Check if Gemini API key is configured."""
        return bool(self.GEMINI_API_KEY and len(self.GEMINI_API_KEY.strip()) > 0)

    @property
    def is_resend_configured(self) -> bool:
        """Check if Resend API key is configured."""
        return bool(self.RESEND_API_KEY and len(self.RESEND_API_KEY.strip()) > 0)

    @property
    def is_google_health_configured(self) -> bool:
        """Check if Google Health Project metadata is present."""
        return bool(self.GOOGLE_HEALTH_PROJECT_NUMBER)


def get_settings() -> Settings:
    """Instantiate Settings from current environment variables."""
    return Settings(
        APP_ENV=os.getenv("APP_ENV", "development"),
        PORT=int(os.getenv("PORT", "8000")),
        FRONTEND_ORIGIN=os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:3000"),
        GOOGLE_CLIENT_ID=os.getenv("GOOGLE_CLIENT_ID"),
        GOOGLE_CLIENT_SECRET=os.getenv("GOOGLE_CLIENT_SECRET"),
        GOOGLE_REDIRECT_URI=os.getenv(
            "GOOGLE_REDIRECT_URI",
            "http://127.0.0.1:8000/api/auth/google/callback",
        ),
        SUPABASE_URL=os.getenv("SUPABASE_URL"),
        SUPABASE_ANON_KEY=os.getenv("SUPABASE_ANON_KEY"),
        SUPABASE_SERVICE_ROLE_KEY=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        GEMINI_API_KEY=os.getenv("GEMINI_API_KEY"),
        GEMINI_MODEL=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        RESEND_API_KEY=os.getenv("RESEND_API_KEY"),
        RESEND_FROM_EMAIL=os.getenv(
            "RESEND_FROM_EMAIL", "notifications@caresaathi.in"
        ),
        GOOGLE_HEALTH_PROJECT_NUMBER=os.getenv("GOOGLE_HEALTH_PROJECT_NUMBER"),
    )


settings = get_settings()
