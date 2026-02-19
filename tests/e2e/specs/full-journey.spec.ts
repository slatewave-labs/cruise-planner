/**
 * Full user journey E2E tests.
 *
 * Tests end-to-end flows that span multiple pages,
 * simulating realistic user interactions.
 */
import { test, expect } from '@playwright/test';
import { mockAllApiRoutes, VALID_TRIP_ID, VALID_PORT_ID, VALID_PLAN_ID } from './fixtures';

test.describe('Full Journey — Create Trip and Generate Plan', () => {
  test('user can create a trip, add a port, save, and generate a day plan', async ({ page }) => {
    await mockAllApiRoutes(page);

    // 1. Start on landing page
    await page.goto('/');
    await expect(page.getByTestId('landing-page')).toBeVisible();

    // 2. Click "Start Planning"
    await page.getByTestId('get-started-btn').click();
    await expect(page).toHaveURL(/\/trips\/new/);

    // 3. Fill in ship details
    await page.getByTestId('ship-name-input').fill('Explorer of the Seas');
    await page.getByTestId('cruise-line-input').fill('Royal Caribbean');

    // 4. Add a port
    await page.getByTestId('add-port-btn').click();
    await expect(page.getByTestId('port-entry-0')).toBeVisible();

    // 5. Fill port details manually
    await page.getByTestId('port-country-0').fill('Spain');
    await page.getByTestId('port-lat-0').fill('41.3784');
    await page.getByTestId('port-lng-0').fill('2.1925');

    // 6. Save the trip
    await page.getByTestId('save-trip-btn').click();
    await expect(page).toHaveURL(new RegExp(`/trips/${VALID_TRIP_ID}`));

    // 7. Verify trip detail page loaded
    await expect(page.getByTestId('trip-detail-page')).toBeVisible();
    await expect(page.getByTestId('trip-ship-name')).toHaveText('Symphony of the Seas');

    // 8. Click "Plan Day" for the first port
    await page.getByTestId('plan-port-btn-0').click();
    await expect(page).toHaveURL(/\/plan$/);

    // 9. Select preferences
    await page.getByTestId('option-party_type-family').click();
    await page.getByTestId('option-activity_level-light').click();
    await page.getByTestId('option-transport_mode-walking').click();
    await page.getByTestId('option-budget-free').click();

    // 10. Generate plan
    await page.getByTestId('generate-plan-btn').click();
    await expect(page).toHaveURL(new RegExp(`/plans/${VALID_PLAN_ID}`));

    // 11. Verify plan content
    await expect(page.getByTestId('plan-title')).toHaveText('Barcelona Highlights');
    await expect(page.getByText('La Rambla Walk')).toBeVisible();
  });
});

test.describe('Full Journey — View Trips and Navigate', () => {
  test('user can view trip list, open a trip, and navigate back', async ({ page }) => {
    await mockAllApiRoutes(page);

    // 1. Go to My Trips
    await page.goto('/trips');
    await expect(page.getByTestId('my-trips-page')).toBeVisible();

    // 2. Click on the first trip
    await page.getByTestId('trip-card-0').click();
    await expect(page).toHaveURL(/\/trips\/trip-e2e-001/);

    // 3. Verify trip detail
    await expect(page.getByTestId('trip-ship-name')).toHaveText('Symphony of the Seas');

    // 4. Navigate to edit
    await page.getByTestId('edit-trip-btn').click();
    await expect(page).toHaveURL(/\/edit/);

    // 5. Verify edit mode
    await expect(page.getByRole('heading', { name: /edit trip/i })).toBeVisible();
  });
});

test.describe('Full Journey — Delete Trip', () => {
  test('user can delete a trip from the detail page', async ({ page }) => {
    await mockAllApiRoutes(page);

    await page.goto(`/trips/${VALID_TRIP_ID}`);
    await expect(page.getByTestId('trip-detail-page')).toBeVisible();

    // Accept the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    await page.getByTestId('delete-trip-btn').click();
    await expect(page).toHaveURL(/\/trips$/);
  });
});
