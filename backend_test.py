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
        self.base_url = "http://localhost:8001"
        self.test_trip_id = None
        self.test_port_id = None
        self.test_plan_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        # Generate unique device IDs for privacy testing
        self.device_a = str(uuid.uuid4())
        self.device_b = str(uuid.uuid4())

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

    def test_device_privacy_isolation(self):
        """Test critical privacy fix - device isolation"""
        self.log("Testing device privacy isolation (CRITICAL PRIVACY TEST)...", "INFO")
        
        # Test 1: Create trip with Device A
        trip_data_a = {
            "ship_name": f"Device A Ship {uuid.uuid4().hex[:8]}",
            "cruise_line": "Device A Cruise"
        }
        
        success, response_a = self.run_test("Create Trip Device A", "POST", "api/trips", 200, trip_data_a, device_id=self.device_a)
        if not success:
            return False
        trip_id_a = response_a.get("trip_id")
        
        # Test 2: Create trip with Device B  
        trip_data_b = {
            "ship_name": f"Device B Ship {uuid.uuid4().hex[:8]}",
            "cruise_line": "Device B Cruise"
        }
        
        success, response_b = self.run_test("Create Trip Device B", "POST", "api/trips", 200, trip_data_b, device_id=self.device_b)
        if not success:
            return False
        trip_id_b = response_b.get("trip_id")
        
        # Test 3: Device A should only see Device A trips
        success, trips_a = self.run_test("List Trips Device A", "GET", "api/trips", device_id=self.device_a)
        if not success:
            return False
            
        device_a_trip_ids = [trip.get("trip_id") for trip in trips_a]
        if trip_id_a not in device_a_trip_ids:
            self.log("❌ Device A cannot see its own trip", "FAIL")
            return False
            
        if trip_id_b in device_a_trip_ids:
            self.log("❌ PRIVACY VIOLATION: Device A can see Device B's trip!", "FAIL")
            return False
        
        # Test 4: Device B should only see Device B trips
        success, trips_b = self.run_test("List Trips Device B", "GET", "api/trips", device_id=self.device_b)
        if not success:
            return False
            
        device_b_trip_ids = [trip.get("trip_id") for trip in trips_b]
        if trip_id_b not in device_b_trip_ids:
            self.log("❌ Device B cannot see its own trip", "FAIL")
            return False
            
        if trip_id_a in device_b_trip_ids:
            self.log("❌ PRIVACY VIOLATION: Device B can see Device A's trip!", "FAIL")
            return False
            
        # Test 5: Device A cannot access Device B's trip directly
        success, _ = self.run_test("Device A Access Device B Trip", "GET", f"api/trips/{trip_id_b}", 404, device_id=self.device_a)
        if not success:
            self.log("❌ Device A should get 404 when accessing Device B's trip", "FAIL")
            return False
            
        # Test 6: Device B cannot access Device A's trip directly  
        success, _ = self.run_test("Device B Access Device A Trip", "GET", f"api/trips/{trip_id_a}", 404, device_id=self.device_b)
        if not success:
            self.log("❌ Device B should get 404 when accessing Device A's trip", "FAIL")
            return False
            
        # Test 7: Device A cannot delete Device B's trip
        success, _ = self.run_test("Device A Delete Device B Trip", "DELETE", f"api/trips/{trip_id_b}", 404, device_id=self.device_a)
        if not success:
            self.log("❌ Device A should get 404 when deleting Device B's trip", "FAIL")
            return False
            
        # Test 8: Test endpoints without X-Device-Id header (should fail with 422)
        success, _ = self.run_test("Create Trip No Device ID", "POST", "api/trips", 422, trip_data_a)
        if not success:
            self.log("❌ Endpoints should require X-Device-Id header", "FAIL")
            return False
            
        success, _ = self.run_test("List Trips No Device ID", "GET", "api/trips", 422)
        if not success:
            self.log("❌ Endpoints should require X-Device-Id header", "FAIL")
            return False
        
        # Cleanup test trips
        self.run_test("Cleanup Device A Trip", "DELETE", f"api/trips/{trip_id_a}", device_id=self.device_a)
        self.run_test("Cleanup Device B Trip", "DELETE", f"api/trips/{trip_id_b}", device_id=self.device_b)
        
        self.log("✅ DEVICE PRIVACY ISOLATION WORKING CORRECTLY", "PASS")
        return True
    def test_trip_crud(self):
        """Test complete trip CRUD operations"""
        # Use device A for main CRUD tests
        device_id = self.device_a
        
        # 1. Create trip
        trip_data = {
            "ship_name": f"Test Ship {uuid.uuid4().hex[:8]}",
            "cruise_line": "Test Cruise Line"
        }
        
        success, response = self.run_test("Create Trip", "POST", "api/trips", 200, trip_data, device_id=device_id)
        if not success:
            return False
        
        self.test_trip_id = response.get("trip_id")
        if not self.test_trip_id:
            self.log("No trip_id returned in create response", "FAIL")
            return False

        # 2. List trips
        success, response = self.run_test("List Trips", "GET", "api/trips", device_id=device_id)
        if not success:
            return False
        
        found_trip = any(trip.get("trip_id") == self.test_trip_id for trip in response)
        if not found_trip:
            self.log("Created trip not found in list", "FAIL")
            return False

        # 3. Get specific trip
        success, response = self.run_test("Get Trip", "GET", f"api/trips/{self.test_trip_id}", device_id=device_id)
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
        
        success, response = self.run_test("Update Trip", "PUT", f"api/trips/{self.test_trip_id}", 200, updated_data, device_id=device_id)
        if not success:
            return False

        self.log("✅ Trip CRUD operations completed successfully", "PASS")
        return True

    def test_port_management(self):
        """Test port management endpoints"""
        if not self.test_trip_id:
            self.log("No test trip available for port testing", "FAIL")
            return False

        device_id = self.device_a

        # 1. Add port to trip
        port_data = {
            "name": "Barcelona",
            "country": "Spain",
            "latitude": 41.3784,
            "longitude": 2.1925,
            "arrival": "2024-06-15T08:00:00",
            "departure": "2024-06-15T18:00:00"
        }
        
        success, response = self.run_test("Add Port", "POST", f"api/trips/{self.test_trip_id}/ports", 200, port_data, device_id=device_id)
        if not success:
            return False
        
        self.test_port_id = response.get("port_id")
        if not self.test_port_id:
            self.log("No port_id returned in add port response", "FAIL")
            return False

        # 2. Get trip with ports
        success, response = self.run_test("Get Trip with Ports", "GET", f"api/trips/{self.test_trip_id}", device_id=device_id)
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
        
        success, response = self.run_test("Update Port", "PUT", f"api/trips/{self.test_trip_id}/ports/{self.test_port_id}", 200, updated_port_data, device_id=device_id)
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

        device_id = self.device_a

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
        success, response = self.run_test("Generate Plan with Currency", "POST", "api/plans/generate", [200, 503], plan_data, timeout=45, device_id=device_id)
        
        if not success:
            return False
        
        # Test 2: Check if different currencies are accepted
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
        if not self.test_trip_id or not self.test_port_id:
            self.log("No test trip/port available for budget error testing", "FAIL")
            return False

        device_id = self.device_a

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

    def test_plan_listing(self):
        """Test plan listing endpoints"""
        if not self.test_trip_id:
            self.log("No test trip available for plan listing", "FAIL")
            return False

        device_id = self.device_a

        # Test list all plans
        success, response = self.run_test("List All Plans", "GET", "api/plans", device_id=device_id)
        if not success:
            return False

        # Test list plans by trip
        success, response = self.run_test("List Plans by Trip", "GET", f"api/plans?trip_id={self.test_trip_id}", device_id=device_id)
        if success:
            self.log("✅ Plan listing endpoints working", "PASS")
            return True
        return False

    def test_port_search_endpoints(self):
        """Test the new port search functionality"""
        self.log("Testing new port search endpoints...", "INFO")
        
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
        
        # Test 4: Search for Alaska ports
        success, response = self.run_test("Port Search - Alaska", "GET", "api/ports/search?q=alaska")
        if not success:
            return False
        
        alaska_ports = ["Juneau", "Ketchikan", "Skagway", "Sitka"]
        found_alaska_ports = [port.get("name") for port in response 
                            if any(ap in port.get("name", "") for ap in alaska_ports)]
        
        if len(found_alaska_ports) < 2:
            self.log(f"Expected multiple Alaska ports, found: {found_alaska_ports}", "FAIL")
            return False
        
        self.log(f"✅ Alaska search returns Alaska ports: {found_alaska_ports}", "PASS")
        
        # Test 5: Search by Caribbean region
        success, response = self.run_test("Port Search - Caribbean Region", "GET", "api/ports/search?region=Caribbean")
        if not success:
            return False
        
        if len(response) < 10:  # Should have many Caribbean ports
            self.log(f"Expected many Caribbean ports, got {len(response)}", "FAIL")
            return False
        
        # All results should be Caribbean
        non_caribbean = [port for port in response if port.get("region") != "Caribbean"]
        if non_caribbean:
            self.log(f"Found non-Caribbean ports in Caribbean search: {[p.get('name') for p in non_caribbean]}", "FAIL")
            return False
        
        caribbean_names = [port.get("name") for port in response[:5]]  # Show first 5
        self.log(f"✅ Caribbean region filter returns Caribbean ports: {caribbean_names}...", "PASS")
        
        # Test 6: Search for Dubai
        success, response = self.run_test("Port Search - Dubai", "GET", "api/ports/search?q=dubai")
        if not success:
            return False
        
        dubai_found = any(port.get("name", "").lower() == "dubai" and 
                         "emirates" in port.get("country", "").lower() 
                         for port in response)
        
        if not dubai_found:
            self.log("Dubai, UAE not found in search results", "FAIL")
            return False
        
        self.log("✅ Dubai search returns Dubai, UAE", "PASS")
        
        # Test 7: Search for Sydney
        success, response = self.run_test("Port Search - Sydney", "GET", "api/ports/search?q=sydney")
        if not success:
            return False
        
        sydney_found = any(port.get("name", "").lower() == "sydney" and 
                          port.get("country", "").lower() == "australia" 
                          for port in response)
        
        if not sydney_found:
            self.log("Sydney, Australia not found in search results", "FAIL")
            return False
        
        self.log("✅ Sydney search returns Sydney, Australia", "PASS")
        
        # Test 8: Test limit parameter
        success, response = self.run_test("Port Search - Limit 5", "GET", "api/ports/search?limit=5")
        if not success:
            return False
        
        if len(response) != 5:
            self.log(f"Expected 5 ports with limit=5, got {len(response)}", "FAIL")
            return False
        
        self.log("✅ Limit parameter works correctly", "PASS")
        
        self.log("🎉 All port search tests passed!", "PASS")
        return True

    def cleanup(self):
        """Clean up test data"""
        self.log("Cleaning up test data...", "INFO")
        
        device_id = self.device_a
        
        # Delete test plan
        if self.test_plan_id:
            self.run_test("Delete Plan", "DELETE", f"api/plans/{self.test_plan_id}", device_id=device_id)
        
        # Delete test trip (this should also delete associated ports and plans)
        if self.test_trip_id:
            self.run_test("Delete Trip", "DELETE", f"api/trips/{self.test_trip_id}", device_id=device_id)

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
                ("DEVICE PRIVACY ISOLATION", self.test_device_privacy_isolation),
                ("Port Search & Regions", self.test_port_search_endpoints),
                ("Trip CRUD Operations", self.test_trip_crud),
                ("Port Management", self.test_port_management),
                ("Weather API Proxy", self.test_weather_api),
                ("AI Plan Generation with Currency", self.test_plan_generation),
                ("Budget Exceeded Error Handling", self.test_budget_exceeded_error_handling),
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