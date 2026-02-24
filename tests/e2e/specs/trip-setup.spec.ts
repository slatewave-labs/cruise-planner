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
    // lat/lng fields are hidden from the UI (populated internally via port search)
    await expect(page.getByTestId('port-lat-0')).not.toBeVisible();
    await expect(page.getByTestId('port-lng-0')).not.toBeVisible();
    await expect(page.getByTestId('port-arrival-0')).toBeVisible();
    await expect(page.getByTestId('port-departure-0')).toBeVisible();
  });

  test('lat/lng fields are not present in the port entry UI', async ({ page }) => {
    await page.getByTestId('add-port-btn').click();
    await expect(page.getByTestId('port-lat-0')).not.toBeAttached();
    await expect(page.getByTestId('port-lng-0')).not.toBeAttached();
  });

  test('arrival datetime input has 5-minute step and a min attribute', async ({ page }) => {
    await page.getByTestId('add-port-btn').click();
    const arrivalInput = page.getByTestId('port-arrival-0');
    await expect(arrivalInput).toHaveAttribute('step', '300');
    const minAttr = await arrivalInput.getAttribute('min');
    expect(minAttr).toBeTruthy();
    // min should be a valid datetime-local value (YYYY-MM-DDTHH:mm)
    expect(minAttr).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  test('departure datetime input has 5-minute step and a min attribute', async ({ page }) => {
    await page.getByTestId('add-port-btn').click();
    const departureInput = page.getByTestId('port-departure-0');
    await expect(departureInput).toHaveAttribute('step', '300');
    const minAttr = await departureInput.getAttribute('min');
    expect(minAttr).toBeTruthy();
    expect(minAttr).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  test('ship name input shows autocomplete dropdown on focus', async ({ page }) => {
    const shipInput = page.getByTestId('ship-name-input');
    await shipInput.click();
    await expect(page.getByTestId('ship-suggestions')).toBeVisible();
    // Should contain known ship names
    await expect(page.getByTestId('ship-suggestion-0')).toBeVisible();
  });

  test('ship name autocomplete filters by typed text', async ({ page }) => {
    const shipInput = page.getByTestId('ship-name-input');
    await shipInput.fill('Symphony');
    await expect(page.getByTestId('ship-suggestions')).toBeVisible();
    await expect(page.getByText('Symphony of the Seas')).toBeVisible();
  });

  test('selecting a ship name suggestion populates the field', async ({ page }) => {
    const shipInput = page.getByTestId('ship-name-input');
    await shipInput.fill('Symphony');
    await page.getByText('Symphony of the Seas').click();
    await expect(shipInput).toHaveValue('Symphony of the Seas');
  });

  test('cruise line input shows autocomplete dropdown on focus', async ({ page }) => {
    const cruiseLineInput = page.getByTestId('cruise-line-input');
    await cruiseLineInput.click();
    await expect(page.getByTestId('cruise-line-suggestions')).toBeVisible();
    await expect(page.getByTestId('cruise-line-suggestion-0')).toBeVisible();
  });

  test('cruise line autocomplete filters by typed text', async ({ page }) => {
    const cruiseLineInput = page.getByTestId('cruise-line-input');
    await cruiseLineInput.fill('Royal');
    await expect(page.getByTestId('cruise-line-suggestions')).toBeVisible();
    await expect(page.getByText('Royal Caribbean International')).toBeVisible();
  });

  test('selecting a cruise line suggestion populates the field', async ({ page }) => {
    const cruiseLineInput = page.getByTestId('cruise-line-input');
    await cruiseLineInput.fill('Royal');
    await page.getByText('Royal Caribbean International').click();
    await expect(cruiseLineInput).toHaveValue('Royal Caribbean International');
  });

  test('ship name dropdown hides when input is cleared and no match', async ({ page }) => {
    const shipInput = page.getByTestId('ship-name-input');
    await shipInput.fill('ZZZNOMATCH');
    // No suggestions match this
    await expect(page.getByTestId('ship-suggestions')).not.toBeVisible();
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
