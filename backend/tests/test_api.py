"""
Test suite for items CRUD API endpoints.
Tests basic functionality including health, CRUD operations, and CORS.
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
    import server
    from server import app

client = TestClient(app)


def test_health_check():
    """Test that health check endpoint returns service information."""
    with patch("server.db_client") as mock_db_client:
        mock_db_client.ping.return_value = True
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            response = client.get("/api/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"
            assert "service" in data
            assert "checks" in data
            assert data["checks"]["database"] == "healthy"


def test_create_item():
    """Test creating a new item."""
    with patch("server.db_client") as mock_db_client:
        # Mock successful item creation
        mock_item = {
            "item_id": "item-123",
            "name": "Test Item",
            "description": "A test item",
            "created_at": "2024-01-15T10:30:00",
        }
        mock_db_client.put_item.return_value = mock_item

        payload = {"name": "Test Item", "description": "A test item"}
        response = client.post("/api/items", json=payload)

        assert response.status_code in [200, 201]
        data = response.json()
        assert data["name"] == "Test Item"
        assert data["description"] == "A test item"
        assert "item_id" in data


def test_create_item_without_description():
    """Test creating item with optional description omitted."""
    with patch("server.db_client") as mock_db_client:
        mock_item = {
            "item_id": "item-456",
            "name": "Minimal Item",
            "created_at": "2024-01-15T10:30:00",
        }
        mock_db_client.put_item.return_value = mock_item

        payload = {"name": "Minimal Item"}
        response = client.post("/api/items", json=payload)

        assert response.status_code in [200, 201]
        data = response.json()
        assert data["name"] == "Minimal Item"


def test_list_items():
    """Test listing all items."""
    with patch("server.db_client") as mock_db_client:
        # Mock items list
        mock_items = [
            {
                "item_id": "item-1",
                "name": "Item One",
                "description": "First item",
            },
            {"item_id": "item-2", "name": "Item Two"},
        ]
        mock_db_client.scan_items.return_value = mock_items

        response = client.get("/api/items")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["name"] == "Item One"


@patch("server.LLMClient")
def test_generate_endpoint(mock_llm_client_class):
    """Test AI text generation endpoint."""
    # Mock LLM Client
    mock_llm_instance = MagicMock()
    mock_llm_client_class.return_value = mock_llm_instance
    mock_llm_instance.generate_day_plan.return_value = "Generated response"

    payload = {"prompt": "Write a test prompt"}

    with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
        response = client.post("/api/generate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert data["response"] == "Generated response"


def test_cors_allowed_origin():
    """Allowed origin receives Access-Control-Allow-Origin header."""
    allowed = server._allowed_origins[0]
    with patch("server.db_client") as mock_db_client:
        mock_db_client.ping.return_value = True
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            response = client.get("/api/health", headers={"Origin": allowed})
    assert response.headers.get("access-control-allow-origin") == allowed


def test_cors_disallowed_origin():
    """Unknown origin does not receive Access-Control-Allow-Origin header."""
    with patch("server.db_client") as mock_db_client:
        mock_db_client.ping.return_value = True
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            response = client.get(
                "/api/health", headers={"Origin": "http://evil.example.com"}
            )
    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_parsed_from_env():
    """ALLOWED_ORIGINS env var is split on commas into origins."""
    raw = "https://app.example.com, https://staging.example.com"
    result = [o.strip() for o in raw.split(",") if o.strip()]
    assert result == [
        "https://app.example.com",
        "https://staging.example.com",
    ]


def test_cors_no_wildcard():
    """Wildcard '*' is never used as an allowed origin."""
    assert "*" not in server._allowed_origins
