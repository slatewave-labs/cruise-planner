/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute, setCatchHandler } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

clientsClaim();

// Precache all build assets — manifest injected by CRA's InjectManifest plugin.
// Each entry is content-hashed, so cache busting is automatic on every new build.
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation: serve cached index.html for all navigation requests
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  new NavigationRoute(
    createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html'),
    {
      denylist: [
        fileExtensionRegexp,
        new RegExp('^/_'),
        new RegExp('/api/'),
      ],
    }
  )
);

// Google Fonts stylesheets (CSS with @font-face rules)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);

// Google Fonts webfont files (woff2)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// Leaflet CSS from CDN
registerRoute(
  ({ url }) => url.origin === 'https://unpkg.com' && url.pathname.includes('leaflet'),
  new CacheFirst({
    cacheName: 'leaflet-cdn',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// OpenStreetMap tiles — cache as user browses, capped to avoid storage bloat
const OSM_TILE_HOSTS = new Set([
  'tile.openstreetmap.org',
  'a.tile.openstreetmap.org',
  'b.tile.openstreetmap.org',
  'c.tile.openstreetmap.org',
]);
registerRoute(
  ({ url }) => OSM_TILE_HOSTS.has(url.hostname),
  new CacheFirst({
    cacheName: 'map-tiles',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// Backend API responses (ports/regions, ports/search, health).
// Excludes /weather and /plans/generate per requirements.
registerRoute(
  ({ url }) => {
    const isApi = url.pathname.startsWith('/api/');
    const isExcluded =
      url.pathname.includes('/weather') ||
      url.pathname.includes('/plans/generate');
    return isApi && !isExcluded;
  },
  new NetworkFirst({
    cacheName: 'api-data',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  })
);

// Google Analytics — let it pass through without caching
registerRoute(
  ({ url }) => url.origin === 'https://www.googletagmanager.com',
  new NetworkFirst({ cacheName: 'analytics', plugins: [
    new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 }),
  ]})
);

// Offline fallback: serve /offline.html only when navigation fails AND the
// cached index.html (from precache) is also unavailable — e.g. if the cache
// was cleared between visits. The full React SPA (via NavigationRoute above)
// remains the primary offline experience from PR #99; this is a last-resort
// safety net. setCatchHandler fires only when a route handler rejects, so it
// never conflicts with the NavigationRoute that handles the normal offline path.
setCatchHandler(async ({ event }) => {
  if (event.request.mode === 'navigate') {
    const cached = await caches.match(process.env.PUBLIC_URL + '/offline.html');
    return cached || Response.error();
  }
  return Response.error();
});

// Listen for skip-waiting message from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
