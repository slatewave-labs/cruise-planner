# Integration Tests

> Last updated: 2026-02-19

Integration tests for ShoreExplorer API endpoints using **pytest**. Tests run against a live FastAPI server with DynamoDB Local.

## Test Files

| File | What It Tests |
|------|---------------|
| `test_trip_crud.py` | Trip create, read, update, delete operations |
| `test_port_management.py` | Add, update, remove ports within trips |
| `test_ports_weather.py` | Port search API and weather forecast proxy |
| `test_ai_integration.py` | AI plan generation endpoint (mocked LLM) |
| `test_affiliate_integration.py` | Affiliate link injection in plans |
| `test_api_privacy.py` | Device-based data isolation (multi-tenancy) |

## Running Tests

```bash
# Start DynamoDB Local first
docker run -d -p 8000:8000 amazon/dynamodb-local

# Run integration tests
cd /path/to/cruise-planner
python -m pytest tests/integration/ -v
```

## CI

Integration tests run automatically in CI with DynamoDB Local started via Docker. See `.github/workflows/ci.yml` for the full configuration.
