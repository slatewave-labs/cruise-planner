import axios from 'axios';
import { getDeviceId } from './utils';
import { getCachedApiResponse, setCachedApiResponse, buildCacheKey } from './apiCache';

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL,
});

api.interceptors.request.use((config) => {
  config.headers['X-Device-Id'] = getDeviceId();
  return config;
});

// Response interceptor: cache successful GET responses (except weather / plan generation)
api.interceptors.response.use(
  (response) => {
    try {
      const method = (response.config.method || '').toLowerCase();
      const url = new URL(response.config.url, response.config.baseURL || window.location.origin);
      const isExcluded =
        url.pathname.includes('/weather') ||
        url.pathname.includes('/plans/generate');

      if (method === 'get' && !isExcluded) {
        const key = buildCacheKey(url.pathname, response.config.params);
        setCachedApiResponse(key, response.data);
      }
    } catch { /* best-effort — never block the response */ }
    return response;
  },
  (error) => {
    // On network error for GET requests, try local cache fallback
    if (error.config && (error.config.method || '').toLowerCase() === 'get') {
      try {
        const url = new URL(error.config.url, error.config.baseURL || window.location.origin);
        const key = buildCacheKey(url.pathname, error.config.params);
        const cached = getCachedApiResponse(key);
        if (cached !== null) {
          return { data: cached, status: 200, config: error.config, _fromCache: true };
        }
      } catch { /* fall through to rejection */ }
    }
    return Promise.reject(error);
  }
);

export default api;
