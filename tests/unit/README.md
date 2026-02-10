# TODO: Unit Tests for ShoreExplorer

## Backend Unit Tests (pytest)
```bash
pip install pytest pytest-asyncio httpx
```

### Test Files to Create:
- `test_trips.py` - Trip CRUD operations
- `test_ports.py` - Port management within trips
- `test_weather.py` - Weather API proxy (mock Open-Meteo responses)
- `test_plans.py` - Plan generation and retrieval (mock Gemini responses)

### Example Test Structure:
```python
# TODO: test_trips.py
import pytest
from httpx import AsyncClient, ASGITransport
from server import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_create_trip(client):
    response = await client.post("/api/trips", json={
        "ship_name": "Test Ship",
        "cruise_line": "Test Line"
    })
    assert response.status_code == 200
    assert response.json()["ship_name"] == "Test Ship"

@pytest.mark.asyncio
async def test_list_trips(client):
    response = await client.get("/api/trips")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

## Frontend Unit Tests (React Testing Library)
```bash
yarn add --dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Test Files to Create:
- `Landing.test.js` - Landing page renders correctly
- `TripSetup.test.js` - Form validation and submission
- `PortPlanner.test.js` - Preference selection
- `WeatherCard.test.js` - Weather display with various codes
- `ActivityCard.test.js` - Activity rendering with all fields
- `MapView.test.js` - Map rendering with markers
