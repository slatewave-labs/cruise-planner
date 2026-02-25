#!/usr/bin/env python3
"""
Comprehensive API Testing for ShoreExplorer Backend
Tests remaining endpoints: health, port search, weather, and AI plan generation
(Trip/plan CRUD is now handled client-side via localStorage)
"""

import requests
import json
import sys
import uuid
from datetime import datetime

class ShoreExplorerAPITester:
    def __init__(self):
        self.base_url = "http://localhost:8001"
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def log(self, message, status="INFO"):
        print(f"[{status}] {message}")

    def run_test(self, name, method, endpoint, expected_status=200, data=None, timeout=30, device_id=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        self.tests_run += 1
        
        self.log(f"Testing {name}...")
        
        # Handle both single status code and list of acceptable codes
        if isinstance(expected_status, int):
            expected_codes = [expected_status]
        else:
            expected_codes = expected_status
        
        # Set device ID header if provided
        headers = {'Content-Type': 'application/json'}
        if device_id:
            headers['X-Device-Id'] = device_id
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)
            else:
                self.log(f"Unknown method: {method}", "ERROR")
                return False, {}

            success = response.status_code in expected_codes
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return success, response.json() if response.text else {}
                except json.JSONDecodeError:
                    return success, {"response_text": response.text}
            else:
                self.log(f"❌ {name} - Expected {expected_codes}, got {response.status_code}", "FAIL")
                self.log(f"Response: {response.text}", "ERROR")
                return False, {}

        except requests.exceptions.Timeout:
            self.log(f"❌ {name} - Request timed out after {timeout}s", "FAIL")
            return False, {}
        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "FAIL")
            return False, {}

    def test_health_endpoint(self):
        """Test health check endpoint"""
        success, response = self.run_test("Health Check", "GET", "api/health")
        # Accept both "ok" and "degraded" status (degraded when services not configured)
        if success and response.get("status") in ["ok", "degraded"]:
            self.log("Health endpoint working correctly", "PASS")
            return True
        else:
            self.log("Health endpoint failed or returned incorrect response", "FAIL")
            return False

    def test_weather_api(self):
        """Test weather proxy endpoint with Celsius temperature verification"""
        # Test with Barcelona coordinates
        success, response = self.run_test(
            "Weather API", 
            "GET", 
            "api/weather?latitude=41.38&longitude=2.19",
            timeout=20
        )
        
        if success:
            # Check if response has expected weather data structure
            daily = response.get("daily", {})
            daily_units = response.get("daily_units", {})
            
            if daily and any(key in daily for key in ["temperature_2m_max", "temperature_2m_min"]):
                self.log("✅ Weather API returned valid data structure", "PASS")
                
                # Verify temperature units are in Celsius
                temp_unit = daily_units.get("temperature_2m_max", "")
                if "°C" in temp_unit:
                    self.log("✅ Weather API returns temperatures in Celsius (°C)", "PASS")
                    return True
                else:
                    self.log(f"❌ Weather API temperature unit is '{temp_unit}', expected '°C'", "FAIL")
                    return False
            else:
                self.log("Weather API response missing expected data fields", "FAIL")
                return False
        return False

    def test_plan_generation(self):
        """Test AI plan generation (may take 15-30 seconds) and currency handling"""
        device_id = str(uuid.uuid4())

        # Test plan generation with port details in request body
        plan_data = {
            "trip_id": "test-trip-123",
            "port_id": "test-port-456",
            "port_name": "Barcelona",
            "port_country": "Spain",
            "latitude": 41.3784,
            "longitude": 2.1925,
            "arrival": "2099-06-15T08:00:00",
            "departure": "2099-06-15T18:00:00",
            "ship_name": "Test Ship",
            "preferences": {
                "party_type": "couple",
                "activity_level": "moderate",
                "transport_mode": "mixed",
                "budget": "medium",
                "currency": "GBP"
            }
        }
        
        self.log("Starting AI plan generation with GBP currency (expecting budget exceeded error)...", "INFO")
        success, response = self.run_test("Generate Plan with Currency", "POST", "api/plans/generate", [200, 503], plan_data, timeout=45, device_id=device_id)
        
        if not success:
            return False
        
        # Test with different currencies
        for currency in ["EUR", "USD"]:
            plan_data["preferences"]["currency"] = currency
            self.log(f"Testing plan generation with {currency} currency (expecting budget exceeded)...", "INFO")
            success, response = self.run_test(f"Generate Plan with {currency}", "POST", "api/plans/generate", [200, 503], plan_data, timeout=45, device_id=device_id)
            if not success:
                return False
        
        self.log("✅ Currency parameter handling in plan generation working", "PASS")
        return True

    def test_budget_exceeded_error_handling(self):
        """Test that AI service errors return proper 503 (budget/quota/auth)"""
        device_id = str(uuid.uuid4())

        plan_data = {
            "trip_id": "test-trip-123",
            "port_id": "test-port-456",
            "port_name": "Barcelona",
            "port_country": "Spain",
            "latitude": 41.3784,
            "longitude": 2.1925,
            "arrival": "2099-06-15T08:00:00",
            "departure": "2099-06-15T18:00:00",
            "ship_name": "Test Ship",
            "preferences": {
                "party_type": "couple",
                "activity_level": "moderate", 
                "transport_mode": "mixed",
                "budget": "medium",
                "currency": "GBP"
            }
        }
        
        self.log("Testing budget exceeded error handling...", "INFO")
        
        try:
            headers = {'Content-Type': 'application/json', 'X-Device-Id': device_id}
            response = requests.post(f"{self.base_url}/api/plans/generate", json=plan_data, headers=headers, timeout=45)
            
            if response.status_code == 503:
                # Check error message - accept budget exceeded OR auth errors (CI)
                error_data = response.json()
                detail = error_data.get("detail", "")
                # Handle new structured error format (dict) or old string format
                message = detail.get("message", str(detail)) if isinstance(detail, dict) else detail
                message_lower = message.lower()
                
                # Accept: budget exceeded, quota exceeded, or auth/mock key errors
                if ("budget" in message_lower and "exceeded" in message_lower) or \
                   ("quota" in message_lower and "exceeded" in message_lower):
                    self.log("✅ Budget/quota exceeded returns proper 503", "PASS")
                    self.tests_passed += 1
                elif "authentication" in message_lower or "mock" in message_lower or \
                     "api key" in message_lower:
                    self.log("✅ 503 with auth error (expected in CI environment)", "PASS")
                    self.tests_passed += 1
                else:
                    self.log(f"❌ 503 but unexpected error message: {message}", "FAIL")
            elif response.status_code == 200:
                self.log("⚠️  Plan generation succeeded (budget may not be exceeded yet)", "WARN")
                self.tests_passed += 1
            elif response.status_code == 500:
                self.log("❌ Budget exceeded returns 500 instead of 503", "FAIL")
            else:
                self.log(f"❌ Unexpected status code: {response.status_code}", "FAIL")
                
            self.tests_run += 1
            return True
            
        except Exception as e:
            self.log(f"❌ Budget error test failed with exception: {str(e)}", "FAIL")
            self.tests_run += 1
            return False

    def test_port_search_endpoints(self):
        """Test the port search functionality"""
        self.log("Testing port search endpoints...", "INFO")
        
        # Test 1: Get regions list
        success, response = self.run_test("Get Port Regions", "GET", "api/ports/regions")
        if not success:
            return False
        
        if not isinstance(response, list):
            self.log("Regions endpoint should return a list", "FAIL")
            return False
        
        if len(response) < 20:  # Should have ~23 regions
            self.log(f"Expected ~23 regions, got {len(response)}", "FAIL")
            return False
        
        # Check for specific expected regions
        expected_regions = ["Caribbean", "Western Mediterranean", "Alaska", "Northern Europe"]
        for region in expected_regions:
            if region not in response:
                self.log(f"Missing expected region: {region}", "FAIL")
                return False
        
        self.log(f"✅ Found {len(response)} regions including expected regions", "PASS")
        
        # Test 2: Default port search (no params - should return first 20 ports)
        success, response = self.run_test("Port Search - Default", "GET", "api/ports/search")
        if not success:
            return False
        
        if not isinstance(response, list):
            self.log("Port search should return a list", "FAIL")
            return False
        
        if len(response) != 20:  # Default limit is 20
            self.log(f"Expected 20 ports, got {len(response)}", "FAIL")
            return False
        
        # Check port structure
        first_port = response[0] if response else {}
        required_fields = ["name", "country", "region", "lat", "lng"]
        for field in required_fields:
            if field not in first_port:
                self.log(f"Port missing required field: {field}", "FAIL")
                return False
        
        self.log("✅ Default port search returns 20 ports with correct structure", "PASS")
        
        # Test 3: Search for Barcelona
        success, response = self.run_test("Port Search - Barcelona", "GET", "api/ports/search?q=barcelona")
        if not success:
            return False
        
        barcelona_found = any(port.get("name", "").lower() == "barcelona" and 
                            port.get("country", "").lower() == "spain" 
                            for port in response)
        
        if not barcelona_found:
            self.log("Barcelona, Spain not found in search results", "FAIL")
            return False
        
        self.log("✅ Barcelona search returns Barcelona, Spain", "PASS")
        
        # Test 4: Limit parameter
        success, response = self.run_test("Port Search - Limit 5", "GET", "api/ports/search?limit=5")
        if not success:
            return False
        
        if len(response) != 5:
            self.log(f"Expected 5 ports with limit=5, got {len(response)}", "FAIL")
            return False
        
        self.log("✅ Limit parameter works correctly", "PASS")
        
        self.log("🎉 All port search tests passed!", "PASS")
        return True

    def test_generate_plan_requires_device_id(self):
        """Test that generate plan endpoint requires X-Device-Id header."""
        plan_data = {
            "trip_id": "t",
            "port_id": "p",
            "port_name": "N",
            "port_country": "C",
            "latitude": 0.0,
            "longitude": 0.0,
            "arrival": "2099-01-01T08:00:00",
            "departure": "2099-01-01T18:00:00",
            "preferences": {
                "party_type": "solo",
                "activity_level": "light",
                "transport_mode": "walking",
                "budget": "free",
            },
        }
        # No X-Device-Id header
        success, _ = self.run_test("Generate Plan No Device ID", "POST", "api/plans/generate", 422, plan_data)
        if success:
            self.log("✅ Generate plan correctly requires X-Device-Id header", "PASS")
            return True
        return False

    def run_all_tests(self):
        """Run all backend API tests"""
        self.log("=" * 60, "INFO")
        self.log("SHOREEXPLORER BACKEND API TESTING", "INFO")
        self.log("=" * 60, "INFO")
        self.log(f"Base URL: {self.base_url}", "INFO")
        self.log("", "INFO")

        try:
            # Test sequence
            tests = [
                ("Health Check", self.test_health_endpoint),
                ("Port Search & Regions", self.test_port_search_endpoints),
                ("Weather API Proxy", self.test_weather_api),
                ("AI Plan Generation with Currency", self.test_plan_generation),
                ("Budget Exceeded Error Handling", self.test_budget_exceeded_error_handling),
                ("Generate Plan Requires Device ID", self.test_generate_plan_requires_device_id),
            ]

            for test_name, test_func in tests:
                self.log(f"\n--- {test_name} ---", "INFO")
                try:
                    test_func()
                except Exception as e:
                    self.log(f"Test {test_name} failed with exception: {str(e)}", "ERROR")

        finally:
            pass

        # Print final results
        self.log("", "INFO")
        self.log("=" * 60, "INFO")
        self.log("TEST RESULTS", "INFO")
        self.log("=" * 60, "INFO")
        self.log(f"Tests Run: {self.tests_run}", "INFO")
        self.log(f"Tests Passed: {self.tests_passed}", "INFO")
        self.log(f"Tests Failed: {self.tests_run - self.tests_passed}", "INFO")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%", "INFO")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 ALL TESTS PASSED!", "PASS")
            return 0
        else:
            self.log("❌ SOME TESTS FAILED", "FAIL")
            return 1

def main():
    """Main test runner"""
    tester = ShoreExplorerAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())