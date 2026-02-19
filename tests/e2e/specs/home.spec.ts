/**
 * Home page E2E tests.
 *
 * Validates the hero section, feature cards, and CTA buttons on the home page.
 */
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays the home page', async ({ page }) => {
    await expect(page.getByTestId('home-page')).toBeVisible();
  });

  test('displays the hero section with heading', async ({ page }) => {
    // Check for main heading - adjust text as needed for your app
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('"Get Started" button is visible and clickable', async ({ page }) => {
    const btn = page.getByTestId('get-started-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('"Learn More" button is visible and clickable', async ({ page }) => {
    const btn = page.getByTestId('learn-more-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('displays all four feature cards', async ({ page }) => {
    for (let i = 0; i < 4; i++) {
      await expect(page.getByTestId(`feature-card-${i}`)).toBeVisible();
    }
  });

  test('bottom CTA "Start" button is visible', async ({ page }) => {
    await expect(page.getByTestId('cta-start-btn')).toBeVisible();
  });
});
