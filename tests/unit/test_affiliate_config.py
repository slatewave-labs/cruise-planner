"""
Unit tests for affiliate link configuration and URL processing.
"""

import os
from urllib.parse import urlparse

import pytest

from backend.affiliate_config import (
    add_affiliate_params,
    get_affiliate_config,
    get_domain_from_url,
    process_plan_activities,
)


class TestGetDomainFromUrl:
    """Test domain extraction from URLs."""

    def test_simple_domain(self):
        url = "https://viator.com/tour/123"
        assert get_domain_from_url(url) == "viator.com"

    def test_www_prefix_removed(self):
        url = "https://www.getyourguide.com/activity/456"
        assert get_domain_from_url(url) == "getyourguide.com"

    def test_subdomain_preserved(self):
        url = "https://tours.booking.com/hotel/789"
        assert get_domain_from_url(url) == "tours.booking.com"

    def test_invalid_url(self):
        assert get_domain_from_url("not-a-url") is None

    def test_empty_url(self):
        assert get_domain_from_url("") is None


class TestAddAffiliateParams:
    """Test affiliate parameter addition to URLs."""

    def test_viator_url_with_affiliate_id(self, monkeypatch):
        """Test adding affiliate params to Viator URL when ID is configured."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-viator-123")
        url = "https://www.viator.com/tours/Rome/Colosseum-Tour/d511-12345"
        result = add_affiliate_params(url)

        assert "aid=test-viator-123" in result
        assert "mcid=cruise-planner-app" in result
        assert urlparse(result).hostname in ("viator.com", "www.viator.com")

    def test_getyourguide_url_with_affiliate_id(self, monkeypatch):
        """Test adding affiliate params to GetYourGuide URL."""
        monkeypatch.setenv("GETYOURGUIDE_AFFILIATE_ID", "test-gyg-456")
        url = "https://www.getyourguide.com/barcelona-l45/activity-t123/456789"
        result = add_affiliate_params(url)

        assert "partner_id=test-gyg-456" in result
        assert "utm_source=cruise-planner" in result
        assert "utm_medium=affiliate" in result

    def test_url_without_affiliate_program(self):
        """Test that URLs without affiliate programs are unchanged."""
        url = "https://example.com/some/path"
        result = add_affiliate_params(url)
        assert result == url

    def test_url_without_configured_affiliate_id(self, monkeypatch):
        """Test URL gets static params but not affiliate ID when ID is not configured."""
        monkeypatch.delenv("VIATOR_AFFILIATE_ID", raising=False)
        url = "https://www.viator.com/tours/Rome/Colosseum-Tour/d511-12345"
        result = add_affiliate_params(url)

        # Should get static param (mcid) even without affiliate ID
        # This helps with general tracking even if monetization isn't enabled
        assert "mcid=cruise-planner-app" in result or result == url
        # Should NOT have affiliate ID param
        assert "aid=" not in result

    def test_url_with_existing_params(self, monkeypatch):
        """Test affiliate params are added to URLs with existing query params."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-viator-789")
        url = "https://www.viator.com/tours/Rome/tour/123?currency=USD&adults=2"
        result = add_affiliate_params(url)

        assert "currency=USD" in result
        assert "adults=2" in result
        assert "aid=test-viator-789" in result

    def test_empty_url(self):
        """Test empty URL is handled gracefully."""
        assert add_affiliate_params("") == ""

    def test_none_url(self):
        """Test None URL is handled gracefully."""
        assert add_affiliate_params(None) is None

    def test_klook_url(self, monkeypatch):
        """Test Klook URL affiliate params."""
        monkeypatch.setenv("KLOOK_AFFILIATE_ID", "test-klook-999")
        url = "https://www.klook.com/activity/12345-singapore-gardens-by-the-bay"
        result = add_affiliate_params(url)

        assert "affiliate_id=test-klook-999" in result
        assert "source=cruise-planner" in result

    def test_booking_com_url(self, monkeypatch):
        """Test Booking.com URL affiliate params."""
        monkeypatch.setenv("BOOKING_AFFILIATE_ID", "test-booking-111")
        url = "https://www.booking.com/hotel/it/rome-hotel.html"
        result = add_affiliate_params(url)

        assert "aid=test-booking-111" in result
        assert "label=cruise-planner-booking" in result

    def test_domain_matching_security(self):
        """Test that fake domains don't match legitimate partners."""
        # A malicious domain should not match our partners
        fake_viator = "https://www.notviator.com/fake/tour"
        result = add_affiliate_params(fake_viator)
        assert result == fake_viator  # Should be unchanged

        fake_klook = "https://www.klook.com.fake.com/activity/123"
        result2 = add_affiliate_params(fake_klook)
        assert result2 == fake_klook  # Should be unchanged

    def test_subdomain_support(self, monkeypatch):
        """Test that legitimate subdomains are supported."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-123")
        
        # www.viator.com should work
        url1 = "https://www.viator.com/tour/123"
        result1 = add_affiliate_params(url1)
        assert "aid=test-123" in result1
        
        # Direct viator.com should also work
        url2 = "https://viator.com/tour/123"
        result2 = add_affiliate_params(url2)
        assert "aid=test-123" in result2


class TestProcessPlanActivities:
    """Test processing of plan activities for affiliate links."""

    def test_process_activities_with_booking_urls(self, monkeypatch):
        """Test processing activities with booking URLs."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-123")

        activities = [
            {
                "order": 1,
                "name": "Colosseum Tour",
                "booking_url": "https://www.viator.com/tours/Rome/tour/123",
            },
            {
                "order": 2,
                "name": "Free Walking Tour",
                "booking_url": None,
            },
            {
                "order": 3,
                "name": "Vatican Museums",
                "booking_url": "https://example.com/vatican",
            },
        ]

        result = process_plan_activities(activities)

        # First activity should have affiliate params
        assert "aid=test-123" in result[0]["booking_url"]

        # Second activity has no URL
        assert result[1]["booking_url"] is None

        # Third activity has no affiliate program
        assert result[2]["booking_url"] == "https://example.com/vatican"

    def test_process_empty_activities(self):
        """Test processing empty activities list."""
        result = process_plan_activities([])
        assert result == []

    def test_process_none_activities(self):
        """Test processing None activities."""
        result = process_plan_activities(None)
        assert result is None

    def test_process_activities_without_booking_url_field(self):
        """Test activities without booking_url field are handled."""
        activities = [
            {"order": 1, "name": "Activity 1"},
            {"order": 2, "name": "Activity 2"},
        ]
        result = process_plan_activities(activities)

        assert len(result) == 2
        assert result[0]["name"] == "Activity 1"
        assert result[1]["name"] == "Activity 2"

    def test_original_activities_not_modified(self, monkeypatch):
        """Test that original activities list is not modified."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-456")

        original_activities = [
            {
                "order": 1,
                "name": "Tour",
                "booking_url": "https://www.viator.com/tours/Rome/tour/123",
            }
        ]

        original_url = original_activities[0]["booking_url"]
        result = process_plan_activities(original_activities)

        # Original should be unchanged
        assert original_activities[0]["booking_url"] == original_url
        # Result should have affiliate params
        assert result[0]["booking_url"] != original_url


class TestAffiliateConfig:
    """Test affiliate configuration retrieval."""

    def test_viator_config(self, monkeypatch):
        """Test Viator affiliate configuration."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-123")
        config = get_affiliate_config("viator.com")
        
        assert config is not None
        assert config["aid"] == "test-123"
        assert config["mcid"] == "cruise-planner-app"

    def test_getyourguide_config(self, monkeypatch):
        """Test GetYourGuide affiliate configuration."""
        monkeypatch.setenv("GETYOURGUIDE_AFFILIATE_ID", "test-456")
        config = get_affiliate_config("getyourguide.com")
        
        assert config is not None
        assert config["partner_id"] == "test-456"
        assert config["utm_source"] == "cruise-planner"

    def test_unknown_domain(self):
        """Test unknown domain returns None."""
        config = get_affiliate_config("unknown.com")
        assert config is None
