/**
 * Landing page E2E tests.
 *
 * Validates the hero section, feature cards, CTA buttons,
 * and navigation links on the home page.
 */
const { test, expect } = require('@playwright/test');
const { mockAllApiRoutes } = require('./fixtures');

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto('/');
  });

  test('displays the hero section with headline and tagline', async ({ page }) => {
    await expect(page.getByTestId('landing-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /make every port/i })).toBeVisible();
    await expect(page.getByText(/personalised day plans/i)).toBeVisible();
  });

  test('"Start Planning" button navigates to /trips/new', async ({ page }) => {
    await page.getByTestId('get-started-btn').click();
    await expect(page).toHaveURL(/\/trips\/new/);
  });

  test('"My Trips" button navigates to /trips', async ({ page }) => {
    await page.getByTestId('view-trips-btn').click();
    await expect(page).toHaveURL(/\/trips$/);
  });

  test('displays all four feature cards', async ({ page }) => {
    for (let i = 0; i < 4; i++) {
      await expect(page.getByTestId(`feature-card-${i}`)).toBeVisible();
    }
  });

  test('bottom CTA "Create Your Trip" button navigates to /trips/new', async ({ page }) => {
    await page.getByTestId('cta-start-btn').click();
    await expect(page).toHaveURL(/\/trips\/new/);
  });
});
