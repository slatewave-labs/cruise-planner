# End-to-End Tests (Playwright)

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
BASE_URL=https://your-site.com npm test
```

## Test Structure

| File | Coverage |
|---|---|
| `specs/home.spec.ts` | Home page hero, features, CTA, pipeline section |
| `specs/navigation.spec.ts` | Header nav, page routing, 404 handling, footer |

## CI Integration

- **PR pipeline** (`ci.yml`): Runs E2E against a locally served build
- **Test environment** (`e2e-test.yml`): Manual dispatch against test deployment
- **Production** (`e2e-prod.yml`): Manual dispatch against production deployment
