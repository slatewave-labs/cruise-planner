/**
 * Terms & Conditions page E2E tests.
 *
 * Validates that all T&C sections render and external
 * links have the correct target attributes.
 */
import { test, expect } from '@playwright/test';

test.describe('Terms & Conditions Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/terms');
  });

  test('displays the Terms & Conditions heading', async ({ page }) => {
    await expect(page.getByTestId('terms-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /terms & conditions/i })).toBeVisible();
  });

  test('renders all five T&C sections', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await expect(page.getByTestId(`terms-section-${i}`)).toBeVisible();
    }
  });

  test('each section with an external link has the correct attributes', async ({ page }) => {
    // Sections 0-3 have external links; section 4 (ShoreExplorer App) does not
    for (let i = 0; i < 4; i++) {
      const link = page.getByTestId(`terms-link-${i}`);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
  });

  test('ShoreExplorer App section does not have an external link', async ({ page }) => {
    await expect(page.getByTestId('terms-link-4')).not.toBeVisible();
  });

  test('displays section titles for all third-party services', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Open-Meteo Weather API' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Google Gemini/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /OpenStreetMap/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Google Maps \(Route Export\)/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ShoreExplorer App' })).toBeVisible();
  });
});
