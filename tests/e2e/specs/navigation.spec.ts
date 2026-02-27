/**
 * Navigation E2E tests — desktop and mobile.
 *
 * Validates that all nav items are present, routes work,
 * and the correct nav variant is shown per viewport.
 */
import { test, expect } from '@playwright/test';
import { mockAllApiRoutes } from './fixtures';

test.describe('Navigation — Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto('/');
  });

  test('desktop nav bar is visible and has all links', async ({ page }) => {
    await expect(page.getByTestId('desktop-nav')).toBeVisible();
    await expect(page.getByTestId('nav-home')).toBeVisible();
    await expect(page.getByTestId('nav-my-trips')).toBeVisible();
    await expect(page.getByTestId('nav-new-trip')).toBeVisible();
  });

  test('mobile bottom nav is NOT visible on desktop', async ({ page }) => {
    await expect(page.getByTestId('mobile-bottom-nav')).not.toBeVisible();
  });

  test('clicking "My Trips" in desktop nav navigates to /trips', async ({ page }) => {
    await page.getByTestId('nav-my-trips').click();
    await expect(page).toHaveURL(/\/trips$/);
  });

  test('clicking "New Trip" in desktop nav navigates to /trips/new', async ({ page }) => {
    await page.getByTestId('nav-new-trip').click();
    await expect(page).toHaveURL(/\/trips\/new/);
  });

  test('clicking "Home" in desktop nav navigates to /', async ({ page }) => {
    // Navigate away first
    await page.goto('/terms');
    await page.getByTestId('nav-home').click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Navigation — Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto('/');
  });

  test('mobile bottom nav is visible and has all links', async ({ page }) => {
    await expect(page.getByTestId('mobile-bottom-nav')).toBeVisible();
    await expect(page.getByTestId('mobile-nav-home')).toBeVisible();
    await expect(page.getByTestId('mobile-nav-my-trips')).toBeVisible();
    await expect(page.getByTestId('mobile-nav-new-trip')).toBeVisible();
  });

  test('desktop nav is NOT visible on mobile', async ({ page }) => {
    await expect(page.getByTestId('desktop-nav')).not.toBeVisible();
  });

  test('mobile header with ShoreExplorer branding is visible', async ({ page }) => {
    await expect(page.getByTestId('mobile-header')).toBeVisible();
    await expect(page.getByTestId('mobile-header')).toContainText('ShoreExplorer');
  });

  test('clicking "My Trips" in mobile nav navigates to /trips', async ({ page }) => {
    await page.getByTestId('mobile-nav-my-trips').click();
    await expect(page).toHaveURL(/\/trips$/);
  });

  test('clicking "New Trip" in mobile nav navigates to /trips/new', async ({ page }) => {
    await page.getByTestId('mobile-nav-new-trip').click();
    await expect(page).toHaveURL(/\/trips\/new/);
  });

  test('site footer is visible after scrolling to the bottom of the page', async ({ page }) => {
    // Scroll to the very bottom so the footer is in view
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const footer = page.getByTestId('site-footer');
    await expect(footer).toBeVisible();

    // Verify footer content is accessible
    await expect(footer).toContainText('Slatewave Labs');
    await expect(footer).toContainText('Terms');
    await expect(footer).toContainText('Privacy');
  });
});
