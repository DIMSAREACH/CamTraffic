import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openOfficerTab } from './helpers/login';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

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

  test('image mode shows Auto driver action and accepts a sample upload', async ({ page }) => {
    await openOfficerTab(page);
    await page.locator('#police-email').fill('officer@camtraffic.demo');
    await page.locator('#police-password').fill('CamTraffic@2026!');
    await page.getByRole('button', { name: /login as officer/i }).click();
    await expect(page).toHaveURL(/\/officer/, { timeout: 25_000 });

    await page.goto('/officer/ai-detection/new?mode=image');
    await expect(page.locator('.ai-detection-demo-select')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Auto \(match/i).first()).toBeVisible({ timeout: 10_000 });

    const sample = path.join(repoRoot, 'ai', 'catalog_10_signs', 'R1_04_No entry.png');
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles(sample);
    await expect(page.locator('.ai-center-dropzone--has-preview, .ai-center-dropzone img, .ai-center-dropzone__preview').first())
      .toBeVisible({ timeout: 15_000 });
  });
});
