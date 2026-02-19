"""
Test suite for backend error handling and health monitoring.
Tests degraded states, database errors, and LLM service failures.
"""

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


class TestHealthCheck:
    """Test the health check endpoint degraded states."""

    @patch("server.db_client")
    def test_health_check_all_services_healthy(self, mock_db_client):
        """Test health check when all services are healthy."""
        mock_db_client.ping.return_value = True

        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            response = client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["checks"]["database"] == "healthy"
        assert data["checks"]["ai_service"] == "configured"

    @patch("server.db_client", None)
    def test_health_check_database_not_configured(self):
        """Test health check when database is not available."""
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            response = client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["checks"]["database"] == "not_configured"

    @patch("server.db_client")
    def test_health_check_llm_not_configured(self, mock_db_client):
        """Test health check when LLM service is not configured."""
        mock_db_client.ping.return_value = True

        with patch.dict(os.environ, {}, clear=True):
            response = client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["checks"]["ai_service"] == "not_configured"


class TestDatabaseErrors:
    """Test database unavailability error handling."""

    @patch("server.db_client", None)
    def test_item_creation_fails_when_db_unavailable(self):
        """Test item creation fails gracefully when DB unavailable."""
        response = client.post(
            "/api/items",
            json={"name": "Test Item", "description": "Test"},
        )

        assert response.status_code == 503
        data = response.json()
        assert "detail" in data


class TestNotFoundErrors:
    """Test 404 error responses."""

    @patch("server.db_client")
    def test_get_item_not_found(self, mock_db_client):
        """Test getting a non-existent item returns 404."""
        mock_db_client.get_item.return_value = None

        response = client.get("/api/items/nonexistent-id")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


class TestLLMErrors:
    """Test LLM service error scenarios."""

    @patch("server.db_client")
    def test_generate_missing_api_key(self, mock_db_client):
        """Test generation fails when API key is missing."""
        mock_db_client.ping.return_value = True

        with patch.dict(os.environ, {}, clear=True):
            response = client.post(
                "/api/generate",
                json={"prompt": "Test prompt"},
            )

        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
