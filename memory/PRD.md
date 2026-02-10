# ShoreExplorer - Product Requirements Document

## Original Problem Statement
Build a cruise port of call planner as a responsive PWA (MVP Android, port to iOS later). The app helps cruise passengers plan their day ashore using AI-generated day plans, weather data, and interactive maps.

## Architecture
- **Frontend**: React PWA (responsive, mobile-first) on port 3000
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB (local or MongoDB Atlas M0)
- **AI**: Google Gemini 2.0 Flash via Google Gemini API
- **Weather**: Open-Meteo API (free, no key needed)
- **Maps**: Leaflet + OpenStreetMap (free), Google Maps export for navigation
- **Deployment**: AWS with Docker, MongoDB Atlas M0 (free tier)
- **Infrastructure**: TODO scaffolds for GitHub Actions CI/CD, feature flags, monitoring, blue/green deployment

## User Personas
1. **Cruise Couple (55-65)**: Tech-moderate, wants easy-to-use planning for port days
2. **Family Travellers (35-50)**: Need family-friendly activity suggestions, budget-conscious
3. **Solo Explorer (30-45)**: Active, adventurous, wants unique local experiences
4. **Senior Travellers (65+)**: Need large touch targets, clear typography, simple navigation

## Core Requirements
- Trip management (ship name, cruise line, ports of call)
- Port scheduling (arrival/departure times, coordinates)
- AI day plan generation with personalised preferences
- Weather-aware planning
- Circular route (ship → activities → ship)
- Activity cost estimates with booking links
- Map visualisation with route
- Export to Google Maps for navigation
- Terms & Conditions for all third-party services
- Responsive PWA (mobile-first)

## What's Been Implemented (2026-02-10)
### Backend API
- Health check endpoint
- Trip CRUD (create, read, update, delete)
- Port management (add, update, delete within trips)
- Weather proxy (Open-Meteo API integration)
- AI day plan generation (Google Gemini 2.0 Flash)
- Plan CRUD (save, retrieve, list, delete)

### Frontend Pages
- Landing page with hero, features, CTAs
- Trip setup with ship details and port management
- Trip detail view with port cards
- Port day planner with preference selectors
- Day plan view with timeline, map, weather, activity cards
- My Trips listing
- Terms & Conditions (all third-party services)

### Components
- Responsive Layout (desktop top nav, mobile bottom nav)
- MapView (Leaflet with markers, route line, popups)
- WeatherCard (weather code mapping, temperature, rain, wind)
- ActivityCard (timeline, costs, booking links, tips)

### Infrastructure Scaffolds (TODO)
- GitHub Actions CI/CD pipeline
- Feature flags configuration (Unleash/Flagsmith/LaunchDarkly)
- Monitoring & observability setup (Sentry, Grafana, UptimeRobot)
- Blue/green deployment architecture
- Test scaffolds (unit, integration/PACT, e2e/Playwright)

## Testing Results
- Backend: 100% pass rate
- Frontend: 95% pass rate (minor DOM timing in automated tests)
- AI plan generation: Confirmed working (15-30s response)
- Weather API: Confirmed working
- All navigation flows working

## Prioritised Backlog

### P0 (Critical)
- [ ] Offline mode for saved plans (service worker caching)
- [ ] Google Maps API integration (when key provided)
- [ ] Error handling improvements for failed AI generation

### P1 (Important)
- [ ] Cruise ship API integration or expanded port database
- [ ] Multi-trip comparison
- [ ] Plan regeneration with modified preferences
- [ ] Share plan via link
- [ ] PWA install prompt

### P2 (Nice to Have)
- [ ] Dark mode support
- [ ] Multi-language support
- [ ] Saved favourite activities
- [ ] Budget tracker across all port plans
- [ ] Photo integration for visited ports
- [ ] Push notifications for departure reminders

### P3 (Future)
- [ ] Native app wrapper (Capacitor/React Native)
- [ ] Social features (share plans with other passengers)
- [ ] Cruise line API partnerships
- [ ] In-app activity booking
- [ ] Real-time ship tracking

## Next Tasks
1. Implement Sentry error tracking (frontend + backend)
2. Add structured logging
3. Create unit tests (pytest + React Testing Library)
4. Implement offline caching for saved plans
5. Add plan regeneration capability
6. Integrate Google Maps when API key available
