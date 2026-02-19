/**
 * Shared fixtures and helpers for ShoreExplorer E2E tests.
 *
 * Provides:
 * - API route mocking so tests run without a live backend
 * - Test data factories for trips, ports, and plans
 */
const { test: base, expect } = require('@playwright/test');

// ---------------------------------------------------------------------------
// Test data constants
// ---------------------------------------------------------------------------

const VALID_TRIP_ID = 'trip-e2e-001';
const VALID_PORT_ID = 'port-e2e-001';
const VALID_PLAN_ID = 'plan-e2e-001';
const DEVICE_ID = 'e2e-test-device';

/** Factory: a minimal trip object returned by the API */
function buildTrip(overrides = {}) {
  return {
    trip_id: VALID_TRIP_ID,
    ship_name: 'Symphony of the Seas',
    cruise_line: 'Royal Caribbean',
    ports: [],
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

/** Factory: a port object embedded in a trip */
function buildPort(overrides = {}) {
  return {
    port_id: VALID_PORT_ID,
    name: 'Barcelona',
    country: 'Spain',
    latitude: 41.3784,
    longitude: 2.1925,
    arrival: '2026-03-10T08:00:00',
    departure: '2026-03-10T18:00:00',
    ...overrides,
  };
}

/** Factory: a generated day plan */
function buildPlan(overrides = {}) {
  return {
    plan_id: VALID_PLAN_ID,
    trip_id: VALID_TRIP_ID,
    port_id: VALID_PORT_ID,
    port_name: 'Barcelona',
    port_country: 'Spain',
    generated_at: '2026-01-16T12:00:00Z',
    preferences: {
      party_type: 'couple',
      activity_level: 'moderate',
      transport_mode: 'mixed',
      budget: 'low',
      currency: 'GBP',
    },
    weather: {
      temperature: 22,
      description: 'Partly cloudy',
      wind_speed: 12,
      precipitation: 0,
      weather_code: 2,
    },
    plan: {
      plan_title: 'Barcelona Highlights',
      summary: 'A wonderful day exploring the Gothic Quarter and waterfront.',
      return_by: '17:00',
      total_estimated_cost: '£45',
      activities: [
        {
          order: 1,
          name: 'La Rambla Walk',
          description: 'Stroll down the famous La Rambla boulevard.',
          location: 'La Rambla, Barcelona',
          latitude: 41.3797,
          longitude: 2.1746,
          start_time: '09:00',
          end_time: '09:45',
          duration_minutes: 45,
          cost_estimate: 'Free',
          booking_url: null,
          transport_to_next: 'Walk',
          travel_time_to_next: '5 mins',
          tips: 'Start early to avoid crowds.',
        },
        {
          order: 2,
          name: 'Gothic Quarter',
          description: 'Explore the medieval streets of the Barri Gòtic.',
          location: 'Barri Gòtic, Barcelona',
          latitude: 41.3833,
          longitude: 2.1761,
          start_time: '10:00',
          end_time: '11:30',
          duration_minutes: 90,
          cost_estimate: 'Free',
          booking_url: null,
          transport_to_next: 'Walk',
          travel_time_to_next: '10 mins',
          tips: 'Look out for Roman ruins.',
        },
        {
          order: 3,
          name: 'Lunch at La Boqueria',
          description: 'Fresh tapas at the famous market.',
          location: 'La Boqueria Market, La Rambla',
          latitude: 41.3816,
          longitude: 2.1719,
          start_time: '12:00',
          end_time: '13:00',
          duration_minutes: 60,
          cost_estimate: '~£20',
          booking_url: null,
          transport_to_next: 'Walk',
          travel_time_to_next: '15 mins',
          tips: 'Try the fresh fruit juices.',
        },
        {
          order: 4,
          name: 'Barceloneta Beach',
          description: 'Relax on the beach and enjoy the sea breeze.',
          location: 'Barceloneta Beach',
          latitude: 41.3782,
          longitude: 2.1925,
          start_time: '14:00',
          end_time: '15:30',
          duration_minutes: 90,
          cost_estimate: 'Free',
          booking_url: null,
          transport_to_next: 'Walk',
          travel_time_to_next: '20 mins',
          tips: 'Bring sunscreen.',
        },
      ],
      packing_suggestions: ['Sunscreen', 'Comfortable walking shoes', 'Water bottle'],
      safety_tips: ['Watch for pickpockets on La Rambla', 'Stay hydrated'],
    },
    ...overrides,
  };
}

/** Port search suggestions returned by /api/ports/search */
function buildPortSuggestions() {
  return [
    { name: 'Barcelona', country: 'Spain', lat: 41.3784, lng: 2.1925, region: 'Mediterranean' },
    { name: 'Marseille', country: 'France', lat: 43.2965, lng: 5.3698, region: 'Mediterranean' },
    { name: 'Naples', country: 'Italy', lat: 40.8518, lng: 14.2681, region: 'Mediterranean' },
  ];
}

/** Regions list returned by /api/ports/regions */
function buildRegions() {
  return ['Mediterranean', 'Caribbean', 'Northern Europe', 'Alaska', 'Asia Pacific'];
}

// ---------------------------------------------------------------------------
// API mock helper — intercepts fetch/XHR to simulate the backend
// ---------------------------------------------------------------------------

/**
 * Sets up route interceptions for all backend API endpoints.
 * The mock returns sensible defaults; individual tests can override
 * specific routes before or after calling this.
 */
async function mockAllApiRoutes(page, options = {}) {
  const tripWithPort = buildTrip({ ports: [buildPort()] });
  const plan = buildPlan();
  const trips = options.trips ?? [tripWithPort];

  // Health
  await page.route('**/api/health', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'healthy' }) })
  );

  // Ports search
  await page.route('**/api/ports/search*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(buildPortSuggestions()) })
  );

  // Regions
  await page.route('**/api/ports/regions', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(buildRegions()) })
  );

  // List trips
  await page.route('**/api/trips', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(trips) });
    }
    // POST — create trip
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ trip_id: VALID_TRIP_ID, message: 'Trip created' }),
    });
  });

  // Single trip (GET / PUT / DELETE)
  await page.route(/\/api\/trips\/[^/]+$/, (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tripWithPort) });
    }
    if (method === 'PUT') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Trip updated' }) });
    }
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Trip deleted' }) });
    }
    return route.continue();
  });

  // Add port to trip
  await page.route(/\/api\/trips\/[^/]+\/ports$/, (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ port_id: VALID_PORT_ID, message: 'Port added' }),
      });
    }
    return route.continue();
  });

  // Update / delete port
  await page.route(/\/api\/trips\/[^/]+\/ports\/[^/]+$/, (route) => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  });

  // Generate plan
  await page.route('**/api/plans/generate', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(plan) })
  );

  // Get plan (must NOT match /api/plans/generate)
  await page.route(/\/api\/plans\/(?!generate)[^/]+$/, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(plan) });
    }
    return route.continue();
  });

  // Weather
  await page.route('**/api/weather*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ temperature: 22, description: 'Partly cloudy', wind_speed: 12, precipitation: 0, weather_code: 2 }),
    })
  );
}

module.exports = {
  VALID_TRIP_ID,
  VALID_PORT_ID,
  VALID_PLAN_ID,
  DEVICE_ID,
  buildTrip,
  buildPort,
  buildPlan,
  buildPortSuggestions,
  buildRegions,
  mockAllApiRoutes,
};
