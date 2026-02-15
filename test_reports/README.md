# ShoreExplorer Test Reports

This directory contains comprehensive test reports for the ShoreExplorer application.

## 📊 Quick Access

Open `index.html` in your browser to see the complete test summary.

## Test Coverage Summary

### Backend Tests (Python/pytest)
- **Total Tests:** 60
- **Passing:** 60 (100%)
- **Coverage:** 86%
- **Test Files:**
  - `tests/unit/test_models.py` - Pydantic model validation
  - `tests/unit/test_ports_data.py` - Port database validation
  - `tests/integration/test_trip_crud.py` - Trip CRUD operations
  - `tests/integration/test_port_management.py` - Port management
  - `tests/integration/test_ports_weather.py` - Port search and weather API
  - `tests/integration/test_api_privacy.py` - Device privacy isolation
  - `tests/integration/test_ai_integration.py` - AI plan generation

### Frontend Tests (Jest/React Testing Library)
- **Total Tests:** 33
- **Passing:** 19+ (partial)
- **Coverage:** 
  - Utilities: 89%
  - Components: Partial coverage
- **Test Files:**
  - `frontend/src/__tests__/utils.test.js` - Utility functions
  - `frontend/src/__tests__/WeatherCard.test.js` - WeatherCard component
  - `frontend/src/__tests__/Landing.test.js` - Landing page

## Viewing Reports

### Complete Test Summary
```bash
# From project root
open test_reports/index.html
# Or
xdg-open test_reports/index.html  # Linux
start test_reports/index.html     # Windows
```

### Backend Reports
- **Test Results:** `test_reports/backend_test_report.html`
- **Coverage Report:** `test_reports/backend_coverage/index.html`

### Frontend Reports
- **Coverage Report:** `frontend/coverage/lcov-report/index.html`

## Running Tests

### Backend Tests
```bash
# Run all backend tests
cd /path/to/cruise-planner
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov=backend --cov-report=html --cov-report=term

# Run specific test file
python -m pytest tests/unit/test_models.py -v
```

### Frontend Tests
```bash
# Run all frontend tests
cd frontend
npm test

# Run with coverage
npm test -- --coverage --watchAll=false

# Run in interactive watch mode
npm test
```

## Test Infrastructure

### Backend Testing Stack
- **pytest** - Test framework
- **pytest-asyncio** - Async test support
- **pytest-cov** - Coverage reporting
- **pytest-html** - HTML test reports
- **FastAPI TestClient** - API endpoint testing
- **unittest.mock** - Mocking external dependencies

### Frontend Testing Stack
- **Jest** - Test framework
- **React Testing Library** - Component testing
- **@testing-library/jest-dom** - Custom matchers
- **@testing-library/user-event** - User interaction simulation

## Test Categories

### Unit Tests
Tests individual functions and components in isolation
- Pydantic model validation
- Utility functions (currency, caching, device ID)
- Port data structure validation
- React component rendering

### Integration Tests
Tests API endpoints and interactions
- Trip CRUD operations
- Port management
- Weather API proxy
- AI plan generation
- Device privacy isolation

### Component Tests
Tests React components with user interactions
- Landing page rendering
- WeatherCard display
- Form validation

## Coverage Goals

- **Backend:** ✅ 86% (Target: 80%+)
- **Frontend:** 🟡 Partial (Target: 80%+)
- **Overall:** 🟢 Good base coverage established

## What's Tested

### Backend
✅ All CRUD operations (Create, Read, Update, Delete)
✅ Port search and filtering
✅ Weather API proxy with error handling
✅ AI plan generation with mocked responses
✅ Device privacy isolation
✅ Input validation and edge cases
✅ Error handling (404, 422, 500, 502, 503)

### Frontend
✅ Utility functions (device ID, caching, currency)
✅ Component rendering (Landing, WeatherCard)
🟡 Additional components need more coverage
🟡 User interaction flows
🟡 API integration with mocked endpoints

## Next Steps

To improve coverage further:
1. Add more React component tests (TripSetup, TripDetail, PortPlanner)
2. Add E2E tests with Playwright
3. Add MSW for API mocking in frontend tests
4. Test error boundary components
5. Test responsive design and mobile layouts
6. Add accessibility tests

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:
- Backend tests run with Python 3.12+
- Frontend tests run in Node.js environment
- All tests can run in Docker containers
- HTML reports are generated for artifacts

## Notes

- Tests use mocked external dependencies (MongoDB, Gemini API, Open-Meteo API)
- Device privacy is a critical feature and thoroughly tested
- Edge cases include invalid inputs, missing data, network errors
- All reports are self-contained HTML files for easy sharing
