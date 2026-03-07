# Plan: Port Guide Content System

> **Priority:** CRITICAL — Enables SEO traffic, ad revenue, and affiliate conversions  
> **Estimated effort:** 4–6 weeks (initial 20 ports), then ongoing  
> **Related:** `MONETIZATION-STRATEGY.md` (Stream 3), `PLAN-SEO-AND-GROWTH.md`, `PLAN-DISPLAY-ADS.md`

---

## Overview

Create SEO-optimized port guide pages for every major cruise port. These pages serve triple duty:

1. **SEO traffic magnet** — Rank for "things to do in [port] from cruise ship" queries
2. **Ad revenue surface** — Port guides are content-heavy pages ideal for display ads
3. **Affiliate conversion funnel** — Each activity listed includes booking links with affiliate tracking
4. **App onboarding** — Every port guide has a CTA to generate an AI day plan, converting readers into app users

---

## Content Structure Per Port Guide

Each port guide page follows a consistent template for SEO and user experience:

### Page Structure

```
1. Hero Section
   - Port name and country
   - Hero image (cruise ship in port or iconic landmark)
   - Quick stats (walking distance to town, language, currency, time zone)
   - "Generate AI Day Plan" CTA button

2. Port Overview (200-300 words)
   - What makes this port special
   - Brief history/context
   - What type of traveler it suits best

3. Getting from the Terminal (practical info)
   - Walking directions to town center
   - Taxi availability and typical costs
   - Shuttle services
   - Public transport options
   - Distance and time estimates

4. Top 10 Activities (core content)
   - Each activity has:
     - Name and category icon
     - 100-150 word description
     - Duration estimate
     - Cost estimate (in multiple currencies)
     - Location/address
     - "Book This Activity" button (affiliate link)
     - Insider tip
   - Mix of categories: culture, nature, food, adventure, shopping, relaxation

5. Where to Eat & Drink
   - 3-5 local restaurant/bar recommendations
   - Cuisine type, price range, distance from port
   - "Near the port" vs "worth the trip" categorization

6. Weather Guide
   - Monthly temperature/rainfall table
   - Best months to visit
   - What to pack based on season

7. Safety & Practical Tips
   - Currency and tipping customs
   - Common tourist scams to avoid
   - Emergency numbers
   - WiFi availability
   - Accessibility information

8. FAQ Section (structured data for Google)
   - "How far is [port] terminal from the city center?"
   - "Do I need a visa for [country]?"
   - "Is [port] walkable from the cruise terminal?"
   - "What currency is used in [port]?"
   - "How much time do I need in [port]?"

9. Call-to-Action Section
   - "Ready to plan your day in [port]?"
   - "Generate Your Personalized AI Day Plan" button
   - "It's free — takes 30 seconds"

10. Related Ports
    - Links to nearby port guides
    - "Also visiting [nearby port]? Check our guide"
```

---

## Data Schema

### Port Guide JSON

```
File: frontend/src/data/port-guides/{port-slug}.json
```

```json
{
  "slug": "barcelona-spain",
  "name": "Barcelona",
  "country": "Spain",
  "region": "Western Mediterranean",
  "hero_image": "/images/ports/barcelona-hero.jpg",
  "hero_alt": "View of Barcelona waterfront from the cruise port with Sagrada Familia in the distance",
  "quick_stats": {
    "terminal_to_city": "10-minute walk to Las Ramblas",
    "language": "Spanish, Catalan",
    "currency": "EUR (€)",
    "time_zone": "CET (UTC+1)",
    "best_months": "April–June, September–October",
    "walkable": true
  },
  "overview": "Barcelona is one of the Mediterranean's most popular cruise ports...",
  "terminal_info": {
    "name": "Port of Barcelona — Moll Adossat",
    "walk_to_city_minutes": 10,
    "taxi_to_city_cost": "€8–12",
    "shuttle_available": true,
    "shuttle_cost": "€5 round trip",
    "public_transport": "Metro Line 3 from Drassanes station",
    "directions": "Exit the terminal and follow signs to Las Ramblas..."
  },
  "activities": [
    {
      "name": "La Sagrada Familia",
      "category": "culture",
      "description": "Gaudí's unfinished masterpiece...",
      "duration_minutes": 90,
      "cost_estimates": { "EUR": 26, "GBP": 22, "USD": 28 },
      "location": "Carrer de Mallorca, 401",
      "latitude": 41.4036,
      "longitude": 2.1744,
      "booking_search_term": "Skip the Line Sagrada Familia Guided Tour",
      "insider_tip": "Book at least 2 weeks in advance — sells out fast",
      "accessibility": "Wheelchair accessible with elevator"
    }
  ],
  "restaurants": [
    {
      "name": "La Boqueria Market",
      "cuisine": "Market / Tapas",
      "price_range": "€",
      "distance_from_port": "5-minute walk",
      "description": "The most famous food market in Barcelona..."
    }
  ],
  "weather": {
    "monthly": [
      { "month": "January", "high_c": 13, "low_c": 5, "rain_mm": 41, "rain_days": 5 },
      { "month": "February", "high_c": 14, "low_c": 6, "rain_mm": 29, "rain_days": 4 }
    ]
  },
  "safety_tips": [
    "Beware of pickpockets on Las Ramblas — keep valuables secure",
    "Don't leave bags on the backs of chairs in restaurants"
  ],
  "faqs": [
    {
      "question": "How far is Barcelona cruise terminal from the city center?",
      "answer": "The main cruise terminal (Moll Adossat) is about a 10-minute walk..."
    }
  ],
  "related_ports": ["palma-de-mallorca-spain", "marseille-france", "civitavecchia-rome-italy"],
  "seo": {
    "title": "Barcelona Cruise Port Guide — Top Activities & Shore Excursion Tips",
    "meta_description": "Plan your perfect day in Barcelona from the cruise port. Top 10 activities, local food, transport tips, and weather guide. Free AI day planner.",
    "keywords": ["barcelona cruise port", "barcelona shore excursion", "things to do barcelona cruise"]
  }
}
```

---

## Frontend Implementation

### Route Structure

```
/ports                    → Port guide index (list all ports by region)
/ports/barcelona-spain    → Barcelona port guide
/ports/cozumel-mexico     → Cozumel port guide
```

### Components to Build

#### 1. `PortGuide.js` — Main port guide page

```jsx
// frontend/src/pages/PortGuide.js

const PortGuide = () => {
  const { slug } = useParams();
  const [guide, setGuide] = useState(null);
  
  useEffect(() => {
    // Load port guide data
    import(`../data/port-guides/${slug}.json`)
      .then(data => setGuide(data.default))
      .catch(() => navigate('/ports'));
  }, [slug]);
  
  if (!guide) return <LoadingSpinner />;
  
  return (
    <>
      <SEOHead 
        title={guide.seo.title}
        description={guide.seo.meta_description}
        canonicalUrl={`/ports/${guide.slug}`}
      />
      
      <PortHero guide={guide} />
      <QuickStats stats={guide.quick_stats} />
      <PortOverview text={guide.overview} />
      
      <AdUnit slot="port-guide-top" />
      
      <TerminalInfo info={guide.terminal_info} />
      <TopActivities activities={guide.activities} portName={guide.name} />
      
      <AdUnit slot="port-guide-mid" />
      
      <WhereToEat restaurants={guide.restaurants} />
      <WeatherGuide weather={guide.weather} />
      <SafetyTips tips={guide.safety_tips} />
      <FAQSection faqs={guide.faqs} />
      
      <AdUnit slot="port-guide-bottom" />
      
      <GeneratePlanCTA portName={guide.name} />
      <RelatedPorts slugs={guide.related_ports} />
    </>
  );
};
```

#### 2. `PortGuideIndex.js` — Index page listing all ports

```jsx
// frontend/src/pages/PortGuideIndex.js

const PortGuideIndex = () => {
  // Group ports by region
  const regions = groupByRegion(allPortGuides);
  
  return (
    <>
      <SEOHead
        title="Cruise Port Guides — ShoreExplorer"
        description="Explore our comprehensive cruise port guides for 200+ ports worldwide."
      />
      
      <h1>Cruise Port Guides</h1>
      
      {regions.map(region => (
        <section key={region.name}>
          <h2>{region.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {region.ports.map(port => (
              <PortCard key={port.slug} port={port} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
};
```

#### 3. `SEOHead.js` — Reusable SEO meta tag component

```jsx
// frontend/src/components/SEOHead.js

import { Helmet } from 'react-helmet-async';

const SEOHead = ({ title, description, canonicalUrl, image }) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={`https://shoreexplorer.com${canonicalUrl}`} />
    
    {/* Open Graph */}
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="article" />
    <meta property="og:url" content={`https://shoreexplorer.com${canonicalUrl}`} />
    {image && <meta property="og:image" content={image} />}
    
    {/* Twitter Card */}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
  </Helmet>
);
```

---

## SEO Technical Requirements

### Structured Data (JSON-LD)

Each port guide page should include structured data for rich search results:

```json
{
  "@context": "https://schema.org",
  "@type": "TouristDestination",
  "name": "Barcelona Cruise Port",
  "description": "Barcelona is one of the Mediterranean's most popular cruise ports...",
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 41.3756,
    "longitude": 2.1762
  },
  "touristType": "Cruise passengers",
  "includesAttraction": [
    {
      "@type": "TouristAttraction",
      "name": "La Sagrada Familia",
      "description": "Gaudí's unfinished masterpiece...",
      "geo": { "@type": "GeoCoordinates", "latitude": 41.4036, "longitude": 2.1744 }
    }
  ]
}
```

### FAQ Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How far is Barcelona cruise terminal from the city center?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The main cruise terminal is about a 10-minute walk..."
      }
    }
  ]
}
```

### Sitemap Generation

```xml
<!-- frontend/public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://shoreexplorer.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://shoreexplorer.com/ports</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Generated for each port guide -->
  <url>
    <loc>https://shoreexplorer.com/ports/barcelona-spain</loc>
    <lastmod>2026-03-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

---

## Content Creation Workflow

### For Each Port Guide

1. **Research phase (1–2 hours per port):**
   - Identify top 10 activities from TripAdvisor, Viator, Google Maps
   - Verify GPS coordinates using Google Maps/OpenStreetMap
   - Research terminal-to-city transport options
   - Find 3–5 restaurant recommendations
   - Compile weather data from historical averages
   - Write safety tips based on travel advisories

2. **Writing phase (1–2 hours per port):**
   - Write overview (200–300 words)
   - Write activity descriptions (100–150 words each)
   - Write terminal directions
   - Compose FAQ answers
   - Create SEO title and meta description

3. **Quality check:**
   - Verify all GPS coordinates on a map
   - Check all cost estimates against current prices
   - Ensure booking search terms return relevant results on Viator/GetYourGuide
   - Run through Yoast-style SEO checklist

### Production Rate Target

- **3 port guides per week** (one person, part-time)
- **20 ports in ~7 weeks**
- **50 ports in ~17 weeks**

### Priority Order (by cruise traffic volume)

| Priority | Ports | Cruise Traffic Rank |
|---|---|---|
| Batch 1 (Week 1–2) | Barcelona, Cozumel, Nassau, Naples, Santorini | Top 5 |
| Batch 2 (Week 3–4) | Athens, Dubrovnik, Palma, Juneau, Grand Cayman | Top 10 |
| Batch 3 (Week 5–6) | St. Thomas, St. Maarten, Mykonos, Kotor, Livorno | Top 15 |
| Batch 4 (Week 7–8) | Marseille, Cádiz, Split, Ketchikan, Aruba | Top 20 |

---

## Revenue Integration

### Affiliate Links in Port Guides

Each activity card in the port guide includes a booking button:

```jsx
<a 
  href={generateBookingUrl(activity.booking_search_term, portName)}
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => trackEvent('affiliate_click', { 
    port: portName, 
    activity: activity.name,
    source: 'port_guide' 
  })}
  className="bg-accent text-white rounded-full px-4 py-2 
             font-body font-semibold text-sm min-h-[48px]
             inline-flex items-center gap-2"
>
  <ExternalLink size={16} />
  Book This Activity
</a>
```

### Display Ads in Port Guides

Port guide pages are the primary surface for display advertising:
- 1 ad after the port overview
- 1 ad between activities and food sections
- 1 ad at the bottom before CTA
- Sidebar ad on desktop (300×250)

See `PLAN-DISPLAY-ADS.md` for ad placement details.

---

## Dependencies

```bash
# Frontend dependency for SEO meta tags
yarn add react-helmet-async
```

---

## Implementation Checklist

### Infrastructure (Week 1)
- [ ] Install `react-helmet-async` for SEO meta tags
- [ ] Create `SEOHead.js` component
- [ ] Create `PortGuide.js` page component with template
- [ ] Create `PortGuideIndex.js` index page
- [ ] Add routes to `App.js` (`/ports`, `/ports/:slug`)
- [ ] Create `frontend/src/data/port-guides/` directory
- [ ] Generate `sitemap.xml`
- [ ] Update `robots.txt`
- [ ] Add Open Graph default tags to `index.html`
- [ ] Add JSON-LD structured data component

### Content Creation (Week 2–8)
- [ ] Research and write Barcelona port guide (pilot)
- [ ] Review pilot guide for quality and SEO
- [ ] Research and write remaining Batch 1 ports (Cozumel, Nassau, Naples, Santorini)
- [ ] Research and write Batch 2 ports (5 ports)
- [ ] Research and write Batch 3 ports (5 ports)
- [ ] Research and write Batch 4 ports (5 ports)

### Integration (Ongoing)
- [ ] Integrate affiliate booking links into all activity cards
- [ ] Add AdSense ad units to port guide template
- [ ] Add "Generate AI Plan" CTA linking to PortPlanner
- [ ] Track port guide pageviews and engagement in Analytics
- [ ] Monitor search rankings in Google Search Console
- [ ] A/B test CTA placement and copy

---

## Files to Create/Modify

| File | Action | Description |
|---|---|---|
| `frontend/src/pages/PortGuide.js` | CREATE | Port guide page component |
| `frontend/src/pages/PortGuideIndex.js` | CREATE | Port guide index page |
| `frontend/src/components/SEOHead.js` | CREATE | Reusable SEO meta tag component |
| `frontend/src/components/PortHero.js` | CREATE | Hero section for port guides |
| `frontend/src/components/TopActivities.js` | CREATE | Activity list with booking links |
| `frontend/src/components/GeneratePlanCTA.js` | CREATE | CTA to generate AI plan |
| `frontend/src/data/port-guides/*.json` | CREATE | One JSON file per port guide |
| `frontend/public/sitemap.xml` | CREATE | Sitemap for search engines |
| `frontend/public/robots.txt` | MODIFY | Add sitemap reference |
| `frontend/src/App.js` | MODIFY | Add port guide routes |
| `frontend/public/index.html` | MODIFY | Add default Open Graph meta tags |
| `frontend/package.json` | MODIFY | Add react-helmet-async |

---

## Success Metrics

| Metric | Month 2 | Month 3 | Month 6 |
|---|---|---|---|
| Port guides published | 10 | 20 | 50 |
| Organic search impressions | 1,000 | 10,000 | 50,000 |
| Organic search clicks | 50 | 500 | 5,000 |
| Affiliate link clicks from guides | 20 | 100 | 500 |
| Ad revenue from port guides | £5 | £30 | £200 |
| AI plan generations from CTA | 10 | 50 | 300 |
