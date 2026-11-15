"""Tests for Family Circle Invitations, Ownership Permissions, and Secure Logout."""

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


def test_create_and_list_family_invitations():
    """Family owner can invite new members and inspect invitation status."""
    anil_token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {anil_token}"}

    payload = {
        "invitee_email": "kavita.sharma@example.com",
        "role": "adult_member",
        "relationship": "Aunt / Sister",
    }

    # 1. Create invitation
    res = client.post("/api/family/invitations", json=payload, headers=headers)
    assert res.status_code == 201
    inv = res.json()
    assert inv["invitee_email"] == "kavita.sharma@example.com"
    assert inv["status"] == "pending"
    assert "token" in inv
    assert "invitation_link" in inv

    # 2. List invitations
    res_list = client.get("/api/family/invitations", headers=headers)
    assert res_list.status_code == 200
    invitations = res_list.json()
    assert len(invitations) >= 1
    assert any(i["invitee_email"] == "kavita.sharma@example.com" for i in invitations)


def test_caregiver_cannot_send_invitations():
    """Caregiver lacks permission to send family invitations (403 Forbidden)."""
    priya_token = create_access_token("user_caregiver_priya_03")
    headers = {"Authorization": f"Bearer {priya_token}"}

    payload = {
        "invitee_email": "nurse.sneha@example.com",
        "role": "caregiver",
    }
    res = client.post("/api/family/invitations", json=payload, headers=headers)
    assert res.status_code == 403


def test_accept_invitation_with_matching_email_and_mismatch_rejection():
    """Accepting invitation checks email match and updates user's family membership."""
    anil_token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {anil_token}"}

    # 1. Anil invites kavita
    inv_res = client.post(
        "/api/family/invitations",
        json={"invitee_email": "kavita.sharma@example.com", "role": "adult_member"},
        headers=headers,
    )
    token = inv_res.json()["token"]

    # 2. Rajesh tries to accept with wrong email -> 403 Forbidden
    rajesh_token = create_access_token("user_rajesh_99")
    res_fail = client.post(f"/api/family/invitations/{token}/accept", headers={"Authorization": f"Bearer {rajesh_token}"})
    assert res_fail.status_code == 403

    # 3. New user registers with matching email
    signup_res = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Kavita Sharma",
            "email": "kavita.sharma@example.com",
            "password": "Password123!",
            "family_name": "Sharma",
        },
    )
    kavita_token = signup_res.json()["access_token"]

    # 4. Kavita accepts invitation -> 200 OK
    res_accept = client.post(f"/api/family/invitations/{token}/accept", headers={"Authorization": f"Bearer {kavita_token}"})
    assert res_accept.status_code == 200
    accepted = res_accept.json()
    assert accepted["status"] == "accepted"


def test_logout_invalidates_token_and_returns_clean_message():
    """Logout invalidates active token and prevents subsequent access."""
    token = create_access_token("user_anil_01")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Endpoint is accessible before logout
    res_before = client.get("/api/family/profiles", headers=headers)
    assert res_before.status_code == 200

    # 2. Call logout
    res_logout = client.post("/api/auth/logout", headers=headers)
    assert res_logout.status_code == 200
    data = res_logout.json()
    assert data["status"] == "logged_out"
    assert "You have been logged out successfully" in data["message"]

    # 3. Old token is now rejected with 401 Unauthorized
    res_after = client.get("/api/family/profiles", headers=headers)
    assert res_after.status_code == 401


def test_delete_family_profile_owner_only():
    """Family owner can delete profiles; unauthorized members receive 403."""
    anil_token = create_access_token("user_anil_01")
    priya_token = create_access_token("user_caregiver_priya_03")

    # Caregiver cannot delete
    res_priya = client.delete("/api/family/profiles/prof_ananya_104", headers={"Authorization": f"Bearer {priya_token}"})
    assert res_priya.status_code == 403

    # Family owner can delete
    res_anil = client.delete("/api/family/profiles/prof_ananya_104", headers={"Authorization": f"Bearer {anil_token}"})
    assert res_anil.status_code in (200, 204)
