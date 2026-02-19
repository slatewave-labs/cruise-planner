/**
 * Navigation E2E tests — desktop and mobile.
 *
 * Validates that all nav items are present, routes work,
 * and the correct nav variant is shown per viewport.
 */
import { test, expect } from '@playwright/test';

test.describe('Navigation — Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('desktop nav bar is visible and has all links', async ({ page }) => {
    await expect(page.getByTestId('desktop-nav')).toBeVisible();
    await expect(page.getByTestId('nav-home')).toBeVisible();
    await expect(page.getByTestId('nav-items')).toBeVisible();
    await expect(page.getByTestId('nav-about')).toBeVisible();
  });

  test('mobile bottom nav is NOT visible on desktop', async ({ page }) => {
    await expect(page.getByTestId('mobile-bottom-nav')).not.toBeVisible();
  });

  test('"My App" branding is visible in desktop nav', async ({ page }) => {
    const nav = page.getByTestId('desktop-nav');
    await expect(nav.getByText('My App')).toBeVisible();
  });

  test('clicking "Items" in desktop nav navigates to /items', async ({ page }) => {
    await page.getByTestId('nav-items').click();
    await expect(page).toHaveURL(/\/items/);
    await expect(page.getByTestId('items-page')).toBeVisible();
  });

  test('clicking "About" in desktop nav navigates to /about', async ({ page }) => {
    await page.getByTestId('nav-about').click();
    await expect(page).toHaveURL(/\/about/);
    await expect(page.getByTestId('about-page')).toBeVisible();
  });

  test('clicking "Home" in desktop nav navigates to /', async ({ page }) => {
    // Navigate away first
    await page.goto('/about');
    await page.getByTestId('nav-home').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('home-page')).toBeVisible();
  });

  test('active nav link is highlighted', async ({ page }) => {
    await page.goto('/items');
    const itemsLink = page.getByTestId('nav-items');
    
    // Check that the active link has the active styling (adjust selector as needed)
    const classes = await itemsLink.getAttribute('class');
    expect(classes).toContain('border-b-2'); // Active indicator
  });
});

test.describe('Navigation — Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('mobile bottom nav is visible and has all links', async ({ page }) => {
    await expect(page.getByTestId('mobile-bottom-nav')).toBeVisible();
    await expect(page.getByTestId('nav-home')).toBeVisible();
    await expect(page.getByTestId('nav-items')).toBeVisible();
    await expect(page.getByTestId('nav-about')).toBeVisible();
  });

  test('desktop nav is NOT visible on mobile', async ({ page }) => {
    await expect(page.getByTestId('desktop-nav')).not.toBeVisible();
  });

  test('mobile header with app branding is visible', async ({ page }) => {
    await expect(page.getByTestId('mobile-header')).toBeVisible();
    await expect(page.getByTestId('mobile-header')).toContainText('My App');
  });

  test('clicking "Items" in mobile nav navigates to /items', async ({ page }) => {
    await page.getByTestId('nav-items').click();
    await expect(page).toHaveURL(/\/items/);
    await expect(page.getByTestId('items-page')).toBeVisible();
  });

  test('clicking "About" in mobile nav navigates to /about', async ({ page }) => {
    await page.getByTestId('nav-about').click();
    await expect(page).toHaveURL(/\/about/);
    await expect(page.getByTestId('about-page')).toBeVisible();
  });

  test('clicking "Home" in mobile nav navigates to /', async ({ page }) => {
    await page.goto('/items');
    await page.getByTestId('nav-home').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('home-page')).toBeVisible();
  });
});
