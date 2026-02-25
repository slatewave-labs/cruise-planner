/**
 * Terms & Conditions page E2E tests.
 *
 * Validates that all T&C sections render and external
 * links have the correct target attributes.
 */
import { test, expect } from '@playwright/test';
import { dismissCookieBanner } from './fixtures';

test.describe('Terms & Conditions Page', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieBanner(page);
    await page.goto('/terms');
  });

  test('displays the Terms & Conditions heading', async ({ page }) => {
    await expect(page.getByTestId('terms-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /terms & conditions/i })).toBeVisible();
  });

  test('renders all sixteen T&C sections', async ({ page }) => {
    for (let i = 0; i < 16; i++) {
      await expect(page.getByTestId(`terms-section-${i}`)).toBeVisible();
    }
  });

  test('sections with external links have the correct attributes', async ({ page }) => {
    // Sections with external links (by array index): 2 (Open-Meteo), 3 (Groq),
    // 4 (OpenStreetMap), 5 (Google Maps), 7 (Google Analytics), 8 (AWS)
    const sectionsWithLinks = [2, 3, 4, 5, 7, 8];
    for (const i of sectionsWithLinks) {
      const link = page.getByTestId(`terms-link-${i}`);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
  });

  test('sections without external links do not show link elements', async ({ page }) => {
    // Sections without external links (by array index): 0, 1, 6, 9-15
    const sectionsWithoutLinks = [0, 1, 6, 9, 10, 11, 12, 13, 14, 15];
    for (const i of sectionsWithoutLinks) {
      await expect(page.getByTestId(`terms-link-${i}`)).not.toBeVisible();
    }
  });

  test('displays section titles for all third-party services', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Open-Meteo Weather API/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Groq AI/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /OpenStreetMap/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Google Maps \(Route Export\)/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Affiliate Partners/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Google Analytics/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /AWS Cloud Infrastructure/ })).toBeVisible();
  });
});
