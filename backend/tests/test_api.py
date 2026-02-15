import json
import os
import sys
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

# Import app from parent directory
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Mock MongoClient before importing app
with patch("pymongo.MongoClient") as mock_mongo:
    from server import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@patch("google.genai.Client")
@patch("server.trips_col")
@patch("server.plans_col")
def test_generate_plan_success(mock_plans, mock_trips, mock_genai_client_class):
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

    with patch("httpx.AsyncClient.get") as mock_weather:
        mock_weather.return_value = MagicMock(
            status_code=404
        )  # Weather fail shouldn't break plan
        response = client.post(
            "/api/plans/generate", json=payload, headers={"X-Device-Id": mock_device_id}
        )

    assert response.status_code == 200
    assert response.json()["plan"]["plan_title"] == "Mock Plan"
