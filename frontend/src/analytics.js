/**
 * Google Analytics helper — respects cookie consent.
 *
 * gtag.js is loaded in index.html with send_page_view:false so nothing
 * fires until the user grants analytics consent via the cookie banner.
 */

import { getCookieConsent } from './components/CookieBanner';

const GA_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;

function isEnabled() {
  if (!GA_ID || !window.gtag) return false;
  const consent = getCookieConsent();
  return consent && consent.analytics === true;
}

/** Send a page_view event for the given path. */
export function trackPageView(path) {
  if (!isEnabled()) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
  });
}

/** Send a custom event (e.g. generate_plan, export_route). */
export function trackEvent(eventName, params = {}) {
  if (!isEnabled()) return;
  window.gtag('event', eventName, params);
}
