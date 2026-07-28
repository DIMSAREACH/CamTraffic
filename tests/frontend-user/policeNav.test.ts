import { describe, expect, it } from 'vitest';
import { OFFICER_QUICK_ROUTES, POLICE_QUICK_ROUTES } from '@officer/navigation/officerNav';

describe('officerNav', () => {
  it('maps officer quick links to /officer routes', () => {
    expect(OFFICER_QUICK_ROUTES.reports).toBe('/officer/reports');
    expect(OFFICER_QUICK_ROUTES.evidence).toBe('/officer/evidence');
    expect(POLICE_QUICK_ROUTES.reports).toBe(OFFICER_QUICK_ROUTES.reports);
  });
});
