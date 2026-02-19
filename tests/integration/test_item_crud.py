"""
Integration tests for Items CRUD operations.
Tests the full request/response cycle for item management endpoints.
"""

import os
import sys
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

sys.path.append(os.path.join(os.path.dirname(__file__), "../../backend"))

# Mock DynamoDB before importing app
with patch("boto3.resource") as mock_boto3:
    mock_table = MagicMock()
    mock_dynamodb = MagicMock()
    mock_dynamodb.Table.return_value = mock_table
    mock_boto3.return_value = mock_dynamodb
    from server import app

client = TestClient(app)

# Test data constants
VALID_ITEM_NAME = "Test Item"
VALID_DESCRIPTION = "A test item description"


@patch("server.db_client")
def test_create_item_success(mock_db_client):
    """Test successful item creation."""
    # Arrange
    item_data = {"name": VALID_ITEM_NAME, "description": VALID_DESCRIPTION}

    # Mock successful item creation
    def put_item_side_effect(item, partition_key="item_id"):
        return item

    mock_db_client.put_item.side_effect = put_item_side_effect

    # Act
    response = client.post("/api/items", json=item_data)

    # Assert
    assert response.status_code in [200, 201]
    data = response.json()
    assert "item_id" in data
    assert data["name"] == VALID_ITEM_NAME
    assert data["description"] == VALID_DESCRIPTION

    # Verify put_item was called
    assert mock_db_client.put_item.called


@patch("server.db_client")
def test_create_item_without_description(mock_db_client):
    """Test item creation with optional description omitted."""
    item_data = {"name": VALID_ITEM_NAME}

    # Mock successful item creation
    def put_item_side_effect(item, partition_key="item_id"):
        return item

    mock_db_client.put_item.side_effect = put_item_side_effect

    response = client.post("/api/items", json=item_data)

    assert response.status_code in [200, 201]
    data = response.json()
    assert data["name"] == VALID_ITEM_NAME


def test_create_item_missing_name():
    """Test that creating item without name fails."""
    item_data = {}

    response = client.post("/api/items", json=item_data)

    # Pydantic validation should fail
    assert response.status_code == 422


@patch("server.db_client")
def test_list_items_empty(mock_db_client):
    """Test listing items when none exist."""
    # Mock empty result from DynamoDB
    mock_db_client.scan_items.return_value = []

    response = client.get("/api/items")

    assert response.status_code == 200
    assert response.json() == []

    # Verify scan_items was called
    mock_db_client.scan_items.assert_called_once()


@patch("server.db_client")
def test_list_items_with_data(mock_db_client):
    """Test listing items returns correct data."""
    # Arrange
    mock_items = [
        {
            "item_id": "item-123",
            "name": "Item One",
            "description": "First item",
        },
        {"item_id": "item-456", "name": "Item Two"},
    ]
    mock_db_client.scan_items.return_value = mock_items

    # Act
    response = client.get("/api/items")

    # Assert
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 2
    assert items[0]["item_id"] == "item-123"


@patch("server.db_client")
def test_get_item_success(mock_db_client):
    """Test retrieving a specific item."""
    item_id = "item-123"
    mock_item = {
        "item_id": item_id,
        "name": VALID_ITEM_NAME,
        "description": VALID_DESCRIPTION,
    }
    mock_db_client.get_item.return_value = mock_item

    response = client.get(f"/api/items/{item_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["item_id"] == item_id

    # Verify get_item was called with correct arguments
    mock_db_client.get_item.assert_called_once_with(item_id, partition_key="item_id")


@patch("server.db_client")
def test_get_item_not_found(mock_db_client):
    """Test retrieving non-existent item returns 404."""
    # DynamoDB returns None when item not found
    mock_db_client.get_item.return_value = None

    response = client.get("/api/items/nonexistent")

    assert response.status_code == 404


@patch("server.db_client")
def test_update_item_success(mock_db_client):
    """Test updating item details."""
    item_id = "item-123"
    existing_item = {
        "item_id": item_id,
        "name": VALID_ITEM_NAME,
    }
    updated_item = {
        **existing_item,
        "name": "Updated Item",
        "description": "Updated description",
    }

    # Mock update_item to return updated item
    mock_db_client.update_item.return_value = updated_item

    update_data = {
        "name": "Updated Item",
        "description": "Updated description",
    }

    response = client.put(f"/api/items/{item_id}", json=update_data)

    assert response.status_code == 200
    # Verify update_item was called
    assert mock_db_client.update_item.called
    call_args = mock_db_client.update_item.call_args[0]
    assert call_args[0] == item_id


@patch("server.db_client")
def test_update_item_partial(mock_db_client):
    """Test partial update (only name)."""
    item_id = "item-123"
    existing_item = {"item_id": item_id, "name": VALID_ITEM_NAME}
    updated_item = {**existing_item, "name": "Updated Item"}

    mock_db_client.update_item.return_value = updated_item

    update_data = {"name": "Updated Item"}

    response = client.put(f"/api/items/{item_id}", json=update_data)

    assert response.status_code == 200


@patch("server.db_client")
def test_delete_item_success(mock_db_client):
    """Test deleting an item."""
    item_id = "item-123"
    # DynamoDB delete_item returns True on success
    mock_db_client.delete_item.return_value = True

    response = client.delete(f"/api/items/{item_id}")

    assert response.status_code == 200
    assert "message" in response.json()

    # Verify delete was called with correct arguments
    mock_db_client.delete_item.assert_called_once_with(item_id, partition_key="item_id")


@patch("server.db_client")
def test_delete_item_not_found(mock_db_client):
    """Test deleting non-existent item."""
    # DynamoDB delete_item returns False when not found
    mock_db_client.delete_item.return_value = False

    response = client.delete("/api/items/nonexistent")

    assert response.status_code == 404
