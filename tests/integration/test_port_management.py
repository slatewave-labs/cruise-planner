"""
Integration tests for Port Search (remaining backend endpoint).
Port CRUD within trips is now handled client-side via localStorage.
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

from backend.server import app

client = TestClient(app)

VALID_DEVICE_ID = "test-device-123"


def test_search_ports():
    """Test that port search endpoint returns results."""
    response = client.get(
        "/api/ports/search",
        params={"q": "Barcelona"},
        headers={"X-Device-Id": VALID_DEVICE_ID},
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_list_regions():
    """Test that regions endpoint returns a list."""
    response = client.get("/api/ports/regions")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

