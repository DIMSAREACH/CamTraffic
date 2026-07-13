import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('User portal accessibility smoke', () => {
  test('login page — no critical or serious violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter((v) =>
      v.impact === 'critical' || v.impact === 'serious',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
});
