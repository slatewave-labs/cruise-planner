# Plan: LLM Cost Reduction & Plan Quality Improvement

> **Priority:** HIGH — Cost reduction + quality improvement  
> **Estimated effort:** 6–8 weeks total (phased)  
> **Related:** `MONETIZATION-STRATEGY.md` (Stream 5)

---

## Problem Statement

The current AI plan generation has two critical issues:

1. **Cost:** Each Groq API call costs ~£0.01. At scale (10K plans/month), this is £100/month — potentially the single largest cost.
2. **Quality:** The LLM (Llama 3.3 70B) frequently halluccinates:
   - Fake GPS coordinates (locations don't exist or are in the wrong place)
   - Broken or non-existent booking URLs
   - Unrealistic timing estimates
   - Activities that are closed, don't exist, or are in the wrong city
   - Poor route planning (zigzag routes instead of efficient circular paths)
   - Inconsistent cost estimates

---

## Solution: Three-Phase Approach

### Phase 1: Plan Caching & Deduplication (Week 1–2)

**Goal:** Reduce LLM calls by 50–70% by caching and reusing plans.

**Implementation:**

#### 1.1 Server-Side Plan Cache

```
File: backend/plan_cache.py (NEW)
```

- Create a plan cache keyed by: `port_name + preference_hash`
- Preference hash = hash of: `party_type + activity_level + transport_mode + budget`
- When a plan is requested:
  1. Check cache for matching `port_name + preference_hash`
  2. If found AND less than 7 days old → return cached plan (with fresh weather data overlaid)
  3. If not found → generate via LLM, cache the result
- Store cache in a JSON file on disk (simple) or DynamoDB (production)

#### 1.2 Plan Template Variation

- When returning a cached plan, apply minor randomization:
  - Shuffle the order of 2–3 middle activities
  - Vary cost estimates by ±5%
  - Regenerate the narrative summary text only (much cheaper LLM call: ~£0.001)
- This prevents every user from getting identical plans while avoiding the full LLM cost

#### 1.3 Backend Changes

```python
# In server.py, modify the /api/plans/generate endpoint:

# 1. Compute preference hash
pref_key = compute_preference_hash(port_name, preferences)

# 2. Check cache
cached = plan_cache.get(pref_key)
if cached and not is_expired(cached):
    plan = apply_variation(cached["plan"])
    plan["weather"] = fetch_fresh_weather(lat, lon, date)
    return plan

# 3. Generate via LLM (fallback)
plan = generate_via_llm(prompt)
plan_cache.set(pref_key, plan)
return plan
```

**Estimated cost reduction:** 50–70% of LLM calls eliminated.

---

### Phase 2: Curated Activity Database (Week 3–6)

**Goal:** Build a verified activity database for the top 20–30 cruise ports, eliminating hallucination entirely for these ports.

#### 2.1 Database Schema

```
File: backend/port_activities.py (NEW)
```

```python
# Activity schema
{
    "id": "barcelona-sagrada-familia",
    "port": "barcelona",
    "name": "Sagrada Familia Guided Tour",
    "description": "Skip-the-line access to Gaudí's masterpiece...",
    "category": "culture",  # culture, nature, food, adventure, shopping, relaxation
    "location": "Carrer de Mallorca, 401, Barcelona",
    "latitude": 41.4036,
    "longitude": 2.1744,
    "typical_duration_minutes": 90,
    "cost_estimate_eur": 26,
    "cost_estimates": {"EUR": 26, "GBP": 22, "USD": 28},
    "opening_hours": "09:00-20:00",
    "closed_days": [],  # e.g. ["Monday"]
    "booking_search_term": "Skip the Line Sagrada Familia Guided Tour",
    "activity_level": "low",  # low, moderate, high
    "suitable_for": ["couples", "families", "solo", "seniors"],
    "transport_from_port_minutes": 25,
    "transport_mode": "taxi/metro",
    "tips": "Book tickets in advance — sells out weeks ahead",
    "verified": true,
    "last_verified": "2026-02-15",
    "source": "manual_research"
}
```

#### 2.2 Data Collection Strategy

**For each of the top 20 ports, collect 15–25 activities covering:**
- 3–5 cultural/historical sites
- 2–3 food/drink experiences
- 2–3 nature/scenic activities
- 1–2 adventure activities
- 1–2 shopping areas
- 1–2 relaxation spots (beaches, parks)
- Port terminal info (walking directions, taxi stands, shuttle services)

**Data sources (all free):**
- OpenStreetMap / Overpass API for POI data and coordinates
- Wikidata / Wikipedia for descriptions
- Google Maps (manual research for verification)
- Cruise forum posts (CruiseCritic, etc.) for practical tips
- Official tourism board websites for opening hours and prices

**Priority ports (top 20 by cruise traffic):**
1. Cozumel, Mexico
2. Nassau, Bahamas
3. Barcelona, Spain
4. Civitavecchia (Rome), Italy
5. Piraeus (Athens), Greece
6. Dubrovnik, Croatia
7. Santorini, Greece
8. Naples, Italy
9. Palma de Mallorca, Spain
10. Marseille, France
11. Juneau, Alaska
12. Ketchikan, Alaska
13. Grand Cayman
14. St. Thomas, USVI
15. St. Maarten
16. Mykonos, Greece
17. Kotor, Montenegro
18. Livorno (Florence), Italy
19. Cádiz, Spain
20. Split, Croatia

#### 2.3 Algorithmic Itinerary Generation

```
File: backend/itinerary_builder.py (NEW)
```

**Algorithm:**

```
Input: port_name, preferences (party_type, activity_level, transport_mode, budget), 
       arrival_time, departure_time, weather

1. FILTER activities by:
   - Port matches
   - Activity level matches (or ±1 level)
   - Suitable for party_type
   - Open on the arrival date
   - Cost within budget
   - Weather appropriate (skip outdoor if heavy rain)

2. SCORE each activity:
   - Category diversity bonus (+10 if category not yet in plan)
   - Proximity bonus (+5 for activities close to already-selected ones)
   - Rating/popularity bonus (+1 to +5)
   - Transport mode match bonus (+3 if matches preference)

3. SELECT top 6–8 activities using greedy selection with scoring

4. ROUTE OPTIMIZE:
   - Start at cruise terminal
   - Use nearest-neighbor heuristic to order activities
   - Ensure circular route (end near terminal)
   - Insert travel times between activities
   - Ensure last activity ends ≥60 mins before departure

5. ASSEMBLE plan JSON:
   - Assign start/end times based on duration + travel
   - Add cost estimates in preferred currency
   - Add booking URLs (verified, with affiliate params)
   - Calculate total cost
   - Add packing suggestions based on activity types
   - Add safety tips based on port
```

**Benefits over LLM:**
- ✅ Zero hallucination — every coordinate, URL, and price is verified
- ✅ Instant generation (<100ms vs 15–30s for LLM)
- ✅ Zero API cost
- ✅ Consistent quality
- ✅ Offline capable (all data is local)
- ✅ Easy to update (change a database entry, not retrain a model)

#### 2.4 LLM as Narrative Layer (Optional)

For curated plans, the LLM can optionally be used ONLY for:
- Generating a creative plan title (~10 tokens, ~£0.0001)
- Writing a 2–3 sentence summary (~50 tokens, ~£0.0005)
- This is ~10x cheaper than generating the full plan

If LLM is unavailable, use template-based narratives:
```python
TITLE_TEMPLATES = [
    "A Perfect Day in {port_name}",
    "{port_name}: Sun, Culture & Local Flavour",
    "Discovering {port_name} — Your Shore Day Guide",
]
```

---

### Phase 3: Hybrid System (Week 7–8)

**Goal:** Use curated database for top ports, LLM for rare/unrecognized ports, with graceful fallback.

#### 3.1 Decision Flow

```
User requests plan for Port X:

1. Is Port X in the curated database?
   YES → Use algorithmic generation (Phase 2)
        → Optionally add LLM narrative
   NO  → Is the LLM available?
         YES → Use LLM generation (current approach)
              → Cache the result (Phase 1)
         NO  → Return error with helpful message
              → Suggest nearby curated ports
```

#### 3.2 Gradual Migration

- Start with 5 curated ports (Barcelona, Cozumel, Naples, Santorini, Nassau)
- Monitor plan quality ratings (add a "Was this plan helpful?" feedback widget)
- Expand curated database based on:
  - Most requested ports (analytics)
  - User feedback scores
  - Affiliate conversion rates per port

#### 3.3 Backend Changes to `server.py`

```python
@app.post("/api/plans/generate")
async def generate_plan(request: Request, data: GeneratePlanInput, ...):
    port_name = data.port_name
    
    # Try curated database first
    if port_activities.has_port(port_name):
        plan = itinerary_builder.build(
            port=port_name,
            preferences=data.preferences,
            arrival=data.arrival,
            departure=data.departure,
            weather=fetch_weather(data.latitude, data.longitude, data.arrival_date),
        )
        plan["generation_method"] = "curated"
    
    # Fallback to cached plan
    elif plan_cache.has(port_name, data.preferences):
        plan = plan_cache.get(port_name, data.preferences)
        plan["generation_method"] = "cached"
    
    # Fallback to LLM
    else:
        plan = generate_via_llm(prompt)
        plan_cache.set(port_name, data.preferences, plan)
        plan["generation_method"] = "ai"
    
    # Process affiliate links
    plan["activities"] = process_plan_activities(plan["activities"], port_name)
    
    return plan
```

---

## Cost Projection

| Phase | LLM Calls Reduction | Monthly Cost (at 10K plans) |
|---|---|---|
| Current | 0% | £100 |
| Phase 1 (Caching) | 50–70% | £30–50 |
| Phase 2 (Top 20 ports, ~60% of traffic) | 80–90% | £10–20 |
| Phase 3 (Hybrid, mature) | 90–95% | £5–10 |

---

## Quality Improvement Metrics

| Metric | Current (LLM) | Target (Curated) |
|---|---|---|
| Coordinate accuracy | ~70% correct | 100% verified |
| Booking URL validity | ~30% working | 100% verified |
| Route efficiency | Poor (zigzag) | Optimized (nearest-neighbor) |
| Time estimate accuracy | ±30 minutes | ±10 minutes |
| Plan generation time | 15–30 seconds | <1 second (curated) |
| Cost estimate accuracy | ±50% | ±15% |

---

## Implementation Checklist

### Phase 1: Caching (Week 1–2)
- [ ] Create `backend/plan_cache.py` with in-memory + disk persistence
- [ ] Implement preference hashing
- [ ] Add cache lookup in `/api/plans/generate` endpoint
- [ ] Add cache-hit/miss metrics logging
- [ ] Add plan variation logic for cached plans
- [ ] Write unit tests for caching logic
- [ ] Monitor cache hit rates in production

### Phase 2: Curated Database (Week 3–6)
- [ ] Design activity schema and create `backend/port_activities.py`
- [ ] Create `backend/itinerary_builder.py` with routing algorithm
- [ ] Research and curate activities for Barcelona (pilot port)
- [ ] Write unit tests for itinerary builder
- [ ] Validate generated plans against LLM plans (quality comparison)
- [ ] Curate remaining 19 ports (can be parallelized across team)
- [ ] Add "Was this plan helpful?" feedback widget to frontend
- [ ] Create admin tooling for database maintenance

### Phase 3: Hybrid System (Week 7–8)
- [ ] Implement decision flow in `/api/plans/generate`
- [ ] Add `generation_method` field to plan response
- [ ] Update frontend to show generation method indicator
- [ ] Monitor and compare quality ratings by method
- [ ] Document process for adding new curated ports
- [ ] Create data update workflow (quarterly review of activities)

---

## Files to Create/Modify

| File | Action | Description |
|---|---|---|
| `backend/plan_cache.py` | CREATE | Plan caching with preference hashing |
| `backend/port_activities.py` | CREATE | Curated activity database |
| `backend/port_activities_data/` | CREATE | JSON files per port with activity data |
| `backend/itinerary_builder.py` | CREATE | Algorithmic itinerary assembly |
| `backend/server.py` | MODIFY | Add caching + curated database fallback |
| `backend/tests/test_plan_cache.py` | CREATE | Cache unit tests |
| `backend/tests/test_itinerary_builder.py` | CREATE | Builder unit tests |
| `frontend/src/components/PlanFeedback.js` | CREATE | "Was this helpful?" widget |
| `frontend/src/pages/DayPlanView.js` | MODIFY | Add feedback widget + generation method |
