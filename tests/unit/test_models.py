import sys
import os
import pytest
from datetime import datetime, timedelta
from pydantic import ValidationError

# Add backend directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../backend"))

from server import TripInput, PlanPreferences, GeneratePlanInput, PortInput

def test_trip_input_valid():
    data = {"ship_name": "Wonder of the Seas", "cruise_line": "Royal Caribbean"}
    trip = TripInput(**data)
    assert trip.ship_name == "Wonder of the Seas"
    assert trip.cruise_line == "Royal Caribbean"

def test_trip_input_missing_optional():
    data = {"ship_name": "Icon of the Seas"}
    trip = TripInput(**data)
    assert trip.ship_name == "Icon of the Seas"
    assert trip.cruise_line == ""

def test_trip_input_invalid_missing_required():
    with pytest.raises(ValidationError):
        TripInput()

def test_port_input_valid():
    data = {
        "name": "Barcelona",
        "country": "Spain",
        "latitude": 41.38,
        "longitude": 2.19,
        "arrival": "2027-06-01T08:00:00",
        "departure": "2027-06-01T18:00:00"
    }
    port = PortInput(**data)
    assert port.name == "Barcelona"
    assert port.latitude == 41.38

def test_plan_preferences_defaults():
    data = {
        "party_type": "couple",
        "activity_level": "moderate",
        "transport_mode": "mixed",
        "budget": "medium"
    }
    prefs = PlanPreferences(**data)
    assert prefs.currency == "GBP"  # Default value

def test_generate_plan_input_valid():
    data = {
        "trip_id": "trip123",
        "port_id": "port456",
        "port_name": "Barcelona",
        "port_country": "Spain",
        "latitude": 41.38,
        "longitude": 2.19,
        "arrival": "2027-06-01T08:00:00",
        "departure": "2027-06-01T18:00:00",
        "ship_name": "Test Ship",
        "preferences": {
            "party_type": "solo",
            "activity_level": "intensive",
            "transport_mode": "walking",
            "budget": "free"
        }
    }
    obj = GeneratePlanInput(**data)
    assert obj.trip_id == "trip123"
    assert obj.port_name == "Barcelona"
    assert obj.preferences.party_type == "solo"

def test_plan_preferences_invalid_budget():
    # Pydantic doesn't restrict these strings currently, but if it did this would fail
    # For now, we trust the prompt handles it or we could add Enums
    pass


# --- Arrival/Departure validation tests ---

def _future_dt(hours_from_now=1):
    """Return a datetime string N hours from now."""
    dt = datetime.now() + timedelta(hours=hours_from_now)
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def test_port_input_departure_before_arrival_rejected():
    """Departure before arrival must be rejected."""
    arrival = _future_dt(hours_from_now=2)
    departure = _future_dt(hours_from_now=1)  # 1h before arrival
    with pytest.raises(ValidationError, match="departure must not be before arrival"):
        PortInput(
            name="Barcelona", country="Spain",
            latitude=41.38, longitude=2.19,
            arrival=arrival, departure=departure,
        )


def test_port_input_arrival_too_far_in_past_rejected():
    """Arrival more than 24 hours in the past must be rejected."""
    old_arrival = (datetime.now() - timedelta(hours=25)).strftime("%Y-%m-%dT%H:%M:%S")
    departure = _future_dt(hours_from_now=48)
    with pytest.raises(ValidationError, match="arrival must not be more than 24 hours"):
        PortInput(
            name="Barcelona", country="Spain",
            latitude=41.38, longitude=2.19,
            arrival=old_arrival, departure=departure,
        )


def test_port_input_arrival_within_24h_past_accepted():
    """Arrival within the last 24 hours should be accepted."""
    recent_arrival = (datetime.now() - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%S")
    departure = _future_dt(hours_from_now=6)
    port = PortInput(
        name="Barcelona", country="Spain",
        latitude=41.38, longitude=2.19,
        arrival=recent_arrival, departure=departure,
    )
    assert port.arrival == recent_arrival


def test_port_input_invalid_datetime_format_rejected():
    """Non-ISO datetime strings should be rejected."""
    with pytest.raises(ValidationError, match="valid datetime"):
        PortInput(
            name="Barcelona", country="Spain",
            latitude=41.38, longitude=2.19,
            arrival="not-a-date", departure="also-not-a-date",
        )


def test_port_input_accepts_short_format():
    """Accept YYYY-MM-DDTHH:MM format (without seconds)."""
    arrival = _future_dt(hours_from_now=1)[:16]  # trim to HH:MM
    departure = _future_dt(hours_from_now=5)[:16]
    port = PortInput(
        name="Barcelona", country="Spain",
        latitude=41.38, longitude=2.19,
        arrival=arrival, departure=departure,
    )
    assert port.name == "Barcelona"


def test_generate_plan_input_departure_before_arrival_rejected():
    """GeneratePlanInput also validates departure >= arrival."""
    arrival = _future_dt(hours_from_now=5)
    departure = _future_dt(hours_from_now=1)
    with pytest.raises(ValidationError, match="departure must not be before arrival"):
        GeneratePlanInput(
            trip_id="t1", port_id="p1",
            port_name="Barcelona", port_country="Spain",
            latitude=41.38, longitude=2.19,
            arrival=arrival, departure=departure,
            preferences={
                "party_type": "solo", "activity_level": "light",
                "transport_mode": "walking", "budget": "free",
            },
        )
