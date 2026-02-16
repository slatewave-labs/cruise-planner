import sys
import os
import pytest
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
        "arrival": "2023-10-01T08:00:00",
        "departure": "2023-10-01T18:00:00"
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
        "preferences": {
            "party_type": "solo",
            "activity_level": "intensive",
            "transport_mode": "walking",
            "budget": "free"
        }
    }
    obj = GeneratePlanInput(**data)
    assert obj.trip_id == "trip123"
    assert obj.preferences.party_type == "solo"

def test_plan_preferences_invalid_budget():
    # Pydantic doesn't restrict these strings currently, but if it did this would fail
    # For now, we trust the prompt handles it or we could add Enums
    pass
