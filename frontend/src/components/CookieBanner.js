import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Shield, X, Check } from 'lucide-react';

const CONSENT_KEY = 'shoreexplorer_cookie_consent';

/**
 * Read the stored cookie consent object from localStorage.
 * Returns null if no consent has been recorded yet.
 * Shape: { essential: true, analytics: boolean, thirdParty: boolean, timestamp: string }
 */
export function getCookieConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveConsent(consent) {
  const record = {
    essential: true,
    analytics: Boolean(consent.analytics),
    thirdParty: Boolean(consent.thirdParty),
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  return record;
}

function Toggle({ checked, onChange, disabled = false, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-7 w-12 shrink-0 items-center
        rounded-full transition-colors duration-200 focus:outline-none
        focus-visible:ring-2 focus-visible:ring-accent/50
        min-h-[48px] min-w-[48px]
        ${disabled ? 'bg-stone-300 cursor-not-allowed' : checked ? 'bg-accent' : 'bg-stone-300'}
      `}
    >
      <span
        aria-hidden="true"
        className={`
          absolute top-1/2 -translate-y-1/2 inline-block h-5 w-5 rounded-full
          bg-white shadow-md transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      >
        {disabled && (
          <Check className="w-3 h-3 text-stone-400 absolute inset-0 m-auto" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}

function PreferenceRow({ label, description, checked, onChange, disabled = false, id }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-stone-100 last:border-b-0">
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className="font-body font-semibold text-primary text-base cursor-pointer"
        >
          {label}
          {disabled && (
            <span className="ml-2 text-xs font-medium text-muted-foreground bg-stone-100 px-2 py-0.5 rounded-full">
              Always on
            </span>
          )}
        </label>
        <p className="font-body text-sm text-muted-foreground mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
      <div className="flex-shrink-0 pt-0.5">
        <Toggle checked={checked} onChange={onChange} disabled={disabled} id={id} />
      </div>
    </div>
  );
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [thirdParty, setThirdParty] = useState(false);

  useEffect(() => {
    const existing = getCookieConsent();
    if (!existing) {
      setVisible(true);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    saveConsent({ analytics: true, thirdParty: true });
    setVisible(false);
  }, []);

  const handleRejectNonEssential = useCallback(() => {
    saveConsent({ analytics: false, thirdParty: false });
    setVisible(false);
  }, []);

  const handleSavePreferences = useCallback(() => {
    saveConsent({ analytics, thirdParty });
    setVisible(false);
  }, [analytics, thirdParty]);

  const togglePreferences = useCallback(() => {
    setShowPreferences((prev) => !prev);
  }, []);

  if (!visible) return null;

  return (
    <div
      data-testid="cookie-banner"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 shadow-lg animate-slide-up"
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
    >
          <div className="max-w-5xl mx-auto px-5 py-5 md:px-8 md:py-6">

            {!showPreferences && (
              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 text-accent" aria-hidden="true">
                    <Cookie className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-heading text-lg font-bold text-primary mb-1">
                      We value your privacy
                    </h2>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">
                      We use cookies to improve your experience, analyse site usage, and support
                      our partners. You can customise your preferences at any time. Read our{' '}
                      <Link
                        to="/privacy"
                        className="text-accent-dark font-semibold hover:underline focus:underline"
                      >
                        Privacy Policy
                      </Link>{' '}
                      and{' '}
                      <Link
                        to="/terms"
                        className="text-accent-dark font-semibold hover:underline focus:underline"
                      >
                        Terms
                      </Link>
                      .
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <button
                    data-testid="cookie-accept-all"
                    onClick={handleAcceptAll}
                    className="bg-accent text-white rounded-full px-6 py-3 font-bold min-h-[48px] hover:bg-accent/90 active:scale-95 transition-all shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 font-body text-sm"
                  >
                    Accept All
                  </button>
                  <button
                    data-testid="cookie-reject"
                    onClick={handleRejectNonEssential}
                    className="bg-stone-200 text-primary rounded-full px-6 py-3 font-semibold min-h-[48px] hover:bg-stone-300 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 font-body text-sm"
                  >
                    Reject Non-Essential
                  </button>
                  <button
                    data-testid="cookie-manage"
                    onClick={togglePreferences}
                    className="text-accent-dark font-semibold hover:underline min-h-[48px] focus:outline-none focus-visible:underline font-body text-sm px-2"
                  >
                    Manage Preferences
                  </button>
                </div>
              </div>
            )}

            {showPreferences && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield
                      className="w-5 h-5 text-accent flex-shrink-0"
                      aria-hidden="true"
                    />
                    <h2 className="font-heading text-lg font-bold text-primary">
                      Cookie Preferences
                    </h2>
                  </div>
                  <button
                    onClick={togglePreferences}
                    aria-label="Close preferences"
                    className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  >
                    <X className="w-5 h-5 text-stone-500" />
                  </button>
                </div>

                <div>
                  <PreferenceRow
                    id="pref-essential"
                    label="Essential Cookies"
                    description="Required for core functionality — storing your trip data and device identification. These cannot be disabled."
                    checked={true}
                    onChange={() => {}}
                    disabled
                  />
                  <PreferenceRow
                    id="pref-analytics"
                    label="Analytics Cookies"
                    description="Help us understand how you use ShoreExplorer so we can improve the experience. Includes Google Analytics."
                    checked={analytics}
                    onChange={setAnalytics}
                  />
                  <PreferenceRow
                    id="pref-thirdparty"
                    label="Third-Party Cookies"
                    description="Used by our affiliate partners for tracking referrals. Supports tour and excursion booking partners."
                    checked={thirdParty}
                    onChange={setThirdParty}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pt-2">
                  <button
                    data-testid="cookie-save-preferences"
                    onClick={handleSavePreferences}
                    className="bg-accent text-white rounded-full px-6 py-3 font-bold min-h-[48px] hover:bg-accent/90 active:scale-95 transition-all shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 font-body text-sm"
                  >
                    Save Preferences
                  </button>
                  <button
                    data-testid="cookie-accept-all"
                    onClick={handleAcceptAll}
                    className="bg-stone-200 text-primary rounded-full px-6 py-3 font-semibold min-h-[48px] hover:bg-stone-300 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 font-body text-sm"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={togglePreferences}
                    className="text-accent-dark font-semibold hover:underline min-h-[48px] focus:outline-none focus-visible:underline font-body text-sm px-2"
                  >
                    Back
                  </button>
                </div>

                <p className="font-body text-xs text-muted-foreground leading-relaxed">
                  For more information, see our{' '}
                  <Link to="/privacy" className="text-accent-dark font-semibold hover:underline">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link to="/terms" className="text-accent-dark font-semibold hover:underline">
                    Terms
                  </Link>
                  .
                </p>
              </div>
            )}

          </div>
    </div>
  );
}
