# End-to-End Tests — ShoreExplorer (Playwright)

> Last updated: 2026-02-19

Browser-based E2E tests using **Playwright** with **TypeScript**.

## Setup

```bash
cd tests/e2e
npm ci
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
| `specs/landing.spec.ts` | Landing page hero, CTAs, feature cards |
| `specs/trip-setup.spec.ts` | Create/edit trip, add/remove ports, port search |
| `specs/my-trips.spec.ts` | Trip list, empty state, navigation |
| `specs/trip-detail.spec.ts` | Trip detail, port cards, edit/delete |
| `specs/port-planner.spec.ts` | Preference selection, plan generation, error handling |
| `specs/day-plan-view.spec.ts` | Plan display, activities, stats, packing/safety |
| `specs/terms.spec.ts` | T&C sections, external links |
| `specs/navigation.spec.ts` | Desktop nav, mobile nav, routing |
| `specs/mobile-accessibility.spec.ts` | 375px viewport, 48px touch targets, landmarks |
| `specs/full-journey.spec.ts` | End-to-end user flows spanning multiple pages |
| `specs/fixtures.ts` | Shared test fixtures, mock API routes, test data |

## CI Integration

- **PR pipeline** (`ci.yml`): Runs E2E tests against the locally built app using the `frontend-e2e` job.
- **Test environment** (`e2e-test.yml`): Workflow dispatch to run against test deployment.
- **Production** (`e2e-prod.yml`): Workflow dispatch to run against production deployment.
