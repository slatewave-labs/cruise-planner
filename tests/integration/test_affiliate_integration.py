"""
Integration tests for affiliate link functionality in plan generation.
"""

import os
import sys
import pytest
from unittest.mock import Mock, patch

# Add backend directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../backend"))

# Mock DynamoDB before importing app
with patch('boto3.resource') as mock_boto3:
    mock_table = Mock()
    mock_dynamodb = Mock()
    mock_dynamodb.Table.return_value = mock_table
    mock_boto3.return_value = mock_dynamodb
    from server import app

from affiliate_config import add_affiliate_params
from fastapi.testclient import TestClient


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_db(monkeypatch):
    """Mock database operations."""
    mock_db_client = Mock()
    
    # Mock successful trip lookup
    mock_db_client.get_trip.return_value = {
        "trip_id": "test-trip-123",
        "device_id": "test-device",
        "ship_name": "Test Ship",
        "ports": [
            {
                "port_id": "test-port-456",
                "name": "Barcelona",
                "country": "Spain",
                "latitude": 41.3851,
                "longitude": 2.1734,
                "arrival": "2024-06-15T08:00:00",
                "departure": "2024-06-15T18:00:00",
            }
        ],
    }
    
    # Mock successful plan save
    def create_plan_side_effect(plan):
        return plan
    mock_db_client.create_plan.side_effect = create_plan_side_effect
    
    # Patch the db_client in the server module
    import server
    monkeypatch.setattr("server.db_client", mock_db_client)
    
    return mock_db_client


class TestAffiliateLinksInPlanGeneration:
    """Test affiliate link integration in plan generation."""

    def test_affiliate_params_added_to_viator_urls(self, monkeypatch):
        """Test that Viator URLs get affiliate parameters when ID is configured."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-affiliate-123")
        
        original_url = "https://www.viator.com/tours/Barcelona/Sagrada-Familia-Tour/d562-12345"
        result_url = add_affiliate_params(original_url)
        
        assert "aid=test-affiliate-123" in result_url
        assert "mcid=cruise-planner-app" in result_url
        assert "viator.com" in result_url

    def test_affiliate_params_not_added_without_config(self):
        """Test that URLs remain unchanged when affiliate ID is not configured."""
        # Make sure env var is not set
        if "VIATOR_AFFILIATE_ID" in os.environ:
            del os.environ["VIATOR_AFFILIATE_ID"]
        
        original_url = "https://www.viator.com/tours/Barcelona/Sagrada-Familia-Tour/d562-12345"
        result_url = add_affiliate_params(original_url)
        
        # URL should not have affiliate ID param when not configured
        assert "aid=" not in result_url
        # May have static tracking param or be unchanged
        assert "mcid=cruise-planner-app" in result_url or result_url == original_url

    @patch("server.LLMClient")
    def test_plan_generation_processes_affiliate_links(
        self, mock_llm_client_class, test_client, mock_db, monkeypatch
    ):
        """Test that generated plans have affiliate parameters added to booking URLs."""
        monkeypatch.setenv("GROQ_API_KEY", "test-key")
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-viator-affiliate")
        monkeypatch.setenv("GETYOURGUIDE_AFFILIATE_ID", "test-gyg-affiliate")
        
        # Mock LLM API response with booking URLs
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
                    "booking_url": "https://www.viator.com/tours/Barcelona/Sagrada-Familia/d562-12345",
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
                    "booking_url": "https://www.getyourguide.com/barcelona-l45/park-guell-t123/56789",
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
        
        # Verify first activity (Viator) has affiliate params
        viator_url = activities[0]["booking_url"]
        assert "viator.com" in viator_url
        assert "aid=test-viator-affiliate" in viator_url
        assert "mcid=cruise-planner-app" in viator_url
        
        # Verify second activity (GetYourGuide) has affiliate params
        gyg_url = activities[1]["booking_url"]
        assert "getyourguide.com" in gyg_url
        assert "partner_id=test-gyg-affiliate" in gyg_url
        assert "utm_source=cruise-planner" in gyg_url

    def test_multiple_booking_platforms_supported(self, monkeypatch):
        """Test that multiple booking platforms are supported."""
        monkeypatch.setenv("KLOOK_AFFILIATE_ID", "klook-123")
        monkeypatch.setenv("BOOKING_AFFILIATE_ID", "booking-456")
        monkeypatch.setenv("TRIPADVISOR_AFFILIATE_ID", "tripadvisor-789")
        
        # Test Klook
        klook_url = add_affiliate_params("https://www.klook.com/activity/12345-singapore-tour")
        assert "affiliate_id=klook-123" in klook_url
        
        # Test Booking.com
        booking_url = add_affiliate_params("https://www.booking.com/hotel/sg/hotel.html")
        assert "aid=booking-456" in booking_url
        
        # Test TripAdvisor
        ta_url = add_affiliate_params("https://www.tripadvisor.com/Attraction_Review-g60763-d104236")
        assert "pid=tripadvisor-789" in ta_url
