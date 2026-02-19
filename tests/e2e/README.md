# End-to-End Tests for ShoreExplorer (Playwright)

## Setup

```bash
cd tests/e2e
npm install
npx playwright install --with-deps chromium
```

## Running Tests

```bash
# Run all tests (headless)
npm test

# Run with browser visible
npm run test:headed

# Run with Playwright UI
npm run test:ui
```

## Targeting Different Environments

Override `BASE_URL` to run against a deployed environment:

```bash
BASE_URL=http://test.shore-explorer.com npm test
BASE_URL=http://shore-explorer.com npm test
```

## Test Structure

| File | Coverage |
|---|---|
| `specs/landing.spec.js` | Landing page hero, CTAs, feature cards |
| `specs/trip-setup.spec.js` | Create/edit trip, add/remove ports, port search |
| `specs/my-trips.spec.js` | Trip list, empty state, navigation |
| `specs/trip-detail.spec.js` | Trip detail, port cards, edit/delete |
| `specs/port-planner.spec.js` | Preference selection, plan generation, error handling |
| `specs/day-plan-view.spec.js` | Plan display, activities, stats, packing/safety |
| `specs/terms.spec.js` | T&C sections, external links |
| `specs/navigation.spec.js` | Desktop nav, mobile nav, routing |
| `specs/mobile-accessibility.spec.js` | 375px viewport, 48px touch targets, landmarks |
| `specs/full-journey.spec.js` | End-to-end user flows spanning multiple pages |

## CI Integration

- **PR pipeline** (`ci.yml`): Runs E2E tests against the locally built app using the `frontend-e2e` job.
- **Test environment** (`e2e-test.yml`): Workflow dispatch to run against `http://test.shore-explorer.com`.
- **Production** (`e2e-prod.yml`): Workflow dispatch to run against `http://shore-explorer.com`.
