/**
 * Production-truth data mode.
 * - Production builds always use live Django APIs (no mock, no sample merge).
 * - Development may opt in via .env flags.
 */
export const IS_DEV = import.meta.env.DEV;
export const IS_PROD_BUILD = import.meta.env.PROD;

/** Full in-memory API (mockApi.ts) — development only, requires VITE_USE_MOCK=true */
export const USE_MOCK_API = IS_DEV && import.meta.env.VITE_USE_MOCK === 'true';

/** Inject demo rows when live API returns empty — development only, requires VITE_USE_SAMPLE_FALLBACK=true */
export const USE_SAMPLE_FALLBACK = IS_DEV && import.meta.env.VITE_USE_SAMPLE_FALLBACK === 'true';

export function assertProductionDataMode(): void {
  if (IS_PROD_BUILD && import.meta.env.VITE_USE_MOCK === 'true') {
    throw new Error(
      'CamTraffic: VITE_USE_MOCK must be false for production builds. Use the Django backend and seed_production.',
    );
  }
}

export function dataModeLabel(): string {
  if (USE_MOCK_API) return 'mock-api';
  if (USE_SAMPLE_FALLBACK) return 'live+sample-fallback';
  return 'production-truth';
}
