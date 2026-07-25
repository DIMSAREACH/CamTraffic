import { test, expect } from '@playwright/test';
import { gotoAdminLogin } from './helpers/login';

test.describe('Admin portal login smoke', () => {
  test('login page renders email and password fields', async ({ page }) => {
    await gotoAdminLogin(page);
    await expect(page.locator('#admin-email')).toBeVisible();
    await expect(page.locator('#admin-password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in to console/i })).toBeVisible();
  });

  test('invalid credentials show an error message', async ({ page }) => {
    await gotoAdminLogin(page);
    await page.locator('#admin-email').fill('invalid-admin@test.kh');
    await page.locator('#admin-password').fill('wrong-password-123');
    await page.getByRole('button', { name: /sign in to console/i }).click();
    await expect(page.locator('.err-alert')).toBeVisible({ timeout: 15_000 });
  });

  test('valid admin credentials reach dashboard', async ({ page }) => {
    await gotoAdminLogin(page);
    await page.locator('#admin-email').fill('admin@camtraffic.demo');
    await page.locator('#admin-password').fill('CamTraffic@2026!');
    await page.getByRole('button', { name: /sign in to console/i }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 20_000 });
  });
});
