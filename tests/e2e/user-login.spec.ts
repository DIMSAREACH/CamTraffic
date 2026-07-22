import { test, expect } from '@playwright/test';
import { openDriverTab } from './helpers/login';

test.describe('User portal login smoke', () => {
  test('driver tab shows login form', async ({ page }) => {
    await openDriverTab(page);
    await expect(page.locator('#driver-email')).toBeVisible();
    await expect(page.locator('#driver-password')).toBeVisible();
  });

  test('invalid driver credentials show an error message', async ({ page }) => {
    await openDriverTab(page);
    await page.locator('#driver-email').fill('invalid-driver@test.kh');
    await page.locator('#driver-password').fill('wrong-password-123');
    await page.getByRole('button', { name: /login as driver/i }).click();
    await expect(page.locator('.err-alert')).toBeVisible({ timeout: 15_000 });
  });

  test('valid driver credentials reach dashboard', async ({ page }) => {
    await openDriverTab(page);
    await page.locator('#driver-email').fill('driver@camtraffic.demo');
    await page.locator('#driver-password').fill('CamTraffic@2026!');
    await page.getByRole('button', { name: /login as driver/i }).click();
    await expect(page).toHaveURL(/\/citizen/, { timeout: 20_000 });
  });
});
