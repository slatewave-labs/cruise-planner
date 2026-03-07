# Plan: App Store Launch (Google Play & Apple App Store)

> **Priority:** MEDIUM — Medium-term growth enabler  
> **Estimated effort:** 8–12 weeks  
> **Related:** `MONETIZATION-STRATEGY.md` (Stream 7)

---

## Overview

ShoreExplorer is already a PWA (Progressive Web App) built with React. This makes it relatively straightforward to publish to both the Google Play Store and Apple App Store using wrapper technologies. Being on app stores dramatically increases discoverability and enables native features like push notifications and in-app purchases.

---

## Platform Comparison

| Factor | Google Play | Apple App Store |
|---|---|---|
| Developer account | $25 one-time | $99/year |
| PWA acceptance | ✅ TWA supported | ⚠️ Needs native features |
| Wrapper technology | Bubblewrap / PWABuilder | Capacitor + Xcode |
| Review time | 1–3 days | 3–7 days |
| Commission on sales | 15% (first $1M) | 15% (Small Business Program) |
| Push notifications | ✅ Web push or FCM | ⚠️ Requires native integration |
| In-app purchases | ✅ Google Play Billing | ✅ StoreKit |
| Mac required | ❌ | ✅ (for Xcode build) |

---

## Phase 1: Google Play Store (Week 1–4)

### Approach: Trusted Web Activity (TWA)

TWA wraps the existing PWA in a lightweight Android shell. The app runs the web content full-screen with no browser UI — it looks and feels native.

### Prerequisites

- [ ] PWA passes Lighthouse audit (score >90)
- [ ] `manifest.json` is complete (name, icons, theme colour, start_url)
- [ ] Service worker handles offline (at minimum, show a cached offline page)
- [ ] HTTPS enabled on production domain
- [ ] `.well-known/assetlinks.json` hosted on the domain

### Step-by-Step

#### 1.1 Audit and Prepare PWA

```bash
# Run Lighthouse audit
npx lighthouse https://shoreexplorer.com --output html --output-path ./lighthouse-report.html

# Key scores needed:
# - Performance: >80
# - PWA: >90
# - Accessibility: >90
# - Best Practices: >90
```

**PWA checklist:**
- [ ] `manifest.json` has all required fields:
  ```json
  {
    "name": "ShoreExplorer — Cruise Port Day Planner",
    "short_name": "ShoreExplorer",
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#0F172A",
    "background_color": "#F5F5F4",
    "icons": [
      { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
      { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
    ]
  }
  ```
- [ ] Service worker registered and caching critical assets
- [ ] Offline fallback page shows useful message

#### 1.2 Generate TWA using Bubblewrap

```bash
# Install Bubblewrap CLI
npm install -g @nicolo-ribaudo/bubblewrap

# Initialize TWA project
bubblewrap init --manifest https://shoreexplorer.com/manifest.json

# Configure:
# - Package name: com.shoreexplorer.app
# - App name: ShoreExplorer
# - Launcher name: ShoreExplorer
# - Theme color: #0F172A
# - Background color: #F5F5F4
# - Start URL: /
# - Signing key: Create new
```

#### 1.3 Digital Asset Links

Host on the production domain for TWA verification:

```json
// https://shoreexplorer.com/.well-known/assetlinks.json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.shoreexplorer.app",
    "sha256_cert_fingerprints": ["AA:BB:CC:..."]
  }
}]
```

#### 1.4 Build and Sign APK

```bash
# Build the APK
bubblewrap build

# Output: app-release-signed.apk
# Also generates: app-release-bundle.aab (preferred for Play Store)
```

#### 1.5 Google Play Console Setup

1. Create Google Play Developer account ($25)
2. Create new app: "ShoreExplorer — Cruise Port Day Planner"
3. Fill in store listing:
   - **Title:** ShoreExplorer — Cruise Port Day Planner
   - **Short description:** Plan your perfect day at every cruise port with AI-powered itineraries, maps, and weather.
   - **Full description:** (See App Store Listing Copy below)
   - **Category:** Travel & Local
   - **Screenshots:** Phone (6.5" and 5.5"), Tablet (optional)
   - **Feature graphic:** 1024×500 banner image
   - **Privacy policy URL:** https://shoreexplorer.com/privacy
4. Upload AAB bundle
5. Set pricing: Free (with in-app purchases)
6. Submit for review

#### 1.6 Google Play App Store Listing Copy

```
Title: ShoreExplorer — Cruise Port Day Planner

Short Description:
Plan your perfect day at every cruise port with AI-powered itineraries, 
interactive maps, and real-time weather forecasts.

Full Description:
🚢 PLANNING A CRUISE? Let ShoreExplorer be your personal port day guide.

ShoreExplorer generates personalised day plans for your cruise port visits, 
so you can make the most of every shore excursion.

✨ FEATURES:
• AI-Powered Day Plans — Get a tailored itinerary based on your interests, 
  budget, and how long you're in port
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
Generate up to 3 AI day plans per month for free. 
Upgrade to Premium for unlimited plans, PDF export, and an ad-free experience.

Plan smarter. Explore more. Return to the ship on time.
```

---

## Phase 2: Apple App Store (Week 5–10)

### Approach: Capacitor Wrapper

Apple is stricter about web wrappers. We need to use Ionic Capacitor to create a native shell and add at least one native feature (push notifications is the easiest win).

### Prerequisites

- [ ] Mac with Xcode installed (or CI/CD with Mac runner)
- [ ] Apple Developer account ($99/year)
- [ ] At least one native feature (push notifications)
- [ ] App icons in all required sizes

### Step-by-Step

#### 2.1 Add Capacitor to the Project

```bash
cd frontend

# Install Capacitor
yarn add @capacitor/core @capacitor/cli
yarn add @capacitor/ios @capacitor/push-notifications

# Initialize Capacitor
npx cap init "ShoreExplorer" "com.shoreexplorer.app" --web-dir build

# Build the React app
yarn build

# Add iOS platform
npx cap add ios

# Sync web assets to native project
npx cap sync ios
```

#### 2.2 Configure Capacitor

```json
// capacitor.config.json
{
  "appId": "com.shoreexplorer.app",
  "appName": "ShoreExplorer",
  "webDir": "build",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "PushNotifications": {
      "presentationOptions": ["badge", "sound", "alert"]
    }
  }
}
```

#### 2.3 Add Native Push Notifications

This is the key native feature that justifies App Store approval:

```javascript
// frontend/src/pushNotifications.js (NEW)

import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const initPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive === 'granted') {
    await PushNotifications.register();
  }
  
  PushNotifications.addListener('registration', (token) => {
    // Send token to backend for departure reminders
    console.log('Push registration token:', token.value);
  });
  
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
  });
};
```

**Use case for push notifications:**
- "Don't forget! Your ship departs from Barcelona at 17:00. Head back by 16:00."
- "Weather update: Rain expected in Naples tomorrow. Check your plan for indoor alternatives."

#### 2.4 Build and Submit

```bash
# Build React app
cd frontend && yarn build

# Sync to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# In Xcode:
# 1. Set team and signing
# 2. Configure app icons (Assets.xcassets)
# 3. Set deployment target (iOS 15+)
# 4. Archive and submit to App Store Connect
```

#### 2.5 App Store Connect Setup

1. Create new app in App Store Connect
2. Fill in metadata (similar to Google Play listing)
3. Upload screenshots for:
   - iPhone 6.7" (required)
   - iPhone 6.5" (required)
   - iPad 12.9" (if supporting iPad)
4. Set pricing: Free (with in-app purchases)
5. Configure in-app purchases via StoreKit
6. Submit for review

### Common Apple Rejection Reasons & Mitigations

| Rejection Reason | Mitigation |
|---|---|
| "App is a repackaged website" | Add push notifications, offline mode, native gestures |
| "Limited functionality" | Ensure AI plan generation, maps, weather all work well |
| "Missing privacy labels" | Fill in App Privacy section accurately |
| "Crashes on launch" | Test thoroughly on real devices |
| "In-app purchase issues" | Use StoreKit for iOS payments (Apple requirement) |

---

## Phase 3: In-App Purchases (Week 8–12)

### Google Play Billing

For Android, use the Google Play Billing Library for premium subscriptions:

```javascript
// Use the @nicolo-ribaudo/nicolo-nicolo pattern or a Capacitor plugin
// e.g., @nicolo-nicolo/capacitor-purchases (RevenueCat)
```

### Apple StoreKit

For iOS, all digital purchases MUST go through Apple's StoreKit:

```javascript
// RevenueCat is the recommended cross-platform solution
// Handles both Google Play and Apple subscriptions with a single API
```

### RevenueCat Integration (Recommended)

RevenueCat provides a unified API for managing subscriptions across platforms:

```bash
# Install RevenueCat
yarn add @revenuecat/purchases-capacitor

# Revenue Cat handles:
# - Google Play Billing
# - Apple StoreKit
# - Subscription management
# - Analytics and churn prevention
# - Free tier: up to $2,500/month in revenue
```

---

## App Store Optimization (ASO)

### Keywords to Target

**Primary:**
- cruise port planner
- shore excursion app
- cruise day planner
- cruise port activities

**Secondary:**
- cruise trip planner
- port of call guide
- cruise travel guide
- shore excursion planning

### Screenshot Strategy

Create 6 screenshots showing:
1. Hero/splash with tagline
2. Trip setup with ports
3. AI plan generation in action
4. Beautiful day plan with map
5. Activity cards with booking links
6. Weather forecast integration

### Rating & Review Strategy

- Prompt for review after a user's second successful plan generation
- Use the native review APIs (Google Play In-App Review, SKStoreReviewController)
- Never prompt during errors or loading states
- Limit to once every 60 days

---

## Timeline

| Week | Milestone |
|---|---|
| 1 | Audit PWA, fix Lighthouse issues |
| 2 | Generate TWA with Bubblewrap |
| 3 | Set up Google Play Console, prepare assets |
| 4 | Submit to Google Play Store |
| 5 | Add Capacitor to project |
| 6 | Implement push notifications |
| 7 | Test on iOS devices |
| 8 | Set up App Store Connect, prepare assets |
| 9 | Submit to Apple App Store |
| 10 | Address any Apple review feedback |
| 11 | Implement in-app purchases (RevenueCat) |
| 12 | Launch premium subscriptions on both stores |

---

## Cost Summary

| Item | Cost | Frequency |
|---|---|---|
| Google Play Developer account | $25 | One-time |
| Apple Developer account | $99 | Annual |
| RevenueCat | Free | Up to $2,500/month revenue |
| Screenshots / graphics | $0–200 | One-time (DIY or designer) |
| Mac for iOS builds | $0 | Use GitHub Actions Mac runner |
| **Total Year 1** | **~$125–325** | |

---

## Implementation Checklist

### Google Play (Phase 1)
- [ ] Run Lighthouse audit and fix issues
- [ ] Update `manifest.json` with all required fields
- [ ] Create maskable icon (512×512)
- [ ] Implement basic service worker for offline
- [ ] Set up Bubblewrap project
- [ ] Create Digital Asset Links file
- [ ] Build and sign AAB bundle
- [ ] Create Google Play Developer account
- [ ] Prepare store listing (screenshots, description, feature graphic)
- [ ] Upload and submit for review
- [ ] Monitor review feedback and iterate

### Apple App Store (Phase 2)
- [ ] Add Capacitor to frontend project
- [ ] Implement push notifications
- [ ] Create Apple Developer account
- [ ] Configure Xcode project (signing, icons, splash screens)
- [ ] Build and test on real iOS devices
- [ ] Prepare App Store Connect listing
- [ ] Configure App Privacy labels
- [ ] Submit for review
- [ ] Address rejection feedback (if any)

### In-App Purchases (Phase 3)
- [ ] Set up RevenueCat account
- [ ] Create subscription products in Google Play Console
- [ ] Create subscription products in App Store Connect
- [ ] Integrate RevenueCat SDK
- [ ] Test purchase flows on both platforms
- [ ] Implement receipt validation
- [ ] Handle subscription lifecycle events

---

## Files to Create/Modify

| File | Action | Description |
|---|---|---|
| `frontend/capacitor.config.json` | CREATE | Capacitor configuration |
| `frontend/src/pushNotifications.js` | CREATE | Push notification setup |
| `frontend/public/manifest.json` | MODIFY | Add all required PWA fields |
| `frontend/public/.well-known/assetlinks.json` | CREATE | Android app verification |
| `frontend/ios/` | CREATE (auto) | Xcode project (generated by Capacitor) |
| `frontend/android/` | CREATE (auto) | Android project (generated by Bubblewrap) |
| `.github/workflows/build-android.yml` | CREATE | CI for Android builds |
| `.github/workflows/build-ios.yml` | CREATE | CI for iOS builds |
| `infra/app-store/` | CREATE | Store listing assets and metadata |
