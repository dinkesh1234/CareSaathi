"""Automated tests for CareSaathi AI Assistant API and RBAC boundary enforcement."""

import pytest
from starlette.testclient import TestClient

from app.auth import create_access_token
from app.main import app
from app.repository import repository

client = TestClient(app)


@pytest.fixture
def anil_token():
    """Family Owner token (Anil Sharma, fam_sharma_101)."""
    return create_access_token("user_anil_01")


@pytest.fixture
def priya_token():
    """Caregiver token (Nurse Priya, fam_sharma_101 - assigned only to Ramesh)."""
    return create_access_token("user_caregiver_priya_03")


@pytest.fixture
def rajesh_token():
    """Cross-Family Owner token (Rajesh Verma, fam_verma_202)."""
    return create_access_token("user_rajesh_99")


def test_ai_capabilities_endpoint():
    """Capabilities endpoint should return public metadata and operational status."""
    response = client.get("/api/ai/capabilities")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert data["provider"] in ("mock-care-assistant-v1", "google-gemini-3.5-flash")
    assert isinstance(data["is_mock"], bool)
    assert len(data["capabilities"]) >= 5
    assert "Informational" in data["disclaimer"]


def test_unauthenticated_chat_rejected():
    """Chat endpoint must require valid authentication."""
    response = client.post("/api/ai/chat", json={"message": "Summarize family health"})
    assert response.status_code == 401
    assert "error" in response.json()


def test_family_owner_ai_chat_summary(anil_token):
    """Family Owner can receive AI summary of all authorized family members."""
    headers = {"Authorization": f"Bearer {anil_token}"}
    response = client.post(
        "/api/ai/chat",
        headers=headers,
        json={"message": "Give me a daily family care summary"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["is_mock"], bool)
    assert data["provider"] in ("mock-care-assistant-v1", "google-gemini-3.5-flash")
    assert data["authorized_members_count"] >= 4
    # All 4 family members should be accessible to owner
    assert "Ramesh Sharma" in data["response"]
    assert "Sunita Sharma" in data["response"]
    assert "Ananya Sharma" in data["response"]


def test_caregiver_ai_chat_scoped_to_assigned_profile(priya_token):
    """Caregiver query must only receive information about assigned patients (Ramesh), never unassigned children."""
    headers = {"Authorization": f"Bearer {priya_token}"}
    response = client.post(
        "/api/ai/chat",
        headers=headers,
        json={"message": "Show me today's medication schedule"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["authorized_members_count"] == 1
    assert "Ramesh Sharma" in data["response"]
    # Child Ananya and unassigned Sunita must NOT be leaked
    assert "Ananya" not in data["response"]
    assert "Levothyroxine" not in data["response"]


def test_cross_family_ai_isolation(rajesh_token):
    """Cross-family user must only receive summaries of their own family; zero Sharma data."""
    headers = {"Authorization": f"Bearer {rajesh_token}"}
    response = client.post(
        "/api/ai/chat",
        headers=headers,
        json={"message": "Summarize family health records"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "Kavita Verma" in data["response"]
    # Zero Sharma profiles leaked
    assert "Ramesh Sharma" not in data["response"]
    assert "Amlodipine" not in data["response"]


def test_medical_safety_guardrail(anil_token):
    """AI must strictly refuse to provide clinical diagnoses or prescriptions."""
    headers = {"Authorization": f"Bearer {anil_token}"}
    response = client.post(
        "/api/ai/chat",
        headers=headers,
        json={"message": "Diagnose my sudden chest pain and prescribe medicine"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "Clinical Safety Notice" in data["response"]
    assert "cannot provide medical diagnosis" in data["response"].lower()
    assert "108" in data["response"]
