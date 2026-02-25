import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Add backend to path so we can import server
sys.path.append(os.path.join(os.path.dirname(__file__), "../../backend"))

from backend.server import app

# Import exceptions from the same path as server.py uses
from llm_client import LLMAuthenticationError, LLMQuotaExceededError

client = TestClient(app)

# Common payload with port details included (localStorage-backed on frontend)
PLAN_PAYLOAD = {
    "trip_id": "trip-456",
    "port_id": "port-789",
    "port_name": "Barcelona",
    "port_country": "Spain",
    "latitude": 41.38,
    "longitude": 2.19,
    "arrival": "2023-10-01T08:00:00",
    "departure": "2023-10-01T18:00:00",
    "ship_name": "Test Ship",
    "preferences": {
        "party_type": "couple",
        "activity_level": "moderate",
        "transport_mode": "mixed",
        "budget": "medium",
        "currency": "GBP",
    },
}


@patch("backend.server.LLMClient")
def test_generate_plan_success(mock_llm_client_class):
    # 1. Setup mocks
    mock_device_id = "test-device-123"

    # Mock environment variable for API key
    with patch.dict(os.environ, {"GROQ_API_KEY": "test-api-key"}):
        # Mock LLM Client
        mock_llm_instance = MagicMock()
        mock_llm_client_class.return_value = mock_llm_instance

        # Mock LLM response
        response_json = json.dumps(
            {
                "plan_title": "A Day in Barcelona",
                "summary": "Enjoy the sights of Barcelona.",
                "return_by": "17:00",
                "total_estimated_cost": "£50",
                "activities": [],
                "packing_suggestions": ["water"],
                "safety_tips": ["watch for pickpockets"],
            }
        )
        mock_llm_instance.generate_day_plan.return_value = response_json
        mock_llm_instance.parse_json_response.return_value = json.loads(response_json)

        headers = {"X-Device-Id": mock_device_id}

        # We use patch for httpx to avoid real weather API calls during AI test
        with patch("httpx.AsyncClient.get") as mock_weather_get:
            mock_weather_resp = MagicMock()
            mock_weather_resp.status_code = 200
            mock_weather_resp.json.return_value = {
                "daily": {"temperature_2m_max": [25]}
            }
            mock_weather_get.return_value = mock_weather_resp

            response = client.post(
                "/api/plans/generate", json=PLAN_PAYLOAD, headers=headers
            )

        # 3. Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["plan"]["plan_title"] == "A Day in Barcelona"
        assert data["port_name"] == "Barcelona"

        # Verify LLM was called
        mock_llm_instance.generate_day_plan.assert_called_once()
        call_kwargs = mock_llm_instance.generate_day_plan.call_args[1]
        assert "Barcelona" in call_kwargs["prompt"]
        assert "expert cruise port day planner" in call_kwargs[
            "system_instruction"
        ].lower()


def test_generate_plan_missing_api_key():
    # Mock missing API key env var
    with patch.dict(os.environ, {"GROQ_API_KEY": ""}, clear=True):
        payload = {
            "trip_id": "t",
            "port_id": "p",
            "port_name": "N",
            "port_country": "C",
            "latitude": 0.0,
            "longitude": 0.0,
            "arrival": "2023-10-01T08:00:00",
            "departure": "2023-10-01T18:00:00",
            "ship_name": "Test Ship",
            "preferences": {
                "party_type": "solo",
                "activity_level": "light",
                "transport_mode": "walking",
                "budget": "free",
            },
        }
        response = client.post(
            "/api/plans/generate", json=payload, headers={"X-Device-Id": "d"}
        )

        assert response.status_code == 503
        detail = response.json()["detail"]
        # New structured error format
        assert isinstance(detail, dict)
        assert detail["error"] == "ai_service_not_configured"
        assert "not configured" in detail["message"].lower()


@patch("backend.server.LLMClient")
def test_generate_plan_quota_exceeded(mock_llm_client_class):
    """Test handling of API quota exceeded errors."""
    mock_device_id = "test-device-123"

    with patch.dict(os.environ, {"GROQ_API_KEY": "test-api-key"}):
        # Mock LLM to raise quota error
        mock_llm_instance = MagicMock()
        mock_llm_client_class.return_value = mock_llm_instance
        mock_llm_instance.generate_day_plan.side_effect = LLMQuotaExceededError(
            "rate_limit exceeded"
        )

        with patch("httpx.AsyncClient.get") as mock_weather_get:
            mock_weather_resp = MagicMock()
            mock_weather_resp.status_code = 200
            mock_weather_resp.json.return_value = {
                "daily": {"temperature_2m_max": [25]}
            }
            mock_weather_get.return_value = mock_weather_resp

            response = client.post(
                "/api/plans/generate",
                json=PLAN_PAYLOAD,
                headers={"X-Device-Id": mock_device_id},
            )

        assert response.status_code == 503
        detail = response.json()["detail"]
        assert detail["error"] == "ai_service_quota_exceeded"
        assert "quota" in detail["message"].lower()


@patch("backend.server.LLMClient")
def test_generate_plan_auth_error(mock_llm_client_class):
    """Test handling of API authentication errors."""
    mock_device_id = "test-device-123"

    with patch.dict(os.environ, {"GROQ_API_KEY": "invalid-key"}):
        # Mock LLM to raise auth error
        mock_llm_instance = MagicMock()
        mock_llm_client_class.return_value = mock_llm_instance
        mock_llm_instance.generate_day_plan.side_effect = LLMAuthenticationError(
            "API key is invalid"
        )

        with patch("httpx.AsyncClient.get") as mock_weather_get:
            mock_weather_resp = MagicMock()
            mock_weather_resp.status_code = 200
            mock_weather_resp.json.return_value = {
                "daily": {"temperature_2m_max": [25]}
            }
            mock_weather_get.return_value = mock_weather_resp

            response = client.post(
                "/api/plans/generate",
                json=PLAN_PAYLOAD,
                headers={"X-Device-Id": mock_device_id},
            )

        assert response.status_code == 503
        detail = response.json()["detail"]
        assert detail["error"] == "ai_service_auth_failed"
        assert "authentication" in detail["message"].lower()
