import pytest
import json
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import sys
import os

# Add backend to path so we can import server
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

# Mock MongoClient before importing app to avoid connection errors
with patch('pymongo.MongoClient') as mock_mongo:
    from backend.server import app

client = TestClient(app)

@patch('backend.llm_client.Groq')
@patch('backend.server.trips_col')
@patch('backend.server.plans_col')
def test_generate_plan_success(mock_plans, mock_trips, mock_groq_class):
    # 1. Setup mocks
    mock_device_id = "test-device-123"
    mock_trip_id = "trip-456"
    mock_port_id = "port-789"
    
    # Mock environment variable for API key
    with patch.dict(os.environ, {"GROQ_API_KEY": "test-api-key"}):
        # Mock Trip in DB
        mock_trips.find_one.return_value = {
            "trip_id": mock_trip_id,
            "device_id": mock_device_id,
            "ship_name": "Test Ship",
            "ports": [
                {
                    "port_id": mock_port_id,
                    "name": "Barcelona",
                    "country": "Spain",
                    "latitude": 41.38,
                    "longitude": 2.19,
                    "arrival": "2023-10-01T08:00:00",
                    "departure": "2023-10-01T18:00:00"
                }
            ]
        }
        
        # Mock Groq Client
        mock_groq_instance = MagicMock()
        mock_groq_class.return_value = mock_groq_instance
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "plan_title": "A Day in Barcelona",
            "summary": "Enjoy the sights of Barcelona.",
            "return_by": "17:00",
            "total_estimated_cost": "£50",
            "activities": [],
            "packing_suggestions": ["water"],
            "safety_tips": ["watch for pickpockets"]
        })
        mock_groq_instance.chat.completions.create.return_value = mock_response
        
        # 2. Call the endpoint
        payload = {
            "trip_id": mock_trip_id,
            "port_id": mock_port_id,
            "preferences": {
                "party_type": "couple",
                "activity_level": "moderate",
                "transport_mode": "mixed",
                "budget": "medium",
                "currency": "GBP"
            }
        }
        
        headers = {"X-Device-Id": mock_device_id}
        
        # We use patch for httpx to avoid real weather API calls during AI test
        with patch('httpx.AsyncClient.get') as mock_weather_get:
            mock_weather_resp = MagicMock()
            mock_weather_resp.status_code = 200
            mock_weather_resp.json.return_value = {"daily": {"temperature_2m_max": [25]}}
            mock_weather_get.return_value = mock_weather_resp
            
            response = client.post("/api/plans/generate", json=payload, headers=headers)
        
        # 3. Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["plan"]["plan_title"] == "A Day in Barcelona"
        assert data["port_name"] == "Barcelona"
        
        # Verify AI instructions and prompt
        args, kwargs = mock_groq_instance.chat.completions.create.call_args
        assert kwargs["model"] == "llama-3.1-70b-versatile"
        assert kwargs["response_format"] == {"type": "json_object"}
        assert len(kwargs["messages"]) == 2
        assert kwargs["messages"][0]["role"] == "system"
        assert "Barcelona" in kwargs["messages"][1]["content"]
        assert (
            "expert cruise port day planner" in kwargs["messages"][0]["content"].lower()
        )

def test_generate_plan_missing_api_key():
    # Mock missing API key env var
    with patch.dict(os.environ, {"GROQ_API_KEY": ""}, clear=True):
        # Mock port/trip lookup to bypass it
        with patch('backend.server.trips_col') as mock_trips:
            mock_trips.find_one.return_value = {
                "trip_id": "t", 
                "device_id": "d", 
                "ship_name": "Test Ship",
                "ports": [{
                    "port_id": "p", 
                    "name": "N", 
                    "country": "C", 
                    "latitude": 0, 
                    "longitude": 0, 
                    "arrival": "2023-10-01T08:00:00", 
                    "departure": "2023-10-01T18:00:00"
                }]
            }
            
            payload = {
                "trip_id": "t", "port_id": "p", 
                "preferences": {"party_type": "solo", "activity_level": "light", "transport_mode": "walking", "budget": "free"}
            }
            response = client.post("/api/plans/generate", json=payload, headers={"X-Device-Id": "d"})
            
            assert response.status_code == 503
            detail = response.json()["detail"]
            # New structured error format
            assert isinstance(detail, dict)
            assert detail["error"] == "ai_service_not_configured"
            assert "not configured" in detail["message"].lower()


@patch('backend.llm_client.Groq')
@patch('backend.server.trips_col')
@patch('backend.server.plans_col')
def test_generate_plan_quota_exceeded(mock_plans, mock_trips, mock_groq_class):
    """Test handling of API quota exceeded errors."""
    mock_device_id = "test-device-123"
    mock_trip_id = "trip-456"
    mock_port_id = "port-789"
    
    with patch.dict(os.environ, {"GROQ_API_KEY": "test-api-key"}):
        # Mock Trip in DB
        mock_trips.find_one.return_value = {
            "trip_id": mock_trip_id,
            "device_id": mock_device_id,
            "ship_name": "Test Ship",
            "ports": [{
                "port_id": mock_port_id,
                "name": "Barcelona",
                "country": "Spain",
                "latitude": 41.38,
                "longitude": 2.19,
                "arrival": "2023-10-01T08:00:00",
                "departure": "2023-10-01T18:00:00"
            }]
        }
        
        # Mock Groq to raise rate limit error
        mock_groq_instance = MagicMock()
        mock_groq_class.return_value = mock_groq_instance
        mock_groq_instance.chat.completions.create.side_effect = Exception("rate_limit exceeded")
        
        payload = {
            "trip_id": mock_trip_id,
            "port_id": mock_port_id,
            "preferences": {
                "party_type": "couple",
                "activity_level": "moderate",
                "transport_mode": "mixed",
                "budget": "medium",
                "currency": "GBP"
            }
        }
        
        with patch('httpx.AsyncClient.get') as mock_weather_get:
            mock_weather_resp = MagicMock()
            mock_weather_resp.status_code = 200
            mock_weather_resp.json.return_value = {"daily": {"temperature_2m_max": [25]}}
            mock_weather_get.return_value = mock_weather_resp
            
            response = client.post("/api/plans/generate", json=payload, headers={"X-Device-Id": mock_device_id})
        
        assert response.status_code == 503
        detail = response.json()["detail"]
        assert detail["error"] == "ai_service_quota_exceeded"
        assert "quota" in detail["message"].lower()


@patch('backend.llm_client.Groq')
@patch('backend.server.trips_col')
@patch('backend.server.plans_col')
def test_generate_plan_auth_error(mock_plans, mock_trips, mock_groq_class):
    """Test handling of API authentication errors."""
    mock_device_id = "test-device-123"
    mock_trip_id = "trip-456"
    mock_port_id = "port-789"
    
    with patch.dict(os.environ, {"GROQ_API_KEY": "invalid-key"}):
        mock_trips.find_one.return_value = {
            "trip_id": mock_trip_id,
            "device_id": mock_device_id,
            "ship_name": "Test Ship",
            "ports": [{
                "port_id": mock_port_id,
                "name": "Barcelona",
                "country": "Spain",
                "latitude": 41.38,
                "longitude": 2.19,
                "arrival": "2023-10-01T08:00:00",
                "departure": "2023-10-01T18:00:00"
            }]
        }
        
        # Mock Groq to raise auth error
        mock_groq_instance = MagicMock()
        mock_groq_class.return_value = mock_groq_instance
        mock_groq_instance.chat.completions.create.side_effect = Exception("API key is invalid")
        
        payload = {
            "trip_id": mock_trip_id,
            "port_id": mock_port_id,
            "preferences": {
                "party_type": "couple",
                "activity_level": "moderate",
                "transport_mode": "mixed",
                "budget": "medium",
                "currency": "GBP"
            }
        }
        
        with patch('httpx.AsyncClient.get') as mock_weather_get:
            mock_weather_resp = MagicMock()
            mock_weather_resp.status_code = 200
            mock_weather_resp.json.return_value = {"daily": {"temperature_2m_max": [25]}}
            mock_weather_get.return_value = mock_weather_resp
            
            response = client.post("/api/plans/generate", json=payload, headers={"X-Device-Id": mock_device_id})
        
        assert response.status_code == 503
        detail = response.json()["detail"]
        assert detail["error"] == "ai_service_auth_failed"
        assert "authentication" in detail["message"].lower()
