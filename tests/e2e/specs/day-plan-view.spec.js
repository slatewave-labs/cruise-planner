/**
 * Day Plan View E2E tests.
 *
 * Validates the generated plan display including title, summary,
 * activities timeline, map, weather, stats, and action buttons.
 */
const { test, expect } = require('@playwright/test');
const { mockAllApiRoutes, VALID_PLAN_ID, VALID_TRIP_ID } = require('./fixtures');

test.describe('Day Plan View', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto(`/plans/${VALID_PLAN_ID}`);
  });

  test('displays the plan title and summary', async ({ page }) => {
    await expect(page.getByTestId('day-plan-view')).toBeVisible();
    await expect(page.getByTestId('plan-title')).toHaveText('Barcelona Highlights');
    await expect(page.getByText(/gothic quarter and waterfront/i)).toBeVisible();
  });

  test('shows port name and country in the header', async ({ page }) => {
    await expect(page.getByText('Barcelona, Spain')).toBeVisible();
  });

  test('displays quick stats — return time, cost, and activity count', async ({ page }) => {
    await expect(page.getByTestId('return-time')).toHaveText('17:00');
    await expect(page.getByTestId('total-cost')).toHaveText('£45');
    await expect(page.getByText('4 stops')).toBeVisible();
  });

  test('renders the activity timeline with all activities', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'La Rambla Walk' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gothic Quarter' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lunch at La Boqueria' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Barceloneta Beach' })).toBeVisible();
  });

  test('shows packing suggestions section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'What to Bring' })).toBeVisible();
    // Verify at least one packing item is rendered
    await expect(page.getByText('Comfortable walking shoes')).toBeVisible();
  });

  test('shows safety tips', async ({ page }) => {
    await expect(page.getByText(/pickpockets/i)).toBeVisible();
    await expect(page.getByText(/stay hydrated/i)).toBeVisible();
  });

  test('"Open in Google Maps" button is visible', async ({ page }) => {
    await expect(page.getByTestId('export-map-btn')).toBeVisible();
    await expect(page.getByTestId('export-map-btn')).toContainText('Open in Google Maps');
  });

  test('"Back to Trip" link navigates to trip detail', async ({ page }) => {
    await page.getByTestId('back-to-trip-link').click();
    await expect(page).toHaveURL(new RegExp(`/trips/${VALID_TRIP_ID}`));
  });
});

test.describe('Day Plan View — Plan Not Found', () => {
  test('shows "Plan not found" when API returns 404', async ({ page }) => {
    await page.route(/\/api\/plans\/[^/]+$/, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) });
      }
      return route.continue();
    });

    await page.goto('/plans/nonexistent-plan-id');
    await expect(page.getByText(/plan not found/i)).toBeVisible();
  });
});
