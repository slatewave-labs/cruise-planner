"""
Integration tests for AI text generation endpoint.
Tests LLM client integration and error handling.
"""

import os
import sys
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

# Add backend to path so we can import server
sys.path.append(os.path.join(os.path.dirname(__file__), "../../backend"))

# Mock DynamoDB before importing app to avoid connection errors
with patch("boto3.resource") as mock_boto3:
    mock_table = MagicMock()
    mock_dynamodb = MagicMock()
    mock_dynamodb.Table.return_value = mock_table
    mock_boto3.return_value = mock_dynamodb
    from server import app

client = TestClient(app)


@patch("server.LLMClient")
def test_generate_success(mock_llm_client_class):
    """Test successful text generation."""
    # Mock LLM Client
    mock_llm_instance = MagicMock()
    mock_llm_client_class.return_value = mock_llm_instance

    # Mock LLM response
    mock_llm_instance.generate_day_plan.return_value = (
        "This is generated text from the LLM"
    )

    # Call the endpoint
    payload = {"prompt": "Write a short test response"}

    with patch.dict(os.environ, {"GROQ_API_KEY": "test-api-key"}):
        response = client.post("/api/generate", json=payload)

    # Assertions
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert data["response"] == "This is generated text from the LLM"

    # Verify LLM was called
    mock_llm_instance.generate_day_plan.assert_called_once()


def test_generate_missing_api_key():
    """Test generation fails gracefully when API key missing."""
    # Mock missing API key env var
    with patch.dict(os.environ, {"GROQ_API_KEY": ""}, clear=True):
        payload = {"prompt": "Test prompt"}
        response = client.post("/api/generate", json=payload)

        assert response.status_code == 503
        detail = response.json()["detail"]
        assert "not configured" in str(detail).lower()


def test_generate_missing_prompt():
    """Test that prompt is required."""
    with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
        payload = {}
        response = client.post("/api/generate", json=payload)

        # Pydantic validation should fail
        assert response.status_code == 422
