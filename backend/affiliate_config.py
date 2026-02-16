"""
Affiliate link configuration and URL wrapper for monetization.

This module provides functionality to wrap booking URLs with affiliate tracking
parameters for supported booking platforms. When users book via these links,
the application owner receives commission.
"""

import logging
import os
from typing import Optional
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

logger = logging.getLogger(__name__)


def get_affiliate_config(domain: str) -> Optional[dict]:
    """
    Get affiliate configuration for a specific domain.

    This function reads environment variables at runtime to support dynamic configuration.

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


def process_plan_activities(activities: list) -> list:
    """
    Process all activities in a plan to add affiliate parameters to booking URLs.

    Args:
        activities: List of activity dictionaries from AI-generated plan

    Returns:
        Activities with affiliate-wrapped booking URLs
    """
    if not activities or not isinstance(activities, list):
        return activities

    processed_activities = []
    for activity in activities:
        # Create a copy to avoid modifying the original
        processed_activity = activity.copy()

        # Process booking_url if it exists
        if "booking_url" in processed_activity and processed_activity["booking_url"]:
            original_url = processed_activity["booking_url"]
            processed_activity["booking_url"] = add_affiliate_params(original_url)

        processed_activities.append(processed_activity)

    return processed_activities
