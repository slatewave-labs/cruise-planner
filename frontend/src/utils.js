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

// --- Local Plan Cache ---

const CACHE_KEY = 'shoreexplorer_plans';

export function cachePlan(plan) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[plan.plan_id] = {
      data: plan,
      cached_at: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* localStorage full or unavailable */ }
}

export function getCachedPlan(planId) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return cache[planId]?.data || null;
  } catch {
    return null;
  }
}

export function getCachedPlansForPort(tripId, portId) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return Object.values(cache)
      .filter(entry => entry.data?.trip_id === tripId && entry.data?.port_id === portId)
      .sort((a, b) => new Date(b.cached_at) - new Date(a.cached_at))
      .map(entry => entry.data);
  } catch {
    return [];
  }
}

export function clearPlanCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch { /* ignore */ }
}
