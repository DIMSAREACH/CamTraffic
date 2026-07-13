import { describe, expect, it } from 'vitest';
import { POLICE_QUICK_ROUTES } from '@user/navigation/policeNav';

describe('policeNav', () => {
  it('maps officer quick links to enforcement routes', () => {
    expect(POLICE_QUICK_ROUTES.reports).toBe('/dashboard/reports');
    expect(POLICE_QUICK_ROUTES.evidence).toBe('/dashboard/evidence');
  });
});
