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

@patch('backend.server.db_client')
def test_trip_isolation(mock_db_client):
    # Setup
    device_a = "device-a"
    device_b = "device-b"
    
    # Mock list_trips for Device B (returns empty list)
    mock_db_client.list_trips.return_value = []
    
    # Call list_trips as Device B
    response = client.get("/api/trips", headers={"X-Device-Id": device_b})
    
    # Verify that the query to DynamoDB used device_b
    mock_db_client.list_trips.assert_called()
    call_args = mock_db_client.list_trips.call_args[0]
    assert call_args[0] == device_b
    
    # Even if Device B tries to GET trip-a directly, it should fail
    mock_db_client.get_trip.return_value = None  # Not found for B
    response = client.get("/api/trips/trip-a", headers={"X-Device-Id": device_b})
    assert response.status_code == 404
    
    # Verify get_trip was called with device_b
    mock_db_client.get_trip.assert_called_with("trip-a", device_b)
