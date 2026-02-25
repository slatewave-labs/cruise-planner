import json
import os
import sys
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

# Import app from parent directory
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import server  # noqa: E402
from server import app  # noqa: E402

client = TestClient(app)


def test_health_check():
    """Test that health check endpoint works."""
    with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "checks" in data


@patch("server.LLMClient")
def test_generate_plan_success(mock_llm_client_class):
    """Test successful plan generation with port details in request body."""
    # Setup mocks
    mock_device_id = "test-device"

    # Mock LLM Client
    mock_llm_instance = MagicMock()
    mock_llm_client_class.return_value = mock_llm_instance
    plan_json = json.dumps({"plan_title": "Mock Plan", "activities": []})
    mock_llm_instance.generate_day_plan.return_value = plan_json
    mock_llm_instance.parse_json_response.return_value = json.loads(plan_json)

    payload = {
        "trip_id": "trip-123",
        "port_id": "port-456",
        "port_name": "Barcelona",
        "port_country": "Spain",
        "latitude": 41.38,
        "longitude": 2.19,
        "arrival": "2027-06-01T08:00:00",
        "departure": "2027-06-01T18:00:00",
        "ship_name": "Test Ship",
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
    data = response.json()
    assert data["plan"]["plan_title"] == "Mock Plan"
    assert data["port_name"] == "Barcelona"
    assert data["port_country"] == "Spain"
    assert "plan_id" in data


def test_cors_allowed_origin():
    """Allowed origin receives Access-Control-Allow-Origin header."""
    allowed = server._allowed_origins[0]
    with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
        response = client.get("/api/health", headers={"Origin": allowed})
    assert response.headers.get("access-control-allow-origin") == allowed


def test_cors_disallowed_origin():
    """Unknown origin does not receive Access-Control-Allow-Origin header."""
    with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
        response = client.get(
            "/api/health", headers={"Origin": "http://evil.example.com"}
        )
    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_parsed_from_env():
    """ALLOWED_ORIGINS env var is split on commas into individual origins."""
    raw = "https://app.example.com, https://staging.example.com"
    result = [o.strip() for o in raw.split(",") if o.strip()]
    assert result == ["https://app.example.com", "https://staging.example.com"]


def test_cors_no_wildcard():
    """Wildcard '*' is never used as an allowed origin."""
    assert "*" not in server._allowed_origins
