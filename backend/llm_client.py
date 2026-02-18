"""
LLM Client abstraction layer for AI-powered plan generation.

This module provides a unified interface for interacting with LLM providers,
currently supporting Groq. This abstraction makes it easy to swap providers
in the future without changing the core application logic.
"""

import json
import logging
import os
from typing import Any, Dict, Optional

from groq import Groq

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Abstraction layer for LLM API calls.

    Currently uses Groq API with Llama 3.3 70B model for high-quality
    structured JSON generation at low cost (14,400 requests/day on free tier).
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize LLM client.

        Args:
            api_key: Groq API key. If not provided, reads from GROQ_API_KEY env var.

        Raises:
            ValueError: If no API key is provided or found in environment.
        """
        self.api_key = api_key or os.environ.get("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Groq API key not configured. Set GROQ_API_KEY environment variable."
            )

        self.client = Groq(api_key=self.api_key)
        # Using Llama 3.3 70B for best JSON generation quality
        # Alternatives: llama-3.1-8b-instant (faster), mixtral-8x7b-32768
        self.model = "llama-3.3-70b-versatile"
        logger.info(f"LLM client initialized with model: {self.model}")

    def generate_day_plan(
        self,
        prompt: str,
        system_instruction: str = (
            "You are an expert cruise port day planner. "
            "You always respond with valid JSON only, no markdown."
        ),
        temperature: float = 0.7,
    ) -> str:
        """
        Generate a day plan using the LLM.

        Args:
            prompt: The user prompt describing what plan to generate.
            system_instruction: System-level instructions for the LLM.
            temperature: Sampling temperature (0.0-2.0). Higher = more creative.

        Returns:
            Raw text response from the LLM (should be valid JSON).

        Raises:
            LLMAPIError: If the API call fails.
            LLMQuotaExceededError: If rate limits or quotas are exceeded.
            LLMAuthenticationError: If API key is invalid.
        """
        try:
            logger.info(f"Calling Groq API with model: {self.model}")

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
                # Request JSON output for better structured responses
                response_format={"type": "json_object"},
            )

            response_text = response.choices[0].message.content
            logger.info("Groq API call successful")
            logger.debug(f"Response length: {len(response_text)} chars")

            return response_text

        except Exception as e:
            error_msg = str(e).lower()
            logger.error(f"Groq API call failed: {str(e)}", exc_info=True)

            # Parse specific error types
            if "rate_limit" in error_msg or "quota" in error_msg:
                raise LLMQuotaExceededError(
                    f"Groq API rate limit exceeded: {str(e)}"
                ) from e
            elif (
                "api key" in error_msg
                or "authentication" in error_msg
                or "401" in error_msg
                or "unauthorized" in error_msg
            ):
                raise LLMAuthenticationError(
                    f"Groq API authentication failed: {str(e)}"
                ) from e
            else:
                raise LLMAPIError(f"Groq API error: {str(e)}") from e

    def parse_json_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse LLM response as JSON, handling common formatting issues.

        Args:
            response_text: Raw text response from LLM.

        Returns:
            Parsed JSON as a dictionary.

        Raises:
            json.JSONDecodeError: If response is not valid JSON.
        """
        clean = response_text.strip()

        # Remove markdown code fences if present
        # (shouldn't happen with json_object mode)
        if clean.startswith("```"):
            logger.warning("LLM returned markdown code fences, cleaning...")
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            clean = clean.strip()

        # Remove json prefix if present
        if clean.startswith("json\n"):
            clean = clean[5:].strip()

        try:
            return json.loads(clean)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {str(e)}")
            logger.debug(f"Raw response (first 500 chars): {response_text[:500]}")
            raise


class LLMAPIError(Exception):
    """Base exception for LLM API errors."""

    pass


class LLMQuotaExceededError(LLMAPIError):
    """Raised when API rate limits or quotas are exceeded."""

    pass


class LLMAuthenticationError(LLMAPIError):
    """Raised when API authentication fails."""

    pass
