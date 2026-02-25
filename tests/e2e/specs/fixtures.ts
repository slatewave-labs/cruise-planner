/**
 * Shared fixtures and helpers for ShoreExplorer E2E tests.
 *
 * Provides:
 * - API route mocking so tests run without a live backend
 * - Test data factories for trips, ports, and plans
 * - TypeScript interfaces for test data shapes
 */
import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface Port {
  port_id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  arrival: string;
  departure: string;
}

export interface Trip {
  trip_id: string;
  ship_name: string;
  cruise_line: string;
  ports: Port[];
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface Activity {
  order: number;
  name: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  cost_estimate: string;
  booking_url: string | null;
  transport_to_next: string;
  travel_time_to_next: string;
  tips: string;
}

export interface Plan {
  plan_id: string;
  trip_id: string;
  port_id: string;
  port_name: string;
  port_country: string;
  generated_at: string;
  preferences: {
    party_type: string;
    activity_level: string;
    transport_mode: string;
    budget: string;
    currency: string;
  };
  weather: {
    temperature: number;
    description: string;
    wind_speed: number;
    precipitation: number;
    weather_code: number;
  };
  plan: {
    plan_title: string;
    summary: string;
    return_by: string;
    total_estimated_cost: string;
    activities: Activity[];
    packing_suggestions: string[];
    safety_tips: string[];
  };
}

export interface PortSuggestion {
  name: string;
  country: string;
  lat: number;
  lng: number;
  region: string;
}

export interface MockOptions {
  trips?: Trip[];
  plans?: Plan[];
  seedTrips?: boolean;
  seedPlans?: boolean;
}

// ---------------------------------------------------------------------------
// Test data constants
// ---------------------------------------------------------------------------

export const VALID_TRIP_ID = 'trip-e2e-001';
export const VALID_PORT_ID = 'port-e2e-001';
export const VALID_PLAN_ID = 'plan-e2e-001';
export const DEVICE_ID = 'e2e-test-device';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/** Factory: a minimal trip object returned by the API */
export function buildTrip(overrides: Partial<Trip> = {}): Trip {
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
export function buildPort(overrides: Partial<Port> = {}): Port {
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
export function buildPlan(overrides: Partial<Plan> = {}): Plan {
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
export function buildPortSuggestions(): PortSuggestion[] {
  return [
    { name: 'Barcelona', country: 'Spain', lat: 41.3784, lng: 2.1925, region: 'Mediterranean' },
    { name: 'Marseille', country: 'France', lat: 43.2965, lng: 5.3698, region: 'Mediterranean' },
    { name: 'Naples', country: 'Italy', lat: 40.8518, lng: 14.2681, region: 'Mediterranean' },
  ];
}

/** Regions list returned by /api/ports/regions */
export function buildRegions(): string[] {
  return ['Mediterranean', 'Caribbean', 'Northern Europe', 'Alaska', 'Asia Pacific'];
}

// ---------------------------------------------------------------------------
// Cookie consent helper — dismiss GDPR banner for tests that skip mockAllApiRoutes
// ---------------------------------------------------------------------------

/**
 * Seeds cookie consent in localStorage so the GDPR cookie banner
 * does not appear and block E2E interactions. Use this in specs
 * that go directly to a page without calling mockAllApiRoutes.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('shoreexplorer_cookie_consent')) {
      window.localStorage.setItem('shoreexplorer_cookie_consent', JSON.stringify({
        essential: true,
        analytics: false,
        thirdParty: false,
        timestamp: new Date().toISOString(),
      }));
    }
  });
}

// ---------------------------------------------------------------------------
// API mock helper — intercepts fetch/XHR to simulate the backend
// ---------------------------------------------------------------------------

/**
 * Sets up route interceptions for all backend API endpoints.
 * The mock returns sensible defaults; individual tests can override
 * specific routes before or after calling this.
 */
export async function mockAllApiRoutes(page: Page, options: MockOptions = {}): Promise<void> {
  const tripWithPort = buildTrip({ ports: [buildPort()] });
  const defaultPlan = buildPlan();
  const trips = options.trips ?? [tripWithPort];
  const plans = options.plans ?? [defaultPlan];
  const seedTrips = options.seedTrips ?? false;
  const seedPlans = options.seedPlans ?? false;
  const seedSignature = JSON.stringify({ seedTrips, seedPlans, trips, plans });

  // Seed localStorage for local-only trip/plan persistence (opt-in).
  // Install once per page to avoid accumulating init scripts.
  const asAnyPage = page as unknown as {
    __seedInstalled?: boolean;
    __seedSignature?: string;
  };
  if (!asAnyPage.__seedInstalled) {
    await page.addInitScript((seed) => {
      if (window.sessionStorage.getItem('__shoreexplorer_e2e_seeded__')) {
        return;
      }
      window.sessionStorage.setItem('__shoreexplorer_e2e_seeded__', '1');

      window.localStorage.removeItem('shoreexplorer_trips');
      window.localStorage.removeItem('shoreexplorer_plans');

      // Always dismiss the GDPR cookie banner so it doesn't block E2E interactions
      if (!window.localStorage.getItem('shoreexplorer_cookie_consent')) {
        window.localStorage.setItem('shoreexplorer_cookie_consent', JSON.stringify({
          essential: true,
          analytics: false,
          thirdParty: false,
          timestamp: new Date().toISOString(),
        }));
      }

      if (seed.seedTrips) {
        const tripStore = Object.fromEntries(seed.trips.map((trip) => [trip.trip_id, trip]));
        window.localStorage.setItem('shoreexplorer_trips', JSON.stringify(tripStore));
      }

      if (seed.seedPlans) {
        const planStore = Object.fromEntries(seed.plans.map((p) => [p.plan_id, p]));
        window.localStorage.setItem('shoreexplorer_plans', JSON.stringify(planStore));
      }
    }, { trips, plans, seedTrips, seedPlans });
    asAnyPage.__seedInstalled = true;
    asAnyPage.__seedSignature = seedSignature;
  } else if (asAnyPage.__seedSignature !== seedSignature) {
    throw new Error(
      'mockAllApiRoutes called with different seed options on the same page. ' +
      'Use one seed setup per test page to avoid flaky localStorage initialization.'
    );
  }

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

  // Generate plan
  await page.route('**/api/plans/generate', async (route) => {
    let payload: Partial<Plan> & { preferences?: Plan['preferences'] } = {};
    try {
      payload = route.request().postDataJSON();
    } catch {
      payload = {};
    }

    if (!payload.trip_id || !payload.port_id) {
      return route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Missing trip_id or port_id in generate-plan payload' }),
      });
    }

    const generatedPlan = buildPlan({
      plan_id: `plan-e2e-${Math.random().toString(16).slice(2, 10)}`,
      trip_id: payload.trip_id,
      port_id: payload.port_id,
      port_name: typeof payload.port_name === 'string' ? payload.port_name : defaultPlan.port_name,
      port_country:
        typeof payload.port_country === 'string'
          ? payload.port_country
          : defaultPlan.port_country,
      preferences: {
        ...defaultPlan.preferences,
        ...(payload.preferences || {}),
      },
    });

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(generatedPlan),
    });
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
