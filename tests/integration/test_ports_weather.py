"""
Integration tests for Port Search and Weather API endpoints
Tests port search functionality and weather proxy
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

# Mock DynamoDB before importing app
with patch('boto3.resource') as mock_boto3:
    mock_table = MagicMock()
    mock_dynamodb = MagicMock()
    mock_dynamodb.Table.return_value = mock_table
    mock_boto3.return_value = mock_dynamodb
    from backend.server import app

client = TestClient(app)


class TestPortSearch:
    """Tests for port search endpoints"""
    
    def test_search_ports_no_query(self):
        """Test searching ports with no query returns results"""
        response = client.get("/api/ports/search")
        
        assert response.status_code == 200
        results = response.json()
        assert isinstance(results, list)
        # Should return some ports (up to limit)
        assert len(results) <= 20  # Default limit
    
    def test_search_ports_by_name(self):
        """Test searching ports by name"""
        response = client.get("/api/ports/search?q=barcelona")
        
        assert response.status_code == 200
        results = response.json()
        assert isinstance(results, list)
        
        # All results should contain "barcelona" (case-insensitive)
        if results:
            for port in results:
                assert "barcelona" in port["name"].lower() or \
                       "barcelona" in port["country"].lower() or \
                       "barcelona" in port["region"].lower()
    
    def test_search_ports_by_country(self):
        """Test searching ports by country name"""
        response = client.get("/api/ports/search?q=spain")
        
        assert response.status_code == 200
        results = response.json()
        
        # Should find Spanish ports
        if results:
            assert any("spain" in port["country"].lower() for port in results)
    
    def test_search_ports_with_region_filter(self):
        """Test searching ports with region filter"""
        response = client.get("/api/ports/search?region=Caribbean")
        
        assert response.status_code == 200
        results = response.json()
        
        # All results should be from Caribbean
        for port in results:
            assert port["region"] == "Caribbean"
    
    def test_search_ports_with_limit(self):
        """Test that limit parameter works"""
        response = client.get("/api/ports/search?limit=5")
        
        assert response.status_code == 200
        results = response.json()
        assert len(results) <= 5
    
    def test_search_ports_max_limit_enforced(self):
        """Test that max limit is enforced"""
        response = client.get("/api/ports/search?limit=1000")
        
        # The endpoint accepts up to 50, but pydantic might reject > 50
        # If validation fails, expect 422. If it accepts and clamps, expect 200.
        assert response.status_code in [200, 422]
        
        if response.status_code == 200:
            results = response.json()
            assert len(results) <= 50
    
    def test_search_ports_case_insensitive(self):
        """Test that search is case-insensitive"""
        response1 = client.get("/api/ports/search?q=NASSAU")
        response2 = client.get("/api/ports/search?q=nassau")
        response3 = client.get("/api/ports/search?q=Nassau")
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        assert response3.status_code == 200
        
        # All should return same results
        results1 = response1.json()
        results2 = response2.json()
        results3 = response3.json()
        
        if results1:  # If Nassau exists
            assert len(results1) == len(results2) == len(results3)
    
    def test_search_ports_no_results(self):
        """Test searching for non-existent port"""
        response = client.get("/api/ports/search?q=nonexistentport12345")
        
        assert response.status_code == 200
        results = response.json()
        assert results == []
    
    def test_list_regions(self):
        """Test listing all port regions"""
        response = client.get("/api/ports/regions")
        
        assert response.status_code == 200
        regions = response.json()
        assert isinstance(regions, list)
        assert len(regions) > 0
        
        # Regions should be sorted
        assert regions == sorted(regions)
        
        # Should contain common regions
        regions_lower = [r.lower() for r in regions]
        assert any("caribbean" in r for r in regions_lower)
    
    def test_search_ports_combined_filters(self):
        """Test combining query and region filter"""
        response = client.get("/api/ports/search?q=nassau&region=Caribbean")
        
        assert response.status_code == 200
        results = response.json()
        
        for port in results:
            assert port["region"] == "Caribbean"
            searchable = f"{port['name']} {port['country']}".lower()
            assert "nassau" in searchable


class TestWeatherAPI:
    """Tests for weather API proxy"""
    
    @patch('httpx.AsyncClient')
    def test_get_weather_success(self, mock_httpx):
        """Test successful weather data retrieval"""
        # Mock httpx response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "latitude": 41.38,
            "longitude": 2.19,
            "daily": {
                "temperature_2m_max": [25.0],
                "temperature_2m_min": [18.0],
                "weathercode": [1]
            }
        }
        
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_httpx.return_value = mock_client
        
        response = client.get("/api/weather?latitude=41.38&longitude=2.19")
        
        assert response.status_code == 200
        data = response.json()
        assert "daily" in data
    
    def test_get_weather_missing_coordinates(self):
        """Test weather endpoint with missing coordinates"""
        response = client.get("/api/weather")
        
        # Should return 422 for missing required params
        assert response.status_code == 422
    
    def test_get_weather_invalid_latitude(self):
        """Test weather endpoint with invalid latitude"""
        response = client.get("/api/weather?latitude=invalid&longitude=2.19")
        
        assert response.status_code == 422
    
    @patch('httpx.AsyncClient')
    def test_get_weather_with_date(self, mock_httpx):
        """Test weather retrieval with specific date"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"daily": {}}
        
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_httpx.return_value = mock_client
        
        response = client.get(
            "/api/weather?latitude=41.38&longitude=2.19&date=2023-10-01"
        )
        
        assert response.status_code == 200
    
    @patch('httpx.AsyncClient')
    def test_get_weather_api_error(self, mock_httpx):
        """Test handling of weather API errors"""
        mock_response = MagicMock()
        mock_response.status_code = 500
        
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_httpx.return_value = mock_client
        
        response = client.get("/api/weather?latitude=41.38&longitude=2.19")
        
        # Should return 502 Bad Gateway when weather service fails
        assert response.status_code == 502
        detail = response.json()["detail"]
        # New structured error format
        assert isinstance(detail, dict)
        assert "unavailable" in detail["message"].lower()
    
    @patch('httpx.AsyncClient')
    def test_get_weather_extreme_coordinates(self, mock_httpx):
        """Test weather with extreme but valid coordinates"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"daily": {}}
        
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        mock_httpx.return_value = mock_client
        
        # Test near poles
        response = client.get("/api/weather?latitude=89.9&longitude=0")
        assert response.status_code in [200, 502]
        
        # Test near dateline
        response = client.get("/api/weather?latitude=0&longitude=179.9")
        assert response.status_code in [200, 502]


def test_health_endpoint():
    """Test health check endpoint"""
    response = client.get("/api/health")
    
    assert response.status_code == 200
    data = response.json()
    # Health status can be "ok" or "degraded" depending on service configuration
    assert data["status"] in ["ok", "degraded"]
    assert "service" in data
    assert "checks" in data
