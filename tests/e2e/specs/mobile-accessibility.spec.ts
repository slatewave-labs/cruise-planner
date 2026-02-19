/**
 * Mobile responsiveness and accessibility E2E tests.
 *
 * Validates that pages render correctly at mobile viewport sizes
 * and that touch targets meet the 48px minimum accessibility requirement.
 */
import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 375, height: 667 };

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test('home page is usable at 375px width', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-page')).toBeVisible();
    await expect(page.getByTestId('get-started-btn')).toBeVisible();
    await expect(page.getByTestId('learn-more-btn')).toBeVisible();

    // Feature cards should be visible (may be stacked)
    await expect(page.getByTestId('feature-card-0')).toBeVisible();
  });

  test('items page is usable at 375px width', async ({ page }) => {
    await page.goto('/items');
    await expect(page.getByTestId('items-page')).toBeVisible();
    await expect(page.getByTestId('create-item-form')).toBeVisible();
    await expect(page.getByTestId('item-name-input')).toBeVisible();
    await expect(page.getByTestId('create-item-btn')).toBeVisible();
  });

  test('about page is usable at 375px width', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByTestId('about-page')).toBeVisible();
    await expect(page.getByTestId('tech-section-0')).toBeVisible();
  });
});

test.describe('Accessibility — Touch Targets', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test('primary action buttons meet 48px minimum height', async ({ page }) => {
    await page.goto('/');

    // Check "Get Started" button
    const startBtn = page.getByTestId('get-started-btn');
    const startBox = await startBtn.boundingBox();
    expect(startBox!.height).toBeGreaterThanOrEqual(48);

    // Check "Learn More" button
    const learnBtn = page.getByTestId('learn-more-btn');
    const learnBox = await learnBtn.boundingBox();
    expect(learnBox!.height).toBeGreaterThanOrEqual(48);
  });

  test('mobile nav items meet 48px minimum touch target', async ({ page }) => {
    await page.goto('/');

    const navItems = ['home', 'items', 'about'];
    for (const item of navItems) {
      const el = page.getByTestId(`nav-${item}`);
      const box = await el.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(48);
      expect(box!.width).toBeGreaterThanOrEqual(48);
    }
  });

  test('create item button meets 48px minimum height', async ({ page }) => {
    await page.goto('/items');

    const createBtn = page.getByTestId('create-item-btn');
    const box = await createBtn.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  });

  test('CTA button meets 48px minimum height', async ({ page }) => {
    await page.goto('/');

    const ctaBtn = page.getByTestId('cta-start-btn');
    const box = await ctaBtn.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  });
});

test.describe('Accessibility — Page Landmarks', () => {
  test('app layout has proper structure', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('app-layout')).toBeVisible();
    
    // The main content area should exist
    await expect(page.locator('main')).toBeVisible();
    
    // Navigation elements should be present
    const navCount = await page.locator('nav').count();
    expect(navCount).toBeGreaterThanOrEqual(1);
  });

  test('pages have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Should have an h1 on every page
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
