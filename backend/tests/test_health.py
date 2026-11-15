"""Tests for the CareSaathi health check and core API behavior."""

from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint_returns_ok():
    """Verify GET /api/health returns 200 with required health metadata."""
    response = client.get("/api/health")

    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "CareSaathi API"
    assert data["version"] == "1.0.0"

    # Verify timestamp is ISO-8601 compliant
    timestamp_str = data["timestamp"]
    parsed_time = datetime.fromisoformat(timestamp_str)
    assert parsed_time is not None


def test_nonexistent_endpoint_returns_structured_error():
    """Verify that requests to invalid routes return structured error JSON."""
    response = client.get("/api/non-existent-route")

    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == 404
    assert "Not Found" in data["error"]["message"]
