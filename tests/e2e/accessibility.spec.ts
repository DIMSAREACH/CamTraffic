import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoAdminLogin } from './helpers/login';

test.describe('Accessibility smoke (axe-core)', () => {
  test('admin login page — no critical or serious violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter((v) =>
      v.impact === 'critical' || v.impact === 'serious',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('skip-to-main link is present on dashboard after login', async ({ page }) => {
    await gotoAdminLogin(page);
    await page.locator('#admin-email').fill('admin@camtraffic.demo');
    await page.locator('#admin-password').fill('CamTraffic@2026!');
    await page.getByRole('button', { name: /sign in to console/i }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 20_000 });

    const skipLink = page.getByRole('link', { name: /skip to main content/i });
    await expect(skipLink).toBeAttached();
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
  });
});
