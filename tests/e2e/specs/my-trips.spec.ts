/**
 * My Trips listing E2E tests.
 *
 * Validates the trip list rendering, empty state,
 * navigation to trip detail, and the "New Trip" button.
 */
import { test, expect } from '@playwright/test';
import { mockAllApiRoutes, buildTrip, buildPort } from './fixtures';

test.describe('My Trips Page', () => {
  test('displays trips when they exist', async ({ page }) => {
    const trips = [
      buildTrip({ ports: [buildPort()] }),
      buildTrip({
        trip_id: 'trip-e2e-002',
        ship_name: 'Anthem of the Seas',
        cruise_line: 'Royal Caribbean',
        ports: [],
        created_at: '2026-02-01T08:00:00Z',
      }),
    ];
    await mockAllApiRoutes(page, { trips });
    await page.goto('/trips');

    await expect(page.getByTestId('my-trips-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /my trips/i })).toBeVisible();
    await expect(page.getByTestId('trip-card-0')).toBeVisible();
    await expect(page.getByTestId('trip-card-1')).toBeVisible();
  });

  test('shows empty state with "Create Your First Trip" button when no trips', async ({ page }) => {
    await mockAllApiRoutes(page, { trips: [] });
    await page.goto('/trips');

    await expect(page.getByTestId('create-first-trip-btn')).toBeVisible();
    await expect(page.getByText(/no trips yet/i)).toBeVisible();
  });

  test('"New Trip" button navigates to /trips/new', async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto('/trips');

    await page.getByTestId('new-trip-btn').click();
    await expect(page).toHaveURL(/\/trips\/new/);
  });

  test('clicking a trip card navigates to the trip detail page', async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto('/trips');

    await page.getByTestId('trip-card-0').click();
    await expect(page).toHaveURL(/\/trips\/trip-e2e-001/);
  });

  test('each trip card shows ship name and port count', async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto('/trips');

    await expect(page.getByTestId('trip-card-0')).toContainText('Symphony of the Seas');
    await expect(page.getByTestId('trip-card-0')).toContainText('1 ports');
  });
});
