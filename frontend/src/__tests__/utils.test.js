/**
 * Unit tests for utility functions in utils.js
 */
import {
  getCurrencySymbol,
  getDeviceId,
  cachePlan,
  getCachedPlan,
  getCachedPlansForPort,
  getCachedPlansForTrip,
  clearPlanCache,
  cacheTrip,
  getCachedTrip,
  getAllCachedTrips,
  removeCachedTrip,
  getCachedPlanCountForTrip,
} from '../utils';

describe('Currency Utils', () => {
  test('getCurrencySymbol returns correct symbol for GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  test('getCurrencySymbol returns code for unknown currency', () => {
    expect(getCurrencySymbol('XXX')).toBe('XXX');
  });
});

describe('Device ID Utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('getDeviceId generates new ID if none exists', () => {
    const id = getDeviceId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('getDeviceId returns same ID on multiple calls', () => {
    const id1 = getDeviceId();
    const id2 = getDeviceId();
    expect(id1).toBe(id2);
  });

  test('getDeviceId returns existing ID if present', () => {
    const existingId = 'existing-device-id';
    localStorage.setItem('shoreexplorer_device_id', existingId);
    const id = getDeviceId();
    expect(id).toBe(existingId);
  });
});

describe('Plan Cache Utils', () => {
  const mockPlan = {
    plan_id: 'plan-123',
    trip_id: 'trip-456',
    port_id: 'port-789',
    plan_title: 'Test Plan',
    activities: [],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  test('cachePlan stores and retrieves plan', () => {
    cachePlan(mockPlan);
    const retrieved = getCachedPlan('plan-123');
    expect(retrieved).toEqual(mockPlan);
  });

  test('getCachedPlansForPort returns plans for specific port', () => {
    cachePlan(mockPlan);
    cachePlan({
      ...mockPlan,
      plan_id: 'plan-456',
      port_id: 'port-different',
    });
    
    const plans = getCachedPlansForPort('trip-456', 'port-789');
    expect(plans).toHaveLength(1);
    expect(plans[0].plan_id).toBe('plan-123');
  });
});

describe('Trip Cache Utils', () => {
  const mockTrip = {
    trip_id: 'trip-123',
    ship_name: 'Test Ship',
    cruise_line: 'Test Cruise',
    ports: [],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  test('cacheTrip stores and retrieves trip', () => {
    cacheTrip(mockTrip);
    const retrieved = getCachedTrip('trip-123');
    expect(retrieved).toEqual(mockTrip);
  });

  test('getAllCachedTrips returns all trips', () => {
    cacheTrip(mockTrip);
    cacheTrip({
      ...mockTrip,
      trip_id: 'trip-456',
      ship_name: 'Another Ship',
    });
    
    const trips = getAllCachedTrips();
    expect(trips).toHaveLength(2);
  });

  test('removeCachedTrip removes trip and associated plans', () => {
    const mockPlanForTrip = {
      plan_id: 'plan-123',
      trip_id: 'trip-123',
      port_id: 'port-789',
    };
    cacheTrip(mockTrip);
    cachePlan(mockPlanForTrip);
    
    removeCachedTrip('trip-123');
    
    expect(getCachedTrip('trip-123')).toBeNull();
    expect(getCachedPlan('plan-123')).toBeNull();
  });

  test('malformed JSON in localStorage is handled', () => {
    localStorage.setItem('shoreexplorer_plans', 'invalid json');
    expect(getCachedPlan('plan-123')).toBeNull();
  });
});

