# Google Analytics Setup Guide

Set up Google Analytics for ShoreExplorer to track anonymised usage data and understand how visitors use the application.

---

## Prerequisites

- A Google account
- Access to the ShoreExplorer GitHub repository secrets

---

## Step 1: Create a Google Analytics Account

1. Go to [analytics.google.com](https://analytics.google.com/)
2. Click **Start measuring**
3. Enter an **Account name** (e.g. `ShoreExplorer`)
4. Click **Next**

## Step 2: Create a Property

1. Enter a **Property name** (e.g. `ShoreExplorer — Test` or `ShoreExplorer — Production`)
2. Select your **Reporting time zone** and **Currency**
3. Click **Next**
4. Select your **Industry category** → `Travel`
5. Select your **Business size**
6. Click **Create**

## Step 3: Set Up a Web Data Stream

1. Select **Web** as the platform
2. Enter your **Website URL**:
   - **Test:** `https://test.your-domain.com` (or your CloudFront URL)
   - **Production:** `https://your-domain.com`
3. Enter a **Stream name** (e.g. `ShoreExplorer Web — Test`)
4. Click **Create stream**
5. Copy the **Measurement ID** — it looks like `G-XXXXXXXXXX`

> **Repeat Steps 2–3** to create separate properties for test and production environments.

---

## Step 4: Add Measurement IDs to GitHub Secrets

1. Go to your GitHub repository: **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:

| Secret Name | Value | Environment |
|---|---|---|
| `TEST_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Test |
| `PROD_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Production |

> Use the measurement ID from the **test** property for `TEST_GA_MEASUREMENT_ID` and the **production** property for `PROD_GA_MEASUREMENT_ID`.

---

## Step 5: Deploy

The measurement ID is injected at build time as the `REACT_APP_GA_MEASUREMENT_ID` environment variable. Trigger a deployment to apply:

**Test environment:**
```bash
# Push to main to trigger automatic test deployment
git commit --allow-empty -m "Enable Google Analytics"
git push origin main
```

**Production:**
```bash
# Create and push a release tag
git tag v1.x.x
git push origin v1.x.x
```

---

## How It Works

1. **gtag.js** is loaded in `index.html` only when `REACT_APP_GA_MEASUREMENT_ID` is set
2. Page views are tracked automatically on every route change via `App.js`
3. **Cookie consent is respected** — analytics events only fire if the user accepts analytics cookies in the cookie banner
4. **IP anonymisation** is enabled by default (`anonymize_ip: true`)
5. Initial page view is suppressed (`send_page_view: false`) and sent via React Router instead, so single-page navigation is tracked correctly

### Cookie Consent Integration

ShoreExplorer includes a GDPR-compliant cookie banner. Google Analytics events are only sent when the user has:

- Clicked **Accept All**, or
- Enabled **Analytics Cookies** in the **Manage Preferences** panel

If the user rejects analytics cookies, the gtag.js script is still loaded (for performance — it avoids a flash of re-layout) but no data is sent to Google.

---

## Verification

### Check Analytics Is Working

1. Open your deployed site in a browser
2. Accept cookies in the consent banner
3. Open **Google Analytics** → **Reports** → **Realtime**
4. You should see your visit appear within a few seconds

### Check Analytics Is Disabled Without Consent

1. Open the site in an incognito/private window
2. **Reject** cookies or close the banner without accepting
3. Open the browser DevTools → **Network** tab
4. Filter for `google-analytics` or `gtag` — you should see the script loaded but no `collect` requests

### Local Development

To test locally, set the environment variable before starting the dev server:

```bash
REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX yarn start
```

---

## Recommended Google Analytics Settings

After setup, configure these settings in the Google Analytics console:

1. **Data retention:** Go to **Admin** → **Data Settings** → **Data Retention** → set to **14 months** (matches the privacy policy)
2. **Google Signals:** Keep **disabled** to avoid cross-device tracking
3. **Granular location and device data:** Keep default settings (country/city level)
4. **User data collection acknowledgement:** Review and accept

---

## Tracking Custom Events

The `analytics.js` module exports a `trackEvent` function for custom events:

```javascript
import { trackEvent } from './analytics';

// Track when a user generates a day plan
trackEvent('generate_plan', {
  port_name: 'Dubrovnik',
  plan_type: 'full_day',
});

// Track when a user exports a route to Google Maps
trackEvent('export_route', {
  port_name: 'Santorini',
  activity_count: 5,
});
```

These events also respect cookie consent — they silently no-op if the user hasn't accepted analytics cookies.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| No data in Analytics dashboard | Check that the measurement ID in GitHub secrets matches the one in Google Analytics |
| Analytics works on test but not prod | Verify `PROD_GA_MEASUREMENT_ID` is set correctly — it should be a different ID than test |
| Events not firing | Ensure cookies are accepted via the banner. Check browser console for errors |
| `REACT_APP_GA_MEASUREMENT_ID` not set | The app runs normally without analytics — no errors will appear |

---

## Summary of GitHub Secrets

| Secret | Description |
|---|---|
| `TEST_GA_MEASUREMENT_ID` | Google Analytics measurement ID for test (e.g. `G-ABC123DEF4`) |
| `PROD_GA_MEASUREMENT_ID` | Google Analytics measurement ID for production (e.g. `G-XYZ789GHI0`) |

---

**Last Updated:** February 2026
