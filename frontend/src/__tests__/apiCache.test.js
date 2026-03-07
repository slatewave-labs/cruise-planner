/**
 * Unit tests for apiCache.js — local API response caching with
 * version-based cache busting and prefetch support.
 */
import {
  getCachedApiResponse,
  setCachedApiResponse,
  buildCacheKey,
  prefetchApiData,
} from '../apiCache';

let testStore = {};

describe('apiCache', () => {
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

  // --- buildCacheKey ---

  describe('buildCacheKey', () => {
    test('returns pathname alone when no params', () => {
      expect(buildCacheKey('/api/ports/regions')).toBe('/api/ports/regions');
      expect(buildCacheKey('/api/ports/regions', {})).toBe('/api/ports/regions');
      expect(buildCacheKey('/api/ports/regions', undefined)).toBe('/api/ports/regions');
    });

    test('appends sorted params', () => {
      const key = buildCacheKey('/api/ports/search', { q: 'rome', limit: 10 });
      expect(key).toBe('/api/ports/search?limit=10&q=rome');
    });

    test('is deterministic regardless of param insertion order', () => {
      const a = buildCacheKey('/api/x', { z: 1, a: 2 });
      const b = buildCacheKey('/api/x', { a: 2, z: 1 });
      expect(a).toBe(b);
    });
  });

  // --- get / set cached response ---

  describe('getCachedApiResponse / setCachedApiResponse', () => {
    test('returns null for missing key', () => {
      expect(getCachedApiResponse('nope')).toBeNull();
    });

    test('round-trips data correctly', () => {
      const data = [{ name: 'Barcelona' }, { name: 'Rome' }];
      setCachedApiResponse('/api/ports/regions', data);
      expect(getCachedApiResponse('/api/ports/regions')).toEqual(data);
    });

    test('stores timestamp alongside data', () => {
      setCachedApiResponse('key', { x: 1 });
      const raw = JSON.parse(testStore['shoreexplorer_api_v1']);
      expect(raw['key'].ts).toBeGreaterThan(0);
    });

    test('handles corrupted localStorage gracefully', () => {
      testStore['shoreexplorer_api_v1'] = 'not json';
      expect(getCachedApiResponse('anything')).toBeNull();
    });
  });

  // --- version-based cache busting ---

  describe('cache busting', () => {
    test('prefetchApiData prunes old version caches', async () => {
      // Simulate an old cache version
      testStore['shoreexplorer_api_v0'] = JSON.stringify({ old: true });

      // Need to mock Object.keys(localStorage) for pruning
      const origKeys = Object.keys;
      jest.spyOn(Object, 'keys').mockImplementation((obj) => {
        if (obj === localStorage) return Object.getOwnPropertyNames(testStore);
        return origKeys(obj);
      });

      const mockApi = { get: jest.fn().mockResolvedValue({ data: [] }) };
      await prefetchApiData(mockApi, 'http://localhost:8001');

      // Old version should be removed
      expect(testStore['shoreexplorer_api_v0']).toBeUndefined();
      Object.keys.mockRestore();
    });
  });

  // --- prefetchApiData ---

  describe('prefetchApiData', () => {
    test('fetches regions and ports when cache is empty', async () => {
      const mockApi = {
        get: jest.fn()
          .mockResolvedValueOnce({ data: ['Caribbean', 'Mediterranean'] })
          .mockResolvedValueOnce({ data: [{ name: 'Barcelona' }] }),
      };

      await prefetchApiData(mockApi, 'http://localhost:8001');

      expect(mockApi.get).toHaveBeenCalledTimes(2);
      expect(mockApi.get).toHaveBeenCalledWith(
        'http://localhost:8001/api/ports/regions',
        { params: undefined }
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        'http://localhost:8001/api/ports/search',
        { params: { q: '', limit: 500 } }
      );

      expect(getCachedApiResponse('/api/ports/regions')).toEqual(['Caribbean', 'Mediterranean']);
      expect(getCachedApiResponse('/api/ports/search?limit=500&q=')).toEqual([{ name: 'Barcelona' }]);
    });

    test('skips prefetch when cache already populated', async () => {
      setCachedApiResponse('/api/ports/regions', ['Caribbean']);
      setCachedApiResponse('/api/ports/search?limit=500&q=', [{ name: 'Rome' }]);

      const mockApi = { get: jest.fn() };
      await prefetchApiData(mockApi, 'http://localhost:8001');

      expect(mockApi.get).not.toHaveBeenCalled();
    });

    test('does not throw when API calls fail', async () => {
      const mockApi = { get: jest.fn().mockRejectedValue(new Error('Network error')) };
      await expect(prefetchApiData(mockApi, 'http://localhost:8001')).resolves.toBeDefined();
    });
  });
});
