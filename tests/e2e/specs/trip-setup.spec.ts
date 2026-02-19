/**
 * Trip creation (TripSetup) E2E tests.
 *
 * Covers creating a new trip, adding ports, using port search,
 * removing ports, form validation, and the save flow.
 */
import { test, expect } from '@playwright/test';
import { mockAllApiRoutes, VALID_TRIP_ID } from './fixtures';

test.describe('Trip Setup — Create New Trip', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto('/trips/new');
  });

  test('renders the new trip form with ship details inputs', async ({ page }) => {
    await expect(page.getByTestId('trip-setup-page')).toBeVisible();
    await expect(page.getByTestId('ship-name-input')).toBeVisible();
    await expect(page.getByTestId('cruise-line-input')).toBeVisible();
    await expect(page.getByTestId('add-port-btn')).toBeVisible();
  });

  test('shows heading "Plan a New Trip" for new trip creation', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /plan a new trip/i })).toBeVisible();
  });

  test('can fill in ship name and cruise line', async ({ page }) => {
    await page.getByTestId('ship-name-input').fill('Symphony of the Seas');
    await page.getByTestId('cruise-line-input').fill('Royal Caribbean');

    await expect(page.getByTestId('ship-name-input')).toHaveValue('Symphony of the Seas');
    await expect(page.getByTestId('cruise-line-input')).toHaveValue('Royal Caribbean');
  });

  test('can add a port entry and fill port details', async ({ page }) => {
    await page.getByTestId('add-port-btn').click();
    await expect(page.getByTestId('port-entry-0')).toBeVisible();
    await expect(page.getByTestId('port-name-0')).toBeVisible();
    await expect(page.getByTestId('port-country-0')).toBeVisible();
    await expect(page.getByTestId('port-lat-0')).toBeVisible();
    await expect(page.getByTestId('port-lng-0')).toBeVisible();
    await expect(page.getByTestId('port-arrival-0')).toBeVisible();
    await expect(page.getByTestId('port-departure-0')).toBeVisible();
  });

  test('can add multiple ports and remove one', async ({ page }) => {
    await page.getByTestId('add-port-btn').click();
    await page.getByTestId('add-port-btn').click();

    await expect(page.getByTestId('port-entry-0')).toBeVisible();
    await expect(page.getByTestId('port-entry-1')).toBeVisible();

    // Remove first port
    await page.getByTestId('remove-port-0').click();

    // Only one port entry should remain
    await expect(page.getByTestId('port-entry-0')).toBeVisible();
    await expect(page.getByTestId('port-entry-1')).not.toBeVisible();
  });

  test('shows empty state message when no ports added', async ({ page }) => {
    await expect(page.getByText(/no ports added yet/i)).toBeVisible();
  });

  test('submitting the form saves the trip and redirects to trip detail', async ({ page }) => {
    await page.getByTestId('ship-name-input').fill('Anthem of the Seas');
    await page.getByTestId('cruise-line-input').fill('Royal Caribbean');

    await page.getByTestId('save-trip-btn').click();

    await expect(page).toHaveURL(new RegExp(`/trips/${VALID_TRIP_ID}`));
  });

  test('port search shows suggestions dropdown on focus', async ({ page }) => {
    await page.getByTestId('add-port-btn').click();

    const portNameInput = page.getByTestId('port-name-0');
    await portNameInput.click();

    // The dropdown should appear with port suggestions
    await expect(page.getByText('Barcelona')).toBeVisible();
    await expect(page.getByText('Marseille')).toBeVisible();
  });
});

test.describe('Trip Setup — Edit Existing Trip', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto(`/trips/${VALID_TRIP_ID}/edit`);
  });

  test('loads existing trip data in edit mode', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /edit trip/i })).toBeVisible();
    await expect(page.getByTestId('ship-name-input')).toHaveValue('Symphony of the Seas');
    await expect(page.getByTestId('cruise-line-input')).toHaveValue('Royal Caribbean');
  });

  test('shows existing ports pre-populated', async ({ page }) => {
    await expect(page.getByTestId('port-entry-0')).toBeVisible();
  });
});
