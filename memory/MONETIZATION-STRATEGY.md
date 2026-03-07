# ShoreExplorer — Monetization & Revenue Strategy

> **Status:** SPIKE — Research & Planning  
> **Date:** 2026-03-07  
> **Goal:** Make ShoreExplorer profitable within 3 months or the product will be shelved.

---

## Executive Summary

ShoreExplorer currently earns **zero revenue**. The only monetization infrastructure in place is an affiliate link system (Viator, GetYourGuide, Klook, TripAdvisor, Booking.com) that is **configured but generating no income** because there is no meaningful traffic yet.

This document proposes **7 revenue streams** ranked by implementation effort vs. revenue potential, along with a financial model showing how each contributes to the 3-month profitability target.

---

## Current Cost Baseline

| Cost Category | Monthly Estimate | Notes |
|---|---|---|
| AWS Infrastructure (S3 + CloudFront) | ~£5–15 | Static site hosting, low traffic |
| Groq API (LLM calls) | ~£0–50 | ~£0.01/request, depends on usage |
| Domain name | ~£1 | Annual cost amortized |
| **Total monthly burn** | **~£6–65** | Scales with usage |

**Break-even target:** Generate >£65/month in revenue consistently.

---

## Revenue Stream Overview

| # | Revenue Stream | Effort | Time to Revenue | Monthly Potential (at 1K MAU) | Monthly Potential (at 10K MAU) |
|---|---|---|---|---|---|
| 1 | Affiliate booking links (existing) | ✅ Done | Immediate (needs traffic) | £20–80 | £200–800 |
| 2 | Display advertising (Google AdSense) | 🟡 Low | 1–2 weeks | £5–40 | £50–400 |
| 3 | SEO port guide content pages | 🟡 Medium | 4–8 weeks (SEO ramp) | £0 (traffic growth) | Enables streams 1+2 |
| 4 | Premium features / freemium | 🔴 High | 4–6 weeks | £50–200 | £500–2,000 |
| 5 | Curated port database (LLM cost elimination) | 🔴 High | 6–8 weeks | Saves £30–50 in costs | Saves £300–500 |
| 6 | Sponsored port content / local business listings | 🟡 Medium | 4–8 weeks | £50–200 | £500–2,000 |
| 7 | App store presence (Google Play / Apple) | 🔴 High | 8–12 weeks | Enables all streams at scale | — |

---

## Detailed Revenue Streams

### 1. Affiliate Booking Links (EXISTING — Optimize)

**Status:** Infrastructure is built. Affiliate IDs need to be obtained and configured.

**How it works today:**
- AI generates a day plan with activities
- `affiliate_config.py` adds affiliate tracking parameters to booking URLs
- Supports: Viator (8%), GetYourGuide (8%), Klook (4–6%), TripAdvisor (5–7%), Booking.com (3–4%)

**What needs to happen:**
1. **Sign up for affiliate programs** — Viator and GetYourGuide are the highest priority (8% commission, 30-day cookies)
2. **Improve booking link prominence** — Make "Book This Activity" buttons more visually prominent in `ActivityCard.js`
3. **Add affiliate disclosure** — Required by FTC/ASA; add to Terms & Conditions page
4. **Track click-throughs** — Add Google Analytics events for affiliate link clicks
5. **A/B test link placement** — Test inline vs. bottom-of-card vs. dedicated booking section

**Revenue model:**
- Average tour booking: £40–80
- Commission: 8% = £3.20–6.40 per booking
- Conversion rate from click to booking: ~2–5%
- If 10% of users click a booking link and 3% convert:
  - 1,000 MAU × 10% clicks × 3% conversion × £4.80 avg commission = **£14.40/month**
  - 10,000 MAU × 10% × 3% × £4.80 = **£144/month**

**Implementation plan:** See `AFFILIATE_LINKS.md` (already exists)

---

### 2. Display Advertising (Google AdSense)

**Revenue potential:** £3–8 RPM (Revenue Per 1,000 page views) in the travel niche.

**Where to place ads (tastefully):**
- **Port guide pages** (content pages, see Stream 3) — banner ads between sections
- **After plan generation** — a single ad banner below the day plan summary
- **My Trips page** — sidebar/footer ad on desktop
- **NEVER:** During plan generation loading, on the map, or overlapping interactive elements

**Key principles:**
- Ads must not degrade the premium feel of the app
- 48px minimum clearance from interactive elements (accessibility)
- Offer an ad-free experience as a premium feature (see Stream 4)
- Respect cookie consent (GDPR) — only show personalized ads if consented

**Revenue model:**
- Average travel RPM: £4 (Tier 1 audience: UK/US/AU)
- 1,000 MAU × ~5 pageviews/session × 2 sessions/month = 10,000 pageviews
- 10,000 pageviews × £4/1,000 = **£40/month**
- At 10K MAU: **£400/month**

**Implementation plan:** See `PLAN-DISPLAY-ADS.md`

---

### 3. SEO Port Guide Content Pages

**This is the most critical revenue enabler.** Without traffic, no other stream works.

**Strategy:** Create static, SEO-optimized port guide pages for the top 50–100 cruise ports that rank for searches like:
- "things to do in Barcelona from cruise port"
- "Cozumel shore excursion planning"
- "best activities near Naples cruise terminal"

**Why this works:**
- Cruise passengers actively Google port info before their trip
- Long-tail cruise port keywords have moderate competition and high commercial intent
- Each page naturally integrates affiliate booking links AND display ads
- Content pages drive organic traffic that feeds all other revenue streams

**Content structure per port:**
1. Port overview (location, terminal info, distance to town)
2. Top 10 activities with booking links (affiliate revenue)
3. Getting around (transport options)
4. Food & drink recommendations
5. Safety tips
6. Weather by month
7. CTA: "Generate a personalized AI day plan for [Port Name]" → drives app usage

**Revenue model:** Indirect — drives traffic that enables Streams 1 and 2. A port guide page ranking #1 for "things to do in [popular port]" can drive 500–2,000 visits/month per port.

**Implementation plan:** See `PLAN-PORT-GUIDE-CONTENT.md`

---

### 4. Premium Features / Freemium Model

**Free tier (current functionality):**
- 3 AI-generated plans per month
- Basic activity cards
- Standard map view
- Ads shown

**Premium tier (£2.99/month or £19.99/year):**
- Unlimited AI plan regenerations
- Ad-free experience
- Offline plan downloads (PDF export)
- Priority AI generation (faster response times)
- Multi-plan comparison for same port
- Shareable plan links
- Custom activity additions to plans
- Budget tracking across all ports

**Why subscription over one-off purchase:**
- Recurring revenue is more predictable
- Cruise passengers plan multiple trips per year
- Annual subscription (£19.99) captures the "planning season" value
- Monthly option for casual users

**Revenue model:**
- 1,000 MAU × 5% conversion to premium × £2.99/month = **£149.50/month**
- 10,000 MAU × 3% conversion × £2.99/month = **£897/month**

**Implementation plan:** See `PLAN-PREMIUM-FEATURES.md`

---

### 5. Curated Port Database (LLM Cost Elimination)

**Problem:** Each LLM call costs ~£0.01 and produces unreliable results (hallucinated locations, broken links, poor timing estimates).

**Solution:** Build a curated activity database for top cruise ports and use algorithmic itinerary generation instead of (or in addition to) LLM calls.

**Hybrid approach:**
1. **Phase 1:** Cache LLM-generated plans and reuse for similar preference profiles (reduces calls by ~60%)
2. **Phase 2:** Build curated database for top 20 ports with verified activities, real coordinates, real opening hours, real prices
3. **Phase 3:** Use rule-based itinerary assembly (constraint solver) with LLM only for narrative text generation (much cheaper, shorter prompts)

**Benefits:**
- Eliminates hallucination problem completely for curated ports
- Reduces LLM costs from ~£0.01/plan to ~£0.001/plan (narrative only)
- Faster plan generation (no API wait time for cached/curated results)
- More reliable booking links (verified URLs, not LLM-generated)
- Enables offline plan generation for curated ports

**Revenue impact:** Cost reduction of £30–500/month depending on scale, plus improved user experience leads to higher conversion rates.

**Implementation plan:** See `PLAN-LLM-COST-REDUCTION.md`

---

### 6. Sponsored Port Content / Local Business Listings

**Concept:** Allow local businesses at cruise ports (restaurants, tour operators, shops) to pay for featured placement in day plans and port guides.

**Tiers:**
- **Free listing:** Business appears in the general port database
- **Featured listing (£10–50/month):** Highlighted placement in AI-generated plans and port guides, with logo and description
- **Sponsored activity (£25–100/month):** Guaranteed inclusion in plans matching relevant preferences

**Why businesses would pay:**
- Cruise passengers are high-value customers (average spend of £80–150/port day)
- Guaranteed visibility to a pre-qualified audience
- Performance-trackable (clicks, bookings)

**Revenue model:**
- 20 ports × 3 featured businesses × £25/month = **£1,500/month** at maturity
- Start small: 5 ports × 2 businesses × £15/month = **£150/month**

**Prerequisites:** Need meaningful traffic first (>5,000 MAU). This is a medium-term revenue stream.

**Implementation considerations:**
- Need a simple business self-service portal (or manual outreach initially)
- Must clearly label sponsored content (FTC/ASA compliance)
- Maintain editorial integrity — sponsored activities should still be genuinely good recommendations

---

### 7. App Store Presence

**See `PLAN-APP-STORE-LAUNCH.md` for full details.**

**Quick summary:**
- Google Play: Use TWA (Trusted Web Activity) wrapper — cost: £20 one-off
- Apple App Store: Use Capacitor for native shell — cost: £80/year + development time
- Enables in-app purchases for premium features
- Enables push notifications for departure reminders
- Massive discovery advantage (app store search)

---

## Financial Projections (3-Month Target)

### Month 1 (Build Foundation)
| Stream | Revenue | Notes |
|---|---|---|
| Affiliate links | £0–5 | Traffic still building |
| Display ads | £5–15 | Implemented week 2 |
| SEO content | £0 | Content published, not yet ranking |
| Premium features | £0 | In development |
| **Total** | **£5–20** | |
| **Costs** | **~£15** | |

### Month 2 (Growth Phase)
| Stream | Revenue | Notes |
|---|---|---|
| Affiliate links | £10–30 | Some organic traffic arriving |
| Display ads | £20–60 | More pages, more traffic |
| SEO content | £0 | Starting to rank for long-tail terms |
| Premium features | £30–100 | Launched, early adopters |
| **Total** | **£60–190** | |
| **Costs** | **~£25** | |

### Month 3 (Profitability Target)
| Stream | Revenue | Notes |
|---|---|---|
| Affiliate links | £30–80 | Traffic growing, conversions improving |
| Display ads | £40–120 | 5K+ pageviews/month |
| SEO content | — | Traffic growth feeds other streams |
| Premium features | £80–250 | 3–5% of users converting |
| Sponsored content | £0–50 | First pilot businesses |
| **Total** | **£150–500** | |
| **Costs** | **~£30** | |

**Verdict:** Profitability is achievable by Month 3 if traffic growth targets are met. The critical path is: SEO content → organic traffic → ad revenue + affiliate conversions + premium upgrades.

---

## Priority Execution Order

1. **Week 1–2:** Implement display ads (quick revenue) + sign up for affiliate programs
2. **Week 2–4:** Build and publish port guide content for top 20 ports (SEO traffic)
3. **Week 3–5:** Implement premium features + plan caching (reduce LLM costs)
4. **Week 4–8:** SEO optimization + growth marketing (see `PLAN-SEO-AND-GROWTH.md`)
5. **Week 6–10:** Curated port database for top ports (eliminate LLM dependency)
6. **Week 8–12:** App store submission (Google Play first, then Apple)
7. **Ongoing:** Sponsored content outreach once traffic exceeds 5K MAU

---

## Key Metrics to Track

| Metric | Target (Month 3) | Tool |
|---|---|---|
| Monthly Active Users (MAU) | 2,000+ | Google Analytics |
| Plans generated per month | 500+ | Backend logs |
| Affiliate link clicks | 100+/month | GA events |
| Affiliate conversions | 5+/month | Affiliate dashboards |
| Ad RPM | £3–8 | AdSense dashboard |
| Premium conversion rate | 3–5% | Custom tracking |
| Organic search traffic | 1,000+/month | Google Search Console |
| Bounce rate | <60% | Google Analytics |
| Average session duration | >3 min | Google Analytics |

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Low traffic / slow SEO | Supplement with social media marketing, cruise forum posts, travel blogger outreach |
| LLM costs spike with traffic | Implement plan caching immediately; move to curated database |
| Affiliate programs reject application | Apply to multiple programs simultaneously; start with Viator (easiest approval) |
| AdSense policy issues | Follow guidelines strictly; avoid ads near interactive elements |
| Premium tier has low conversion | A/B test pricing; offer 7-day free trial; add more premium features |
| App store rejection | Follow TWA best practices; add native features for Apple |

---

## Related Documents

- `PLAN-DISPLAY-ADS.md` — Display advertising implementation
- `PLAN-LLM-COST-REDUCTION.md` — LLM cost reduction and quality improvement
- `PLAN-SEO-AND-GROWTH.md` — SEO and user acquisition strategy
- `PLAN-PREMIUM-FEATURES.md` — Freemium model and premium features
- `PLAN-APP-STORE-LAUNCH.md` — App store launch plan
- `PLAN-PORT-GUIDE-CONTENT.md` — Port guide content system
- `AFFILIATE_LINKS.md` — Existing affiliate link documentation
