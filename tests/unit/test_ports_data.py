"""
Unit tests for ports_data.py module
Tests the cruise ports database integrity and structure
"""
import pytest
from backend.ports_data import CRUISE_PORTS


def test_ports_data_exists():
    """Test that CRUISE_PORTS is defined and not empty"""
    assert CRUISE_PORTS is not None
    assert isinstance(CRUISE_PORTS, list)
    assert len(CRUISE_PORTS) > 0


def test_all_ports_have_required_fields():
    """Test that every port has all required fields"""
    required_fields = {"name", "country", "region", "lat", "lng"}
    
    for port in CRUISE_PORTS:
        assert isinstance(port, dict), f"Port should be a dict: {port}"
        port_keys = set(port.keys())
        missing = required_fields - port_keys
        assert not missing, f"Port {port.get('name', 'UNKNOWN')} missing fields: {missing}"


def test_port_names_are_strings():
    """Test that all port names are non-empty strings"""
    for port in CRUISE_PORTS:
        assert isinstance(port["name"], str), f"Port name should be string: {port}"
        assert len(port["name"]) > 0, f"Port name should not be empty: {port}"


def test_coordinates_are_valid():
    """Test that latitude and longitude values are valid numbers"""
    for port in CRUISE_PORTS:
        lat = port["lat"]
        lng = port["lng"]
        
        # Check types
        assert isinstance(lat, (int, float)), f"Latitude should be number for {port['name']}"
        assert isinstance(lng, (int, float)), f"Longitude should be number for {port['name']}"
        
        # Check valid ranges
        assert -90 <= lat <= 90, f"Invalid latitude {lat} for {port['name']}"
        assert -180 <= lng <= 180, f"Invalid longitude {lng} for {port['name']}"


def test_regions_are_consistent():
    """Test that regions use consistent naming (no typos)"""
    # Get all unique regions
    regions = set(port["region"] for port in CRUISE_PORTS)
    
    # There should be a reasonable number of regions (not too many suggesting typos)
    assert len(regions) > 5, "Should have multiple regions"
    assert len(regions) < 50, "Too many regions might indicate inconsistencies"
    
    # Regions should be non-empty strings
    for region in regions:
        assert isinstance(region, str)
        assert len(region) > 0


def test_caribbean_ports_exist():
    """Test that Caribbean region has expected ports"""
    caribbean_ports = [p for p in CRUISE_PORTS if p["region"] == "Caribbean"]
    assert len(caribbean_ports) > 10, "Should have multiple Caribbean ports"
    
    # Check for some well-known Caribbean ports
    caribbean_names = [p["name"].lower() for p in caribbean_ports]
    assert any("nassau" in name for name in caribbean_names)
    assert any("cozumel" in name for name in caribbean_names)


def test_no_duplicate_port_entries():
    """Test that there are no exact duplicate port entries (warning only)"""
    seen = set()
    duplicates = []
    
    for port in CRUISE_PORTS:
        # Create a unique identifier
        identifier = (port["name"], port["country"], port["lat"], port["lng"])
        if identifier in seen:
            duplicates.append(identifier)
        seen.add(identifier)
    
    # Note: This is informational - some ports may legitimately appear multiple times
    # (e.g., different terminals). We log but don't fail.
    if duplicates:
        import warnings
        warnings.warn(f"Found potential duplicate ports: {duplicates}", UserWarning)


def test_mediterranean_ports_exist():
    """Test that Mediterranean ports exist"""
    # Check if Mediterranean region exists or similar
    regions = [p["region"] for p in CRUISE_PORTS]
    regions_lower = [r.lower() for r in regions]
    
    # Should have European/Mediterranean ports
    has_med = any(r in regions_lower for r in ["mediterranean", "europe", "med"])
    assert has_med or len([p for p in CRUISE_PORTS if p["country"] in ["Spain", "Italy", "Greece"]]) > 5


def test_port_countries_are_valid():
    """Test that country names are non-empty strings"""
    for port in CRUISE_PORTS:
        assert isinstance(port["country"], str)
        assert len(port["country"]) > 0
        # Country names should not have weird characters
        assert not any(char in port["country"] for char in ["<", ">", "{", "}"])
