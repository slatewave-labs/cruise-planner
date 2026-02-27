"""
Integration tests for affiliate link functionality in plan generation.
"""

import os
import sys
from unittest.mock import Mock, patch

import pytest

# Add backend directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../backend"))

from fastapi.testclient import TestClient
from server import app


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


class TestAffiliateLinksInPlanGeneration:
    """Test affiliate link integration in plan generation."""

    def test_affiliate_params_added_to_viator_urls(self, monkeypatch):
        """Test that Viator search URLs get affiliate parameters when ID is configured."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-affiliate-123")

        from affiliate_config import generate_booking_search_url

        result_url = generate_booking_search_url("Sagrada Familia Tour", "Barcelona")

        assert result_url is not None
        assert "aid=test-affiliate-123" in result_url
        assert "mcid=cruise-planner-app" in result_url
        assert "viator.com/searchResults/all" in result_url
        assert "text=Sagrada+Familia+Tour+Barcelona" in result_url

    def test_affiliate_params_not_added_without_config(self, monkeypatch):
        """Test that no search URL is generated when affiliate ID is not configured."""
        monkeypatch.delenv("VIATOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("GETYOURGUIDE_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("KLOOK_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("TRIPADVISOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("BOOKING_AFFILIATE_ID", raising=False)

        from affiliate_config import generate_booking_search_url

        result_url = generate_booking_search_url("Sagrada Familia Tour", "Barcelona")
        assert result_url is None

    @patch("server.LLMClient")
    def test_plan_generation_processes_affiliate_links(
        self, mock_llm_client_class, test_client, monkeypatch
    ):
        """Test that generated plans have valid search URLs instead of AI-hallucinated ones."""
        monkeypatch.setenv("GROQ_API_KEY", "test-key")
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-viator-affiliate")
        monkeypatch.setenv("GETYOURGUIDE_AFFILIATE_ID", "test-gyg-affiliate")
        monkeypatch.delenv("KLOOK_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("TRIPADVISOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("BOOKING_AFFILIATE_ID", raising=False)

        # Mock LLM API response — AI sets booking_url to null as instructed
        plan_json = """{
            "plan_title": "Barcelona Highlights",
            "summary": "Explore the best of Barcelona in one day",
            "return_by": "17:00",
            "total_estimated_cost": "€150",
            "activities": [
                {
                    "order": 1,
                    "name": "Sagrada Familia",
                    "description": "Visit Gaudi's masterpiece",
                    "location": "Carrer de Mallorca, 401",
                    "latitude": 41.4036,
                    "longitude": 2.1744,
                    "start_time": "09:00",
                    "end_time": "11:00",
                    "duration_minutes": 120,
                    "cost_estimate": "€30",
                    "booking_url": null,
                    "transport_to_next": "Metro L2",
                    "travel_time_to_next": "15 min",
                    "tips": "Book tickets in advance"
                },
                {
                    "order": 2,
                    "name": "Park Guell",
                    "description": "Colorful park by Gaudi",
                    "location": "Carrer d'Olot",
                    "latitude": 41.4145,
                    "longitude": 2.1527,
                    "start_time": "12:00",
                    "end_time": "14:00",
                    "duration_minutes": 120,
                    "cost_estimate": "€25",
                    "booking_url": null,
                    "transport_to_next": "Walk",
                    "travel_time_to_next": "20 min",
                    "tips": "Great views of the city"
                }
            ],
            "packing_suggestions": ["Comfortable shoes", "Water bottle"],
            "safety_tips": ["Watch for pickpockets"]
        }"""

        import json

        mock_llm_instance = Mock()
        mock_llm_instance.generate_day_plan.return_value = plan_json
        mock_llm_instance.parse_json_response.return_value = json.loads(plan_json)
        mock_llm_client_class.return_value = mock_llm_instance

        # Make request to generate plan
        response = test_client.post(
            "/api/plans/generate",
            json={
                "trip_id": "test-trip-123",
                "port_id": "test-port-456",
                "port_name": "Barcelona",
                "port_country": "Spain",
                "latitude": 41.3874,
                "longitude": 2.1686,
                "arrival": "2099-10-01T08:00:00",
                "departure": "2099-10-01T18:00:00",
                "ship_name": "Test Ship",
                "preferences": {
                    "party_type": "couple",
                    "activity_level": "moderate",
                    "transport_mode": "public_transport",
                    "budget": "medium",
                    "currency": "EUR",
                },
            },
            headers={"X-Device-ID": "test-device"},
        )

        assert response.status_code == 200
        plan_data = response.json()

        # Verify plan structure
        assert "plan" in plan_data
        assert "activities" in plan_data["plan"]

        activities = plan_data["plan"]["activities"]
        assert len(activities) == 2

        # Verify first activity has a valid Viator search URL (round-robin index 0)
        viator_url = activities[0]["booking_url"]
        assert "viator.com/searchResults/all" in viator_url
        assert "text=Sagrada+Familia+Barcelona" in viator_url
        assert "aid=test-viator-affiliate" in viator_url
        assert "mcid=cruise-planner-app" in viator_url

        # Verify second activity gets GetYourGuide (round-robin index 1)
        gyg_url = activities[1]["booking_url"]
        assert "getyourguide.com/s/" in gyg_url
        assert "q=Park+Guell+Barcelona" in gyg_url
        assert "partner_id=test-gyg-affiliate" in gyg_url

    def test_multiple_booking_platforms_supported(self, monkeypatch):
        """Test that multiple booking platforms generate valid search URLs."""
        from affiliate_config import generate_booking_search_url

        # Test Klook as primary platform
        monkeypatch.delenv("VIATOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("GETYOURGUIDE_AFFILIATE_ID", raising=False)
        monkeypatch.setenv("KLOOK_AFFILIATE_ID", "klook-123")
        monkeypatch.delenv("TRIPADVISOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("BOOKING_AFFILIATE_ID", raising=False)

        klook_url = generate_booking_search_url("Gardens by the Bay", "Singapore")
        assert klook_url is not None
        assert "klook.com/search/result" in klook_url
        assert "affiliate_id=klook-123" in klook_url

        # Test TripAdvisor as primary platform
        monkeypatch.delenv("KLOOK_AFFILIATE_ID", raising=False)
        monkeypatch.setenv("TRIPADVISOR_AFFILIATE_ID", "tripadvisor-789")

        ta_url = generate_booking_search_url("Colosseum Tour", "Rome")
        assert ta_url is not None
        assert "tripadvisor.com/Search" in ta_url
        assert "pid=tripadvisor-789" in ta_url
