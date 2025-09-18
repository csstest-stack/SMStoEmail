#!/usr/bin/env python3
"""
SMS Mail Forwarder Backend API Test Suite
Tests all backend endpoints for functionality and error handling
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://sms2email.preview.emergentagent.com/api"
TIMEOUT = 30

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        self.test_results = []
        self.created_filter_id = None
        
    def log_result(self, endpoint: str, method: str, status: str, details: str, response_data: Any = None):
        """Log test result"""
        result = {
            "endpoint": endpoint,
            "method": method,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        print(f"[{status}] {method} {endpoint}: {details}")
        if response_data and status == "PASS":
            print(f"  Response: {json.dumps(response_data, indent=2)}")
        print()

    def test_health_endpoints(self):
        """Test basic health check endpoints"""
        print("=== Testing Health Endpoints ===")
        
        # Test GET /api/
        try:
            response = self.session.get(f"{BASE_URL}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "version" in data:
                    self.log_result("/", "GET", "PASS", 
                                  f"Health check successful (status: {response.status_code})", data)
                else:
                    self.log_result("/", "GET", "FAIL", 
                                  f"Missing expected fields in response: {data}")
            else:
                self.log_result("/", "GET", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result("/", "GET", "FAIL", f"Request failed: {str(e)}")

        # Test GET /api/health
        try:
            response = self.session.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                data = response.json()
                if "status" in data and "timestamp" in data:
                    self.log_result("/health", "GET", "PASS", 
                                  f"Health check successful (status: {response.status_code})", data)
                else:
                    self.log_result("/health", "GET", "FAIL", 
                                  f"Missing expected fields in response: {data}")
            else:
                self.log_result("/health", "GET", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result("/health", "GET", "FAIL", f"Request failed: {str(e)}")

    def test_sms_stats(self):
        """Test SMS statistics endpoint"""
        print("=== Testing SMS Stats ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/sms/stats")
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["total_messages", "forwarded_messages", "failed_messages", 
                                 "today_messages", "today_forwarded", "forwarding_rate"]
                
                if all(field in data for field in expected_fields):
                    self.log_result("/sms/stats", "GET", "PASS", 
                                  f"SMS stats retrieved successfully", data)
                else:
                    missing_fields = [f for f in expected_fields if f not in data]
                    self.log_result("/sms/stats", "GET", "FAIL", 
                                  f"Missing fields: {missing_fields}")
            else:
                self.log_result("/sms/stats", "GET", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result("/sms/stats", "GET", "FAIL", f"Request failed: {str(e)}")

    def test_email_config(self):
        """Test email configuration endpoints"""
        print("=== Testing Email Configuration ===")
        
        # Test GET /api/email/config (should return not_configured initially)
        try:
            response = self.session.get(f"{BASE_URL}/email/config")
            if response.status_code == 200:
                data = response.json()
                self.log_result("/email/config", "GET", "PASS", 
                              f"Email config retrieved successfully", data)
            else:
                self.log_result("/email/config", "GET", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result("/email/config", "GET", "FAIL", f"Request failed: {str(e)}")

        # Test POST /api/email/config
        email_config = {
            "email_type": "smtp",
            "smtp_server": "smtp.gmail.com",
            "smtp_port": 587,
            "smtp_username": "test@gmail.com",
            "smtp_password": "test_password",
            "use_tls": True,
            "recipient_email": "recipient@example.com",
            "sender_name": "SMS Forwarder Test"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/email/config", json=email_config)
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "success":
                    self.log_result("/email/config", "POST", "PASS", 
                                  f"Email config saved successfully", data)
                else:
                    self.log_result("/email/config", "POST", "FAIL", 
                                  f"Unexpected response: {data}")
            else:
                self.log_result("/email/config", "POST", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result("/email/config", "POST", "FAIL", f"Request failed: {str(e)}")

        # Test GET /api/email/config again (should return configured now)
        try:
            response = self.session.get(f"{BASE_URL}/email/config")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "configured" and "config" in data:
                    # Check if password is masked
                    config = data["config"]
                    if config.get("smtp_password") == "***masked***":
                        self.log_result("/email/config", "GET", "PASS", 
                                      f"Email config retrieved with masked password", data)
                    else:
                        self.log_result("/email/config", "GET", "FAIL", 
                                      f"Password not properly masked in response")
                else:
                    self.log_result("/email/config", "GET", "FAIL", 
                                  f"Unexpected response structure: {data}")
            else:
                self.log_result("/email/config", "GET", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result("/email/config", "GET", "FAIL", f"Request failed: {str(e)}")

    def test_email_sending(self):
        """Test email sending endpoint"""
        print("=== Testing Email Sending ===")
        
        test_email_request = {
            "recipient_email": "test@example.com",
            "test_message": "This is a test email from SMS Mail Forwarder API test suite"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/email/test", json=test_email_request)
            if response.status_code == 200:
                data = response.json()
                # Email will likely fail due to dummy credentials, but API should handle it gracefully
                if "status" in data and "message" in data:
                    self.log_result("/email/test", "POST", "PASS", 
                                  f"Email test endpoint working (status: {data['status']})", data)
                else:
                    self.log_result("/email/test", "POST", "FAIL", 
                                  f"Missing expected fields in response: {data}")
            else:
                self.log_result("/email/test", "POST", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result("/email/test", "POST", "FAIL", f"Request failed: {str(e)}")

    def test_sms_filters(self):
        """Test SMS filter endpoints"""
        print("=== Testing SMS Filters ===")
        
        # Test GET /api/filters (should be empty initially)
        try:
            response = self.session.get(f"{BASE_URL}/filters")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("/filters", "GET", "PASS", 
                                  f"Filters retrieved successfully (count: {len(data)})", data)
                else:
                    self.log_result("/filters", "GET", "FAIL", 
                                  f"Expected list response, got: {type(data)}")
            else:
                self.log_result("/filters", "GET", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result("/filters", "GET", "FAIL", f"Request failed: {str(e)}")

        # Test POST /api/filters
        filter_data = {
            "name": "Test Sender Filter",
            "filter_type": "sender",
            "filter_value": "+1234567890",
            "enabled": True
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/filters", json=filter_data)
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "success" and "filter_id" in data:
                    self.created_filter_id = data["filter_id"]
                    self.log_result("/filters", "POST", "PASS", 
                                  f"Filter created successfully", data)
                else:
                    self.log_result("/filters", "POST", "FAIL", 
                                  f"Unexpected response: {data}")
            else:
                self.log_result("/filters", "POST", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result("/filters", "POST", "FAIL", f"Request failed: {str(e)}")

        # Test GET /api/filters again (should have one filter now)
        try:
            response = self.session.get(f"{BASE_URL}/filters")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Find our created filter
                    created_filter = None
                    for filter_item in data:
                        if filter_item.get("name") == "Test Sender Filter":
                            created_filter = filter_item
                            # Store the actual filter ID from the response
                            if "id" in filter_item:
                                self.created_filter_id = filter_item["id"]
                            break
                    
                    if created_filter:
                        self.log_result("/filters", "GET", "PASS", 
                                      f"Created filter found in list", data)
                    else:
                        self.log_result("/filters", "GET", "FAIL", 
                                      f"Created filter not found in list")
                else:
                    self.log_result("/filters", "GET", "FAIL", 
                                  f"Expected non-empty list, got: {data}")
            else:
                self.log_result("/filters", "GET", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result("/filters", "GET", "FAIL", f"Request failed: {str(e)}")

    def test_filter_operations(self):
        """Test filter update and delete operations"""
        print("=== Testing Filter Operations ===")
        
        if not self.created_filter_id:
            self.log_result("/filters/{id}", "PUT", "SKIP", 
                          "No filter ID available for testing")
            self.log_result("/filters/{id}", "DELETE", "SKIP", 
                          "No filter ID available for testing")
            return

        # Test PUT /api/filters/{filter_id}
        update_data = {
            "name": "Updated Test Filter",
            "enabled": False
        }
        
        try:
            response = self.session.put(f"{BASE_URL}/filters/{self.created_filter_id}", 
                                      json=update_data)
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "success":
                    self.log_result(f"/filters/{self.created_filter_id}", "PUT", "PASS", 
                                  f"Filter updated successfully", data)
                else:
                    self.log_result(f"/filters/{self.created_filter_id}", "PUT", "FAIL", 
                                  f"Unexpected response: {data}")
            elif response.status_code == 404:
                self.log_result(f"/filters/{self.created_filter_id}", "PUT", "FAIL", 
                              f"Filter not found (404)")
            else:
                self.log_result(f"/filters/{self.created_filter_id}", "PUT", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result(f"/filters/{self.created_filter_id}", "PUT", "FAIL", 
                          f"Request failed: {str(e)}")

        # Test DELETE /api/filters/{filter_id}
        try:
            response = self.session.delete(f"{BASE_URL}/filters/{self.created_filter_id}")
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "success":
                    self.log_result(f"/filters/{self.created_filter_id}", "DELETE", "PASS", 
                                  f"Filter deleted successfully", data)
                else:
                    self.log_result(f"/filters/{self.created_filter_id}", "DELETE", "FAIL", 
                                  f"Unexpected response: {data}")
            elif response.status_code == 404:
                self.log_result(f"/filters/{self.created_filter_id}", "DELETE", "FAIL", 
                              f"Filter not found (404)")
            else:
                self.log_result(f"/filters/{self.created_filter_id}", "DELETE", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result(f"/filters/{self.created_filter_id}", "DELETE", "FAIL", 
                          f"Request failed: {str(e)}")

    def test_sms_forwarding(self):
        """Test SMS forwarding functionality"""
        print("=== Testing SMS Forwarding ===")
        
        # Test SMS forwarding with sample data
        sms_data = {
            "sender": "+1234567890",
            "content": "This is a test SMS message for the forwarding system"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/sms/forward", json=sms_data)
            if response.status_code == 200:
                data = response.json()
                if "status" in data and "message" in data and "sms_id" in data:
                    self.log_result("/sms/forward", "POST", "PASS", 
                                  f"SMS forwarding processed (status: {data['status']})", data)
                else:
                    self.log_result("/sms/forward", "POST", "FAIL", 
                                  f"Missing expected fields in response: {data}")
            elif response.status_code == 400:
                # This might happen if no email config is found
                data = response.json()
                self.log_result("/sms/forward", "POST", "PASS", 
                              f"SMS forwarding handled error correctly (400): {data.get('detail', 'Unknown error')}")
            else:
                self.log_result("/sms/forward", "POST", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result("/sms/forward", "POST", "FAIL", f"Request failed: {str(e)}")

    def test_sms_messages(self):
        """Test SMS message history endpoint"""
        print("=== Testing SMS Messages ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/sms/messages")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("/sms/messages", "GET", "PASS", 
                                  f"SMS messages retrieved successfully (count: {len(data)})", 
                                  {"message_count": len(data), "sample": data[:2] if data else []})
                else:
                    self.log_result("/sms/messages", "GET", "FAIL", 
                                  f"Expected list response, got: {type(data)}")
            else:
                self.log_result("/sms/messages", "GET", "FAIL", 
                              f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_result("/sms/messages", "GET", "FAIL", f"Request failed: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("Starting SMS Mail Forwarder Backend API Tests")
        print("=" * 60)
        
        # Test in logical order
        self.test_health_endpoints()
        self.test_sms_stats()
        self.test_email_config()
        self.test_email_sending()
        self.test_sms_filters()
        self.test_filter_operations()
        self.test_sms_forwarding()
        self.test_sms_messages()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["status"] == "PASS")
        failed = sum(1 for result in self.test_results if result["status"] == "FAIL")
        skipped = sum(1 for result in self.test_results if result["status"] == "SKIP")
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Skipped: {skipped}")
        print()
        
        if failed > 0:
            print("FAILED TESTS:")
            for result in self.test_results:
                if result["status"] == "FAIL":
                    print(f"  - {result['method']} {result['endpoint']}: {result['details']}")
        
        return {
            "total": len(self.test_results),
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "results": self.test_results
        }

if __name__ == "__main__":
    tester = BackendTester()
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    exit(0 if results["failed"] == 0 else 1)