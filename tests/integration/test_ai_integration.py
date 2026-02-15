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

@patch('google.genai.Client')
@patch('backend.server.trips_col')
@patch('backend.server.plans_col')
def test_generate_plan_success(mock_plans, mock_trips, mock_genai_client_class):
    # 1. Setup mocks
    mock_device_id = "test-device-123"
    mock_trip_id = "trip-456"
    mock_port_id = "port-789"
    
    # Mock environment variable for API key
    with patch.dict(os.environ, {"GOOGLE_API_KEY": "test-api-key"}):
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
        
        # Mock Gemini Client
        mock_genai_instance = MagicMock()
        mock_genai_client_class.return_value = mock_genai_instance
        
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "plan_title": "A Day in Barcelona",
            "summary": "Enjoy the sights of Barcelona.",
            "return_by": "17:00",
            "total_estimated_cost": "£50",
            "activities": [],
            "packing_suggestions": ["water"],
            "safety_tips": ["watch for pickpockets"]
        })
        mock_genai_instance.models.generate_content.return_value = mock_response
        
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
        args, kwargs = mock_genai_instance.models.generate_content.call_args
        assert kwargs['model'] == "gemini-2.5-flash"
        assert "Barcelona" in kwargs['contents']
        assert "expert cruise port day planner" in kwargs['config'].system_instruction.lower()

@patch('google.genai.Client')
def test_generate_plan_missing_api_key(mock_genai_client_class):
    # Mock missing API key env var
    with patch.dict(os.environ, {"GOOGLE_API_KEY": ""}):
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
            assert "Plan generation is not configured" in response.json()["detail"]
