/**
 * Port Planner (preferences) E2E tests.
 *
 * Validates preference selection, the generate button,
 * error handling, and navigation to the generated plan.
 */
const { test, expect } = require('@playwright/test');
const { mockAllApiRoutes, VALID_TRIP_ID, VALID_PORT_ID, VALID_PLAN_ID, buildPlan } = require('./fixtures');

test.describe('Port Planner Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto(`/trips/${VALID_TRIP_ID}/ports/${VALID_PORT_ID}/plan`);
  });

  test('displays the port planner page with port name', async ({ page }) => {
    await expect(page.getByTestId('port-planner-page')).toBeVisible();
    await expect(page.getByTestId('port-planner-title')).toContainText('Barcelona');
  });

  test('shows all four preference categories', async ({ page }) => {
    await expect(page.getByText(/who's travelling/i)).toBeVisible();
    await expect(page.getByText(/activity level/i)).toBeVisible();
    await expect(page.getByText(/getting around/i)).toBeVisible();
    await expect(page.getByText(/budget/i)).toBeVisible();
  });

  test('can select different party type preferences', async ({ page }) => {
    // Default is "couple" — click "solo"
    await page.getByTestId('option-party_type-solo').click();
    await expect(page.getByTestId('option-party_type-solo')).toHaveClass(/border-accent/);
  });

  test('can select activity level preferences', async ({ page }) => {
    await page.getByTestId('option-activity_level-active').click();
    await expect(page.getByTestId('option-activity_level-active')).toHaveClass(/border-accent/);
  });

  test('can select transport mode preferences', async ({ page }) => {
    await page.getByTestId('option-transport_mode-walking').click();
    await expect(page.getByTestId('option-transport_mode-walking')).toHaveClass(/border-accent/);
  });

  test('can select budget preferences', async ({ page }) => {
    await page.getByTestId('option-budget-high').click();
    await expect(page.getByTestId('option-budget-high')).toHaveClass(/border-accent/);
  });

  test('currency selector is visible and can be changed', async ({ page }) => {
    const select = page.getByTestId('currency-select');
    await expect(select).toBeVisible();
    await select.selectOption('USD');
    await expect(select).toHaveValue('USD');
  });

  test('"Generate Day Plan" button triggers plan generation and redirects', async ({ page }) => {
    await page.getByTestId('generate-plan-btn').click();
    await expect(page).toHaveURL(new RegExp(`/plans/${VALID_PLAN_ID}`));
  });

  test('"Back to Trip" button navigates back to trip detail', async ({ page }) => {
    await page.getByTestId('back-to-trip-btn').click();
    await expect(page).toHaveURL(new RegExp(`/trips/${VALID_TRIP_ID}`));
  });
});

test.describe('Port Planner — Error Handling', () => {
  test('displays error message when plan generation fails', async ({ page }) => {
    // Mock everything except plan generation
    await mockAllApiRoutes(page);

    // Override plan generation to return an error
    await page.route('**/api/plans/generate', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'AI service unavailable' }),
      })
    );

    await page.goto(`/trips/${VALID_TRIP_ID}/ports/${VALID_PORT_ID}/plan`);
    await page.getByTestId('generate-plan-btn').click();

    await expect(page.getByTestId('plan-error-message')).toBeVisible();
    await expect(page.getByText(/plan generation failed/i)).toBeVisible();
  });
});
