import { describe, expect, it, vi } from 'vitest';

describe('production-truth data mode', () => {
  it('does not use sample fallback when env flag is false', async () => {
    vi.stubEnv('VITE_USE_SAMPLE_FALLBACK', 'false');
    vi.stubEnv('VITE_USE_MOCK', 'false');
    const { USE_SAMPLE_FALLBACK, USE_MOCK_API } = await import('@shared/config/dataMode');
    expect(USE_SAMPLE_FALLBACK).toBe(false);
    expect(USE_MOCK_API).toBe(false);
  });
});
