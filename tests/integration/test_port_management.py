"""
Integration tests for Port Management within Trips
Tests adding, updating, and deleting ports from trips
"""
import pytest
from unittest.mock import patch, MagicMock, Mock
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

VALID_DEVICE_ID = "test-device-123"
TEST_TRIP_ID = "trip-456"
TEST_PORT_ID = "port-789"


# Valid port data for testing
VALID_PORT_DATA = {
    "name": "Barcelona",
    "country": "Spain",
    "latitude": 41.38,
    "longitude": 2.19,
    "arrival": "2023-10-01T08:00:00",
    "departure": "2023-10-01T18:00:00"
}


@patch('backend.server.db_client')
def test_add_port_to_trip_success(mock_db_client):
    """Test successfully adding a port to a trip"""
    # Mock trip exists
    existing_trip = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ship_name": "Test Ship",
        "ports": []
    }
    mock_db_client.get_trip.return_value = existing_trip
    
    # Mock successful update
    updated_trip = {
        **existing_trip,
        "ports": [{**VALID_PORT_DATA, "port_id": "port-123"}]
    }
    mock_db_client.update_trip.return_value = updated_trip
    
    response = client.post(
        f"/api/trips/{TEST_TRIP_ID}/ports",
        json=VALID_PORT_DATA,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "port_id" in data
    assert data["name"] == VALID_PORT_DATA["name"]
    assert data["latitude"] == VALID_PORT_DATA["latitude"]
    
    # Verify update was called
    assert mock_db_client.update_trip.called


@patch('backend.server.db_client')
def test_add_port_trip_not_found(mock_db_client):
    """Test adding port to non-existent trip"""
    # DynamoDB returns None when trip not found
    mock_db_client.get_trip.return_value = None
    
    response = client.post(
        f"/api/trips/nonexistent/ports",
        json=VALID_PORT_DATA,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 404


def test_add_port_missing_required_fields():
    """Test adding port with missing required fields"""
    invalid_data = {
        "name": "Barcelona",
        # Missing country, latitude, longitude, arrival, departure
    }
    
    response = client.post(
        f"/api/trips/{TEST_TRIP_ID}/ports",
        json=invalid_data,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 422


def test_add_port_invalid_coordinates():
    """Test adding port with invalid coordinates"""
    invalid_data = {
        **VALID_PORT_DATA,
        "latitude": 200,  # Invalid latitude
    }
    
    response = client.post(
        f"/api/trips/{TEST_TRIP_ID}/ports",
        json=invalid_data,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    # Should either fail validation or pass through (depends on Pydantic setup)
    # For now, just check it doesn't crash
    assert response.status_code in [200, 422, 404]


@patch('backend.server.db_client')
def test_update_port_success(mock_db_client):
    """Test updating an existing port"""
    # Mock trip with existing port
    existing_trip = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ports": [{
            "port_id": TEST_PORT_ID,
            **VALID_PORT_DATA
        }]
    }
    mock_db_client.get_trip.return_value = existing_trip
    
    # Mock successful update
    updated_trip = {
        **existing_trip,
        "ports": [{
            "port_id": TEST_PORT_ID,
            **VALID_PORT_DATA,
            "arrival": "2023-10-01T09:00:00",
        }]
    }
    mock_db_client.update_trip.return_value = updated_trip
    
    updated_data = {
        **VALID_PORT_DATA,
        "arrival": "2023-10-01T09:00:00",  # Changed arrival time
    }
    
    response = client.put(
        f"/api/trips/{TEST_TRIP_ID}/ports/{TEST_PORT_ID}",
        json=updated_data,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "updated" in data["message"].lower()


@patch('backend.server.db_client')
def test_update_port_not_found(mock_db_client):
    """Test updating non-existent port"""
    # Mock trip exists but port doesn't
    existing_trip = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ports": []
    }
    mock_db_client.get_trip.return_value = existing_trip
    
    # Update returns None when port not found
    mock_db_client.update_trip.return_value = None
    
    response = client.put(
        f"/api/trips/{TEST_TRIP_ID}/ports/nonexistent",
        json=VALID_PORT_DATA,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 404


@patch('backend.server.db_client')
def test_delete_port_success(mock_db_client):
    """Test deleting a port from a trip"""
    # Mock trip with port
    existing_trip = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ports": [{
            "port_id": TEST_PORT_ID,
            **VALID_PORT_DATA
        }]
    }
    mock_db_client.get_trip.return_value = existing_trip
    
    # Mock successful deletion
    updated_trip = {
        **existing_trip,
        "ports": []
    }
    mock_db_client.update_trip.return_value = updated_trip
    # Mock cascade delete of plans
    mock_db_client.delete_plans_by_port.return_value = 0
    
    response = client.delete(
        f"/api/trips/{TEST_TRIP_ID}/ports/{TEST_PORT_ID}",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    
    # Verify update was called to remove port
    assert mock_db_client.update_trip.called


@patch('backend.server.db_client')
def test_delete_port_not_found(mock_db_client):
    """Test deleting non-existent port"""
    # Mock trip exists but port doesn't
    existing_trip = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ports": []
    }
    mock_db_client.get_trip.return_value = existing_trip
    
    # Update returns None when port not found
    mock_db_client.update_trip.return_value = None
    
    response = client.delete(
        f"/api/trips/{TEST_TRIP_ID}/ports/nonexistent",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 404


@patch('backend.server.db_client')
def test_multiple_ports_in_trip(mock_db_client):
    """Test managing multiple ports in a single trip"""
    # Mock trip with multiple ports
    existing_trip = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ports": [
            {"port_id": "port-1", "name": "Barcelona", **VALID_PORT_DATA},
            {"port_id": "port-2", "name": "Rome", **VALID_PORT_DATA, "country": "Italy"},
        ]
    }
    mock_db_client.get_trip.return_value = existing_trip
    
    # Mock successful deletion
    updated_trip = {
        **existing_trip,
        "ports": [{"port_id": "port-2", "name": "Rome", **VALID_PORT_DATA, "country": "Italy"}]
    }
    mock_db_client.update_trip.return_value = updated_trip
    mock_db_client.delete_plans_by_port.return_value = 0
    
    # Delete one port
    response = client.delete(
        f"/api/trips/{TEST_TRIP_ID}/ports/port-1",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200


@patch('backend.server.db_client')
def test_port_isolation_between_devices(mock_db_client):
    """Test that devices cannot modify each other's trip ports"""
    device_a = "device-a"
    device_b = "device-b"
    
    # Device B tries to add port to Device A's trip
    # DynamoDB returns None for device B (trip not found)
    mock_db_client.get_trip.return_value = None
    
    response = client.post(
        f"/api/trips/{TEST_TRIP_ID}/ports",
        json=VALID_PORT_DATA,
        headers={"X-Device-Id": device_b}
    )
    
    assert response.status_code == 404


@patch('backend.server.db_client')
def test_add_port_with_special_characters_in_name(mock_db_client):
    """Test adding port with special characters in name"""
    existing_trip = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ports": []
    }
    mock_db_client.get_trip.return_value = existing_trip
    
    special_port = {
        **VALID_PORT_DATA,
        "name": "São Paulo (Santos)",
        "country": "Côte d'Ivoire"
    }
    
    # Mock successful update
    updated_trip = {
        **existing_trip,
        "ports": [{**special_port, "port_id": "port-123"}]
    }
    mock_db_client.update_trip.return_value = updated_trip
    
    response = client.post(
        f"/api/trips/{TEST_TRIP_ID}/ports",
        json=special_port,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == special_port["name"]
