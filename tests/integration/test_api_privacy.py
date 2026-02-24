import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

# Mock DynamoDB before importing app
with patch('boto3.resource') as mock_boto3:
    mock_table = MagicMock()
    mock_dynamodb = MagicMock()
    mock_dynamodb.Table.return_value = mock_table
    mock_boto3.return_value = mock_dynamodb
    from backend.server import app

client = TestClient(app)


def test_health_endpoint_is_public():
    """Health endpoint does not require X-Device-Id."""
    with patch('backend.server.db_client') as mock_db_client:
        mock_db_client.health_check.return_value = True
        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            response = client.get("/api/health")
    assert response.status_code == 200


def test_port_search_is_public():
    """Port search does not require authentication."""
    response = client.get("/api/ports/search", params={"q": "Barcelona"})
    assert response.status_code == 200


def test_generate_plan_requires_device_id():
    """Generate plan endpoint requires X-Device-Id header."""
    payload = {
        "trip_id": "trip-123",
        "port_id": "port-456",
        "port_name": "Barcelona",
        "port_country": "Spain",
        "latitude": 41.38,
        "longitude": 2.19,
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
    # No X-Device-Id header
    response = client.post("/api/plans/generate", json=payload)
    assert response.status_code == 422
