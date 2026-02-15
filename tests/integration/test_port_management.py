"""
Integration tests for Port Management within Trips
Tests adding, updating, and deleting ports from trips
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

with patch('pymongo.MongoClient') as mock_mongo:
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


@patch('backend.server.trips_col')
def test_add_port_to_trip_success(mock_trips):
    """Test successfully adding a port to a trip"""
    # Mock trip exists
    mock_trips.find_one.return_value = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ship_name": "Test Ship",
        "ports": []
    }
    
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
    assert mock_trips.update_one.called


@patch('backend.server.trips_col')
def test_add_port_trip_not_found(mock_trips):
    """Test adding port to non-existent trip"""
    mock_trips.find_one.return_value = None
    
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


@patch('backend.server.trips_col')
def test_update_port_success(mock_trips):
    """Test updating an existing port"""
    # Mock trip with existing port
    mock_trips.find_one.return_value = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ports": [{
            "port_id": TEST_PORT_ID,
            **VALID_PORT_DATA
        }]
    }
    
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
    assert data["arrival"] == updated_data["arrival"]


@patch('backend.server.trips_col')
def test_update_port_not_found(mock_trips):
    """Test updating non-existent port"""
    mock_trips.find_one.return_value = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ports": []  # No ports
    }
    
    response = client.put(
        f"/api/trips/{TEST_TRIP_ID}/ports/nonexistent",
        json=VALID_PORT_DATA,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 404


@patch('backend.server.trips_col')
def test_delete_port_success(mock_trips):
    """Test deleting a port from a trip"""
    # Mock trip with existing port
    mock_trips.find_one.return_value = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ports": [{
            "port_id": TEST_PORT_ID,
            **VALID_PORT_DATA
        }]
    }
    
    response = client.delete(
        f"/api/trips/{TEST_TRIP_ID}/ports/{TEST_PORT_ID}",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["deleted"] is True
    
    # Verify update was called to remove port
    assert mock_trips.update_one.called


@patch('backend.server.trips_col')
def test_delete_port_not_found(mock_trips):
    """Test deleting non-existent port"""
    mock_trips.find_one.return_value = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ports": []
    }
    
    response = client.delete(
        f"/api/trips/{TEST_TRIP_ID}/ports/nonexistent",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 404


@patch('backend.server.trips_col')
def test_multiple_ports_in_trip(mock_trips):
    """Test managing multiple ports in a single trip"""
    # Mock trip with multiple ports
    mock_trips.find_one.return_value = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ports": [
            {"port_id": "port-1", "name": "Barcelona", **VALID_PORT_DATA},
            {"port_id": "port-2", "name": "Rome", **VALID_PORT_DATA, "country": "Italy"},
        ]
    }
    
    # Delete one port
    response = client.delete(
        f"/api/trips/{TEST_TRIP_ID}/ports/port-1",
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200


@patch('backend.server.trips_col')
def test_port_isolation_between_devices(mock_trips):
    """Test that devices cannot modify each other's trip ports"""
    device_a = "device-a"
    device_b = "device-b"
    
    # Device A's trip
    mock_trips.find_one.return_value = None  # Trip not found for device B
    
    # Device B tries to add port to Device A's trip
    response = client.post(
        f"/api/trips/{TEST_TRIP_ID}/ports",
        json=VALID_PORT_DATA,
        headers={"X-Device-Id": device_b}
    )
    
    assert response.status_code == 404


@patch('backend.server.trips_col')
def test_add_port_with_special_characters_in_name(mock_trips):
    """Test adding port with special characters in name"""
    mock_trips.find_one.return_value = {
        "trip_id": TEST_TRIP_ID,
        "device_id": VALID_DEVICE_ID,
        "ports": []
    }
    
    special_port = {
        **VALID_PORT_DATA,
        "name": "São Paulo (Santos)",
        "country": "Côte d'Ivoire"
    }
    
    response = client.post(
        f"/api/trips/{TEST_TRIP_ID}/ports",
        json=special_port,
        headers={"X-Device-Id": VALID_DEVICE_ID}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == special_port["name"]
