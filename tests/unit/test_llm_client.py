"""Unit tests for LLM client abstraction layer."""

import json
import os
from unittest.mock import MagicMock, patch

import pytest

# Add backend to path
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../backend"))

from llm_client import (
    LLMAPIError,
    LLMAuthenticationError,
    LLMClient,
    LLMQuotaExceededError,
)


class TestLLMClientInitialization:
    """Test LLM client initialization."""

    def test_init_with_api_key(self):
        """Test initialization with explicit API key."""
        client = LLMClient(api_key="test-key-123")
        assert client.api_key == "test-key-123"
        assert client.model == "llama-3.1-70b-versatile"

    def test_init_with_env_var(self):
        """Test initialization with environment variable."""
        with patch.dict(os.environ, {"GROQ_API_KEY": "env-key-456"}):
            client = LLMClient()
            assert client.api_key == "env-key-456"

    def test_init_without_api_key(self):
        """Test initialization fails without API key."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="Groq API key not configured"):
                LLMClient()

    def test_init_with_empty_env_var(self):
        """Test initialization fails with empty env var."""
        with patch.dict(os.environ, {"GROQ_API_KEY": ""}):
            with pytest.raises(ValueError, match="Groq API key not configured"):
                LLMClient()


class TestGenerateDayPlan:
    """Test day plan generation."""

    @patch("llm_client.Groq")
    def test_generate_day_plan_success(self, mock_groq_class):
        """Test successful plan generation."""
        # Setup mock
        mock_groq_instance = MagicMock()
        mock_groq_class.return_value = mock_groq_instance

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps(
            {
                "plan_title": "Test Plan",
                "summary": "A test summary",
                "activities": [],
            }
        )
        mock_groq_instance.chat.completions.create.return_value = mock_response

        # Test
        client = LLMClient(api_key="test-key")
        result = client.generate_day_plan(
            prompt="Generate a plan for Barcelona",
            system_instruction="You are a planner",
        )

        # Assertions
        assert "Test Plan" in result
        mock_groq_instance.chat.completions.create.assert_called_once()
        call_kwargs = mock_groq_instance.chat.completions.create.call_args[1]
        assert call_kwargs["model"] == "llama-3.1-70b-versatile"
        assert call_kwargs["temperature"] == 0.7
        assert call_kwargs["response_format"] == {"type": "json_object"}
        assert len(call_kwargs["messages"]) == 2
        assert call_kwargs["messages"][0]["role"] == "system"
        assert call_kwargs["messages"][1]["role"] == "user"

    @patch("llm_client.Groq")
    def test_generate_day_plan_custom_temperature(self, mock_groq_class):
        """Test plan generation with custom temperature."""
        mock_groq_instance = MagicMock()
        mock_groq_class.return_value = mock_groq_instance

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "{}"
        mock_groq_instance.chat.completions.create.return_value = mock_response

        client = LLMClient(api_key="test-key")
        client.generate_day_plan(prompt="test", temperature=0.9)

        call_kwargs = mock_groq_instance.chat.completions.create.call_args[1]
        assert call_kwargs["temperature"] == 0.9

    @patch("llm_client.Groq")
    def test_generate_day_plan_rate_limit_error(self, mock_groq_class):
        """Test handling of rate limit errors."""
        mock_groq_instance = MagicMock()
        mock_groq_class.return_value = mock_groq_instance
        mock_groq_instance.chat.completions.create.side_effect = Exception(
            "Rate_limit exceeded"
        )

        client = LLMClient(api_key="test-key")
        with pytest.raises(LLMQuotaExceededError, match="rate limit exceeded"):
            client.generate_day_plan(prompt="test")

    @patch("llm_client.Groq")
    def test_generate_day_plan_auth_error(self, mock_groq_class):
        """Test handling of authentication errors."""
        mock_groq_instance = MagicMock()
        mock_groq_class.return_value = mock_groq_instance
        mock_groq_instance.chat.completions.create.side_effect = Exception(
            "API key is invalid"
        )

        client = LLMClient(api_key="test-key")
        with pytest.raises(LLMAuthenticationError, match="authentication failed"):
            client.generate_day_plan(prompt="test")

    @patch("llm_client.Groq")
    def test_generate_day_plan_unauthorized_error(self, mock_groq_class):
        """Test handling of 401 unauthorized errors."""
        mock_groq_instance = MagicMock()
        mock_groq_class.return_value = mock_groq_instance
        mock_groq_instance.chat.completions.create.side_effect = Exception(
            "401 unauthorized"
        )

        client = LLMClient(api_key="test-key")
        with pytest.raises(LLMAuthenticationError):
            client.generate_day_plan(prompt="test")

    @patch("llm_client.Groq")
    def test_generate_day_plan_quota_error(self, mock_groq_class):
        """Test handling of quota exceeded errors."""
        mock_groq_instance = MagicMock()
        mock_groq_class.return_value = mock_groq_instance
        mock_groq_instance.chat.completions.create.side_effect = Exception(
            "Quota exceeded for this account"
        )

        client = LLMClient(api_key="test-key")
        with pytest.raises(LLMQuotaExceededError):
            client.generate_day_plan(prompt="test")

    @patch("llm_client.Groq")
    def test_generate_day_plan_generic_error(self, mock_groq_class):
        """Test handling of generic API errors."""
        mock_groq_instance = MagicMock()
        mock_groq_class.return_value = mock_groq_instance
        mock_groq_instance.chat.completions.create.side_effect = Exception(
            "Network timeout"
        )

        client = LLMClient(api_key="test-key")
        with pytest.raises(LLMAPIError, match="Network timeout"):
            client.generate_day_plan(prompt="test")


class TestParseJSONResponse:
    """Test JSON response parsing."""

    def test_parse_valid_json(self):
        """Test parsing valid JSON."""
        client = LLMClient(api_key="test-key")
        response = '{"plan_title": "Test", "activities": []}'
        result = client.parse_json_response(response)
        assert result["plan_title"] == "Test"
        assert result["activities"] == []

    def test_parse_json_with_whitespace(self):
        """Test parsing JSON with leading/trailing whitespace."""
        client = LLMClient(api_key="test-key")
        response = '  \n{"test": "value"}  \n'
        result = client.parse_json_response(response)
        assert result["test"] == "value"

    def test_parse_json_with_markdown_fences(self):
        """Test parsing JSON wrapped in markdown code fences."""
        client = LLMClient(api_key="test-key")
        response = '```json\n{"plan": "data"}\n```'
        result = client.parse_json_response(response)
        assert result["plan"] == "data"

    def test_parse_json_with_triple_backticks(self):
        """Test parsing JSON with triple backticks only."""
        client = LLMClient(api_key="test-key")
        response = '```\n{"plan": "data"}\n```'
        result = client.parse_json_response(response)
        assert result["plan"] == "data"

    def test_parse_json_with_json_prefix(self):
        """Test parsing JSON with 'json' prefix."""
        client = LLMClient(api_key="test-key")
        response = 'json\n{"plan": "data"}'
        result = client.parse_json_response(response)
        assert result["plan"] == "data"

    def test_parse_invalid_json(self):
        """Test parsing invalid JSON raises exception."""
        client = LLMClient(api_key="test-key")
        response = "This is not JSON"
        with pytest.raises(json.JSONDecodeError):
            client.parse_json_response(response)

    def test_parse_incomplete_json(self):
        """Test parsing incomplete JSON raises exception."""
        client = LLMClient(api_key="test-key")
        response = '{"plan": "data"'  # Missing closing brace
        with pytest.raises(json.JSONDecodeError):
            client.parse_json_response(response)

    def test_parse_empty_string(self):
        """Test parsing empty string raises exception."""
        client = LLMClient(api_key="test-key")
        with pytest.raises(json.JSONDecodeError):
            client.parse_json_response("")

    def test_parse_nested_json(self):
        """Test parsing complex nested JSON."""
        client = LLMClient(api_key="test-key")
        response = json.dumps(
            {
                "plan_title": "Barcelona",
                "activities": [
                    {"name": "Sagrada Familia", "cost": "€15"},
                    {"name": "Park Güell", "cost": "€10"},
                ],
                "metadata": {"weather": "sunny", "temp": 25},
            }
        )
        result = client.parse_json_response(response)
        assert result["plan_title"] == "Barcelona"
        assert len(result["activities"]) == 2
        assert result["metadata"]["weather"] == "sunny"


class TestExceptionHierarchy:
    """Test custom exception classes."""

    def test_llm_api_error_is_exception(self):
        """Test LLMAPIError inherits from Exception."""
        error = LLMAPIError("test error")
        assert isinstance(error, Exception)
        assert str(error) == "test error"

    def test_quota_exceeded_is_api_error(self):
        """Test LLMQuotaExceededError inherits from LLMAPIError."""
        error = LLMQuotaExceededError("quota exceeded")
        assert isinstance(error, LLMAPIError)
        assert isinstance(error, Exception)

    def test_auth_error_is_api_error(self):
        """Test LLMAuthenticationError inherits from LLMAPIError."""
        error = LLMAuthenticationError("auth failed")
        assert isinstance(error, LLMAPIError)
        assert isinstance(error, Exception)
