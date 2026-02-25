import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('renders the hero heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /static site template/i })).toBeVisible();
  });

  test('renders feature cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Lightning Fast')).toBeVisible();
    await expect(page.getByText('Secure by Default')).toBeVisible();
    await expect(page.getByText('Global CDN')).toBeVisible();
  });

  test('renders the CI/CD pipeline section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('CI/CD Pipeline')).toBeVisible();
  });

  test('Get Started link navigates to about', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /get started/i }).click();
    await expect(page).toHaveURL('/about');
    await expect(page.getByText('About This Template')).toBeVisible();
  });
});
