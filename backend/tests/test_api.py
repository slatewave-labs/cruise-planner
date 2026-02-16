import json
import os
import sys
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

# Import app from parent directory
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Mock MongoClient before importing app
with patch("pymongo.MongoClient") as mock_mongo:
    # Configure mock to simulate successful connection
    mock_mongo_instance = MagicMock()
    mock_mongo_instance.admin.command.return_value = {"ok": 1}
    mock_mongo.return_value = mock_mongo_instance
    from server import app

client = TestClient(app)


def test_health_check():
    """Test that health check endpoint works."""
    with patch("server.mongo_client") as mock_client:
        mock_client.admin.command.return_value = {"ok": 1}
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "test-key"}):
            response = client.get("/api/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"
            assert "checks" in data


@patch("google.genai.Client")
@patch("server.trips_col")
@patch("server.plans_col")
@patch("server.mongo_client")
def test_generate_plan_success(
    mock_mongo_client, mock_plans, mock_trips, mock_genai_client_class
):
    """Test successful plan generation."""
    # Setup database mock
    mock_mongo_client.admin.command.return_value = {"ok": 1}

    # Setup mocks
    mock_device_id = "test-device"
    mock_trip_id = "trip-123"
    mock_port_id = "port-456"

    mock_trips.find_one.return_value = {
        "trip_id": mock_trip_id,
        "device_id": mock_device_id,
        "ship_name": "Test Ship",
        "ports": [
            {
                "port_id": mock_port_id,
                "name": "Barcelona",
                "country": "Spain",
                "latitude": 41.38,
                "longitude": 2.19,
                "arrival": "2023-10-01T08:00:00",
                "departure": "2023-10-01T18:00:00",
            }
        ],
    }

    # Mock Gemini
    mock_genai_instance = MagicMock()
    mock_genai_client_class.return_value = mock_genai_instance
    mock_response = MagicMock()
    mock_response.text = json.dumps({"plan_title": "Mock Plan", "activities": []})
    mock_genai_instance.models.generate_content.return_value = mock_response

    payload = {
        "trip_id": mock_trip_id,
        "port_id": mock_port_id,
        "preferences": {
            "party_type": "solo",
            "activity_level": "light",
            "transport_mode": "walking",
            "budget": "free",
        },
    }

    with patch("httpx.AsyncClient") as mock_async_client:
        # Mock weather API response
        mock_client = MagicMock()
        mock_async_client.return_value.__aenter__.return_value = mock_client
        mock_weather_response = MagicMock()
        mock_weather_response.status_code = 404  # Weather fail shouldn't break plan
        mock_client.get.return_value = mock_weather_response

        with patch.dict(os.environ, {"GOOGLE_API_KEY": "test-key"}):
            response = client.post(
                "/api/plans/generate",
                json=payload,
                headers={"X-Device-Id": mock_device_id},
            )

    assert response.status_code == 200
    assert response.json()["plan"]["plan_title"] == "Mock Plan"
