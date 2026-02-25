/**
 * Unit tests for CookieBanner component
 * Tests GDPR-compliant cookie consent banner functionality
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import CookieBanner, { getCookieConsent } from '../components/CookieBanner';

const CONSENT_KEY = 'shoreexplorer_cookie_consent';

let testStore = {};

const renderBanner = () => {
  return render(
    <BrowserRouter>
      <CookieBanner />
    </BrowserRouter>
  );
};

describe('CookieBanner Component', () => {
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

  describe('Visibility', () => {
    test('renders when no consent exists', () => {
      const { queryByTestId } = renderBanner();
      expect(queryByTestId('cookie-banner')).toBeInTheDocument();
    });

    test('does not render when consent already exists', () => {
      testStore[CONSENT_KEY] = JSON.stringify({
        essential: true,
        analytics: false,
        thirdParty: false,
        timestamp: new Date().toISOString(),
      });
      const { queryByTestId } = renderBanner();
      expect(queryByTestId('cookie-banner')).not.toBeInTheDocument();
    });
  });

  describe('Default View', () => {
    test('displays privacy heading', () => {
      renderBanner();
      expect(screen.getByText(/we value your privacy/i)).toBeInTheDocument();
    });

    test('shows all action buttons', () => {
      renderBanner();
      expect(screen.getByTestId('cookie-accept-all')).toBeInTheDocument();
      expect(screen.getByTestId('cookie-reject')).toBeInTheDocument();
      expect(screen.getByTestId('cookie-manage')).toBeInTheDocument();
    });

    test('has links to privacy policy and terms', () => {
      renderBanner();
      const privacyLink = screen.getByRole('link', { name: /privacy policy/i });
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });
  });

  describe('Consent Actions', () => {
    test('accept all stores consent with all categories enabled', () => {
      renderBanner();
      fireEvent.click(screen.getByTestId('cookie-accept-all'));
      const raw = testStore[CONSENT_KEY];
      expect(raw).toBeTruthy();
      const consent = JSON.parse(raw);
      expect(consent.essential).toBe(true);
      expect(consent.analytics).toBe(true);
      expect(consent.thirdParty).toBe(true);
      expect(consent.timestamp).toBeTruthy();
    });

    test('reject stores consent with only essential enabled', () => {
      renderBanner();
      fireEvent.click(screen.getByTestId('cookie-reject'));
      const raw = testStore[CONSENT_KEY];
      expect(raw).toBeTruthy();
      const consent = JSON.parse(raw);
      expect(consent.essential).toBe(true);
      expect(consent.analytics).toBe(false);
      expect(consent.thirdParty).toBe(false);
    });
  });

  describe('Manage Preferences', () => {
    test('clicking manage shows preferences view', () => {
      renderBanner();
      fireEvent.click(screen.getByTestId('cookie-manage'));
      expect(screen.getByText(/Cookie Preferences/i)).toBeInTheDocument();
      expect(screen.getByText(/Essential Cookies/i)).toBeInTheDocument();
      expect(screen.getByText(/Analytics Cookies/i)).toBeInTheDocument();
      expect(screen.getByText(/Third-Party Cookies/i)).toBeInTheDocument();
    });

    test('save preferences stores consent', () => {
      renderBanner();
      fireEvent.click(screen.getByTestId('cookie-manage'));
      fireEvent.click(screen.getByTestId('cookie-save-preferences'));
      const raw = testStore[CONSENT_KEY];
      expect(raw).toBeTruthy();
      const consent = JSON.parse(raw);
      expect(consent.essential).toBe(true);
    });
  });

  describe('getCookieConsent helper', () => {
    test('returns null when no consent stored', () => {
      expect(getCookieConsent()).toBeNull();
    });

    test('returns consent object when stored', () => {
      testStore[CONSENT_KEY] = JSON.stringify({
        essential: true,
        analytics: true,
        thirdParty: false,
        timestamp: '2026-02-25T00:00:00.000Z',
      });
      const result = getCookieConsent();
      expect(result).not.toBeNull();
      expect(result.essential).toBe(true);
      expect(result.analytics).toBe(true);
    });

    test('returns null for invalid JSON', () => {
      testStore[CONSENT_KEY] = 'invalid-json';
      expect(getCookieConsent()).toBeNull();
    });
  });

  describe('Accessibility', () => {
    test('banner has dialog role', () => {
      renderBanner();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('buttons meet minimum touch target size', () => {
      renderBanner();
      const acceptBtn = screen.getByTestId('cookie-accept-all');
      expect(acceptBtn.className).toContain('min-h-[48px]');
    });
  });
});
