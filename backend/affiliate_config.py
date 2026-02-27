"""
Affiliate link configuration and URL wrapper for monetization.

This module provides functionality to wrap booking URLs with affiliate tracking
parameters for supported booking platforms. When users book via these links,
the application owner receives commission.
"""

import logging
import os
from typing import Optional
from urllib.parse import parse_qs, quote_plus, urlencode, urlparse, urlunparse

logger = logging.getLogger(__name__)


def get_affiliate_config(domain: str) -> Optional[dict]:
    """
    Get affiliate configuration for a specific domain.

    This function reads environment variables at runtime to support
    dynamic configuration.

    Args:
        domain: The domain to get configuration for (e.g., 'viator.com')

    Returns:
        Dictionary of affiliate parameters if configured, None otherwise
    """
    # Affiliate partner configuration
    # Format: {"domain": {"param_name": "param_value" or env_var_name}}
    affiliate_partners = {
        "viator.com": {
            "aid": os.environ.get("VIATOR_AFFILIATE_ID", ""),
            "mcid": "cruise-planner-app",
        },
        "getyourguide.com": {
            "partner_id": os.environ.get("GETYOURGUIDE_AFFILIATE_ID", ""),
            "utm_source": "cruise-planner",
            "utm_medium": "affiliate",
        },
        "klook.com": {
            "affiliate_id": os.environ.get("KLOOK_AFFILIATE_ID", ""),
            "source": "cruise-planner",
        },
        "tripadvisor.com": {
            "pid": os.environ.get("TRIPADVISOR_AFFILIATE_ID", ""),
            "source": "cruise-planner",
        },
        "booking.com": {
            "aid": os.environ.get("BOOKING_AFFILIATE_ID", ""),
            "label": "cruise-planner-booking",
        },
    }

    # Check if domain is in partners (exact match or ends with partner domain)
    for partner_domain, config in affiliate_partners.items():
        if domain == partner_domain or domain.endswith("." + partner_domain):
            return config

    return None


def get_domain_from_url(url: str) -> Optional[str]:
    """
    Extract the base domain from a URL.

    Args:
        url: The URL to parse

    Returns:
        The base domain (e.g., 'viator.com') or None if invalid
    """
    if not url:
        return None

    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()

        if not domain:
            return None

        # Remove www. prefix if present
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception as e:
        logger.warning(f"Failed to parse domain from URL {url}: {str(e)}")
        return None


def add_affiliate_params(url: str) -> str:
    """
    Add affiliate tracking parameters to a booking URL if the domain is supported.

    Args:
        url: Original booking URL from AI-generated plan

    Returns:
        URL with affiliate parameters added, or original URL if not supported
    """
    if not url or not isinstance(url, str):
        return url

    # Get domain from URL
    domain = get_domain_from_url(url)
    if not domain:
        return url

    # Check if we have affiliate configuration for this domain
    affiliate_config = get_affiliate_config(domain)

    if not affiliate_config:
        # No affiliate program for this domain - return original URL
        return url

    # Filter out empty affiliate IDs (not configured)
    active_params = {
        key: value for key, value in affiliate_config.items() if value and value.strip()
    }

    if not active_params:
        # No affiliate IDs configured for this partner - return original URL
        logger.debug(f"Affiliate partner {domain} configured but no IDs set")
        return url

    try:
        # Parse the URL
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query, keep_blank_values=True)

        # Flatten query params (parse_qs returns lists)
        flat_params = {
            k: v[0] if isinstance(v, list) else v for k, v in query_params.items()
        }

        # Add affiliate parameters (don't override existing params)
        for key, value in active_params.items():
            if key not in flat_params:
                flat_params[key] = value

        # Rebuild URL with affiliate params
        new_query = urlencode(flat_params)
        affiliate_url = urlunparse(
            (
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                new_query,
                parsed.fragment,
            )
        )

        logger.info(f"Added affiliate params to {domain} URL")
        return affiliate_url

    except Exception as e:
        logger.error(f"Failed to add affiliate params to URL {url}: {str(e)}")
        # Return original URL if processing fails
        return url



# Search URL templates for supported booking platforms.
# Used to generate valid search URLs instead of relying on AI-hallucinated links.
SEARCH_URL_TEMPLATES = {
    "viator.com": "https://www.viator.com/searchResults/all?text={query}",
    "getyourguide.com": "https://www.getyourguide.com/s/?q={query}",
    "klook.com": "https://www.klook.com/search/result/?keyword={query}",
    "tripadvisor.com": "https://www.tripadvisor.com/Search?q={query}",
    "booking.com": "https://www.booking.com/searchresults.html?ss={query}",
}

# Priority order for selecting a booking platform
PLATFORM_PRIORITY = [
    "viator.com",
    "getyourguide.com",
    "klook.com",
    "tripadvisor.com",
    "booking.com",
]


# Maps each domain to its primary affiliate ID environment variable name
AFFILIATE_ENV_VARS = {
    "viator.com": "VIATOR_AFFILIATE_ID",
    "getyourguide.com": "GETYOURGUIDE_AFFILIATE_ID",
    "klook.com": "KLOOK_AFFILIATE_ID",
    "tripadvisor.com": "TRIPADVISOR_AFFILIATE_ID",
    "booking.com": "BOOKING_AFFILIATE_ID",
}


def generate_booking_search_url(
    activity_name: str, port_name: str
) -> Optional[str]:
    """
    Generate a valid search URL on the first configured booking platform.

    AI models cannot generate real booking URLs (they hallucinate fake ones that 404).
    Instead, we construct search URLs that lead to real search results pages.

    Args:
        activity_name: Name of the activity to search for
        port_name: Name of the port/city for search context

    Returns:
        A search URL with affiliate params, or None if no platform is configured
    """
    if not activity_name or not port_name:
        return None

    for domain in PLATFORM_PRIORITY:
        # Only use platforms where the affiliate ID env var is actually set
        env_var = AFFILIATE_ENV_VARS.get(domain, "")
        affiliate_id = os.environ.get(env_var, "").strip() if env_var else ""
        if not affiliate_id:
            continue

        template = SEARCH_URL_TEMPLATES.get(domain)
        if not template:
            continue

        # Build search query from activity name and port
        query = quote_plus(f"{activity_name} {port_name}")
        search_url = template.format(query=query)
        # Add affiliate params to the search URL
        return add_affiliate_params(search_url)

    return None


def process_plan_activities(activities: list, port_name: str = "") -> list:
    """
    Process all activities in a plan to generate valid booking search URLs.

    AI models hallucinate specific booking URLs that always 404. Instead, this
    function generates search URLs on real booking platforms based on the
    activity name and port, then adds affiliate tracking parameters.

    Args:
        activities: List of activity dictionaries from AI-generated plan
        port_name: Name of the port/city for building search URLs

    Returns:
        Activities with valid booking search URLs
    """
    if not activities or not isinstance(activities, list):
        return activities

    processed_activities = []
    for activity in activities:
        # Create a copy to avoid modifying the original
        processed_activity = activity.copy()

        # Replace any AI-generated booking_url with a valid search URL
        activity_name = processed_activity.get("name", "")
        if activity_name and port_name:
            search_url = generate_booking_search_url(activity_name, port_name)
            processed_activity["booking_url"] = search_url

        processed_activities.append(processed_activity)

    return processed_activities
