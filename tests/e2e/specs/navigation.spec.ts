import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('header shows site name', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /static site template/i })).toBeVisible();
  });

  test('navigates between pages', async ({ page }) => {
    await page.goto('/');

    // Go to About
    await page.getByRole('link', { name: 'About' }).first().click();
    await expect(page).toHaveURL('/about');
    await expect(page.getByText('About This Template')).toBeVisible();

    // Go back to Home
    await page.getByRole('link', { name: 'Home' }).first().click();
    await expect(page).toHaveURL('/');
  });

  test('unknown routes show 404', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByRole('link', { name: /go home/i })).toBeVisible();
  });

  test('footer is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/all rights reserved/i)).toBeVisible();
  });
});
