# Google Play Store — Step-by-Step Publishing Guide

> **For:** App owner / project admin  
> **Time required:** ~2–3 hours (excluding review wait)  
> **Cost:** $25 one-time (Google Play Developer account)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create a Google Play Developer Account](#2-create-a-google-play-developer-account)
3. [Generate a Signing Key](#3-generate-a-signing-key)
4. [Configure GitHub Secrets](#4-configure-github-secrets)
5. [Update Digital Asset Links](#5-update-digital-asset-links)
6. [Build the APK/AAB](#6-build-the-apkaab)
7. [Create the App Listing on Google Play Console](#7-create-the-app-listing-on-google-play-console)
8. [Upload and Submit for Review](#8-upload-and-submit-for-review)
9. [Post-Submission Checklist](#9-post-submission-checklist)
10. [Ongoing Maintenance](#10-ongoing-maintenance)

---

## 1. Prerequisites

Before you begin, verify the following are in place:

- [ ] The PWA is deployed and accessible at your production URL (e.g. `https://shoreexplorer.com`)
- [ ] HTTPS is enabled on the production domain
- [ ] The site passes a Lighthouse PWA audit (run at [web.dev/measure](https://web.dev/measure/))
- [ ] You have a Google account for the developer console
- [ ] You have a privacy policy page live at `/privacy` on your domain
- [ ] You have prepared app screenshots (see [Section 7.3](#73-prepare-screenshots))

---

## 2. Create a Google Play Developer Account

1. Go to [play.google.com/console/signup](https://play.google.com/console/signup)
2. Sign in with your Google account
3. Pay the **$25 one-time registration fee**
4. Complete identity verification (may take 24–48 hours)
5. Once verified, you'll have access to the Google Play Console

> **Tip:** Use a dedicated business Google account rather than a personal one.

---

## 3. Generate a Signing Key

Google requires that all Android apps are signed with a cryptographic key. You'll create one that the CI/CD pipeline uses to sign builds.

### 3.1 Generate the keystore

On your local machine (requires Java JDK installed):

```bash
keytool -genkeypair \
  -alias shoreexplorer \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -keystore shoreexplorer.keystore \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=ShoreExplorer, OU=Mobile, O=Slatewave Labs, L=London, C=GB"
```

Replace:
- `YOUR_STORE_PASSWORD` — choose a strong password (save it securely!)
- `YOUR_KEY_PASSWORD` — can be the same as the store password

### 3.2 Extract the SHA-256 fingerprint

```bash
keytool -list -v -keystore shoreexplorer.keystore -alias shoreexplorer \
  | grep SHA256
```

This outputs something like:
```
SHA256: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99
```

**Save this fingerprint** — you'll need it in Step 5.

### 3.3 Base64-encode the keystore for CI/CD

```bash
base64 -i shoreexplorer.keystore | tr -d '\n' > keystore-base64.txt
```

The contents of `keystore-base64.txt` will be stored as a GitHub secret in the next step.

> **⚠️ IMPORTANT:** Store your keystore file and passwords securely (e.g. in a password manager). If you lose the keystore, you cannot update your app on Google Play.

---

## 4. Configure GitHub Secrets

Go to your repository → **Settings** → **Secrets and variables** → **Actions** and add the following secrets:

| Secret Name | Description | Example |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | The base64-encoded `.keystore` file | *(contents of keystore-base64.txt)* |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password | `your-store-password` |
| `ANDROID_KEY_PASSWORD` | Key password | `your-key-password` |
| `ANDROID_KEY_ALIAS` | Key alias | `shoreexplorer` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Google Play API service account JSON (for automated uploads) | *(see below)* |

### 4.1 Set up Google Play API access (for automated uploads)

This enables the CI/CD pipeline to upload builds directly to Google Play.

1. In **Google Play Console**, go to **Setup** → **API access**
2. Click **Create new service account**
3. Follow the link to **Google Cloud Console**
4. Create a service account with the role **Service Account User**
5. Create a JSON key and download it
6. Back in Google Play Console, grant the service account **Release manager** permission
7. Copy the entire contents of the JSON key file into the `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` secret

> **Note:** You can skip this step and upload AAB files manually instead.

---

## 5. Update Digital Asset Links

Digital Asset Links verify that your website and Android app belong to the same developer. This is **required** for TWA apps to show without a browser bar.

### 5.1 Update the fingerprint

Edit `frontend/public/.well-known/assetlinks.json` and replace the placeholder:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.shoreexplorer.app",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

Replace the fingerprint with your actual SHA-256 from Step 3.2.

### 5.2 Deploy and verify

1. Commit and push the change — the normal deploy pipeline will handle deployment
2. Verify it's accessible at: `https://yourdomain.com/.well-known/assetlinks.json`
3. Validate using [Google's Asset Links tool](https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://yourdomain.com&relation=delegate_permission/common.handle_all_urls)

> **Note:** The file must be served with `Content-Type: application/json` and must be accessible without authentication or redirects.

---

## 6. Build the APK/AAB

### 6.1 Test build (beta)

1. Go to your repository → **Actions** tab
2. Select **"Build Android (Beta)"** workflow from the left sidebar
3. Click **"Run workflow"** (top right)
4. Fill in:
   - **Version name:** `1.0.0-beta.1`
   - **Version code:** `1`
   - **Upload to Play:** Leave unchecked for first build
5. Click the green **"Run workflow"** button
6. Wait for the build to complete (~5–10 minutes)
7. Once complete, click the workflow run → scroll to **Artifacts** → download the APK/AAB

### 6.2 Test the APK on a device

1. Transfer the APK to an Android device (email it to yourself, or use Google Drive)
2. On the Android device, go to **Settings** → **Security** → enable **Install from unknown sources**
3. Open the APK file to install it
4. Launch the app and verify:
   - [ ] App opens without a browser address bar (TWA verification working)
   - [ ] All pages load and navigate correctly
   - [ ] Maps display and are interactive
   - [ ] Toggle airplane mode → app shows offline page or cached content
   - [ ] App icon looks correct on the home screen
   - [ ] Splash screen shows briefly on launch

### 6.3 Production build

Once testing passes:

1. Run the **"Build Android (Production)"** workflow
2. Fill in:
   - **Version name:** `1.0.0`
   - **Version code:** `1` (or higher if you've already uploaded a beta)
   - **Track:** `internal` (start with internal testing before going to production)
   - **Rollout percentage:** `100`
3. If the `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` secret is configured, the AAB will be automatically uploaded

---

## 7. Create the App Listing on Google Play Console

### 7.1 Create the app

1. Log in to [Google Play Console](https://play.google.com/console/)
2. Click **"Create app"** (top right)
3. Fill in:
   - **App name:** `ShoreExplorer — Cruise Port Day Planner`
   - **Default language:** English (United Kingdom)
   - **App or game:** App
   - **Free or paid:** Free
4. Accept the developer program policies and US export laws declarations
5. Click **"Create app"**

### 7.2 Store listing

Navigate to **Grow** → **Store presence** → **Main store listing** and fill in:

**Title:**
```
ShoreExplorer — Cruise Port Day Planner
```

**Short description** (80 characters max):
```
Plan your perfect cruise port day with AI itineraries, maps & weather.
```

**Full description:**
```
🚢 PLANNING A CRUISE? Let ShoreExplorer be your personal port day guide.

ShoreExplorer generates personalised day plans for your cruise port visits, so you can make the most of every shore excursion.

✨ FEATURES:
• AI-Powered Day Plans — Get a tailored itinerary based on your interests, budget, and how long you're in port
• Interactive Maps — See your route on a live map with all activities marked
• Real-Time Weather — Know what to expect before you step off the ship
• Booking Links — Book tours and activities directly from your plan
• Google Maps Export — One tap to navigate your route
• Works Offline — Save your plans for when you're without Wi-Fi

🎯 PERFECT FOR:
• Couples planning romantic port days
• Families with kids needing activity ideas
• Solo travelers exploring new destinations
• Groups wanting an organised shore day

🌍 COVERS 200+ CRUISE PORTS WORLDWIDE
From the Caribbean to the Mediterranean, Alaska to Southeast Asia.

📱 FREE TO USE
Plan smarter. Explore more. Return to the ship on time.
```

**App category:** Travel & Local

**Contact details:**
- **Email:** *(your support email)*
- **Website:** `https://shoreexplorer.com`

**Privacy policy URL:** `https://shoreexplorer.com/privacy`

### 7.3 Prepare screenshots

You need **at least 2 screenshots** per device type. We recommend **4–6**.

**Phone screenshots (required):**
- Minimum 2, maximum 8
- Size: 1080×1920 pixels (portrait) — or take them on a phone with 1080p+ resolution

**Tablet screenshots (optional but recommended):**
- Size: 1200×1920 pixels

**What to screenshot:**
1. **Hero page** — Landing page with the tagline
2. **Trip setup** — Showing port selection
3. **Day plan** — A generated AI plan with activity list
4. **Map view** — Interactive map with route markers
5. **Activity details** — Activity cards with booking links
6. **Weather** — Weather forecast for a port

**How to take screenshots:**
- **On a phone:** Navigate to each page → take screenshot (Power + Volume Down on most Android devices)
- **On desktop:** Open Chrome DevTools (F12) → toggle device toolbar (Ctrl+Shift+M) → set to a phone resolution (e.g. 412×915) → take screenshot (three dots menu → "Capture screenshot")

**Feature graphic (required):**
- Size: exactly **1024×500 pixels**
- Create a banner with app name and tagline on your brand colours
- Tools: [Canva](https://canva.com) (free), Figma, or any image editor
- Use background colour `#0F172A` with accent `#F43F5E`

### 7.4 Content rating

1. Navigate to **Policy** → **App content** → **Content rating**
2. Click **"Start questionnaire"**
3. Select **IARC** questionnaire
4. Answer the questions — ShoreExplorer has no violence, gambling, or mature content
5. Expected rating: **Everyone** (ESRB) / **PEGI 3** / **USK 0**

### 7.5 Target audience

1. Navigate to **Policy** → **App content** → **Target audience**
2. Select age group: **18 and over** (adult travel planning app)
3. This avoids the stricter children's privacy requirements

### 7.6 Data safety

Navigate to **Policy** → **App content** → **Data safety** and complete the form:

| Question | Answer |
|---|---|
| Does your app collect or share data? | Yes |
| Is all data encrypted in transit? | Yes |
| Can users request data deletion? | Yes |

**Data types:**

| Data Type | Collected | Shared | Purpose |
|---|---|---|---|
| Approximate location | Yes (optional) | No | Weather forecasts |
| App interactions | Yes | Yes (analytics) | Analytics, app improvement |
| Device identifiers | Yes | Yes (analytics) | Analytics |

### 7.7 Government apps and financial features

Mark these as "No" — ShoreExplorer is neither a government app nor a financial app.

---

## 8. Upload and Submit for Review

### 8.1 Upload the AAB

If using the automated pipeline, the AAB was already uploaded. If uploading manually:

1. Navigate to **Release** → **Testing** → **Internal testing**
2. Click **"Create new release"**
3. If using Google Play App Signing, follow the opt-in prompt (recommended)
4. Upload the `.aab` file downloaded from the build artifacts
5. Add release notes:
   ```
   Initial release — AI-powered cruise port day planner with:
   • Personalised day plans for 200+ cruise ports
   • Interactive maps with walking routes
   • Real-time weather forecasts
   • Offline access to saved plans
   ```
6. Click **"Review release"** → **"Start rollout to Internal testing"**

### 8.2 Internal testing

1. Navigate to **Release** → **Testing** → **Internal testing** → **Testers** tab
2. Create a testers list and add your email addresses
3. Copy the **opt-in URL** and open it on your test device
4. Install the app from the Play Store
5. Test thoroughly (see checklist in [Section 6.2](#62-test-the-apk-on-a-device))

### 8.3 Promote to production

Once you're confident the app works:

1. Navigate to **Release** → **Production**
2. Click **"Create new release"**
3. Click **"Add from library"** and select the tested AAB
4. Add release notes for the public
5. Click **"Review release"**
6. Choose rollout percentage:
   - Start with **20%** for the first release to catch issues early
   - Increase to **100%** after a day or two if no problems
7. Click **"Start rollout to Production"**

### 8.4 Wait for review

- Google reviews typically take **1–3 business days** (can be up to 7 for new accounts)
- You'll receive an email notification when approved or if changes are needed
- Check the **Dashboard** in Play Console for real-time status
- If rejected, read the rejection reason carefully, fix the issues, and resubmit

---

## 9. Post-Submission Checklist

After your app is live on the Play Store:

- [ ] Search for "ShoreExplorer" on Google Play and verify it appears
- [ ] Install from the Play Store on a real device
- [ ] Confirm TWA opens without browser chrome
- [ ] Test a complete user flow (create trip → generate plan → view on map)
- [ ] Set up **email alerts** in Play Console for crashes, reviews, and policy issues
- [ ] Monitor **Android Vitals** dashboard for ANRs and crashes
- [ ] Respond to user reviews within 24 hours (builds credibility and ranking)
- [ ] Share the Play Store link on your website and social media

---

## 10. Ongoing Maintenance

### Releasing updates

For web app changes (most updates):
- **No new APK needed** — just deploy your web app as normal via the existing deploy pipelines
- The TWA will automatically show the latest version of your website

For Android-specific changes (icon, colours, SDK version):
1. Update the relevant config in `twa-manifest.json`
2. **Increment the `version_code`** (must be strictly higher than the last upload)
3. Update the `version_name` (e.g. `1.0.0` → `1.1.0`)
4. Run the production build workflow
5. The new AAB will be uploaded and submitted

### Annual requirements

Google requires you to:
- [ ] Target the latest Android SDK within **one year** of each new SDK release
- [ ] Keep your data safety declaration up to date
- [ ] Respond to any policy violation emails promptly
- [ ] Maintain a working privacy policy URL

### Monitoring

Check these regularly in Google Play Console:
- **Dashboard** — installs, ratings, crashes
- **Android Vitals** — ANR rate, crash rate (keep both under 1%)
- **Reviews & Ratings** — respond to feedback
- **Statistics** — track install/uninstall trends

---

## Troubleshooting

### Browser address bar appears in the app

This means Digital Asset Links verification failed. Check:

1. ✅ `assetlinks.json` is at `https://yourdomain.com/.well-known/assetlinks.json`
2. ✅ The SHA-256 fingerprint matches your signing key exactly
3. ✅ The `package_name` is `com.shoreexplorer.app`
4. ✅ The file returns `Content-Type: application/json`
5. ✅ There are no redirects on the `.well-known` path
6. ✅ The domain in `twa-manifest.json` matches your production domain

### App rejected by Google Play

| Rejection Reason | Fix |
|---|---|
| "Minimum functionality" | Ensure all features (AI plans, maps, weather) work reliably |
| "Deceptive behaviour" | Ensure description accurately matches actual features |
| "Missing privacy policy" | Verify `https://yourdomain.com/privacy` is accessible |
| "Crashes on launch" | Test on multiple devices/Android versions |
| "Policy violation" | Read the specific violation and address it |

### Build fails in CI/CD

1. Check the GitHub Actions log for the specific error message
2. Common issues:
   - `ANDROID_KEYSTORE_BASE64` secret is missing or incorrectly encoded
   - Java version mismatch — ensure JDK 17 is used
   - Bubblewrap CLI incompatibility — check for updates
3. Try running the workflow again (transient failures happen)

---

## GitHub Secrets Reference

| Secret | Required For | Description |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | All builds | Base64-encoded signing keystore |
| `ANDROID_KEYSTORE_PASSWORD` | All builds | Keystore password |
| `ANDROID_KEY_PASSWORD` | All builds | Key password (often same as keystore) |
| `ANDROID_KEY_ALIAS` | All builds | Alias in keystore (default: `shoreexplorer`) |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Auto-upload | Service account for Play Console API |
| `TEST_BACKEND_URL` | Beta builds | Backend API URL for test environment |
| `TEST_SITE_URL` | Beta builds | Frontend URL for test environment |
| `PROD_BACKEND_URL` | Prod builds | Backend API URL for production |
| `PROD_SITE_URL` | Prod builds | Frontend URL for production |
