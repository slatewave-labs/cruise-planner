import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

with patch('pymongo.MongoClient') as mock_mongo:
    from backend.server import app

client = TestClient(app)

@patch('backend.server.trips_col')
def test_trip_isolation(mock_trips):
    # Setup
    device_a = "device-a"
    device_b = "device-b"
    
    # Mock find for Device A
    mock_trips.find.return_value.sort.return_value.skip.return_value.limit.return_value = [
        {"trip_id": "trip-a", "device_id": device_a, "ship_name": "Ship A"}
    ]
    
    # Call list_trips as Device B
    response = client.get("/api/trips", headers={"X-Device-Id": device_b})
    
    # Verify that the query to MongoDB used device_b
    args, kwargs = mock_trips.find.call_args
    assert args[0]["device_id"] == device_b
    
    # Even if Device B tries to GET trip-a directly, it should fail if mocked correctly
    mock_trips.find_one.return_value = None # Not found for B
    response = client.get("/api/trips/trip-a", headers={"X-Device-Id": device_b})
    assert response.status_code == 404
    
    args, kwargs = mock_trips.find_one.call_args
    assert args[0] == {"trip_id": "trip-a", "device_id": device_b}
    assert args[1] == {"_id": 0}
