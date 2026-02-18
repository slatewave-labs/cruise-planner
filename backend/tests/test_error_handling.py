"""
Test suite for backend error handling and logging improvements.
"""

import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

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


class TestHealthCheck:
    """Test the enhanced health check endpoint."""

    @patch("server.mongo_client")
    def test_health_check_all_services_healthy(self, mock_mongo_client):
        """Test health check when all services are healthy."""
        mock_mongo_client.admin.command.return_value = {"ok": 1}

        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            response = client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["checks"]["database"] == "healthy"
        assert data["checks"]["ai_service"] == "configured"

    @patch("server.mongo_client", None)
    def test_health_check_database_not_configured(self):
        """Test health check when database is not configured."""
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            response = client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["checks"]["database"] == "not_configured"

    @patch("server.mongo_client")
    def test_health_check_ai_service_not_configured(self, mock_mongo_client):
        """Test health check when AI service is not configured."""
        mock_mongo_client.admin.command.return_value = {"ok": 1}

        with patch.dict(os.environ, {}, clear=True):
            response = client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["checks"]["ai_service"] == "not_configured"


class TestDatabaseErrors:
    """Test database connection error handling."""

    @patch("server.mongo_client", None)
    @patch("server.trips_col", None)
    def test_trip_creation_fails_when_db_unavailable(self):
        """Test that trip creation fails gracefully when database is unavailable."""
        response = client.post(
            "/api/trips",
            json={"ship_name": "Test Ship", "cruise_line": "Test Line"},
            headers={"X-Device-Id": "test-device"},
        )

        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert data["detail"]["error"] == "database_unavailable"
        assert "troubleshooting" in data["detail"]


class TestNotFoundErrors:
    """Test 404 error responses with detailed messages."""

    @patch("server.trips_col")
    def test_get_trip_not_found(self, mock_trips):
        """Test getting a non-existent trip returns detailed error."""
        mock_trips.find_one.return_value = None

        with patch("server.mongo_client") as mock_client:
            mock_client.admin.command.return_value = {"ok": 1}
            response = client.get(
                "/api/trips/nonexistent-id", headers={"X-Device-Id": "test-device"}
            )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert data["detail"]["error"] == "trip_not_found"
        assert "trip_id" in data["detail"]
        assert data["detail"]["trip_id"] == "nonexistent-id"

    @patch("server.plans_col")
    def test_get_plan_not_found(self, mock_plans):
        """Test getting a non-existent plan returns detailed error."""
        mock_plans.find_one.return_value = None

        with patch("server.mongo_client") as mock_client:
            mock_client.admin.command.return_value = {"ok": 1}
            response = client.get(
                "/api/plans/nonexistent-id", headers={"X-Device-Id": "test-device"}
            )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert data["detail"]["error"] == "plan_not_found"
        assert "plan_id" in data["detail"]


class TestWeatherAPIErrors:
    """Test weather API error handling."""

    def test_weather_service_unavailable(self):
        """Test weather endpoint handles service unavailability."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = MagicMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client_class.return_value = mock_client

            mock_response = AsyncMock()
            mock_response.status_code = 500
            mock_response.text = "Internal Server Error"
            mock_client.get = AsyncMock(return_value=mock_response)

            response = client.get("/api/weather?latitude=40.7128&longitude=-74.0060")

            assert response.status_code == 502
            data = response.json()
            assert "detail" in data
            assert data["detail"]["error"] == "weather_service_unavailable"

    def test_weather_service_timeout(self):
        """Test weather endpoint handles timeouts."""
        import httpx

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = MagicMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client_class.return_value = mock_client

            mock_client.get = AsyncMock(
                side_effect=httpx.TimeoutException("Request timed out")
            )

            response = client.get("/api/weather?latitude=40.7128&longitude=-74.0060")

            assert response.status_code == 504
            data = response.json()
            assert "detail" in data
            assert data["detail"]["error"] == "weather_service_timeout"


class TestPlanGenerationErrors:
    """Test plan generation error scenarios."""

    @patch("server.trips_col")
    @patch("server.plans_col")
    def test_generate_plan_missing_api_key(self, mock_plans, mock_trips):
        """Test plan generation fails gracefully when API key is missing."""
        mock_trips.find_one.return_value = {
            "trip_id": "trip-123",
            "device_id": "test-device",
            "ship_name": "Test Ship",
            "ports": [
                {
                    "port_id": "port-456",
                    "name": "Barcelona",
                    "country": "Spain",
                    "latitude": 41.38,
                    "longitude": 2.19,
                    "arrival": "2023-10-01T08:00:00",
                    "departure": "2023-10-01T18:00:00",
                }
            ],
        }

        with patch("server.mongo_client") as mock_client:
            mock_client.admin.command.return_value = {"ok": 1}
            with patch.dict(os.environ, {}, clear=True):
                with patch("httpx.AsyncClient"):
                    response = client.post(
                        "/api/plans/generate",
                        json={
                            "trip_id": "trip-123",
                            "port_id": "port-456",
                            "preferences": {
                                "party_type": "solo",
                                "activity_level": "light",
                                "transport_mode": "walking",
                                "budget": "free",
                            },
                        },
                        headers={"X-Device-Id": "test-device"},
                    )

        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert data["detail"]["error"] == "ai_service_not_configured"
        assert "troubleshooting" in data["detail"]

    @patch("server.LLMClient")
    @patch("server.trips_col")
    @patch("server.plans_col")
    def test_generate_plan_quota_exceeded(
        self, mock_plans, mock_trips, mock_llm_client_class
    ):
        """Test plan generation handles quota exceeded errors."""
        from llm_client import LLMQuotaExceededError

        mock_trips.find_one.return_value = {
            "trip_id": "trip-123",
            "device_id": "test-device",
            "ship_name": "Test Ship",
            "ports": [
                {
                    "port_id": "port-456",
                    "name": "Barcelona",
                    "country": "Spain",
                    "latitude": 41.38,
                    "longitude": 2.19,
                    "arrival": "2023-10-01T08:00:00",
                    "departure": "2023-10-01T18:00:00",
                }
            ],
        }

        mock_llm_instance = MagicMock()
        mock_llm_client_class.return_value = mock_llm_instance
        mock_llm_instance.generate_day_plan.side_effect = LLMQuotaExceededError(
            "Quota exceeded for this project"
        )

        with patch("server.mongo_client") as mock_client:
            mock_client.admin.command.return_value = {"ok": 1}
            with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
                with patch("httpx.AsyncClient"):
                    response = client.post(
                        "/api/plans/generate",
                        json={
                            "trip_id": "trip-123",
                            "port_id": "port-456",
                            "preferences": {
                                "party_type": "solo",
                                "activity_level": "light",
                                "transport_mode": "walking",
                                "budget": "free",
                            },
                        },
                        headers={"X-Device-Id": "test-device"},
                    )

        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert data["detail"]["error"] == "ai_service_quota_exceeded"
        assert "retry_after" in data["detail"]

    @patch("server.LLMClient")
    @patch("server.trips_col")
    @patch("server.plans_col")
    def test_generate_plan_authentication_error(
        self, mock_plans, mock_trips, mock_llm_client_class
    ):
        """Test plan generation handles authentication errors."""
        from llm_client import LLMAuthenticationError

        mock_trips.find_one.return_value = {
            "trip_id": "trip-123",
            "device_id": "test-device",
            "ship_name": "Test Ship",
            "ports": [
                {
                    "port_id": "port-456",
                    "name": "Barcelona",
                    "country": "Spain",
                    "latitude": 41.38,
                    "longitude": 2.19,
                    "arrival": "2023-10-01T08:00:00",
                    "departure": "2023-10-01T18:00:00",
                }
            ],
        }

        mock_llm_instance = MagicMock()
        mock_llm_client_class.return_value = mock_llm_instance
        mock_llm_instance.generate_day_plan.side_effect = LLMAuthenticationError(
            "Invalid API key provided - 401 authentication failed"
        )

        with patch("server.mongo_client") as mock_client:
            mock_client.admin.command.return_value = {"ok": 1}
            with patch.dict(os.environ, {"GROQ_API_KEY": "invalid-key"}):
                with patch("httpx.AsyncClient"):
                    response = client.post(
                        "/api/plans/generate",
                        json={
                            "trip_id": "trip-123",
                            "port_id": "port-456",
                            "preferences": {
                                "party_type": "solo",
                                "activity_level": "light",
                                "transport_mode": "walking",
                                "budget": "free",
                            },
                        },
                        headers={"X-Device-Id": "test-device"},
                    )

        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert data["detail"]["error"] == "ai_service_auth_failed"

    @patch("server.LLMClient")
    @patch("server.trips_col")
    @patch("server.plans_col")
    def test_generate_plan_with_malformed_json_response(
        self, mock_plans, mock_trips, mock_llm_client_class
    ):
        """Test plan generation handles malformed JSON from AI."""
        import json as json_module

        mock_trips.find_one.return_value = {
            "trip_id": "trip-123",
            "device_id": "test-device",
            "ship_name": "Test Ship",
            "ports": [
                {
                    "port_id": "port-456",
                    "name": "Barcelona",
                    "country": "Spain",
                    "latitude": 41.38,
                    "longitude": 2.19,
                    "arrival": "2023-10-01T08:00:00",
                    "departure": "2023-10-01T18:00:00",
                }
            ],
        }

        mock_llm_instance = MagicMock()
        mock_llm_client_class.return_value = mock_llm_instance
        mock_llm_instance.generate_day_plan.return_value = (
            "This is not valid JSON {broken"
        )
        mock_llm_instance.parse_json_response.side_effect = json_module.JSONDecodeError(
            "Expecting value", "This is not valid JSON {broken", 0
        )

        with patch("server.mongo_client") as mock_client:
            mock_client.admin.command.return_value = {"ok": 1}
            with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
                with patch("httpx.AsyncClient"):
                    response = client.post(
                        "/api/plans/generate",
                        json={
                            "trip_id": "trip-123",
                            "port_id": "port-456",
                            "preferences": {
                                "party_type": "solo",
                                "activity_level": "light",
                                "transport_mode": "walking",
                                "budget": "free",
                            },
                        },
                        headers={"X-Device-Id": "test-device"},
                    )

        # Should still return 200 but with parse_error flag
        assert response.status_code == 200
        data = response.json()
        assert data["plan"]["parse_error"] is True
        assert "raw_response" in data["plan"]


class TestRequestIDTracking:
    """Test request ID tracking for observability."""

    def test_request_id_added_to_response(self):
        """Test that X-Request-ID header is added to responses."""
        response = client.get("/api/health")
        assert "X-Request-ID" in response.headers

    def test_request_id_preserved_if_provided(self):
        """Test that provided X-Request-ID is preserved."""
        custom_id = "custom-request-id-123"
        response = client.get("/api/health", headers={"X-Request-ID": custom_id})
        assert response.headers["X-Request-ID"] == custom_id
