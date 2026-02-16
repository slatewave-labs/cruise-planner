"""
Integration tests for Trip CRUD operations
Tests the full request/response cycle for trip management endpoints
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import sys
import os
import uuid

sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

# Mock MongoClient before importing app
with patch('pymongo.MongoClient') as mock_mongo:
    from backend.server import app

client = TestClient(app)

# Test data constants
VALID_DEVICE_ID = "test-device-123"
VALID_SHIP_NAME = "Wonder of the Seas"
VALID_CRUISE_LINE = "Royal Caribbean"


@patch('backend.server.trips_col')
def test_create_trip_success(mock_trips):
    """Test successful trip creation"""
    # Arrange
    trip_data = {
        "ship_name": VALID_SHIP_NAME,
        "cruise_line": VALID_CRUISE_LINE
    }
    
    # Act
    response = client.post(
        "/api/trips",
        json=trip_data,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "trip_id" in data
    assert data["ship_name"] == VALID_SHIP_NAME
    assert data["cruise_line"] == VALID_CRUISE_LINE
    assert data["device_id"] == VALID_DEVICE_ID
    
    # Verify insert was called
    assert mock_trips.insert_one.called


@patch('backend.server.trips_col')
def test_create_trip_without_cruise_line(mock_trips):
    """Test trip creation with optional cruise_line omitted"""
    trip_data = {"ship_name": VALID_SHIP_NAME}
    
    response = client.post(
        "/api/trips",
        json=trip_data,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["cruise_line"] == ""


def test_create_trip_missing_device_id():
    """Test that creating trip without device ID fails"""
    trip_data = {"ship_name": VALID_SHIP_NAME}
    
    response = client.post("/api/trips", json=trip_data)
    
    # FastAPI should return 422 for missing required header
    assert response.status_code == 422


def test_create_trip_missing_ship_name():
    """Test that creating trip without ship_name fails"""
    trip_data = {}
    
    response = client.post(
        "/api/trips",
        json=trip_data,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    # Pydantic validation should fail
    assert response.status_code == 422


@patch('backend.server.trips_col')
def test_list_trips_empty(mock_trips):
    """Test listing trips when none exist"""
    # Mock empty result
    mock_trips.find.return_value.sort.return_value.skip.return_value.limit.return_value = []
    
    response = client.get("/api/trips", headers={"X-Device-Id": VALID_DEVICE_ID})
    
    assert response.status_code == 200
    assert response.json() == []


@patch('backend.server.trips_col')
def test_list_trips_with_data(mock_trips):
    """Test listing trips returns correct data"""
    # Arrange
    mock_trip = {
        "trip_id": "trip-123",
        "device_id": VALID_DEVICE_ID,
        "ship_name": VALID_SHIP_NAME,
        "cruise_line": VALID_CRUISE_LINE,
        "ports": []
    }
    mock_trips.find.return_value.sort.return_value.skip.return_value.limit.return_value = [mock_trip]
    
    # Act
    response = client.get("/api/trips", headers={"X-Device-Id": VALID_DEVICE_ID})
    
    # Assert
    assert response.status_code == 200
    trips = response.json()
    assert len(trips) == 1
    assert trips[0]["trip_id"] == "trip-123"
    
    # Verify query uses correct device_id
    args, _ = mock_trips.find.call_args
    assert args[0]["device_id"] == VALID_DEVICE_ID


@patch('backend.server.trips_col')
def test_get_trip_success(mock_trips):
    """Test retrieving a specific trip"""
    trip_id = "trip-123"
    mock_trip = {
        "trip_id": trip_id,
        "device_id": VALID_DEVICE_ID,
        "ship_name": VALID_SHIP_NAME,
        "ports": []
    }
    mock_trips.find_one.return_value = mock_trip
    
    response = client.get(
        f"/api/trips/{trip_id}",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["trip_id"] == trip_id


@patch('backend.server.trips_col')
def test_get_trip_not_found(mock_trips):
    """Test retrieving non-existent trip returns 404"""
    mock_trips.find_one.return_value = None
    
    response = client.get(
        "/api/trips/nonexistent",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 404
    detail = response.json()["detail"]
    # New structured error format
    assert isinstance(detail, dict)
    assert "not found" in detail["message"].lower()


@patch('backend.server.trips_col')
def test_update_trip_success(mock_trips):
    """Test updating trip details"""
    trip_id = "trip-123"
    mock_trips.find_one.return_value = {
        "trip_id": trip_id,
        "device_id": VALID_DEVICE_ID,
        "ship_name": VALID_SHIP_NAME
    }
    
    update_data = {
        "ship_name": "New Ship Name",
        "cruise_line": "New Cruise Line"
    }
    
    response = client.put(
        f"/api/trips/{trip_id}",
        json=update_data,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200
    assert mock_trips.update_one.called


@patch('backend.server.trips_col')
def test_update_trip_partial(mock_trips):
    """Test partial update (only ship_name)"""
    trip_id = "trip-123"
    mock_trips.find_one.return_value = {
        "trip_id": trip_id,
        "device_id": VALID_DEVICE_ID,
        "ship_name": VALID_SHIP_NAME
    }
    
    update_data = {"ship_name": "Updated Ship"}
    
    response = client.put(
        f"/api/trips/{trip_id}",
        json=update_data,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200


@patch('backend.server.trips_col')
@patch('backend.server.plans_col')
def test_delete_trip_success(mock_plans, mock_trips):
    """Test deleting a trip"""
    trip_id = "trip-123"
    mock_trips.delete_one.return_value = MagicMock(deleted_count=1)
    
    response = client.delete(
        f"/api/trips/{trip_id}",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200
    assert "message" in response.json()
    assert "deleted" in response.json()["message"].lower()
    
    # Verify delete was called with correct filter
    args, _ = mock_trips.delete_one.call_args
    assert args[0]["trip_id"] == trip_id
    assert args[0]["device_id"] == VALID_DEVICE_ID


@patch('backend.server.trips_col')
def test_delete_trip_not_found(mock_trips):
    """Test deleting non-existent trip"""
    mock_trips.delete_one.return_value = MagicMock(deleted_count=0)
    
    response = client.delete(
        "/api/trips/nonexistent",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 404


@patch('backend.server.trips_col')
def test_trip_isolation_between_devices(mock_trips):
    """Test that different devices cannot access each other's trips"""
    device_a = "device-a"
    device_b = "device-b"
    trip_id = "trip-123"
    
    # Device A creates trip
    mock_trips.find_one.return_value = None
    
    # Device B tries to access it
    response = client.get(
        f"/api/trips/{trip_id}",
        headers={"X-Device-Id": device_b}
    )
    
    # Should query with device_b
    args, _ = mock_trips.find_one.call_args
    assert args[0]["device_id"] == device_b
    assert response.status_code == 404
