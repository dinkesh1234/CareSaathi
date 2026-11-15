"""Supabase database service for CareSaathi.

Manages connection to Supabase PostgreSQL, table operations, and connectivity checks.
When Supabase credentials are not configured or unreachable, provides clean status
reporting and falls back safely to the tested repository.
"""

from typing import Any, Dict, List, Optional
import httpx

from app.config import settings
from app.schemas import FamilyMemberProfile

try:
    from supabase import Client, create_client
    _SUPABASE_SDK_AVAILABLE = True
except ImportError:
    _SUPABASE_SDK_AVAILABLE = False
    Client = Any


class SupabaseService:
    """Service client for interacting with Supabase PostgreSQL."""

    def __init__(self) -> None:
        self.url: Optional[str] = settings.SUPABASE_URL
        self.anon_key: Optional[str] = settings.SUPABASE_ANON_KEY
        self.service_role_key: Optional[str] = settings.SUPABASE_SERVICE_ROLE_KEY
        self._client: Optional[Client] = None
        self._init_client()

    def _init_client(self) -> None:
        """Initialize the Supabase client if configured."""
        if not settings.is_supabase_configured or not _SUPABASE_SDK_AVAILABLE:
            return

        key_to_use = self.service_role_key or self.anon_key
        try:
            self._client = create_client(self.url, key_to_use)
        except Exception as err:
            # Client initialization failed (e.g. invalid URL format)
            self._client = None

    async def check_connection(self) -> Dict[str, Any]:
        """Verify live connectivity to the configured Supabase instance."""
        if not settings.is_supabase_configured:
            return {
                "configured": False,
                "connected": False,
                "status": "not_configured",
                "message": "Supabase credentials are not configured in backend/.env",
            }

        key_to_use = self.service_role_key or self.anon_key
        rest_url = f"{self.url.rstrip('/')}/rest/v1/"

        try:
            async with httpx.AsyncClient(timeout=4.0) as http_client:
                response = await http_client.get(
                    rest_url,
                    headers={
                        "apikey": key_to_use,
                        "Authorization": f"Bearer {key_to_use}",
                    },
                )
                if response.status_code in [200, 404]:
                    # 200 or 404 on base rest endpoint confirms reachable Supabase PostgREST
                    return {
                        "configured": True,
                        "connected": True,
                        "status": "connected",
                        "url": self.url,
                        "message": "Connected to Supabase PostgreSQL REST API",
                    }
                else:
                    return {
                        "configured": True,
                        "connected": False,
                        "status": "error",
                        "http_status": response.status_code,
                        "message": f"Supabase returned HTTP {response.status_code}",
                    }
        except Exception as err:
            return {
                "configured": True,
                "connected": False,
                "status": "disconnected",
                "message": f"Connection check failed: {str(err)}",
            }

    async def list_profiles(self, family_id: str) -> Optional[List[Dict[str, Any]]]:
        """Fetch profiles for a family from Supabase if connected."""
        if not self._client:
            return None
        try:
            res = self._client.table("family_profiles").select("*").eq("family_id", family_id).execute()
            return res.data
        except Exception:
            return None


supabase_service = SupabaseService()
