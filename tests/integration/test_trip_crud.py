"""
Integration tests for Trip CRUD operations
Tests the full request/response cycle for trip management endpoints
"""
import pytest
from unittest.mock import patch, MagicMock, Mock
from fastapi.testclient import TestClient
import sys
import os
import uuid

sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

# Mock DynamoDB before importing app
with patch('boto3.resource') as mock_boto3:
    mock_table = MagicMock()
    mock_dynamodb = MagicMock()
    mock_dynamodb.Table.return_value = mock_table
    mock_boto3.return_value = mock_dynamodb
    from backend.server import app

client = TestClient(app)

# Test data constants
VALID_DEVICE_ID = "test-device-123"
VALID_SHIP_NAME = "Wonder of the Seas"
VALID_CRUISE_LINE = "Royal Caribbean"


@patch('backend.server.db_client')
def test_create_trip_success(mock_db_client):
    """Test successful trip creation"""
    # Arrange
    trip_data = {
        "ship_name": VALID_SHIP_NAME,
        "cruise_line": VALID_CRUISE_LINE
    }
    
    # Mock successful trip creation
    def create_trip_side_effect(trip):
        return trip
    mock_db_client.create_trip.side_effect = create_trip_side_effect
    
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
    
    # Verify create_trip was called
    assert mock_db_client.create_trip.called
    call_args = mock_db_client.create_trip.call_args[0][0]
    assert call_args["ship_name"] == VALID_SHIP_NAME
    assert call_args["device_id"] == VALID_DEVICE_ID


@patch('backend.server.db_client')
def test_create_trip_without_cruise_line(mock_db_client):
    """Test trip creation with optional cruise_line omitted"""
    trip_data = {"ship_name": VALID_SHIP_NAME}
    
    # Mock successful trip creation
    def create_trip_side_effect(trip):
        return trip
    mock_db_client.create_trip.side_effect = create_trip_side_effect
    
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


@patch('backend.server.db_client')
def test_list_trips_empty(mock_db_client):
    """Test listing trips when none exist"""
    # Mock empty result from DynamoDB
    mock_db_client.list_trips.return_value = []
    
    response = client.get("/api/trips", headers={"X-Device-Id": VALID_DEVICE_ID})
    
    assert response.status_code == 200
    assert response.json() == []
    
    # Verify list_trips was called with correct device_id
    mock_db_client.list_trips.assert_called_once()
    call_args = mock_db_client.list_trips.call_args[0]
    assert call_args[0] == VALID_DEVICE_ID


@patch('backend.server.db_client')
def test_list_trips_with_data(mock_db_client):
    """Test listing trips returns correct data"""
    # Arrange
    mock_trip = {
        "trip_id": "trip-123",
        "device_id": VALID_DEVICE_ID,
        "ship_name": VALID_SHIP_NAME,
        "cruise_line": VALID_CRUISE_LINE,
        "ports": []
    }
    mock_db_client.list_trips.return_value = [mock_trip]
    
    # Act
    response = client.get("/api/trips", headers={"X-Device-Id": VALID_DEVICE_ID})
    
    # Assert
    assert response.status_code == 200
    trips = response.json()
    assert len(trips) == 1
    assert trips[0]["trip_id"] == "trip-123"
    
    # Verify query uses correct device_id
    call_args = mock_db_client.list_trips.call_args[0]
    assert call_args[0] == VALID_DEVICE_ID


@patch('backend.server.db_client')
def test_get_trip_success(mock_db_client):
    """Test retrieving a specific trip"""
    trip_id = "trip-123"
    mock_trip = {
        "trip_id": trip_id,
        "device_id": VALID_DEVICE_ID,
        "ship_name": VALID_SHIP_NAME,
        "ports": []
    }
    mock_db_client.get_trip.return_value = mock_trip
    
    response = client.get(
        f"/api/trips/{trip_id}",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["trip_id"] == trip_id
    
    # Verify get_trip was called with correct arguments
    mock_db_client.get_trip.assert_called_once_with(trip_id, VALID_DEVICE_ID)


@patch('backend.server.db_client')
def test_get_trip_not_found(mock_db_client):
    """Test retrieving non-existent trip returns 404"""
    # DynamoDB returns None when trip not found
    mock_db_client.get_trip.return_value = None
    
    response = client.get(
        "/api/trips/nonexistent",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 404
    detail = response.json()["detail"]
    # New structured error format
    assert isinstance(detail, dict)
    assert "not found" in detail["message"].lower()


@patch('backend.server.db_client')
def test_update_trip_success(mock_db_client):
    """Test updating trip details"""
    trip_id = "trip-123"
    existing_trip = {
        "trip_id": trip_id,
        "device_id": VALID_DEVICE_ID,
        "ship_name": VALID_SHIP_NAME
    }
    updated_trip = {
        **existing_trip,
        "ship_name": "New Ship Name",
        "cruise_line": "New Cruise Line"
    }
    
    # Mock update_trip to return updated trip
    mock_db_client.update_trip.return_value = updated_trip
    
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
    # Verify update_trip was called
    assert mock_db_client.update_trip.called
    call_args = mock_db_client.update_trip.call_args[0]
    assert call_args[0] == trip_id
    assert call_args[1] == VALID_DEVICE_ID


@patch('backend.server.db_client')
def test_update_trip_partial(mock_db_client):
    """Test partial update (only ship_name)"""
    trip_id = "trip-123"
    existing_trip = {
        "trip_id": trip_id,
        "device_id": VALID_DEVICE_ID,
        "ship_name": VALID_SHIP_NAME
    }
    updated_trip = {
        **existing_trip,
        "ship_name": "Updated Ship"
    }
    
    mock_db_client.update_trip.return_value = updated_trip
    
    update_data = {"ship_name": "Updated Ship"}
    
    response = client.put(
        f"/api/trips/{trip_id}",
        json=update_data,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200


@patch('backend.server.db_client')
def test_delete_trip_success(mock_db_client):
    """Test deleting a trip"""
    trip_id = "trip-123"
    # DynamoDB delete_trip returns True on success
    mock_db_client.delete_trip.return_value = True
    # Mock cascade delete of plans
    mock_db_client.delete_plans_by_trip.return_value = 0
    
    response = client.delete(
        f"/api/trips/{trip_id}",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200
    assert "message" in response.json()
    assert "deleted" in response.json()["message"].lower()
    
    # Verify delete was called with correct arguments
    mock_db_client.delete_trip.assert_called_once_with(trip_id, VALID_DEVICE_ID)


@patch('backend.server.db_client')
def test_delete_trip_not_found(mock_db_client):
    """Test deleting non-existent trip"""
    # DynamoDB delete_trip returns False when not found
    mock_db_client.delete_trip.return_value = False
    
    response = client.delete(
        "/api/trips/nonexistent",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 404


@patch('backend.server.db_client')
def test_trip_isolation_between_devices(mock_db_client):
    """Test that different devices cannot access each other's trips"""
    device_a = "device-a"
    device_b = "device-b"
    trip_id = "trip-123"
    
    # Device A creates trip - Device B tries to access it
    # DynamoDB returns None for device B (not found)
    mock_db_client.get_trip.return_value = None
    
    # Device B tries to access it
    response = client.get(
        f"/api/trips/{trip_id}",
        headers={"X-Device-Id": device_b}
    )
    
    # Should query with device_b
    mock_db_client.get_trip.assert_called_with(trip_id, device_b)
    assert response.status_code == 404
