import json
import os
import sys
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

# Import app from parent directory
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Mock DynamoDB client before importing app
with patch("boto3.resource") as mock_boto_resource:
    # Configure mock to simulate successful connection
    mock_dynamodb = MagicMock()
    mock_boto_resource.return_value = mock_dynamodb
    from server import app

client = TestClient(app)


def test_health_check():
    """Test that health check endpoint works."""
    with patch("server.db_client") as mock_db_client:
        mock_db_client.health_check.return_value = True
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            response = client.get("/api/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"
            assert "checks" in data


@patch("server.LLMClient")
@patch("server.db_client")
def test_generate_plan_success(mock_db_client, mock_llm_client_class):
    """Test successful plan generation."""
    # Setup database mock
    mock_db_client.health_check.return_value = True

    # Setup mocks
    mock_device_id = "test-device"
    mock_trip_id = "trip-123"
    mock_port_id = "port-456"

    mock_db_client.get_trip.return_value = {
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

    # Mock LLM Client
    mock_llm_instance = MagicMock()
    mock_llm_client_class.return_value = mock_llm_instance
    plan_json = json.dumps({"plan_title": "Mock Plan", "activities": []})
    mock_llm_instance.generate_day_plan.return_value = plan_json
    mock_llm_instance.parse_json_response.return_value = json.loads(plan_json)

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

        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            response = client.post(
                "/api/plans/generate",
                json=payload,
                headers={"X-Device-Id": mock_device_id},
            )

    assert response.status_code == 200
    assert response.json()["plan"]["plan_title"] == "Mock Plan"
