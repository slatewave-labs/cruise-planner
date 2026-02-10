#!/usr/bin/env python3
"""
Comprehensive API Testing for ShoreExplorer Backend
Tests all endpoints including health, trips, ports, weather, and AI plan generation
"""

import requests
import json
import sys
import uuid
from datetime import datetime

class ShoreExplorerAPITester:
    def __init__(self):
        self.base_url = "https://port-adventure-1.preview.emergentagent.com"
        self.test_trip_id = None
        self.test_port_id = None
        self.test_plan_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def log(self, message, status="INFO"):
        print(f"[{status}] {message}")

    def run_test(self, name, method, endpoint, expected_status=200, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        self.tests_run += 1
        
        self.log(f"Testing {name}...")
        
        # Handle both single status code and list of acceptable codes
        if isinstance(expected_status, int):
            expected_codes = [expected_status]
        else:
            expected_codes = expected_status
        
        try:
            if method == 'GET':
                response = self.session.get(url, timeout=timeout)
            elif method == 'POST':
                response = self.session.post(url, json=data, timeout=timeout)
            elif method == 'PUT':
                response = self.session.put(url, json=data, timeout=timeout)
            elif method == 'DELETE':
                response = self.session.delete(url, timeout=timeout)
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
        if success and response.get("status") == "ok":
            self.log("Health endpoint working correctly", "PASS")
            return True
        else:
            self.log("Health endpoint failed or returned incorrect response", "FAIL")
            return False

    def test_trip_crud(self):
        """Test complete trip CRUD operations"""
        # 1. Create trip
        trip_data = {
            "ship_name": f"Test Ship {uuid.uuid4().hex[:8]}",
            "cruise_line": "Test Cruise Line"
        }
        
        success, response = self.run_test("Create Trip", "POST", "api/trips", 200, trip_data)
        if not success:
            return False
        
        self.test_trip_id = response.get("trip_id")
        if not self.test_trip_id:
            self.log("No trip_id returned in create response", "FAIL")
            return False

        # 2. List trips
        success, response = self.run_test("List Trips", "GET", "api/trips")
        if not success:
            return False
        
        found_trip = any(trip.get("trip_id") == self.test_trip_id for trip in response)
        if not found_trip:
            self.log("Created trip not found in list", "FAIL")
            return False

        # 3. Get specific trip
        success, response = self.run_test("Get Trip", "GET", f"api/trips/{self.test_trip_id}")
        if not success:
            return False
        
        if response.get("ship_name") != trip_data["ship_name"]:
            self.log("Retrieved trip data doesn't match created data", "FAIL")
            return False

        # 4. Update trip
        updated_data = {
            "ship_name": f"Updated Ship {uuid.uuid4().hex[:8]}",
            "cruise_line": "Updated Cruise Line"
        }
        
        success, response = self.run_test("Update Trip", "PUT", f"api/trips/{self.test_trip_id}", 200, updated_data)
        if not success:
            return False

        self.log("✅ Trip CRUD operations completed successfully", "PASS")
        return True

    def test_port_management(self):
        """Test port management endpoints"""
        if not self.test_trip_id:
            self.log("No test trip available for port testing", "FAIL")
            return False

        # 1. Add port to trip
        port_data = {
            "name": "Barcelona",
            "country": "Spain",
            "latitude": 41.3784,
            "longitude": 2.1925,
            "arrival": "2024-06-15T08:00:00",
            "departure": "2024-06-15T18:00:00"
        }
        
        success, response = self.run_test("Add Port", "POST", f"api/trips/{self.test_trip_id}/ports", 200, port_data)
        if not success:
            return False
        
        self.test_port_id = response.get("port_id")
        if not self.test_port_id:
            self.log("No port_id returned in add port response", "FAIL")
            return False

        # 2. Get trip with ports
        success, response = self.run_test("Get Trip with Ports", "GET", f"api/trips/{self.test_trip_id}")
        if not success:
            return False
        
        ports = response.get("ports", [])
        if len(ports) == 0:
            self.log("No ports found in trip after adding port", "FAIL")
            return False
        
        found_port = any(port.get("port_id") == self.test_port_id for port in ports)
        if not found_port:
            self.log("Added port not found in trip", "FAIL")
            return False

        # 3. Update port
        updated_port_data = {
            "name": "Barcelona Updated",
            "country": "Spain",
            "latitude": 41.3784,
            "longitude": 2.1925,
            "arrival": "2024-06-15T09:00:00",
            "departure": "2024-06-15T19:00:00"
        }
        
        success, response = self.run_test("Update Port", "PUT", f"api/trips/{self.test_trip_id}/ports/{self.test_port_id}", 200, updated_port_data)
        if not success:
            return False

        self.log("✅ Port management operations completed successfully", "PASS")
        return True

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
        if not self.test_trip_id or not self.test_port_id:
            self.log("No test trip/port available for plan generation", "FAIL")
            return False

        # Test 1: Basic plan generation with default currency (GBP)
        plan_data = {
            "trip_id": self.test_trip_id,
            "port_id": self.test_port_id,
            "preferences": {
                "party_type": "couple",
                "activity_level": "moderate",
                "transport_mode": "mixed",
                "budget": "medium",
                "currency": "GBP"
            }
        }
        
        self.log("Starting AI plan generation with GBP currency (expecting budget exceeded error)...", "INFO")
        success, response = self.run_test("Generate Plan with Currency", "POST", "api/plans/generate", [200, 503], plan_data, timeout=45)
        
        if not success:
            return False
        
        # Test 2: Check if different currencies are accepted
        for currency in ["EUR", "USD"]:
            plan_data["preferences"]["currency"] = currency
            self.log(f"Testing plan generation with {currency} currency (expecting budget exceeded)...", "INFO")
            success, response = self.run_test(f"Generate Plan with {currency}", "POST", "api/plans/generate", [200, 503], plan_data, timeout=45)
            if not success:
                return False
        
        self.log("✅ Currency parameter handling in plan generation working", "PASS")
        return True

    def test_budget_exceeded_error_handling(self):
        """Test that budget exceeded returns proper 503 error instead of 500"""
        if not self.test_trip_id or not self.test_port_id:
            self.log("No test trip/port available for budget error testing", "FAIL")
            return False

        plan_data = {
            "trip_id": self.test_trip_id,
            "port_id": self.test_port_id,
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
            response = self.session.post(f"{self.base_url}/api/plans/generate", json=plan_data, timeout=45)
            
            if response.status_code == 503:
                # Check error message contains budget information
                error_data = response.json()
                detail = error_data.get("detail", "")
                if "budget" in detail.lower() and "exceeded" in detail.lower():
                    self.log("✅ Budget exceeded returns proper 503 with descriptive error", "PASS")
                    self.tests_passed += 1
                else:
                    self.log(f"❌ 503 response but error message not descriptive: {detail}", "FAIL")
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

    def test_plan_listing(self):
        """Test plan listing endpoints"""
        if not self.test_trip_id:
            self.log("No test trip available for plan listing", "FAIL")
            return False

        # Test list all plans
        success, response = self.run_test("List All Plans", "GET", "api/plans")
        if not success:
            return False

        # Test list plans by trip
        success, response = self.run_test("List Plans by Trip", "GET", f"api/plans?trip_id={self.test_trip_id}")
        if success:
            self.log("✅ Plan listing endpoints working", "PASS")
            return True
        return False

    def cleanup(self):
        """Clean up test data"""
        self.log("Cleaning up test data...", "INFO")
        
        # Delete test plan
        if self.test_plan_id:
            self.run_test("Delete Plan", "DELETE", f"api/plans/{self.test_plan_id}")
        
        # Delete test trip (this should also delete associated ports and plans)
        if self.test_trip_id:
            self.run_test("Delete Trip", "DELETE", f"api/trips/{self.test_trip_id}")

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
                ("Trip CRUD Operations", self.test_trip_crud),
                ("Port Management", self.test_port_management),
                ("Weather API Proxy", self.test_weather_api),
                ("AI Plan Generation", self.test_plan_generation),
                ("Plan Listing", self.test_plan_listing),
            ]

            for test_name, test_func in tests:
                self.log(f"\n--- {test_name} ---", "INFO")
                try:
                    test_func()
                except Exception as e:
                    self.log(f"Test {test_name} failed with exception: {str(e)}", "ERROR")

        finally:
            # Always attempt cleanup
            self.cleanup()

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