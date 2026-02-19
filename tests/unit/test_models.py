"""
Unit tests for Pydantic models.
Tests request validation and model structure.
"""

import os
import sys

import pytest
from pydantic import ValidationError

# Add backend directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../backend"))

from server import (
    CreateItemRequest,
    UpdateItemRequest,
    GenerateRequest,
)


def test_create_item_valid():
    """Test valid item creation with all fields."""
    data = {"name": "Test Item", "description": "A test description"}
    item = CreateItemRequest(**data)
    assert item.name == "Test Item"
    assert item.description == "A test description"


def test_create_item_without_description():
    """Test item creation with optional description omitted."""
    data = {"name": "Minimal Item"}
    item = CreateItemRequest(**data)
    assert item.name == "Minimal Item"
    assert item.description is None


def test_create_item_missing_name():
    """Test that name is required on CreateItemRequest."""
    with pytest.raises(ValidationError):
        CreateItemRequest()


def test_update_item_all_optional():
    """Test UpdateItemRequest allows all fields to be optional."""
    # Empty update should be valid
    update = UpdateItemRequest()
    assert update.name is None
    assert update.description is None


def test_update_item_partial_name():
    """Test UpdateItemRequest with only name."""
    data = {"name": "Updated Name"}
    update = UpdateItemRequest(**data)
    assert update.name == "Updated Name"
    assert update.description is None


def test_update_item_partial_description():
    """Test UpdateItemRequest with only description."""
    data = {"description": "Updated description"}
    update = UpdateItemRequest(**data)
    assert update.name is None
    assert update.description == "Updated description"


def test_generate_request_valid():
    """Test GenerateRequest with prompt."""
    data = {"prompt": "Write a test prompt"}
    req = GenerateRequest(**data)
    assert req.prompt == "Write a test prompt"


def test_generate_request_missing_prompt():
    """Test GenerateRequest requires prompt."""
    with pytest.raises(ValidationError):
        GenerateRequest()
