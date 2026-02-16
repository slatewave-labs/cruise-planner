#!/usr/bin/env python3
"""
Demo script to show affiliate link functionality.

This script demonstrates how booking URLs are processed to add affiliate
parameters when affiliate IDs are configured.
"""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from affiliate_config import add_affiliate_params, process_plan_activities


def demo_url_processing():
    """Demonstrate URL processing with and without affiliate configuration."""
    print("=" * 70)
    print("AFFILIATE LINK DEMO")
    print("=" * 70)
    print()

    # Example URLs
    test_urls = [
        ("Viator", "https://www.viator.com/tours/Rome/Colosseum-Tour/d511-12345"),
        (
            "GetYourGuide",
            "https://www.getyourguide.com/barcelona-l45/sagrada-familia/12345",
        ),
        ("Klook", "https://www.klook.com/activity/12345-singapore-gardens"),
        ("TripAdvisor", "https://www.tripadvisor.com/Attraction_Review-g187147"),
        ("Booking.com", "https://www.booking.com/hotel/it/rome-hotel.html"),
        (
            "Unknown Provider",
            "https://example.com/tour/123",
        ),  # No affiliate program
    ]

    # Test without affiliate IDs
    print("1. WITHOUT AFFILIATE IDs CONFIGURED")
    print("-" * 70)
    for name, url in test_urls:
        result = add_affiliate_params(url)
        changed = "✓ Modified" if result != url else "✗ Unchanged"
        print(f"{name:20s} {changed}")
        if result != url:
            print(f"  Original: {url}")
            print(f"  Result:   {result}")
        print()

    # Test with affiliate IDs
    print("\n2. WITH AFFILIATE IDs CONFIGURED")
    print("-" * 70)
    os.environ["VIATOR_AFFILIATE_ID"] = "demo-viator-123"
    os.environ["GETYOURGUIDE_AFFILIATE_ID"] = "demo-gyg-456"
    os.environ["KLOOK_AFFILIATE_ID"] = "demo-klook-789"
    os.environ["TRIPADVISOR_AFFILIATE_ID"] = "demo-ta-abc"
    os.environ["BOOKING_AFFILIATE_ID"] = "demo-booking-xyz"

    for name, url in test_urls:
        result = add_affiliate_params(url)
        changed = "✓ Modified" if result != url else "✗ Unchanged"
        print(f"{name:20s} {changed}")
        print(f"  Original: {url}")
        print(f"  Result:   {result}")
        print()


def demo_plan_processing():
    """Demonstrate processing of a complete day plan."""
    print("\n3. PROCESSING A COMPLETE DAY PLAN")
    print("-" * 70)

    # Ensure affiliate IDs are set
    os.environ["VIATOR_AFFILIATE_ID"] = "demo-viator-123"
    os.environ["GETYOURGUIDE_AFFILIATE_ID"] = "demo-gyg-456"

    # Sample activities from a day plan
    activities = [
        {
            "order": 1,
            "name": "Colosseum Guided Tour",
            "booking_url": "https://www.viator.com/tours/Rome/Colosseum/d511-12345",
        },
        {
            "order": 2,
            "name": "Vatican Museums",
            "booking_url": "https://www.getyourguide.com/rome-l33/vatican/67890",
        },
        {
            "order": 3,
            "name": "Free Walking Tour",
            "booking_url": None,  # Free activity, no booking URL
        },
    ]

    print("Original activities:")
    for activity in activities:
        print(f"  {activity['order']}. {activity['name']}")
        if activity["booking_url"]:
            print(f"     URL: {activity['booking_url']}")
        else:
            print(f"     URL: (none)")

    # Process activities
    processed = process_plan_activities(activities)

    print("\nProcessed activities (with affiliate params):")
    for activity in processed:
        print(f"  {activity['order']}. {activity['name']}")
        if activity["booking_url"]:
            print(f"     URL: {activity['booking_url']}")
            # Show what changed
            original = activities[activity["order"] - 1]["booking_url"]
            if original and activity["booking_url"] != original:
                print(f"     ✓ Affiliate params added")
        else:
            print(f"     URL: (none)")


if __name__ == "__main__":
    demo_url_processing()
    demo_plan_processing()

    print("\n" + "=" * 70)
    print("DEMO COMPLETE")
    print("=" * 70)
    print("\nTo enable affiliate links in production:")
    print("1. Sign up for affiliate programs (see AFFILIATE_LINKS.md)")
    print("2. Set environment variables with your affiliate IDs")
    print("3. Restart the backend server")
    print("4. Generated plans will automatically include affiliate links")
