# Plan: Display Advertising (Google AdSense)

> **Priority:** HIGH — Quick revenue, low effort  
> **Estimated effort:** 1–2 weeks  
> **Related:** `MONETIZATION-STRATEGY.md` (Stream 2)

---

## Overview

Google AdSense can generate passive revenue from page views. In the travel niche, typical RPMs (Revenue Per 1,000 pageviews) range from £3–8 for Tier 1 audiences (UK, US, Australia).

**Key principle:** Ads must enhance, not degrade, the ShoreExplorer experience. Our users are 30–70 years old and expect a premium, clean interface. Ads should be tasteful, non-intrusive, and never interfere with core functionality.

---

## Ad Placement Strategy

### Where to Show Ads

| Placement | Page | Ad Format | Rationale |
|---|---|---|---|
| Below port guide header | Port Guide pages | Responsive banner (728×90 / 320×100) | Content pages are ad-friendly |
| Between port guide sections | Port Guide pages | In-article ad | Natural content break |
| After plan summary | DayPlanView | Responsive banner | Post-content, non-intrusive |
| Footer area | My Trips, Landing | Anchor ad (sticky bottom) | Low visual impact |
| Sidebar (desktop only) | Port Guide pages | Medium rectangle (300×250) | Desktop has space for sidebar |

### Where to NEVER Show Ads

| Location | Reason |
|---|---|
| During plan generation (loading state) | Users are waiting and frustrated — ads here feel exploitative |
| Over the map | Interactive element — ads would block usability |
| Between activity cards | Would disrupt the timeline flow |
| In modal dialogs | Feels intrusive and spammy |
| Navigation bars | Accessibility and usability concern |
| Within 48px of any interactive element | Accidental clicks, accessibility violation |

---

## Implementation Guide

### Step 1: Apply for Google AdSense

**Prerequisites:**
- Site must have meaningful content (port guides are ideal)
- Privacy policy must exist (✅ already have `PrivacyPolicy.js`)
- Cookie consent must be implemented (✅ already have `CookieBanner.js`)
- Site must be publicly accessible

**Application:** https://adsense.google.com/start/

**Timeline:** Approval takes 1–14 days. Publish at least 5 port guide pages before applying.

### Step 2: Create AdSense Component

```
File: frontend/src/components/AdUnit.js (NEW)
```

```jsx
import React, { useEffect, useRef } from 'react';

/**
 * Google AdSense ad unit component.
 * Only renders if:
 * 1. AdSense is configured (REACT_APP_ADSENSE_CLIENT_ID is set)
 * 2. User has accepted advertising cookies
 * 3. User is not a premium subscriber
 */
const AdUnit = ({ 
  slot, 
  format = 'auto', 
  responsive = true,
  className = '' 
}) => {
  const adRef = useRef(null);
  
  useEffect(() => {
    // Check if AdSense is available and consent given
    const clientId = process.env.REACT_APP_ADSENSE_CLIENT_ID;
    if (!clientId) return;
    
    // Check cookie consent
    const consent = localStorage.getItem('shoreexplorer_cookie_consent');
    if (!consent) return;
    const parsed = JSON.parse(consent);
    if (!parsed.advertising) return;
    
    // Check premium status
    const premium = localStorage.getItem('shoreexplorer_premium');
    if (premium === 'true') return;
    
    // Push ad
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn('AdSense push failed:', e);
    }
  }, []);
  
  const clientId = process.env.REACT_APP_ADSENSE_CLIENT_ID;
  if (!clientId) return null;
  
  return (
    <div className={`ad-unit my-4 ${className}`} aria-hidden="true">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
        ref={adRef}
      />
    </div>
  );
};

export default AdUnit;
```

### Step 3: Add AdSense Script to index.html

**Note:** Create React App substitutes `%REACT_APP_*%` in `public/index.html` at **build time**, so this approach works correctly. The substitution happens during `yarn build` (or `react-scripts build`), not at runtime.

```html
<!-- In frontend/public/index.html, add before </head> -->
<!-- Only load if configured — CRA substitutes env vars at build time -->
<script>
  (function() {
    var clientId = '%REACT_APP_ADSENSE_CLIENT_ID%';
    // After CRA build substitution, check it's a real value
    if (clientId && clientId.indexOf('REACT_APP') === -1 && clientId.length > 5) {
      var script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + clientId;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  })();
</script>
```

### Step 4: Integrate into Pages

**Port Guide pages (highest ad density — content pages):**
```jsx
// In PortGuide.js
<article>
  <h1>{port.name} Cruise Port Day Guide</h1>
  <PortOverview port={port} />
  
  <AdUnit slot="1234567890" format="horizontal" />
  
  <TopActivities port={port} />
  
  <AdUnit slot="1234567891" format="in-article" />
  
  <FoodAndDrink port={port} />
  <WeatherByMonth port={port} />
  <SafetyTips port={port} />
  
  <AdUnit slot="1234567892" format="horizontal" />
  
  <CTAGeneratePlan port={port} />
</article>
```

**DayPlanView (single ad after summary):**
```jsx
// In DayPlanView.js, after the plan summary section
<PlanSummary plan={plan} />
<AdUnit slot="1234567893" format="horizontal" className="mt-6" />
<ActivityTimeline activities={plan.activities} />
```

**My Trips page (footer ad):**
```jsx
// At the bottom of MyTrips.js
<TripList trips={trips} />
<AdUnit slot="1234567894" format="horizontal" className="mt-8" />
```

### Step 5: Premium Ad-Free Experience

Integrate with the premium features system:

```javascript
// In AdUnit.js, check premium status
const isPremium = localStorage.getItem('shoreexplorer_premium') === 'true';
if (isPremium) return null; // No ads for premium users
```

This creates a natural incentive for premium subscription.

### Step 6: Cookie Consent Integration

The existing `CookieBanner.js` needs an "advertising" consent category:

```javascript
// Update CookieBanner.js consent categories
const consentCategories = {
  necessary: true,      // Always on
  analytics: false,     // Google Analytics
  advertising: false,   // Google AdSense (NEW)
};
```

- If user declines advertising cookies → show non-personalized ads or no ads
- If user accepts → show personalized ads (higher RPM)

---

## Environment Variables

```bash
# Add to frontend/.env
REACT_APP_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX

# Add to GitHub Secrets
TEST_ADSENSE_CLIENT_ID=    # Empty for test (no ads)
PROD_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
```

---

## Revenue Projections

| Monthly Pageviews | RPM (£) | Monthly Revenue |
|---|---|---|
| 1,000 | £4 | £4 |
| 5,000 | £4 | £20 |
| 10,000 | £5 | £50 |
| 25,000 | £5 | £125 |
| 50,000 | £6 | £300 |
| 100,000 | £6 | £600 |

**Note:** RPM increases with traffic volume as AdSense optimizes ad placement.

---

## AdSense Policy Compliance

### Must Do
- [ ] Clear and accessible Privacy Policy (✅ exists)
- [ ] Cookie consent banner with advertising category
- [ ] No more than 3 ad units per page
- [ ] Ads clearly distinguishable from content
- [ ] No ad placement that encourages accidental clicks
- [ ] No pop-up or overlay ads
- [ ] Content must be original and valuable

### Must Not Do
- ❌ Place ads on pages with no content (e.g., loading screens)
- ❌ Use misleading ad labels (e.g., "Recommended for you" on ads)
- ❌ Auto-refresh ads
- ❌ Place ads in emails
- ❌ Click own ads or encourage others to click

---

## A/B Testing Plan

Once ads are live, test:

1. **Number of ad units per page:** 1 vs. 2 vs. 3
2. **Ad formats:** Horizontal banner vs. in-article vs. responsive
3. **Ad placement:** After summary vs. between sections vs. footer
4. **Impact on user engagement:** Track bounce rate, session duration, plan generation rate
5. **Impact on affiliate clicks:** Ensure ads don't cannibalize affiliate revenue

---

## Implementation Checklist

- [ ] Apply for Google AdSense account
- [ ] Create `AdUnit.js` component
- [ ] Add AdSense script to `index.html` (conditionally loaded)
- [ ] Update `CookieBanner.js` with advertising consent category
- [ ] Add `REACT_APP_ADSENSE_CLIENT_ID` to environment configuration
- [ ] Integrate ads into port guide pages (primary ad surface)
- [ ] Add single ad to DayPlanView page
- [ ] Add footer ad to MyTrips page
- [ ] Implement premium user ad-free check
- [ ] Add ad impression tracking to Google Analytics
- [ ] Test on mobile (ensure ads don't break layout)
- [ ] Test with ad blockers (graceful degradation)
- [ ] Update Privacy Policy with ad disclosure
- [ ] Update Terms & Conditions with ad mention
- [ ] Monitor AdSense dashboard for policy violations

---

## Files to Create/Modify

| File | Action | Description |
|---|---|---|
| `frontend/src/components/AdUnit.js` | CREATE | AdSense ad unit component |
| `frontend/public/index.html` | MODIFY | Add conditional AdSense script |
| `frontend/src/components/CookieBanner.js` | MODIFY | Add advertising consent category |
| `frontend/src/pages/PortGuide.js` | MODIFY | Integrate ad units |
| `frontend/src/pages/DayPlanView.js` | MODIFY | Add post-summary ad |
| `frontend/src/pages/MyTrips.js` | MODIFY | Add footer ad |
| `frontend/src/pages/PrivacyPolicy.js` | MODIFY | Add advertising disclosure |
