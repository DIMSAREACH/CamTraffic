import type { Page } from '@playwright/test';

const LOCALE_KEY = 'camtraffic_locale';
const E2E_PRIMED_KEY = 'camtraffic_e2e_storage_primed';

/** Stable EN locale and no persisted session before each login smoke test. */
export async function prepareLoginPage(page: Page) {
  await page.addInitScript((localeKey, primedKey) => {
    localStorage.setItem(localeKey, 'en');
    // Init script runs on every navigation; only wipe auth once per test tab.
    if (localStorage.getItem(primedKey) === '1') return;

    sessionStorage.clear();
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = storage.length - 1; i >= 0; i -= 1) {
        const key = storage.key(i);
        if (key?.startsWith('traffic_')) storage.removeItem(key);
      }
    }
    localStorage.setItem(primedKey, '1');
    localStorage.setItem(localeKey, 'en');
  }, LOCALE_KEY, E2E_PRIMED_KEY);
}

export async function gotoAdminLogin(page: Page) {
  await prepareLoginPage(page);
  await page.goto('/');
  await page.locator('#admin-email').waitFor({ state: 'visible', timeout: 30_000 });
}

export async function openOfficerTab(page: Page) {
  await prepareLoginPage(page);
  await page.goto('/');
  const officerTab = page.getByRole('button', { name: /^(officer|police|មន្ត្រី)$/i });
  await officerTab.waitFor({ state: 'visible', timeout: 30_000 });
  await officerTab.click();
  await page.locator('#police-email').waitFor({ state: 'visible', timeout: 15_000 });
}

export async function openDriverTab(page: Page) {
  await prepareLoginPage(page);
  await page.goto('/');
  const driverTab = page.getByRole('button', { name: /^(driver|អ្នកបើកបរ)$/i });
  await driverTab.waitFor({ state: 'visible', timeout: 30_000 });
  await driverTab.click();
  await page.locator('#driver-email').waitFor({ state: 'visible', timeout: 15_000 });
}
