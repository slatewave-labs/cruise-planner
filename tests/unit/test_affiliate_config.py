"""
Unit tests for affiliate link configuration and URL processing.
"""

import os
from urllib.parse import urlparse

import pytest

from backend.affiliate_config import (
    add_affiliate_params,
    generate_booking_search_url,
    generate_booking_search_url_for_platform,
    get_affiliate_config,
    get_configured_platforms,
    get_domain_from_url,
    process_plan_activities,
    validate_booking_url,
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


class TestGenerateBookingSearchUrl:
    """Test search URL generation for booking platforms."""

    def test_generates_viator_search_url_when_configured(self, monkeypatch):
        """Test Viator search URL is generated when affiliate ID is set."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-123")
        result = generate_booking_search_url("Colosseum Tour", "Rome")

        assert result is not None
        assert "viator.com/searchResults/all" in result
        assert "text=Colosseum+Tour+Rome" in result
        assert "aid=test-123" in result

    def test_falls_back_to_getyourguide(self, monkeypatch):
        """Test fallback to GetYourGuide when Viator is not configured."""
        monkeypatch.delenv("VIATOR_AFFILIATE_ID", raising=False)
        monkeypatch.setenv("GETYOURGUIDE_AFFILIATE_ID", "test-gyg-456")
        result = generate_booking_search_url("Park Guell", "Barcelona")

        assert result is not None
        assert "getyourguide.com/s/" in result
        assert "q=Park+Guell+Barcelona" in result
        assert "partner_id=test-gyg-456" in result

    def test_returns_none_when_no_platform_configured(self, monkeypatch):
        """Test returns None when no affiliate platform is configured."""
        monkeypatch.delenv("VIATOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("GETYOURGUIDE_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("KLOOK_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("TRIPADVISOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("BOOKING_AFFILIATE_ID", raising=False)
        result = generate_booking_search_url("Tour", "City")
        assert result is None

    def test_returns_none_for_empty_activity_name(self, monkeypatch):
        """Test returns None when activity name is empty."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-123")
        assert generate_booking_search_url("", "Rome") is None

    def test_returns_none_for_empty_port_name(self, monkeypatch):
        """Test returns None when port name is empty."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-123")
        assert generate_booking_search_url("Tour", "") is None


class TestProcessPlanActivities:
    """Test processing of plan activities for booking search URLs."""

    def test_process_activities_generates_search_urls(self, monkeypatch):
        """Test activities get search URLs when AI provides no/invalid URLs."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-123")

        activities = [
            {
                "order": 1,
                "name": "Colosseum Tour",
                # AI-hallucinated URL on unsupported domain — falls back to search
                "booking_url": "https://www.example.com/fake-tour/123",
            },
            {
                "order": 2,
                "name": "Free Walking Tour",
                "booking_url": None,
            },
        ]

        result = process_plan_activities(activities, port_name="Rome")

        # First activity: invalid domain → replaced with search URL
        assert "viator.com/searchResults/all" in result[0]["booking_url"]
        assert "text=Colosseum+Tour+Rome" in result[0]["booking_url"]
        assert "aid=test-123" in result[0]["booking_url"]

        # Second activity also gets a search URL (has a name)
        assert "viator.com/searchResults/all" in result[1]["booking_url"]
        assert "text=Free+Walking+Tour+Rome" in result[1]["booking_url"]

    def test_process_empty_activities(self):
        """Test processing empty activities list."""
        result = process_plan_activities([])
        assert result == []

    def test_process_none_activities(self):
        """Test processing None activities."""
        result = process_plan_activities(None)
        assert result is None

    def test_process_activities_without_name(self, monkeypatch):
        """Test activities without name field don't get search URLs."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-123")
        activities = [
            {"order": 1, "booking_url": None},
        ]
        result = process_plan_activities(activities, port_name="Rome")
        assert result[0].get("booking_url") is None

    def test_process_activities_without_port_name(self, monkeypatch):
        """Test activities without port_name don't get search URLs."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-123")
        activities = [
            {"order": 1, "name": "Tour", "booking_url": None},
        ]
        result = process_plan_activities(activities, port_name="")
        assert result[0].get("booking_url") is None

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
        result = process_plan_activities(original_activities, port_name="Rome")

        # Original should be unchanged
        assert original_activities[0]["booking_url"] == original_url
        # Result should have affiliate params added (URL is valid)
        assert "aid=test-456" in result[0]["booking_url"]


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


class TestGetConfiguredPlatforms:
    """Test discovery of configured affiliate platforms."""

    def test_returns_configured_platforms(self, monkeypatch):
        """Test that only platforms with configured IDs are returned."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "v-123")
        monkeypatch.setenv("KLOOK_AFFILIATE_ID", "k-456")
        monkeypatch.delenv("GETYOURGUIDE_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("TRIPADVISOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("BOOKING_AFFILIATE_ID", raising=False)

        platforms = get_configured_platforms()
        assert platforms == ["viator.com", "klook.com"]

    def test_returns_empty_when_none_configured(self, monkeypatch):
        """Test empty list when no affiliate IDs are set."""
        monkeypatch.delenv("VIATOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("GETYOURGUIDE_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("KLOOK_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("TRIPADVISOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("BOOKING_AFFILIATE_ID", raising=False)

        assert get_configured_platforms() == []

    def test_respects_priority_order(self, monkeypatch):
        """Test that platforms are returned in PLATFORM_PRIORITY order."""
        monkeypatch.setenv("BOOKING_AFFILIATE_ID", "b-111")
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "v-222")
        monkeypatch.delenv("GETYOURGUIDE_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("KLOOK_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("TRIPADVISOR_AFFILIATE_ID", raising=False)

        platforms = get_configured_platforms()
        assert platforms == ["viator.com", "booking.com"]


class TestGenerateBookingSearchUrlForPlatform:
    """Test platform-specific search URL generation."""

    def test_generates_viator_url(self, monkeypatch):
        """Test generating a Viator search URL."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-v")
        result = generate_booking_search_url_for_platform(
            "Colosseum Tour", "Rome", "viator.com"
        )
        assert result is not None
        assert "viator.com/searchResults/all" in result
        assert "aid=test-v" in result

    def test_generates_getyourguide_url(self, monkeypatch):
        """Test generating a GetYourGuide search URL."""
        monkeypatch.setenv("GETYOURGUIDE_AFFILIATE_ID", "test-gyg")
        result = generate_booking_search_url_for_platform(
            "Park Guell", "Barcelona", "getyourguide.com"
        )
        assert result is not None
        assert "getyourguide.com/s/" in result
        assert "partner_id=test-gyg" in result

    def test_returns_none_for_empty_inputs(self):
        """Test returns None when activity name or port is empty."""
        assert (
            generate_booking_search_url_for_platform("", "Rome", "viator.com") is None
        )
        assert (
            generate_booking_search_url_for_platform("Tour", "", "viator.com") is None
        )

    def test_returns_none_for_unknown_platform(self):
        """Test returns None for an unsupported platform domain."""
        assert (
            generate_booking_search_url_for_platform("Tour", "Rome", "unknown.com")
            is None
        )


class TestProcessPlanActivitiesDistribution:
    """Test even distribution of affiliate links across platforms."""

    def test_distributes_across_multiple_platforms(self, monkeypatch):
        """Test that activities are spread evenly across configured platforms."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "v-123")
        monkeypatch.setenv("GETYOURGUIDE_AFFILIATE_ID", "gyg-456")
        monkeypatch.delenv("KLOOK_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("TRIPADVISOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("BOOKING_AFFILIATE_ID", raising=False)

        activities = [
            {"order": 1, "name": "Activity A", "booking_url": None},
            {"order": 2, "name": "Activity B", "booking_url": None},
            {"order": 3, "name": "Activity C", "booking_url": None},
            {"order": 4, "name": "Activity D", "booking_url": None},
        ]

        result = process_plan_activities(activities, port_name="Rome")

        # With 2 platforms and 4 activities: round-robin gives alternating
        assert urlparse(result[0]["booking_url"]).hostname in (
            "viator.com",
            "www.viator.com",
        )
        assert urlparse(result[1]["booking_url"]).hostname in (
            "getyourguide.com",
            "www.getyourguide.com",
        )
        assert urlparse(result[2]["booking_url"]).hostname in (
            "viator.com",
            "www.viator.com",
        )
        assert urlparse(result[3]["booking_url"]).hostname in (
            "getyourguide.com",
            "www.getyourguide.com",
        )

    def test_distributes_across_three_platforms(self, monkeypatch):
        """Test round-robin with three configured platforms."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "v-1")
        monkeypatch.setenv("GETYOURGUIDE_AFFILIATE_ID", "gyg-2")
        monkeypatch.setenv("KLOOK_AFFILIATE_ID", "k-3")
        monkeypatch.delenv("TRIPADVISOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("BOOKING_AFFILIATE_ID", raising=False)

        activities = [
            {"order": i, "name": f"Activity {i}", "booking_url": None}
            for i in range(1, 7)
        ]

        result = process_plan_activities(activities, port_name="Barcelona")

        assert urlparse(result[0]["booking_url"]).hostname in (
            "viator.com",
            "www.viator.com",
        )
        assert urlparse(result[1]["booking_url"]).hostname in (
            "getyourguide.com",
            "www.getyourguide.com",
        )
        assert urlparse(result[2]["booking_url"]).hostname in (
            "klook.com",
            "www.klook.com",
        )
        assert urlparse(result[3]["booking_url"]).hostname in (
            "viator.com",
            "www.viator.com",
        )
        assert urlparse(result[4]["booking_url"]).hostname in (
            "getyourguide.com",
            "www.getyourguide.com",
        )
        assert urlparse(result[5]["booking_url"]).hostname in (
            "klook.com",
            "www.klook.com",
        )

    def test_single_platform_still_works(self, monkeypatch):
        """Test that a single configured platform still works for all activities."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "v-only")
        monkeypatch.delenv("GETYOURGUIDE_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("KLOOK_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("TRIPADVISOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("BOOKING_AFFILIATE_ID", raising=False)

        activities = [
            {"order": 1, "name": "Tour A", "booking_url": None},
            {"order": 2, "name": "Tour B", "booking_url": None},
        ]

        result = process_plan_activities(activities, port_name="Rome")

        assert urlparse(result[0]["booking_url"]).hostname in (
            "viator.com",
            "www.viator.com",
        )
        assert urlparse(result[1]["booking_url"]).hostname in (
            "viator.com",
            "www.viator.com",
        )


class TestValidateBookingUrl:
    """Test validation of AI-provided booking URLs."""

    def test_valid_viator_product_url(self):
        url = "https://www.viator.com/tours/Rome/Colosseum-Tour/d511-12345"
        assert validate_booking_url(url) is True

    def test_valid_getyourguide_product_url(self):
        url = "https://www.getyourguide.com/barcelona-l45/sagrada-familia-t12345/"
        assert validate_booking_url(url) is True

    def test_valid_klook_product_url(self):
        url = "https://www.klook.com/activity/12345-singapore-gardens"
        assert validate_booking_url(url) is True

    def test_valid_tripadvisor_product_url(self):
        url = "https://www.tripadvisor.com/AttractionProductReview-g187497-d123.html"
        assert validate_booking_url(url) is True

    def test_valid_booking_com_product_url(self):
        url = "https://www.booking.com/hotel/it/rome-grand-hotel.html"
        assert validate_booking_url(url) is True

    def test_rejects_none(self):
        assert validate_booking_url(None) is False

    def test_rejects_empty_string(self):
        assert validate_booking_url("") is False

    def test_rejects_http_scheme(self):
        url = "http://www.viator.com/tours/Rome/Tour/d511-12345"
        assert validate_booking_url(url) is False

    def test_rejects_unsupported_domain(self):
        url = "https://www.example.com/tours/Rome/Tour"
        assert validate_booking_url(url) is False

    def test_rejects_homepage(self):
        url = "https://www.viator.com/"
        assert validate_booking_url(url) is False

    def test_rejects_viator_search_url(self):
        url = "https://www.viator.com/searchResults/all?text=Rome+tour"
        assert validate_booking_url(url) is False

    def test_rejects_getyourguide_search_url(self):
        url = "https://www.getyourguide.com/s/?q=Rome+tour"
        assert validate_booking_url(url) is False

    def test_rejects_klook_search_url(self):
        url = "https://www.klook.com/search/result/?keyword=Rome+tour"
        assert validate_booking_url(url) is False

    def test_rejects_non_string_input(self):
        assert validate_booking_url(123) is False

    def test_valid_url_without_www(self):
        url = "https://viator.com/tours/Rome/Colosseum-Tour/d511-12345"
        assert validate_booking_url(url) is True


class TestProcessPlanActivitiesWithValidation:
    """Test that process_plan_activities validates AI URLs and uses search fallback."""

    def test_keeps_valid_ai_url_with_affiliate_params(self, monkeypatch):
        """Valid AI-provided URLs are kept and get affiliate params added."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-v-123")

        activities = [
            {
                "order": 1,
                "name": "Colosseum Tour",
                "booking_url": "https://www.viator.com/tours/Rome/Colosseum/d511-12345",
            }
        ]

        result = process_plan_activities(activities, port_name="Rome")

        # URL is kept (not replaced with search URL)
        assert "viator.com/tours/Rome/Colosseum/d511-12345" in result[0]["booking_url"]
        # Affiliate params are added
        assert "aid=test-v-123" in result[0]["booking_url"]

    def test_falls_back_to_search_for_invalid_ai_url(self, monkeypatch):
        """Invalid AI URLs (unsupported domain) fall back to search URL."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-v-123")

        activities = [
            {
                "order": 1,
                "name": "City Walk",
                "booking_url": "https://www.fakebooking.com/tour/123",
            }
        ]

        result = process_plan_activities(activities, port_name="Rome")

        assert "viator.com/searchResults/all" in result[0]["booking_url"]
        assert "text=City+Walk+Rome" in result[0]["booking_url"]

    def test_uses_booking_search_term_for_fallback(self, monkeypatch):
        """When AI URL is null, booking_search_term is used for search query."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-v-123")

        activities = [
            {
                "order": 1,
                "name": "Visit Sagrada Familia",
                "booking_url": None,
                "booking_search_term": "Skip the Line Sagrada Familia Guided Tour",
            }
        ]

        result = process_plan_activities(activities, port_name="Barcelona")

        assert "viator.com/searchResults/all" in result[0]["booking_url"]
        # Uses booking_search_term, not the activity name
        assert "Skip+the+Line+Sagrada+Familia+Guided+Tour" in result[0]["booking_url"]

    def test_falls_back_to_name_without_booking_search_term(self, monkeypatch):
        """Without booking_search_term, activity name is used for search query."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-v-123")

        activities = [
            {
                "order": 1,
                "name": "Colosseum Tour",
                "booking_url": None,
            }
        ]

        result = process_plan_activities(activities, port_name="Rome")

        assert "viator.com/searchResults/all" in result[0]["booking_url"]
        assert "text=Colosseum+Tour+Rome" in result[0]["booking_url"]

    def test_mixed_valid_and_invalid_urls(self, monkeypatch):
        """Mix of valid AI URLs and fallback search URLs in the same plan."""
        monkeypatch.setenv("VIATOR_AFFILIATE_ID", "test-v-123")
        monkeypatch.setenv("GETYOURGUIDE_AFFILIATE_ID", "test-gyg-456")
        monkeypatch.delenv("KLOOK_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("TRIPADVISOR_AFFILIATE_ID", raising=False)
        monkeypatch.delenv("BOOKING_AFFILIATE_ID", raising=False)

        activities = [
            {
                "order": 1,
                "name": "Colosseum Tour",
                # Valid Viator URL — kept
                "booking_url": "https://www.viator.com/tours/Rome/Colosseum/d511-12345",
            },
            {
                "order": 2,
                "name": "Walking Tour",
                # Null — fallback to search (round-robin index 1 → GYG)
                "booking_url": None,
                "booking_search_term": "Rome Free Walking Tour",
            },
        ]

        result = process_plan_activities(activities, port_name="Rome")

        # First: valid AI URL kept with affiliate params
        assert "viator.com/tours/Rome/Colosseum/d511-12345" in result[0]["booking_url"]
        assert "aid=test-v-123" in result[0]["booking_url"]

        # Second: fallback search URL on GYG (round-robin idx=1)
        assert "getyourguide.com/s/" in result[1]["booking_url"]
        assert "q=Rome+Free+Walking+Tour" in result[1]["booking_url"]
