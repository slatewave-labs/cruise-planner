const CURRENCIES = [
  { code: 'GBP', label: 'GBP', symbol: '\u00A3' },
  { code: 'USD', label: 'USD', symbol: '$' },
  { code: 'EUR', label: 'EUR', symbol: '\u20AC' },
  { code: 'AUD', label: 'AUD', symbol: 'A$' },
  { code: 'CAD', label: 'CAD', symbol: 'C$' },
  { code: 'NZD', label: 'NZD', symbol: 'NZ$' },
  { code: 'CHF', label: 'CHF', symbol: 'Fr' },
  { code: 'JPY', label: 'JPY', symbol: '\u00A5' },
  { code: 'NOK', label: 'NOK', symbol: 'kr' },
  { code: 'SEK', label: 'SEK', symbol: 'kr' },
  { code: 'DKK', label: 'DKK', symbol: 'kr' },
  { code: 'SGD', label: 'SGD', symbol: 'S$' },
  { code: 'ZAR', label: 'ZAR', symbol: 'R' },
  { code: 'AED', label: 'AED', symbol: '\u062F.\u0625' },
];

export function getCurrencySymbol(code) {
  const c = CURRENCIES.find(c => c.code === code);
  return c ? c.symbol : code;
}

export default CURRENCIES;

// --- Device Identity ---

const DEVICE_ID_KEY = 'shoreexplorer_device_id';

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// --- Local Plan Cache ---

const PLAN_CACHE_KEY = 'shoreexplorer_plans';
const TRIP_CACHE_KEY = 'shoreexplorer_trips';

export function cachePlan(plan) {
  try {
    const cache = JSON.parse(localStorage.getItem(PLAN_CACHE_KEY) || '{}');
    cache[plan.plan_id] = {
      data: plan,
      cached_at: new Date().toISOString(),
    };
    localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(cache));
  } catch { /* localStorage full or unavailable */ }
}

export function getCachedPlan(planId) {
  try {
    const cache = JSON.parse(localStorage.getItem(PLAN_CACHE_KEY) || '{}');
    return cache[planId]?.data || null;
  } catch {
    return null;
  }
}

export function getCachedPlansForPort(tripId, portId) {
  try {
    const cache = JSON.parse(localStorage.getItem(PLAN_CACHE_KEY) || '{}');
    return Object.values(cache)
      .filter(entry => entry.data?.trip_id === tripId && entry.data?.port_id === portId)
      .sort((a, b) => new Date(b.cached_at) - new Date(a.cached_at))
      .map(entry => entry.data);
  } catch {
    return [];
  }
}

export function getCachedPlansForTrip(tripId) {
  try {
    const cache = JSON.parse(localStorage.getItem(PLAN_CACHE_KEY) || '{}');
    return Object.values(cache)
      .filter(entry => entry.data?.trip_id === tripId)
      .sort((a, b) => new Date(b.cached_at) - new Date(a.cached_at))
      .map(entry => entry.data);
  } catch {
    return [];
  }
}

export function clearPlanCache() {
  try {
    localStorage.removeItem(PLAN_CACHE_KEY);
  } catch { /* ignore */ }
}

// --- Local Trip Cache ---

export function cacheTrip(trip) {
  try {
    const cache = JSON.parse(localStorage.getItem(TRIP_CACHE_KEY) || '{}');
    cache[trip.trip_id] = {
      data: trip,
      cached_at: new Date().toISOString(),
    };
    localStorage.setItem(TRIP_CACHE_KEY, JSON.stringify(cache));
  } catch { /* localStorage full or unavailable */ }
}

export function getCachedTrip(tripId) {
  try {
    const cache = JSON.parse(localStorage.getItem(TRIP_CACHE_KEY) || '{}');
    return cache[tripId]?.data || null;
  } catch {
    return null;
  }
}

export function getAllCachedTrips() {
  try {
    const cache = JSON.parse(localStorage.getItem(TRIP_CACHE_KEY) || '{}');
    return Object.values(cache)
      .sort((a, b) => new Date(b.cached_at) - new Date(a.cached_at))
      .map(entry => ({ ...entry.data, _cached_at: entry.cached_at }));
  } catch {
    return [];
  }
}

export function removeCachedTrip(tripId) {
  try {
    const cache = JSON.parse(localStorage.getItem(TRIP_CACHE_KEY) || '{}');
    delete cache[tripId];
    localStorage.setItem(TRIP_CACHE_KEY, JSON.stringify(cache));
    // Also remove associated plans
    const planCache = JSON.parse(localStorage.getItem(PLAN_CACHE_KEY) || '{}');
    const updated = {};
    for (const [k, v] of Object.entries(planCache)) {
      if (v.data?.trip_id !== tripId) updated[k] = v;
    }
    localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

export function getCachedPlanCountForTrip(tripId) {
  try {
    const cache = JSON.parse(localStorage.getItem(PLAN_CACHE_KEY) || '{}');
    return Object.values(cache).filter(entry => entry.data?.trip_id === tripId).length;
  } catch {
    return 0;
  }
}
