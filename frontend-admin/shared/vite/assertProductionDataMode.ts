export function assertProductionDataMode(mode: string, env: Record<string, string>): void {
  if (mode === 'production' && env.VITE_USE_MOCK === 'true') {
    throw new Error(
      'CamTraffic production build blocked: set VITE_USE_MOCK=false in .env before npm run build.',
    );
  }
}
