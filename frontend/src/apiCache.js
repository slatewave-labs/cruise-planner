/* eslint-disable no-console */
/**
 * API response cache — prefetches and stores GET API data in localStorage
 * so the app works offline (e.g. at sea with no internet).
 *
 * Cached endpoints:
 *   - /api/ports/regions
 *   - /api/ports/search (full port list)
 *
 * Excluded:
 *   - /api/weather         (real-time data, not useful to cache)
 *   - /api/plans/generate  (POST, per-request AI generation)
 *
 * Cache busting: each entry is stored under a version key derived from
 * APP_CACHE_VERSION. When the app is rebuilt with a new version, old
 * entries are pruned automatically.
 */

// Bump this version when API response shapes change or when you want
// all clients to re-fetch fresh data on next load after a new release.
const APP_CACHE_VERSION = '1';

const CACHE_PREFIX = 'shoreexplorer_api_v';
const CACHE_KEY = `${CACHE_PREFIX}${APP_CACHE_VERSION}`;

// ------- Low-level helpers -------

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(obj) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch { /* storage full — silently degrade */ }
}

/** Remove cache entries from older versions (cache busting). */
function pruneOldCaches() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX) && key !== CACHE_KEY) {
        localStorage.removeItem(key);
      }
    });
  } catch { /* ignore */ }
}

// ------- Public API -------

/**
 * Retrieve a cached API response by key.
 * @param {string} key  Cache entry key (e.g. 'ports_regions')
 * @returns {*|null}  The cached data, or null if not found
 */
export function getCachedApiResponse(key) {
  const cache = readCache();
  const entry = cache[key];
  return entry ? entry.data : null;
}

/**
 * Store an API response in the local cache.
 * @param {string} key  Cache entry key
 * @param {*}      data The JSON-serialisable response data
 */
export function setCachedApiResponse(key, data) {
  const cache = readCache();
  cache[key] = { data, ts: Date.now() };
  writeCache(cache);
}

/**
 * Build a deterministic cache key for a given URL + params.
 * @param {string} pathname  e.g. '/api/ports/search'
 * @param {object} [params]  query params, e.g. { q: '', limit: 500 }
 * @returns {string}
 */
export function buildCacheKey(pathname, params) {
  if (!params || Object.keys(params).length === 0) return pathname;
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return `${pathname}?${sorted}`;
}

/**
 * Prefetch all cacheable API endpoints on first app load.
 * Runs in the background — failures are silently ignored (we may already
 * have cached data from a previous session).
 *
 * @param {import('axios').AxiosInstance} apiClient  The configured axios instance
 * @param {string} baseUrl  Backend URL (REACT_APP_BACKEND_URL)
 */
export async function prefetchApiData(apiClient, baseUrl) {
  pruneOldCaches();

  // Already have cached data? Skip prefetch (avoids redundant network calls).
  // Fresh data will still be fetched when the user navigates and the
  // service-worker's NetworkFirst strategy updates the cache transparently.
  const cache = readCache();
  if (cache['/api/ports/regions'] && cache['/api/ports/search?limit=500&q=']) {
    return;
  }

  const endpoints = [
    { key: '/api/ports/regions', url: `${baseUrl}/api/ports/regions` },
    {
      key: '/api/ports/search?limit=500&q=',
      url: `${baseUrl}/api/ports/search`,
      params: { q: '', limit: 500 },
    },
  ];

  const results = await Promise.allSettled(
    endpoints.map(async ({ key, url, params }) => {
      try {
        const res = await apiClient.get(url, { params });
        setCachedApiResponse(key, res.data);
      } catch (err) {
        // Network offline or backend down — no-op; cached data (if any) survives
        console.warn(`[apiCache] prefetch failed for ${key}:`, err.message);
      }
    })
  );
  return results;
}
