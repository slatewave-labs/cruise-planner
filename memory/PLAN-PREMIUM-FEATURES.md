# Plan: Premium Features & Freemium Model

> **Priority:** HIGH — Recurring revenue stream  
> **Estimated effort:** 4–6 weeks  
> **Related:** `MONETIZATION-STRATEGY.md` (Stream 4)

---

## Overview

Introduce a freemium model where the core ShoreExplorer experience remains free, but power users can unlock premium features for a small subscription. This is the most sustainable long-term revenue model and creates a clear upgrade path when the app moves to app stores.

---

## Tier Comparison

| Feature | Free Tier | Premium Tier |
|---|---|---|
| AI plan generation | 3 plans/month | Unlimited |
| Port guide access | ✅ Full access | ✅ Full access |
| Interactive map | ✅ Basic | ✅ Enhanced (offline maps) |
| Weather forecasts | ✅ Current day | ✅ 7-day extended forecast |
| Activity cards | ✅ Standard | ✅ With reviews & photos |
| Booking links | ✅ Yes | ✅ Yes |
| Display ads | ⚠️ Shown | ✅ Ad-free |
| PDF export | ❌ | ✅ Export plan as PDF |
| Offline access | ❌ | ✅ Save plans offline |
| Multi-plan comparison | ❌ | ✅ Compare 3 plans side-by-side |
| Custom activities | ❌ | ✅ Add own activities to plans |
| Budget tracker | ❌ | ✅ Track spending across ports |
| Priority generation | ❌ | ✅ Faster AI response times |
| Plan sharing | ❌ | ✅ Share via link |
| Departure reminders | ❌ | ✅ Push notifications |

---

## Pricing Strategy

### Web (Current)

| Plan | Price | Billing |
|---|---|---|
| Free | £0 | — |
| Premium Monthly | £2.99/month | Recurring |
| Premium Annual | £19.99/year (£1.67/month) | Recurring, 44% savings |
| Lifetime | £39.99 one-off | One-time purchase (web only) |

**Important note on lifetime purchases:** Apple strongly discourages non-consumable lifetime purchases in favour of subscriptions. The lifetime tier should only be offered on the web version (via Stripe). For app store versions, offer monthly and annual subscriptions only. This avoids App Store review issues and aligns with Apple's preferred monetization model.

**Why these prices:**
- £2.99/month is below the "impulse buy" threshold
- Annual plan offers genuine savings, encouraging commitment
- Lifetime option for price-sensitive users who dislike subscriptions
- All prices below the cost of a single shore excursion (~£40–80)

### App Store (Future)

| Plan | Google Play | Apple App Store |
|---|---|---|
| Free (with ads) | £0 | £0 |
| Premium Monthly | £2.99 | £2.99 |
| Premium Annual | £19.99 | £19.99 |
| One-time unlock | £4.99 | £4.99 |

**Note:** App store commissions are 15% (small developer program) on first £1M revenue.

---

## Payment Implementation (Web)

### Option A: Stripe (Recommended)

**Why Stripe:**
- Simple integration with React
- Handles subscriptions natively
- Low fees (1.4% + 20p for European cards)
- No monthly fee
- Customer portal for self-service management

**Architecture:**

```
User clicks "Upgrade" → Stripe Checkout (hosted page) → Webhook to backend
                                                         → Set premium flag in localStorage
                                                         → Sync premium status on next visit
```

**Implementation:**

```python
# backend/payments.py (NEW)

import stripe
from fastapi import APIRouter

router = APIRouter()

@router.post("/api/payments/create-checkout")
async def create_checkout(request: Request, data: CheckoutInput):
    """Create a Stripe Checkout session for premium upgrade."""
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price": get_price_id(data.plan),  # monthly, annual, or lifetime
            "quantity": 1,
        }],
        mode="subscription" if data.plan != "lifetime" else "payment",
        success_url=f"{FRONTEND_URL}/premium/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_URL}/premium/cancel",
        client_reference_id=data.device_id,
    )
    return {"checkout_url": session.url}

@router.post("/api/payments/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    # Verify webhook signature
    # On successful payment: store premium status
    # On subscription cancelled: remove premium status
    pass

@router.get("/api/payments/status/{device_id}")
async def payment_status(device_id: str):
    """Check if a device has an active premium subscription."""
    # Lookup in DynamoDB or simple JSON store
    return {"is_premium": True, "plan": "annual", "expires": "2027-03-07"}
```

**Frontend flow:**

```jsx
// frontend/src/pages/PremiumUpgrade.js (NEW)

const PremiumUpgrade = () => {
  const handleUpgrade = async (plan) => {
    const { data } = await api.post('/api/payments/create-checkout', {
      plan,  // 'monthly', 'annual', 'lifetime'
      device_id: getDeviceId(),
    });
    window.location.href = data.checkout_url; // Redirect to Stripe
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl font-bold text-primary mb-6">
        Upgrade to Premium
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PricingCard
          plan="monthly"
          price="£2.99"
          period="per month"
          onSelect={() => handleUpgrade('monthly')}
        />
        <PricingCard
          plan="annual"
          price="£19.99"
          period="per year"
          badge="Best Value"
          highlight={true}
          onSelect={() => handleUpgrade('annual')}
        />
        <PricingCard
          plan="lifetime"
          price="£39.99"
          period="one-time"
          onSelect={() => handleUpgrade('lifetime')}
        />
      </div>
    </div>
  );
};
```

### Option B: LemonSqueezy (Simpler Alternative)

If Stripe is too complex, LemonSqueezy offers:
- Hosted checkout with no backend required
- Built-in subscription management
- Tax handling included
- Lower developer effort
- Slightly higher fees (5% + 50p)

---

## Plan Generation Limits (Free Tier)

### Implementation

```javascript
// frontend/src/utils.js — Add plan limit tracking

const PLAN_LIMIT_KEY = 'shoreexplorer_plan_count';
const FREE_PLAN_LIMIT = 3;

export const getPlanCount = () => {
  const data = localStorage.getItem(PLAN_LIMIT_KEY);
  if (!data) return { count: 0, resetDate: getMonthStart() };
  const parsed = JSON.parse(data);
  
  // Reset counter at start of each month
  if (new Date(parsed.resetDate) < getMonthStart()) {
    return { count: 0, resetDate: getMonthStart() };
  }
  return parsed;
};

export const incrementPlanCount = () => {
  const current = getPlanCount();
  const updated = { count: current.count + 1, resetDate: current.resetDate };
  localStorage.setItem(PLAN_LIMIT_KEY, JSON.stringify(updated));
  return updated;
};

export const canGeneratePlan = () => {
  const isPremium = localStorage.getItem('shoreexplorer_premium') === 'true';
  if (isPremium) return true;
  return getPlanCount().count < FREE_PLAN_LIMIT;
};

export const getRemainingPlans = () => {
  const isPremium = localStorage.getItem('shoreexplorer_premium') === 'true';
  if (isPremium) return Infinity;
  return Math.max(0, FREE_PLAN_LIMIT - getPlanCount().count);
};
```

### UI for Plan Limits

```jsx
// In PortPlanner.js, before the "Generate Plan" button

{!canGeneratePlan() && (
  <div className="bg-accent/10 border border-accent rounded-2xl p-4 mb-4">
    <p className="text-primary font-body font-medium">
      You've used all 3 free plans this month.
    </p>
    <p className="text-primary/70 font-body text-sm mt-1">
      Upgrade to Premium for unlimited plan generation.
    </p>
    <Link
      to="/premium"
      className="inline-block mt-3 bg-accent text-white rounded-full 
                 px-6 py-3 font-body font-semibold text-sm
                 hover:bg-accent/90 transition-colors min-h-[48px]"
    >
      Upgrade to Premium — £2.99/month
    </Link>
  </div>
)}

{canGeneratePlan() && !isPremium && (
  <p className="text-primary/50 font-body text-sm mb-4">
    {getRemainingPlans()} free plans remaining this month
  </p>
)}
```

---

## Premium Status Management

### localStorage Schema

```javascript
// Premium status stored locally
{
  key: 'shoreexplorer_premium',
  value: JSON.stringify({
    active: true,
    plan: 'annual',        // 'monthly', 'annual', 'lifetime'
    expires: '2027-03-07', // null for lifetime
    device_id: 'uuid-xxx',
    verified_at: '2026-03-07T10:00:00Z',
  })
}
```

### Verification Flow

```
1. App loads → Check localStorage for premium status
2. If premium flag exists and not expired → Premium active
3. On each app load, verify with backend (if online):
   GET /api/payments/status/{device_id}
   → Update local premium status
4. If backend says expired → Remove local premium flag
5. Show upgrade prompt
```

### Handling Edge Cases

- **Offline:** Trust localStorage (grace period until next online check)
- **Device change:** Premium tied to device_id; provide "Restore Purchase" flow
- **Subscription cancelled:** Backend webhook updates status; next app load syncs
- **Refund requested:** Stripe webhook triggers immediate premium removal

---

## Premium Feature: PDF Export

One of the highest-value premium features — cruise passengers often want a printed day plan.

```jsx
// frontend/src/components/PlanPDFExport.js (NEW)

import { jsPDF } from 'jspdf';

const exportPlanToPDF = (plan) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text(plan.plan_title, 20, 20);
  
  // Summary
  doc.setFontSize(12);
  doc.text(plan.summary, 20, 35, { maxWidth: 170 });
  
  // Activities
  let y = 55;
  plan.activities.forEach((activity, i) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text(`${activity.start_time} — ${activity.name}`, 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(activity.description, 25, y, { maxWidth: 160 });
    y += 15;
  });
  
  // Footer
  doc.setFontSize(8);
  doc.text('Generated by ShoreExplorer — shoreexplorer.com', 20, 285);
  
  doc.save(`${plan.plan_title.replace(/\s+/g, '-')}.pdf`);
};
```

---

## Implementation Checklist

### Phase 1: Plan Limits + Upgrade UI (Week 1–2)
- [ ] Add plan counting logic to `utils.js`
- [ ] Add plan limit check to `PortPlanner.js`
- [ ] Create `PremiumUpgrade.js` page with pricing cards
- [ ] Add premium route to `App.js`
- [ ] Add "Upgrade" link to navigation
- [ ] Style pricing cards per design guidelines
- [ ] Add "remaining plans" counter to UI

### Phase 2: Payment Integration (Week 3–4)
- [ ] Set up Stripe account and products
- [ ] Create `backend/payments.py` with checkout + webhook endpoints
- [ ] Add Stripe webhook handling
- [ ] Implement premium status checking
- [ ] Test checkout flow end-to-end
- [ ] Add "Restore Purchase" flow
- [ ] Handle subscription lifecycle (create, renew, cancel, refund)

### Phase 3: Premium Features (Week 4–6)
- [ ] Implement ad-free experience for premium users
- [ ] Implement PDF export (`jsPDF`)
- [ ] Implement plan sharing via URL
- [ ] Implement multi-plan comparison view
- [ ] Add custom activity insertion to plans
- [ ] Add budget tracker component

### Phase 4: Marketing & Optimization
- [ ] Add premium upsell prompts at key moments (after plan generation, after 2 visits)
- [ ] A/B test pricing (£1.99 vs £2.99 vs £3.99)
- [ ] Track conversion funnel (view pricing → start checkout → complete)
- [ ] Add 7-day free trial option
- [ ] Create "What's included" comparison modal

---

## Revenue Projections

| MAU | Conversion Rate | Monthly Revenue |
|---|---|---|
| 500 | 5% | 25 × £2.99 = £74.75 |
| 1,000 | 4% | 40 × £2.99 = £119.60 |
| 5,000 | 3% | 150 × £2.99 = £448.50 |
| 10,000 | 3% | 300 × £2.99 = £897.00 |
| 25,000 | 2.5% | 625 × £2.99 = £1,868.75 |

**Annual subscribers increase ARPU:** If 40% of premium users choose annual (£19.99/yr = £1.67/mo), blended ARPU drops but LTV increases significantly.

---

## Files to Create/Modify

| File | Action | Description |
|---|---|---|
| `frontend/src/pages/PremiumUpgrade.js` | CREATE | Pricing page with 3 tiers |
| `frontend/src/components/PricingCard.js` | CREATE | Reusable pricing card component |
| `frontend/src/components/PlanPDFExport.js` | CREATE | PDF export for premium users |
| `frontend/src/components/PlanLimitBanner.js` | CREATE | "X plans remaining" banner |
| `frontend/src/utils.js` | MODIFY | Add plan counting and premium helpers |
| `frontend/src/App.js` | MODIFY | Add premium route |
| `frontend/src/components/Layout.js` | MODIFY | Add "Upgrade" nav link |
| `frontend/src/pages/PortPlanner.js` | MODIFY | Add plan limit check |
| `frontend/src/components/AdUnit.js` | MODIFY | Check premium status |
| `backend/payments.py` | CREATE | Stripe checkout + webhook endpoints |
| `backend/server.py` | MODIFY | Mount payments router |
| `backend/requirements.txt` | MODIFY | Add stripe dependency |

---

## Dependencies

```
# backend/requirements.txt additions
stripe>=7.0.0

# frontend/package.json additions
jspdf: ^2.5.1
```
