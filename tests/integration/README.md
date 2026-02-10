# TODO: Integration Tests for ShoreExplorer

## PACT Contract Testing

### Overview
PACT tests verify that the frontend (consumer) and backend (provider) agree on API contracts.

### Setup
```bash
# Backend (Provider)
pip install pact-python

# Frontend (Consumer)  
yarn add --dev @pact-foundation/pact
```

### Contracts to Test

#### 1. Trip Management
- `GET /api/trips` → Returns array of trips
- `POST /api/trips` → Creates trip, returns trip object
- `GET /api/trips/:id` → Returns single trip with ports
- `PUT /api/trips/:id` → Updates trip
- `DELETE /api/trips/:id` → Deletes trip

#### 2. Port Management
- `POST /api/trips/:id/ports` → Adds port to trip
- `PUT /api/trips/:id/ports/:portId` → Updates port
- `DELETE /api/trips/:id/ports/:portId` → Removes port

#### 3. Weather API
- `GET /api/weather?latitude=X&longitude=Y&date=Z` → Returns weather data

#### 4. Plan Generation
- `POST /api/plans/generate` → Generates day plan (may take 15-30s)
- `GET /api/plans/:id` → Returns saved plan

### External API Integration Tests
- Open-Meteo weather API connectivity
- Gemini 3 Flash LLM API connectivity
- Response format validation

### PACT Broker (TODO)
- Set up Pactflow or self-hosted PACT Broker
- URL: https://pactflow.io/ (free tier: 5 integrations)
