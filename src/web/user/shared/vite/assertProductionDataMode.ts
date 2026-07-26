export function assertProductionDataMode(mode: string, env: Record<string, string>): void {
  if (mode === 'production' && env.VITE_USE_MOCK === 'true') {
    throw new Error(
      'CamTraffic production build blocked: set VITE_USE_MOCK=false in .env before npm run build.',
    );
  }
  if (mode === 'production' && env.VITE_USE_SAMPLE_FALLBACK === 'true') {
    throw new Error(
      'CamTraffic production build blocked: set VITE_USE_SAMPLE_FALLBACK=false in .env before npm run build.',
    );
  }
  if (mode === 'production' && env.VITE_ALLOW_DEMO_VIOLATION === 'true') {
    throw new Error(
      'CamTraffic production build blocked: set VITE_ALLOW_DEMO_VIOLATION=false in .env before npm run build.',
    );
  }
  if (mode === 'production' && env.VITE_ALLOW_DEMO_ASSETS === 'true') {
    throw new Error(
      'CamTraffic production build blocked: set VITE_ALLOW_DEMO_ASSETS=false in .env before npm run build.',
    );
  }
}
