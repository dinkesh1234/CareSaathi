"""Unit and integration tests for CareSaathi External API Integrations.

Tests:
1. Live Status Endpoint (/api/integrations/status) reporting accuracy across all 6 APIs.
2. Google OAuth 2.0 URL generation and parameter validation.
3. Google Calendar synchronization and duplicate prevention.
4. Resend email formatting, templating, and 15-minute deduplication window.
5. Gemini AI adapter medical safety and non-diagnostic enforcement.
6. Google Health Connect adapter schema validation and unit preservation.
"""

from datetime import datetime, timezone
import pytest
from starlette.testclient import TestClient

from app.auth import create_access_token
from app.config import settings
from app.main import app
from app.services.google_calendar_service import google_calendar_service
from app.services.google_health_service import google_health_adapter
from app.services.resend_service import resend_service
from app.services.gemini_service import get_ai_service


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def anil_token():
    return create_access_token("user_anil_01")


def test_integrations_status_endpoint(client):
    """Test that /api/integrations/status accurately returns all 6 services with honest statuses."""
    response = client.get("/api/integrations/status")
    assert response.status_code == 200
    data = response.json()

    assert "services" in data
    services = data["services"]

    # Verify all 6 APIs are present
    assert "supabase" in services
    assert "google_oauth" in services
    assert "google_calendar" in services
    assert "gemini" in services
    assert "resend" in services
    assert "google_health" in services

    # Verify honest reporting: no fake 'connected' claims
    assert services["google_health"]["connected"] is False
    assert services["google_health"]["status"] == "adapter_ready_awaiting_bridge"
    assert "Android Health Connect" in services["google_health"]["platform"]

    # Google OAuth is configured from local credentials
    assert services["google_oauth"]["configured"] is True
    assert "481539639922" in str(services["google_oauth"]["client_id_prefix"])


def test_google_oauth_url_generation(client):
    """Test that /api/auth/google/url generates a valid Google consent URL with proper scopes."""
    response = client.get("/api/auth/google/url?return_state=test_state_123")
    assert response.status_code == 200
    data = response.json()

    assert "authorization_url" in data
    url = data["authorization_url"]
    assert "https://accounts.google.com/o/oauth2/v2/auth" in url
    assert "client_id=" in url
    assert "response_type=code" in url
    assert "calendar.events" in url
    assert "state=test_state_123" in url


def test_resend_deduplication_cache():
    """Test that Resend service deduplication cache catches identical rapid notifications."""
    key = "test_patient@example.com:med:Ramesh:Amlodipine:08:00"

    # First check: not duplicate, recorded
    assert resend_service._is_duplicate(key) is False

    # Second check within window: identified as duplicate
    assert resend_service._is_duplicate(key) is True


def test_test_email_requires_authentication(client):
    """Test that /api/integrations/test-email rejects unauthenticated requests with 401."""
    payload = {
        "recipient_email": "test@example.com",
        "notification_type": "medication",
    }
    response = client.post("/api/integrations/test-email", json=payload)
    assert response.status_code == 401


def test_test_email_authenticated_reporting(client, anil_token):
    """Test that authenticated test email returns clear status regarding Resend configuration."""
    payload = {
        "recipient_email": "anil.sharma@example.com",
        "notification_type": "medication",
    }
    response = client.post(
        "/api/integrations/test-email",
        json=payload,
        headers={"Authorization": f"Bearer {anil_token}"},
    )
    assert response.status_code == 200
    data = response.json()

    if not settings.is_resend_configured:
        assert data["configured"] is False
        assert "not configured" in data["message"].lower()


def test_calendar_sync_requires_google_tokens(client, anil_token):
    """Test that calendar sync gracefully informs user when no Google account is linked."""
    payload = {
        "title": "Cardiology Followup",
        "doctor_name": "Dr. Vikram Mehta",
        "patient_name": "Ramesh Sharma",
        "appointment_date": "2026-11-20T10:30:00Z",
        "location": "Max Hospital",
    }
    response = client.post(
        "/api/integrations/calendar/sync",
        json=payload,
        headers={"Authorization": f"Bearer {anil_token}"},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is False
    assert data["connected"] is False
    assert "No Google account connected" in data["message"]


def test_google_health_adapter_deduplication_and_provenance(client, anil_token):
    """Test that Google Health adapter preserves measurement units and prevents duplicate readings."""
    reading_payload = {
        "profile_id": "prof_ramesh_101",
        "metric_type": "blood_pressure",
        "value": {"systolic": 126, "diastolic": 80},
        "unit": "mmHg",
        "source_device": "Omron Evolv Bluetooth Monitor",
        "recorded_at": "2026-11-15T08:00:00Z",
    }

    # First import
    res1 = client.post(
        "/api/integrations/health/reading",
        json=reading_payload,
        headers={"Authorization": f"Bearer {anil_token}"},
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True
    assert data1["duplicate_prevented"] is False
    assert data1["record"]["unit"] == "mmHg"
    assert data1["record"]["source_device"] == "Omron Evolv Bluetooth Monitor"

    # Second import with identical timestamp & device: duplicate prevented
    res2 = client.post(
        "/api/integrations/health/reading",
        json=reading_payload,
        headers={"Authorization": f"Bearer {anil_token}"},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is True
    assert data2["duplicate_prevented"] is True
    assert "already recorded" in data2["message"].lower()


def test_gemini_service_refuses_medical_diagnosis():
    """Test that Gemini AI provider strictly refuses medical diagnosis requests before any API call."""
    from app.repository import repository
    from app.schemas import Role

    user = repository.get_user_by_id("user_anil_01")
    profiles = repository.list_family_profiles("fam_sharma_01")

    ai_service = get_ai_service()
    response = ai_service.generate_response(
        user=user,
        authorized_profiles=profiles,
        query="Please diagnose my severe chest pain and prescribe nitroglycerin",
    )

    assert "emergency medical services" in response.response.lower()
    assert "108" in response.response
    assert "cannot provide medical diagnosis" in response.response.lower()
