"""Comprehensive Test Suite for Family Profiles and Role-Based Access Control (RBAC)."""

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


def test_unauthenticated_request_rejected():
    """Unauthenticated requests must be rejected with 401 Unauthorized."""
    # No header
    res1 = client.get("/api/family/profiles")
    assert res1.status_code == 401

    # Malformed header
    res2 = client.get("/api/family/profiles", headers={"Authorization": "InvalidTokenFormat"})
    assert res2.status_code == 401

    # Fake/Expired token
    res3 = client.get("/api/family/profiles", headers={"Authorization": "Bearer cs_fake_token_12345"})
    assert res3.status_code == 401


def test_family_owner_can_view_all_family_profiles():
    """Family Owner can view all member profiles (Senior, Adult, Child) in their family."""
    token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/family/profiles", headers=headers)
    assert res.status_code == 200
    profiles = res.json()

    # Sharma family has 4 profiles
    assert len(profiles) == 4
    names = [p["full_name"] for p in profiles]
    assert "Ramesh Sharma" in names
    assert "Ananya Sharma" in names
    assert "Sunita Sharma" in names


def test_guardian_can_access_and_edit_child_profile():
    """Parent/Guardian can access and update Child profile."""
    guardian_token = create_access_token("user_sunita_02")
    headers = {"Authorization": f"Bearer {guardian_token}"}

    # Sunita views Ananya (Child, age 17)
    res = client.get("/api/family/profiles/prof_ananya_104", headers=headers)
    assert res.status_code == 200
    assert res.json()["full_name"] == "Ananya Sharma"
    assert res.json()["age_group"] == "child"

    # Sunita updates Ananya's care notes
    update_res = client.put(
        "/api/family/profiles/prof_ananya_104",
        json={"care_notes": "Updated note: Annual high school wellness checkup completed."},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert "wellness checkup completed" in update_res.json()["care_notes"]


def test_caregiver_access_and_unauthorized_child_protection():
    """Caregiver can access assigned senior profile, but is forbidden from unassigned child profile."""
    caregiver_token = create_access_token("user_caregiver_priya_03")
    headers = {"Authorization": f"Bearer {caregiver_token}"}

    # 1. Caregiver is assigned to Ramesh (Senior) -> Permitted
    res_assigned = client.get("/api/family/profiles/prof_ramesh_101", headers=headers)
    assert res_assigned.status_code == 200
    assert res_assigned.json()["full_name"] == "Ramesh Sharma"

    # 2. Caregiver is NOT assigned to Ananya (Child) -> Strictly Forbidden 403
    res_child = client.get("/api/family/profiles/prof_ananya_104", headers=headers)
    assert res_child.status_code == 403
    assert "guardian-controlled authorization" in res_child.json()["error"]["message"]


def test_caregiver_permission_revocation():
    """Revoking caregiver access immediately terminates their access to that profile."""
    owner_token = create_access_token("user_anil_01")
    caregiver_token = create_access_token("user_caregiver_priya_03")

    caregiver_headers = {"Authorization": f"Bearer {caregiver_token}"}
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    # Verify initial caregiver access works
    res_initial = client.get("/api/family/profiles/prof_ramesh_101", headers=caregiver_headers)
    assert res_initial.status_code == 200

    # Family Owner revokes caregiver access
    revoke_res = client.post(
        "/api/family/profiles/prof_ramesh_101/revoke-caregiver",
        json={"caregiver_user_id": "user_caregiver_priya_03"},
        headers=owner_headers,
    )
    assert revoke_res.status_code == 200
    assert "user_caregiver_priya_03" not in revoke_res.json()["assigned_caregiver_ids"]

    # Subsequent access by caregiver must be rejected with 403 Forbidden
    res_after_revoke = client.get("/api/family/profiles/prof_ramesh_101", headers=caregiver_headers)
    assert res_after_revoke.status_code == 403
    assert "Caregiver is not assigned" in res_after_revoke.json()["error"]["message"]


def test_cross_family_idor_isolation():
    """Users cannot view or modify profiles belonging to other family accounts (anti-IDOR)."""
    # Attacker from Family 2 (Rajesh Verma)
    attacker_token = create_access_token("user_rajesh_99")
    headers = {"Authorization": f"Bearer {attacker_token}"}

    # Attempts to access Sharma family profile
    res = client.get("/api/family/profiles/prof_ramesh_101", headers=headers)
    assert res.status_code == 403
    assert "Cross-family profile access is prohibited" in res.json()["error"]["message"]

    # Attempts to update Sharma family profile
    update_res = client.put(
        "/api/family/profiles/prof_ramesh_101",
        json={"full_name": "Hacked Name"},
        headers=headers,
    )
    assert update_res.status_code == 403

    # Attempts to delete Sharma family profile
    del_res = client.delete("/api/family/profiles/prof_ramesh_101", headers=headers)
    assert del_res.status_code == 403


def test_profile_creation_validation_and_age_grouping():
    """Profile creation enforces role permissions, age constraints and auto-assigns age group."""
    owner_token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {owner_token}"}

    # 1. Create Senior profile
    res_senior = client.post(
        "/api/family/profiles",
        json={
            "full_name": "Dadi Kanta Sharma",
            "age": 71,
            "relationship": "Grandmother",
            "blood_group": "B+",
        },
        headers=headers,
    )
    assert res_senior.status_code == 201
    assert res_senior.json()["age_group"] == "senior"

    # 2. Create Child profile
    res_child = client.post(
        "/api/family/profiles",
        json={
            "full_name": "Aarav Sharma",
            "age": 8,
            "relationship": "Son",
            "blood_group": "O+",
        },
        headers=headers,
    )
    assert res_child.status_code == 201
    assert res_child.json()["age_group"] == "child"
    # Creator must be recorded as guardian
    assert "user_anil_01" in res_child.json()["guardian_user_ids"]

    # 3. Validation failure: age out of range
    res_invalid = client.post(
        "/api/family/profiles",
        json={
            "full_name": "Invalid Member",
            "age": 200,
            "relationship": "Relative",
        },
        headers=headers,
    )
    assert res_invalid.status_code in (400, 422)


def test_caregiver_cannot_create_or_delete_profiles():
    """Caregivers cannot create or delete family profiles."""
    caregiver_token = create_access_token("user_caregiver_priya_03")
    headers = {"Authorization": f"Bearer {caregiver_token}"}

    create_res = client.post(
        "/api/family/profiles",
        json={"full_name": "Illegal Profile", "age": 30, "relationship": "Friend"},
        headers=headers,
    )
    assert create_res.status_code == 403

    del_res = client.delete("/api/family/profiles/prof_ramesh_101", headers=headers)
    assert del_res.status_code == 403
