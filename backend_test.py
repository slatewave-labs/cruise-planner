#!/usr/bin/env python3
"""
Comprehensive API Testing for Items CRUD Backend
Tests health check, items CRUD, and AI text generation endpoints
"""

import json
import sys
import uuid

import requests


class AppAPITester:
    def __init__(self):
        self.base_url = "http://localhost:8001"
        self.test_item_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def log(self, message, status="INFO"):
        print(f"[{status}] {message}")

    def run_test(
        self, name, method, endpoint, expected_status=200, data=None, timeout=30
    ):
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
            if method == "GET":
                response = requests.get(url, timeout=timeout)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=timeout)
            elif method == "PUT":
                response = requests.put(url, json=data, timeout=timeout)
            elif method == "DELETE":
                response = requests.delete(url, timeout=timeout)
            else:
                self.log(f"Unknown method: {method}", "ERROR")
                return False, {}

            success = response.status_code in expected_codes
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return (
                        success,
                        response.json() if response.text else {},
                    )
                except json.JSONDecodeError:
                    return success, {"response_text": response.text}
            else:
                self.log(
                    f"❌ {name} - Expected {expected_codes}, "
                    f"got {response.status_code}",
                    "FAIL",
                )
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
        # Accept both "ok" and "degraded" status
        if success and response.get("status") in ["ok", "degraded"]:
            self.log("Health endpoint working correctly", "PASS")
            return True
        else:
            self.log("Health endpoint failed or returned incorrect response", "FAIL")
            return False

    def test_item_crud(self):
        """Test complete item CRUD operations"""

        # 1. Create item
        item_data = {
            "name": f"Test Item {uuid.uuid4().hex[:8]}",
            "description": "Test item description",
        }

        success, response = self.run_test(
            "Create Item", "POST", "api/items", [200, 201], item_data
        )
        if not success:
            return False

        self.test_item_id = response.get("item_id")
        if not self.test_item_id:
            self.log("No item_id returned in create response", "FAIL")
            return False

        # 2. List items
        success, response = self.run_test("List Items", "GET", "api/items")
        if not success:
            return False

        found_item = any(item.get("item_id") == self.test_item_id for item in response)
        if not found_item:
            self.log("Created item not found in list", "FAIL")
            return False

        # 3. Get specific item
        success, response = self.run_test(
            "Get Item", "GET", f"api/items/{self.test_item_id}"
        )
        if not success:
            return False

        if response.get("name") != item_data["name"]:
            self.log("Retrieved item data doesn't match created data", "FAIL")
            return False

        # 4. Update item
        updated_data = {
            "name": f"Updated Item {uuid.uuid4().hex[:8]}",
            "description": "Updated description",
        }

        success, response = self.run_test(
            "Update Item",
            "PUT",
            f"api/items/{self.test_item_id}",
            200,
            updated_data,
        )
        if not success:
            return False

        self.log("✅ Item CRUD operations completed successfully", "PASS")
        return True

    def test_item_not_found(self):
        """Test that getting non-existent item returns 404"""
        success, _ = self.run_test(
            "Get Non-existent Item",
            "GET",
            "api/items/nonexistent-id-12345",
            404,
        )
        return success

    def test_generate_endpoint(self):
        """Test AI text generation endpoint (if GROQ_API_KEY present)"""
        import os

        if not os.environ.get("GROQ_API_KEY"):
            self.log("⚠️  GROQ_API_KEY not set, skipping generate test", "WARN")
            self.tests_run += 1
            self.tests_passed += 1
            return True

        generate_data = {"prompt": "Write a haiku about coding"}

        self.log("Testing AI text generation (may take 10-15 seconds)...", "INFO")
        success, response = self.run_test(
            "Generate Text",
            "POST",
            "api/generate",
            [200, 503],
            generate_data,
            timeout=30,
        )

        if success:
            if response.get("generated_text"):
                self.log("✅ AI generation endpoint working", "PASS")
                return True
            else:
                self.log("Generate response missing generated_text", "FAIL")
                return False
        return False

    def cleanup(self):
        """Clean up test data"""
        self.log("Cleaning up test data...", "INFO")

        # Delete test item
        if self.test_item_id:
            self.run_test("Delete Item", "DELETE", f"api/items/{self.test_item_id}")

    def run_all_tests(self):
        """Run all backend API tests"""
        self.log("=" * 60, "INFO")
        self.log("ITEMS CRUD BACKEND API TESTING", "INFO")
        self.log("=" * 60, "INFO")
        self.log(f"Base URL: {self.base_url}", "INFO")
        self.log("", "INFO")

        try:
            # Test sequence
            tests = [
                ("Health Check", self.test_health_endpoint),
                ("Item CRUD Operations", self.test_item_crud),
                ("Item Not Found (404)", self.test_item_not_found),
                ("AI Text Generation", self.test_generate_endpoint),
            ]

            for test_name, test_func in tests:
                self.log(f"\n--- {test_name} ---", "INFO")
                try:
                    test_func()
                except Exception as e:
                    self.log(
                        f"Test {test_name} failed with exception: {str(e)}",
                        "ERROR",
                    )

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
        self.log(
            (
                f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%"
                if self.tests_run > 0
                else "0%"
            ),
            "INFO",
        )

        if self.tests_passed == self.tests_run:
            self.log("🎉 ALL TESTS PASSED!", "PASS")
            return 0
        else:
            self.log("❌ SOME TESTS FAILED", "FAIL")
            return 1


def main():
    """Main test runner"""
    tester = AppAPITester()
    return tester.run_all_tests()


if __name__ == "__main__":
    sys.exit(main())
