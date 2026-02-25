"""
Integration tests for the generate-plan endpoint.
Trip/plan CRUD is now handled client-side via localStorage.
These tests verify the AI plan generation endpoint accepts port details directly.
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

from backend.server import app

client = TestClient(app)

VALID_DEVICE_ID = "test-device-123"


def test_generate_plan_requires_port_details():
    """Test that generate-plan requires port details in request body."""
    # Missing port_name, port_country, latitude, longitude, arrival, departure
    payload = {
        "trip_id": "trip-123",
        "port_id": "port-456",
        "preferences": {
            "party_type": "solo",
            "activity_level": "light",
            "transport_mode": "walking",
            "budget": "free",
        },
    }

    response = client.post(
        "/api/plans/generate",
        json=payload,
        headers={"X-Device-Id": VALID_DEVICE_ID},
    )

    # Should fail validation because port details are missing
    assert response.status_code == 422

