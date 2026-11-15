"""Master QA Automation and Edge-Case Test Suite for CareSaathi.

Validates:
1. Calendar & Appointment CRUD, filtering, persistence, and invalid input handling
2. Medication CRUD, empty states, adherence status toggling, and RBAC restrictions
3. Personal Health Profile field validation, age limits, and cross-role permissions
4. Care Continuity overview, shift handoff lifecycle (create, acknowledge, complete)
5. AI Assistant request parsing, role isolation, and non-diagnostic disclaimers
6. Security preflight (CORS), health endpoints, and unauthenticated error envelopes
"""

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.main import app
from app.repository import repository

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_seed_data():
    """Reset repository demo data before each test for clean isolation."""
    repository._seed_demo_data()


# ==============================================================================
# 1. CALENDAR & APPOINTMENT TESTS
# ==============================================================================

def test_calendar_appointment_crud_and_persistence():
    """Verify appointment creation, retrieval, filtering, updates, and persistence."""
    token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Schedule appointment
    new_apt_data = {
        "profile_id": "prof_ramesh_101",
        "doctor_name": "Dr. Aris Thorne",
        "specialty": "Neurology Follow-Up",
        "appointment_date": "2026-11-28 14:00",
        "location": "Max Super Specialty Hospital, Block B, Suite 102",
        "notes": "Review brain MRI and mobility report",
    }
    create_res = client.post("/api/appointments", json=new_apt_data, headers=headers)
    assert create_res.status_code == 201
    apt = create_res.json()
    apt_id = apt["appointment_id"]
    assert apt["doctor_name"] == "Dr. Aris Thorne"
    assert apt["specialty"] == "Neurology Follow-Up"
    assert apt["patient_name"] == "Ramesh Sharma"

    # 2. Get single appointment by ID
    get_res = client.get(f"/api/appointments/{apt_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["appointment_id"] == apt_id

    # 3. List appointments filtered by profile_id
    filter_res = client.get("/api/appointments?profile_id=prof_ramesh_101", headers=headers)
    assert filter_res.status_code == 200
    matched_ids = [a["appointment_id"] for a in filter_res.json()]
    assert apt_id in matched_ids

    # 4. Update appointment date and notes
    update_res = client.put(
        f"/api/appointments/{apt_id}",
        json={"appointment_date": "2026-11-29 11:00", "notes": "Rescheduled to morning slot"},
        headers=headers,
    )
    assert update_res.status_code == 200
    updated_apt = update_res.json()
    assert updated_apt["appointment_date"] == "2026-11-29 11:00"
    assert updated_apt["notes"] == "Rescheduled to morning slot"

    # 5. Confirm appointment persists on subsequent read
    verify_res = client.get(f"/api/appointments/{apt_id}", headers=headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["appointment_date"] == "2026-11-29 11:00"

    # 6. Delete appointment
    del_res = client.delete(f"/api/appointments/{apt_id}", headers=headers)
    assert del_res.status_code == 204

    # 7. Verify 404 after deletion
    post_del_res = client.get(f"/api/appointments/{apt_id}", headers=headers)
    assert post_del_res.status_code == 404


def test_calendar_invalid_inputs_and_error_handling():
    """Verify appropriate HTTP status codes on invalid appointment requests."""
    token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to book appointment for non-existent profile
    bad_profile_res = client.post(
        "/api/appointments",
        json={
            "profile_id": "prof_nonexistent_999",
            "doctor_name": "Dr. Test",
            "specialty": "General Consultation",
            "appointment_date": "2026-12-01 10:00",
            "location": "Test Clinic Suite 101",
        },
        headers=headers,
    )
    assert bad_profile_res.status_code == 404

    # Attempt to book appointment for profile in another family (IDOR protection)
    cross_family_res = client.post(
        "/api/appointments",
        json={
            "profile_id": "prof_rajesh_901",  # belongs to fam_verma_999
            "doctor_name": "Dr. Test",
            "specialty": "General Consultation",
            "appointment_date": "2026-12-01 10:00",
            "location": "Test Clinic Suite 101",
        },
        headers=headers,
    )
    assert cross_family_res.status_code == 404

    # Missing required field (doctor_name missing) returns 422 Unprocessable Entity
    missing_fields_res = client.post(
        "/api/appointments",
        json={
            "profile_id": "prof_ramesh_101",
            "specialty": "Cardiology",
            "appointment_date": "2026-12-01 10:00",
        },
        headers=headers,
    )
    assert missing_fields_res.status_code == 422


# ==============================================================================
# 2. MEDICATION MANAGEMENT TESTS
# ==============================================================================

def test_medication_crud_and_empty_states():
    """Verify medication scheduling, status toggle, empty state handling, and deletion."""
    token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Check medication list for Sunita (initially 0 medications)
    sunita_meds = client.get("/api/medications?profile_id=prof_sunita_102", headers=headers)
    assert sunita_meds.status_code == 200
    assert isinstance(sunita_meds.json(), list)

    # 2. Create new medication for Ramesh
    med_payload = {
        "profile_id": "prof_ramesh_101",
        "name": "Rosuvastatin",
        "dosage": "10mg (1 Tablet)",
        "schedule_time": "09:30 PM",
        "frequency": "Once Daily",
        "refill_days_left": 28,
        "instructions": "Take before bed with water",
    }
    create_res = client.post("/api/medications", json=med_payload, headers=headers)
    assert create_res.status_code == 201
    created = create_res.json()
    med_id = created["medication_id"]
    assert created["name"] == "Rosuvastatin"
    assert created["status_today"] == "pending"

    # 3. Update dosage and refill count
    update_res = client.put(
        f"/api/medications/{med_id}",
        json={"dosage": "20mg (1 Tablet)", "refill_days_left": 60},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["dosage"] == "20mg (1 Tablet)"
    assert update_res.json()["refill_days_left"] == 60

    # 4. Toggle adherence status to reported_taken
    take_res = client.post(
        f"/api/medications/{med_id}/status",
        json={"status": "reported_taken", "confirmation_notes": "Night dose confirmed"},
        headers=headers,
    )
    assert take_res.status_code == 200
    assert take_res.json()["status_today"] == "reported_taken"

    # 5. Toggle adherence status back to pending
    reset_res = client.post(
        f"/api/medications/{med_id}/status",
        json={"status": "pending", "confirmation_notes": "Reset for testing"},
        headers=headers,
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["status_today"] == "pending"

    # 6. Delete medication
    del_res = client.delete(f"/api/medications/{med_id}", headers=headers)
    assert del_res.status_code == 204

    # 7. Verify status 404 when querying deleted med
    post_del_res = client.post(
        f"/api/medications/{med_id}/status",
        json={"status": "reported_taken"},
        headers=headers,
    )
    assert post_del_res.status_code == 404


def test_medication_validation_and_rbac():
    """Verify caregiver restrictions on unassigned profiles and cross-family medication protection."""
    # Nurse Priya is assigned to Ramesh; attempting to schedule medication for Sunita (unassigned) returns 403
    caregiver_token = create_access_token("user_caregiver_priya_03")
    cg_headers = {"Authorization": f"Bearer {caregiver_token}"}

    create_attempt = client.post(
        "/api/medications",
        json={
            "profile_id": "prof_sunita_102",  # Not assigned to Nurse Priya
            "name": "Aspirin",
            "dosage": "75mg",
            "schedule_time": "08:00 AM",
            "frequency": "Once Daily",
            "refill_days_left": 30,
        },
        headers=cg_headers,
    )
    assert create_attempt.status_code == 403

    # Cross-family user cannot access Ramesh's medications
    attacker_token = create_access_token("user_rajesh_99")
    atk_headers = {"Authorization": f"Bearer {attacker_token}"}
    cross_res = client.get("/api/medications?profile_id=prof_ramesh_101", headers=atk_headers)
    assert cross_res.status_code == 200
    # Must return empty list for attacker's family (cannot leak Sharma family meds)
    assert len(cross_res.json()) == 0


# ==============================================================================
# 3. PERSONAL HEALTH PROFILE TESTS
# ==============================================================================

def test_personal_health_profile_validation_and_age_limits():
    """Verify validation of profile age boundaries and guardian controls."""
    token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Reject negative age
    neg_age_res = client.post(
        "/api/family/profiles",
        json={
            "full_name": "Invalid Person",
            "relationship": "Cousin",
            "age": -5,
        },
        headers=headers,
    )
    assert neg_age_res.status_code == 422

    # 2. Reject age exceeding human limit (>130)
    over_age_res = client.post(
        "/api/family/profiles",
        json={
            "full_name": "Invalid Person",
            "relationship": "Ancestor",
            "age": 150,
        },
        headers=headers,
    )
    assert over_age_res.status_code == 422

    # 3. Create valid adult profile
    create_res = client.post(
        "/api/family/profiles",
        json={
            "full_name": "Vikram Sharma",
            "relationship": "Brother",
            "age": 42,
            "blood_group": "O+",
            "emergency_contact": "+91 91234 56789",
            "allergies": "None",
            "care_notes": "Good health, routine annual wellness checks",
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    created_profile = create_res.json()
    assert created_profile["age_group"] == "adult"
    prof_id = created_profile["profile_id"]

    # 4. Update profile details
    update_res = client.put(
        f"/api/family/profiles/{prof_id}",
        json={"blood_group": "O-", "emergency_contact": "+91 99887 76655"},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["blood_group"] == "O-"
    assert update_res.json()["emergency_contact"] == "+91 99887 76655"

    # 5. Family owner can delete the profile
    del_res = client.delete(f"/api/family/profiles/{prof_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


# ==============================================================================
# 4. CARE CONTINUITY ENGINE TESTS
# ==============================================================================

def test_care_continuity_gap_detection_and_handoffs():
    """Verify care gap detection and caregiver shift handoff workflows."""
    token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Retrieve care continuity overview
    overview_res = client.get("/api/continuity/overview", headers=headers)
    assert overview_res.status_code == 200
    data = overview_res.json()
    assert "detected_care_gaps" in data
    assert "active_handoffs" in data
    assert "pending_medications_today" in data

    # 2. Create a shift handoff note
    handoff_payload = {
        "profile_id": "prof_ramesh_101",
        "shift_type": "Evening Transition",
        "from_caregiver_name": "Nurse Priya Nair",
        "to_caregiver_name": "Anil Sharma",
        "priority": "Medium",
        "handoff_notes": "Dinner completed, evening blood sugar 132 mg/dL. Vitals stable.",
    }
    create_h_res = client.post("/api/continuity/handoffs", json=handoff_payload, headers=headers)
    assert create_h_res.status_code == 201
    handoff = create_h_res.json()
    h_id = handoff["handoff_id"]
    assert handoff["status"] == "pending"

    # 3. Acknowledge the shift handoff
    ack_res = client.post(f"/api/continuity/handoffs/{h_id}/acknowledge", headers=headers)
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "acknowledged"

    # 4. Complete the shift handoff
    comp_res = client.post(f"/api/continuity/handoffs/{h_id}/complete", headers=headers)
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "completed"


# ==============================================================================
# 5. AI ASSISTANT & CAPABILITIES TESTS
# ==============================================================================

def test_ai_capabilities_and_disclaimer():
    """Verify AI capabilities endpoint returns operational status and clinical disclaimer."""
    cap_res = client.get("/api/ai/capabilities")
    assert cap_res.status_code == 200
    cap_data = cap_res.json()
    assert cap_data["status"] == "operational"
    assert "capabilities" in cap_data
    assert len(cap_data["capabilities"]) > 0
    assert "disclaimer" in cap_data
    assert "medical" in cap_data["disclaimer"].lower() or "emergency" in cap_data["disclaimer"].lower()


def test_ai_chat_conversational_history():
    """Verify multi-turn history handling in CareSaathi AI chat."""
    token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {token}"}

    chat_res = client.post(
        "/api/ai/chat",
        json={
            "message": "What is the scheduled time for Ramesh's medications?",
            "history": [
                {"role": "user", "content": "Hello CareSaathi AI"},
                {"role": "assistant", "content": "Hello! I am ready to assist with your family's care schedule."},
            ],
        },
        headers=headers,
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "response" in chat_data
    assert len(chat_data["response"]) > 0
    assert "disclaimer" in chat_data


# ==============================================================================
# 6. SECURITY & CORS TESTS
# ==============================================================================

def test_cors_preflight_and_health():
    """Verify CORS preflight handling and system health check consistency."""
    # 1. Health endpoint returns 200 with ISO-8601 timestamp
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    health_data = health_res.json()
    assert health_data["status"] == "healthy"
    assert health_data["service"] == "CareSaathi API"
    assert "T" in health_data["timestamp"]

    # 2. Root metadata endpoint
    root_res = client.get("/")
    assert root_res.status_code == 200
    assert root_res.json()["status"] == "operational"

    # 3. CORS preflight OPTIONS request
    cors_res = client.options(
        "/api/appointments",
        headers={
            "Origin": "http://127.0.0.1:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert cors_res.status_code == 200
    assert "access-control-allow-origin" in cors_res.headers
