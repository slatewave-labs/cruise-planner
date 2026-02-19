/**
 * Trip Detail page E2E tests.
 *
 * Validates trip header, port cards, edit/delete actions,
 * and navigation to the port planner.
 */
import { test, expect } from '@playwright/test';
import { mockAllApiRoutes, VALID_TRIP_ID } from './fixtures';

test.describe('Trip Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto(`/trips/${VALID_TRIP_ID}`);
  });

  test('displays the trip ship name and cruise line', async ({ page }) => {
    await expect(page.getByTestId('trip-detail-page')).toBeVisible();
    await expect(page.getByTestId('trip-ship-name')).toHaveText('Symphony of the Seas');
    await expect(page.getByText('Royal Caribbean')).toBeVisible();
  });

  test('shows port cards with port name, country, and plan button', async ({ page }) => {
    await expect(page.getByTestId('port-card-0')).toBeVisible();
    await expect(page.getByTestId('port-card-0')).toContainText('Barcelona');
    await expect(page.getByTestId('port-card-0')).toContainText('Spain');
    await expect(page.getByTestId('plan-port-btn-0')).toBeVisible();
  });

  test('"Plan Day" button navigates to the port planner page', async ({ page }) => {
    await page.getByTestId('plan-port-btn-0').click();
    await expect(page).toHaveURL(/\/ports\/port-e2e-001\/plan/);
  });

  test('"Edit" button navigates to the edit trip page', async ({ page }) => {
    await page.getByTestId('edit-trip-btn').click();
    await expect(page).toHaveURL(new RegExp(`/trips/${VALID_TRIP_ID}/edit`));
  });

  test('"Delete" button triggers a confirmation dialog', async ({ page }) => {
    // Listen for the dialog before clicking
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Delete this trip');
      await dialog.accept();
    });

    await page.getByTestId('delete-trip-btn').click();

    // After acceptance, we should navigate to /trips
    await expect(page).toHaveURL(/\/trips$/);
  });

  test('shows "Ports of Call" section heading with count', async ({ page }) => {
    await expect(page.getByText(/ports of call \(1\)/i)).toBeVisible();
  });
});

test.describe('Trip Detail — Trip Not Found', () => {
  test('displays "Trip not found" when API returns 404', async ({ page }) => {
    // Override the trip GET to return 404
    await page.route(/\/api\/trips\/[^/]+$/, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Trip not found' }) });
      }
      return route.continue();
    });
    await page.route('**/api/ports/regions', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );

    await page.goto('/trips/nonexistent-trip-id');
    await expect(page.getByText(/trip not found/i)).toBeVisible();
  });
});
