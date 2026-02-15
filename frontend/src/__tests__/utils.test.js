/**
 * Unit tests for utility functions in utils.js
 * Tests currency handling, device ID generation, and localStorage caching
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

// Local store for these tests
let testStore = {};

const mockPlan = {
  plan_id: 'plan-123',
  trip_id: 'trip-456',
  port_id: 'port-789',
  plan_title: 'Test Plan',
  activities: [],
};

const mockTrip = {
  trip_id: 'trip-123',
  ship_name: 'Test Ship',
  cruise_line: 'Test Cruise',
  ports: [],
};

describe('Currency Utils', () => {
/* ... existing code ... */
});

describe('Device ID Utils', () => {
  beforeEach(() => {
    testStore = {};
    jest.clearAllMocks();
    
    // Inject local implementation
    localStorage.getItem.mockImplementation(key => testStore[key] || null);
    localStorage.setItem.mockImplementation((key, value) => {
      testStore[key] = value.toString();
    });
    localStorage.removeItem.mockImplementation(key => {
      delete testStore[key];
    });
    localStorage.clear.mockImplementation(() => {
      testStore = {};
    });
  });

  test('getDeviceId generates new ID if none exists', () => {
    const id = getDeviceId();
    
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(localStorage.setItem).toHaveBeenCalledWith('shoreexplorer_device_id', id);
  });

  test('getDeviceId returns existing ID if present', () => {
    const existingId = 'existing-device-id';
    testStore['shoreexplorer_device_id'] = existingId;
    
    const id = getDeviceId();
    
    expect(id).toBe(existingId);
  });

  test('getDeviceId returns same ID on multiple calls', () => {
    const id1 = getDeviceId();
    const id2 = getDeviceId();
    
    expect(id1).toBe(id2);
  });
});

describe('Plan Cache Utils', () => {
  beforeEach(() => {
    testStore = {};
    jest.clearAllMocks();
    
    // Inject local implementation
    localStorage.getItem.mockImplementation(key => testStore[key] || null);
    localStorage.setItem.mockImplementation((key, value) => {
      testStore[key] = value.toString();
    });
    localStorage.removeItem.mockImplementation(key => {
      delete testStore[key];
    });
    localStorage.clear.mockImplementation(() => {
      testStore = {};
    });
  });

  test('cachePlan stores plan in localStorage', () => {
    cachePlan(mockPlan);
    
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'shoreexplorer_plans',
      expect.any(String)
    );
  });

  test('getCachedPlan retrieves stored plan', () => {
    cachePlan(mockPlan);
    
    const retrieved = getCachedPlan('plan-123');
    
    expect(retrieved).toEqual(mockPlan);
  });

  test('getCachedPlan returns null for non-existent plan', () => {
    const retrieved = getCachedPlan('nonexistent');
    
    expect(retrieved).toBeNull();
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

  test('getCachedPlansForTrip returns all plans for trip', () => {
    cachePlan(mockPlan);
    cachePlan({
      ...mockPlan,
      plan_id: 'plan-456',
      port_id: 'port-different',
    });
    
    const plans = getCachedPlansForTrip('trip-456');
    
    expect(plans).toHaveLength(2);
  });

  test('clearPlanCache removes all plans', () => {
    cachePlan(mockPlan);
    clearPlanCache();
    
    const retrieved = getCachedPlan('plan-123');
    
    expect(retrieved).toBeNull();
  });

  test('getCachedPlanCountForTrip returns correct count', () => {
    cachePlan(mockPlan);
    cachePlan({
      ...mockPlan,
      plan_id: 'plan-456',
    });
    
    const count = getCachedPlanCountForTrip('trip-456');
    
    expect(count).toBe(2);
  });
});

describe('Trip Cache Utils', () => {
  beforeEach(() => {
    testStore = {};
    jest.clearAllMocks();
    
    // Inject local implementation
    localStorage.getItem.mockImplementation(key => testStore[key] || null);
    localStorage.setItem.mockImplementation((key, value) => {
      testStore[key] = value.toString();
    });
    localStorage.removeItem.mockImplementation(key => {
      delete testStore[key];
    });
    localStorage.clear.mockImplementation(() => {
      testStore = {};
    });
  });

  test('cacheTrip stores trip in localStorage', () => {
    cacheTrip(mockTrip);
    
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'shoreexplorer_trips',
      expect.any(String)
    );
  });

  test('getCachedTrip retrieves stored trip', () => {
    cacheTrip(mockTrip);
    
    const retrieved = getCachedTrip('trip-123');
    
    expect(retrieved).toEqual(mockTrip);
  });

  test('getCachedTrip returns null for non-existent trip', () => {
    const retrieved = getCachedTrip('nonexistent');
    
    expect(retrieved).toBeNull();
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
    cacheTrip(mockTrip);
    cachePlan({
      plan_id: 'plan-123',
      trip_id: 'trip-123',
      port_id: 'port-789',
    });
    
    removeCachedTrip('trip-123');
    
    const trip = getCachedTrip('trip-123');
    const plan = getCachedPlan('plan-123');
    
    expect(trip).toBeNull();
    expect(plan).toBeNull();
  });

  test('localStorage errors are handled gracefully', () => {
    const testPlan = {
      plan_id: 'plan-test',
      trip_id: 'trip-123',
      port_id: 'port-test',
    };
    
    // Mock localStorage.setItem to throw
    localStorage.setItem.mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    
    // Should not throw
    expect(() => cachePlan(testPlan)).not.toThrow();
  });

  test('malformed JSON in localStorage is handled', () => {
    testStore['shoreexplorer_plans'] = 'invalid json';
    
    const plan = getCachedPlan('plan-123');
    
    expect(plan).toBeNull();
  });
});


