"""Tests for Care Continuity Engine, Medication Center, Appointments, and User Signup."""

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.main import app
from app.repository import repository

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_seed_data():
    """Reset repository before each test for clean isolation."""
    repository._seed_demo_data()


def test_signup_new_user_success_and_duplicate_rejection():
    """Signup provisions user, family, primary profile and rejects duplicate email."""
    signup_payload = {
        "full_name": "Rohan Gupta",
        "email": "rohan.gupta@example.com",
        "password": "SecurePassword123!",
        "family_name": "Gupta Household",
    }

    # 1. Successful signup
    res = client.post("/api/auth/signup", json=signup_payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["token_type"].lower() == "bearer"
    assert data["user"]["email"] == "rohan.gupta@example.com"
    assert data["user"]["role"] == "family_owner"

    # 2. Duplicate signup rejected with 409
    res_dup = client.post("/api/auth/signup", json=signup_payload)
    assert res_dup.status_code == 409


def test_medications_list_and_rbac_filtering():
    """Family owner sees all meds; caregiver only sees assigned member's meds."""
    anil_token = create_access_token("user_anil_01")
    priya_token = create_access_token("user_caregiver_priya_03")

    # Anil (Family Owner) sees all 4 medications across family
    res_anil = client.get("/api/medications", headers={"Authorization": f"Bearer {anil_token}"})
    assert res_anil.status_code == 200
    meds_anil = res_anil.json()
    assert isinstance(meds_anil, list)
    assert len(meds_anil) == 4
    med_names_anil = [m["name"] for m in meds_anil]
    assert "Amlodipine" in med_names_anil
    assert "Levothyroxine" in med_names_anil

    # Priya (Caregiver assigned ONLY to Ramesh) only sees Ramesh's medications
    res_priya = client.get("/api/medications", headers={"Authorization": f"Bearer {priya_token}"})
    assert res_priya.status_code == 200
    meds_priya = res_priya.json()
    assert isinstance(meds_priya, list)
    assert len(meds_priya) == 3
    for m in meds_priya:
        assert m["profile_id"] == "prof_ramesh_101"


def test_update_medication_status_adherence_and_disclaimer():
    """Updating medication status stores user-reported timestamp and non-clinical disclaimer."""
    token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {token}"}

    update_payload = {
        "status": "reported_taken",
        "confirmation_notes": "Taken with a glass of warm water post lunch.",
    }

    res = client.post("/api/medications/med_metformin_02/status", json=update_payload, headers=headers)
    assert res.status_code == 200
    updated = res.json()
    assert updated["status_today"] == "reported_taken"
    assert updated["last_reported_at"] is not None
    assert "clinical_disclaimer" in updated
    assert "clinical ingestion" in updated["clinical_disclaimer"].lower() or "caregiver/patient" in updated["clinical_disclaimer"].lower()


def test_appointments_list_and_confirm_escort():
    """Appointments list correctly and confirm escort endpoint works."""
    token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/appointments", headers=headers)
    assert res.status_code == 200
    apts = res.json()
    assert isinstance(apts, list)
    assert len(apts) >= 2

    # Confirm escort for cardiology appointment
    escort_payload = {
        "escort_user_id": "user_anil_01",
        "escort_name": "Anil Sharma (Son)",
    }
    res_escort = client.post("/api/appointments/apt_cardio_101/confirm-escort", json=escort_payload, headers=headers)
    assert res_escort.status_code == 200
    updated_apt = res_escort.json()
    assert updated_apt["escort_name"] == "Anil Sharma (Son)"
    assert updated_apt["escort_user_id"] == "user_anil_01"


def test_care_continuity_overview_and_handoff_creation():
    """Care Continuity Engine identifies gaps and allows logging shift handoffs."""
    token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Overview
    res = client.get("/api/continuity/overview", headers=headers)
    assert res.status_code == 200
    overview = res.json()
    assert "detected_care_gaps" in overview
    assert "active_handoffs" in overview
    assert overview["family_id"] == "fam_sharma_101"
    assert overview["high_priority_gaps_count"] >= 1
    assert len(overview["detected_care_gaps"]) >= 1

    # 2. Add Handoff
    handoff_payload = {
        "profile_id": "prof_ramesh_101",
        "shift_type": "Evening Shift",
        "from_caregiver_name": "Anil Sharma",
        "to_caregiver_name": "Sunita Sharma",
        "priority": "routine",
        "handoff_notes": "Evening shift handoff: Ramesh had low sodium dinner, evening vitals checked.",
    }
    res_handoff = client.post("/api/continuity/handoffs", json=handoff_payload, headers=headers)
    assert res_handoff.status_code == 201
    new_handoff = res_handoff.json()
    assert new_handoff["to_caregiver_name"] == "Sunita Sharma"
    assert new_handoff["from_caregiver_name"] == "Anil Sharma"
    assert new_handoff["status"] == "pending"
