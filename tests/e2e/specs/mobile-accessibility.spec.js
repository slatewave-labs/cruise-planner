/**
 * Mobile responsiveness E2E tests.
 *
 * Validates that pages render correctly at mobile viewport sizes
 * and that touch targets meet the 48px minimum accessibility requirement.
 */
const { test, expect } = require('@playwright/test');
const { mockAllApiRoutes, VALID_TRIP_ID, VALID_PORT_ID } = require('./fixtures');

const MOBILE_VIEWPORT = { width: 375, height: 667 };

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await mockAllApiRoutes(page);
  });

  test('landing page is usable at 375px width', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('landing-page')).toBeVisible();
    await expect(page.getByTestId('get-started-btn')).toBeVisible();
    await expect(page.getByTestId('view-trips-btn')).toBeVisible();

    // Feature cards should be visible (may be stacked)
    await expect(page.getByTestId('feature-card-0')).toBeVisible();
  });

  test('trip setup page is usable at 375px width', async ({ page }) => {
    await page.goto('/trips/new');
    await expect(page.getByTestId('trip-setup-page')).toBeVisible();
    await expect(page.getByTestId('ship-name-input')).toBeVisible();
    await expect(page.getByTestId('save-trip-btn')).toBeVisible();
  });

  test('my trips page is usable at 375px width', async ({ page }) => {
    await page.goto('/trips');
    await expect(page.getByTestId('my-trips-page')).toBeVisible();
    await expect(page.getByTestId('new-trip-btn')).toBeVisible();
  });

  test('trip detail page is usable at 375px width', async ({ page }) => {
    await page.goto(`/trips/${VALID_TRIP_ID}`);
    await expect(page.getByTestId('trip-detail-page')).toBeVisible();
    await expect(page.getByTestId('edit-trip-btn')).toBeVisible();
    await expect(page.getByTestId('plan-port-btn-0')).toBeVisible();
  });

  test('port planner page is usable at 375px width', async ({ page }) => {
    await page.goto(`/trips/${VALID_TRIP_ID}/ports/${VALID_PORT_ID}/plan`);
    await expect(page.getByTestId('port-planner-page')).toBeVisible();
    await expect(page.getByTestId('generate-plan-btn')).toBeVisible();
  });

  test('terms page is usable at 375px width', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByTestId('terms-page')).toBeVisible();
    await expect(page.getByTestId('terms-section-0')).toBeVisible();
  });
});

test.describe('Accessibility — Touch Targets', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test('primary action buttons meet 48px minimum height', async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto('/');

    // Check "Start Planning" button
    const startBtn = page.getByTestId('get-started-btn');
    const startBox = await startBtn.boundingBox();
    expect(startBox.height).toBeGreaterThanOrEqual(48);

    // Check "My Trips" button on landing
    const tripsBtn = page.getByTestId('view-trips-btn');
    const tripsBox = await tripsBtn.boundingBox();
    expect(tripsBox.height).toBeGreaterThanOrEqual(48);
  });

  test('mobile nav items meet 48px minimum touch target', async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto('/');

    const navItems = ['home', 'my-trips', 'new-trip', 'terms'];
    for (const item of navItems) {
      const el = page.getByTestId(`mobile-nav-${item}`);
      const box = await el.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.width).toBeGreaterThanOrEqual(48);
    }
  });

  test('save trip button meets 48px minimum height', async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto('/trips/new');

    const saveBtn = page.getByTestId('save-trip-btn');
    const box = await saveBtn.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(48);
  });

  test('generate plan button meets 48px minimum height', async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto(`/trips/${VALID_TRIP_ID}/ports/${VALID_PORT_ID}/plan`);

    const genBtn = page.getByTestId('generate-plan-btn');
    const box = await genBtn.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(48);
  });
});

test.describe('Accessibility — Page Landmarks', () => {
  test('app layout has proper structure', async ({ page }) => {
    await mockAllApiRoutes(page);
    await page.goto('/');

    await expect(page.getByTestId('app-layout')).toBeVisible();
    // The main content area should exist
    await expect(page.locator('main')).toBeVisible();
    // Navigation elements should be present (desktop header nav + mobile bottom nav)
    const navCount = await page.locator('nav').count();
    expect(navCount).toBeGreaterThanOrEqual(1);
  });
});
