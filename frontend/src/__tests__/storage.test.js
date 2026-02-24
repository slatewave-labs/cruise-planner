/**
 * Unit tests for localStorage-based storage module (storage.js).
 * Tests trip/plan CRUD, cascade deletions, and prototype-pollution guards.
 */
import {
  createTrip,
  listTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  addPort,
  updatePort,
  deletePort,
  savePlan,
  getPlan,
  getPlansForTrip,
  getPlansForPort,
  getPlanCountForTrip,
} from '../storage';

let testStore = {};

describe('Trip CRUD', () => {
  beforeEach(() => {
    testStore = {};
    jest.clearAllMocks();
    localStorage.getItem.mockImplementation(key => testStore[key] || null);
    localStorage.setItem.mockImplementation((key, value) => {
      testStore[key] = value.toString();
    });
    localStorage.removeItem.mockImplementation(key => {
      delete testStore[key];
    });
  });

  test('createTrip returns a trip with id and timestamps', () => {
    const trip = createTrip({ ship_name: 'Test Ship', cruise_line: 'Royal' });
    expect(trip.trip_id).toBeDefined();
    expect(trip.ship_name).toBe('Test Ship');
    expect(trip.cruise_line).toBe('Royal');
    expect(trip.ports).toEqual([]);
    expect(trip.created_at).toBeDefined();
    expect(trip.updated_at).toBeDefined();
    expect(trip.expires_at).toBeUndefined();
  });

  test('listTrips returns all trips', () => {
    createTrip({ ship_name: 'Ship A' });
    createTrip({ ship_name: 'Ship B' });
    const trips = listTrips();
    expect(trips).toHaveLength(2);
    const names = trips.map(t => t.ship_name).sort();
    expect(names).toEqual(['Ship A', 'Ship B']);
  });

  test('getTrip retrieves by ID', () => {
    const trip = createTrip({ ship_name: 'Find Me' });
    const found = getTrip(trip.trip_id);
    expect(found).not.toBeNull();
    expect(found.ship_name).toBe('Find Me');
  });

  test('getTrip returns null for unknown ID', () => {
    expect(getTrip('nonexistent')).toBeNull();
  });

  test('updateTrip modifies fields', () => {
    const trip = createTrip({ ship_name: 'Old Name' });
    const updated = updateTrip(trip.trip_id, { ship_name: 'New Name' });
    expect(updated.ship_name).toBe('New Name');
    expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(trip.updated_at).getTime()
    );
  });

  test('updateTrip returns null for unknown ID', () => {
    expect(updateTrip('nonexistent', { ship_name: 'X' })).toBeNull();
  });

  test('deleteTrip removes trip and returns true', () => {
    const trip = createTrip({ ship_name: 'Bye' });
    expect(deleteTrip(trip.trip_id)).toBe(true);
    expect(getTrip(trip.trip_id)).toBeNull();
  });

  test('deleteTrip returns false for unknown ID', () => {
    expect(deleteTrip('nonexistent')).toBe(false);
  });
});

describe('Port CRUD', () => {
  beforeEach(() => {
    testStore = {};
    jest.clearAllMocks();
    localStorage.getItem.mockImplementation(key => testStore[key] || null);
    localStorage.setItem.mockImplementation((key, value) => {
      testStore[key] = value.toString();
    });
  });

  const portData = {
    name: 'Barcelona',
    country: 'Spain',
    latitude: 41.38,
    longitude: 2.19,
    arrival: '2023-10-01T08:00:00',
    departure: '2023-10-01T18:00:00',
  };

  test('addPort adds a port with ID', () => {
    const trip = createTrip({ ship_name: 'Ship' });
    const port = addPort(trip.trip_id, portData);
    expect(port).not.toBeNull();
    expect(port.port_id).toBeDefined();
    expect(port.name).toBe('Barcelona');
    const refreshed = getTrip(trip.trip_id);
    expect(refreshed.ports).toHaveLength(1);
  });

  test('addPort returns null for unknown trip', () => {
    expect(addPort('nonexistent', portData)).toBeNull();
  });

  test('updatePort modifies port fields', () => {
    const trip = createTrip({ ship_name: 'Ship' });
    const port = addPort(trip.trip_id, portData);
    const ok = updatePort(trip.trip_id, port.port_id, {
      ...portData,
      name: 'Madrid',
    });
    expect(ok).toBe(true);
    const refreshed = getTrip(trip.trip_id);
    expect(refreshed.ports[0].name).toBe('Madrid');
  });

  test('deletePort removes port', () => {
    const trip = createTrip({ ship_name: 'Ship' });
    const port = addPort(trip.trip_id, portData);
    expect(deletePort(trip.trip_id, port.port_id)).toBe(true);
    const refreshed = getTrip(trip.trip_id);
    expect(refreshed.ports).toHaveLength(0);
  });

  test('deletePort returns false for unknown port', () => {
    const trip = createTrip({ ship_name: 'Ship' });
    expect(deletePort(trip.trip_id, 'nonexistent')).toBe(false);
  });
});

describe('Plan Storage', () => {
  beforeEach(() => {
    testStore = {};
    jest.clearAllMocks();
    localStorage.getItem.mockImplementation(key => testStore[key] || null);
    localStorage.setItem.mockImplementation((key, value) => {
      testStore[key] = value.toString();
    });
  });

  const mockPlan = {
    plan_id: 'plan-1',
    trip_id: 'trip-1',
    port_id: 'port-1',
    plan: { plan_title: 'Test', activities: [] },
    generated_at: new Date().toISOString(),
  };

  test('savePlan and getPlan round-trip', () => {
    savePlan(mockPlan);
    const found = getPlan('plan-1');
    expect(found).toEqual(mockPlan);
  });

  test('getPlan returns null for unknown', () => {
    expect(getPlan('nonexistent')).toBeNull();
  });

  test('getPlansForTrip filters by trip', () => {
    savePlan(mockPlan);
    savePlan({ ...mockPlan, plan_id: 'plan-2', trip_id: 'trip-other' });
    const plans = getPlansForTrip('trip-1');
    expect(plans).toHaveLength(1);
    expect(plans[0].plan_id).toBe('plan-1');
  });

  test('getPlansForPort filters by trip and port', () => {
    savePlan(mockPlan);
    savePlan({ ...mockPlan, plan_id: 'plan-2', port_id: 'port-other' });
    const plans = getPlansForPort('trip-1', 'port-1');
    expect(plans).toHaveLength(1);
  });

  test('getPlanCountForTrip returns count', () => {
    savePlan(mockPlan);
    savePlan({ ...mockPlan, plan_id: 'plan-2' });
    expect(getPlanCountForTrip('trip-1')).toBe(2);
  });
});

describe('Prototype Pollution Guards', () => {
  beforeEach(() => {
    testStore = {};
    jest.clearAllMocks();
    localStorage.getItem.mockImplementation(key => testStore[key] || null);
    localStorage.setItem.mockImplementation((key, value) => {
      testStore[key] = value.toString();
    });
  });

  test('getTrip rejects __proto__ key', () => {
    expect(getTrip('__proto__')).toBeNull();
  });

  test('updateTrip rejects __proto__ key', () => {
    expect(updateTrip('__proto__', { ship_name: 'X' })).toBeNull();
  });

  test('deleteTrip rejects constructor key', () => {
    expect(deleteTrip('constructor')).toBe(false);
  });

  test('addPort rejects prototype key', () => {
    expect(addPort('prototype', { name: 'X' })).toBeNull();
  });

  test('getPlan rejects __proto__ key', () => {
    expect(getPlan('__proto__')).toBeNull();
  });
});

describe('Cascade Deletion', () => {
  beforeEach(() => {
    testStore = {};
    jest.clearAllMocks();
    localStorage.getItem.mockImplementation(key => testStore[key] || null);
    localStorage.setItem.mockImplementation((key, value) => {
      testStore[key] = value.toString();
    });
  });

  test('deleteTrip removes associated plans', () => {
    const trip = createTrip({ ship_name: 'Ship' });
    savePlan({
      plan_id: 'plan-cascade',
      trip_id: trip.trip_id,
      port_id: 'port-1',
      generated_at: new Date().toISOString(),
    });
    deleteTrip(trip.trip_id);
    expect(getPlan('plan-cascade')).toBeNull();
  });

  test('deletePort removes associated plans', () => {
    const trip = createTrip({ ship_name: 'Ship' });
    const port = addPort(trip.trip_id, {
      name: 'Barcelona',
      country: 'Spain',
      latitude: 41.38,
      longitude: 2.19,
      arrival: '2023-10-01T08:00:00',
      departure: '2023-10-01T18:00:00',
    });
    savePlan({
      plan_id: 'plan-port-cascade',
      trip_id: trip.trip_id,
      port_id: port.port_id,
      generated_at: new Date().toISOString(),
    });
    deletePort(trip.trip_id, port.port_id);
    expect(getPlan('plan-port-cascade')).toBeNull();
  });
});
