import { test, expect } from '@playwright/test';
import { openOfficerTab } from './helpers/login';

test.describe('Officer AI Detection Center smoke', () => {
  test('officer reaches AI detection workspace with four input modes', async ({ page }) => {
    await openOfficerTab(page);
    await page.locator('#police-email').fill('officer@camtraffic.demo');
    await page.locator('#police-password').fill('CamTraffic@2026!');
    await page.getByRole('button', { name: /login as officer/i }).click();
    await expect(page).toHaveURL(/\/officer/, { timeout: 25_000 });

    await page.goto('/officer/ai-detection/new?mode=image');
    await expect(page).toHaveURL(/\/officer\/ai-detection\/new/, { timeout: 20_000 });
    await expect(page.locator('.enforcement-page__title')).toHaveText(/AI Detection/i, { timeout: 20_000 });

    const workspace = page.locator(
      '.ai-center-input-panel, .ai-center-results, .live-webcam-panel, .ai-center-webcam-wrap',
    );

    for (const mode of ['image', 'video', 'camera', 'webcam'] as const) {
      await page.goto(`/officer/ai-detection/new?mode=${mode}`);
      await expect(page).toHaveURL(new RegExp(`mode=${mode}`), { timeout: 20_000 });
      await expect(workspace.first()).toBeVisible({ timeout: 20_000 });
    }
  });
});
