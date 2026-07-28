import { describe, expect, it } from 'vitest';
import { CITIZEN_PORTAL_ROUTES, OFFICER_PORTAL_ROUTES } from '@shared/constants/portalRoutes';

/** Tab config mirrors FinesTabs.tsx — manage vs payments paths. */
const CITIZEN_FINES_TABS = [
  { id: 'manage' as const, path: CITIZEN_PORTAL_ROUTES.fines },
  { id: 'payments' as const, path: CITIZEN_PORTAL_ROUTES.finesPayments },
];

describe('FinesTabs routes', () => {
  it('defines citizen manage and payments tab paths', () => {
    expect(CITIZEN_FINES_TABS).toHaveLength(2);
    expect(CITIZEN_FINES_TABS[0].path).toBe('/citizen/fines');
    expect(CITIZEN_FINES_TABS[1].path).toBe('/citizen/fines/payments');
  });

  it('keeps officer fines on /officer', () => {
    expect(OFFICER_PORTAL_ROUTES.fines).toBe('/officer/fines');
  });

  it('uses distinct tab ids for navigation state', () => {
    const ids = CITIZEN_FINES_TABS.map((tab) => tab.id);
    expect(ids).toEqual(['manage', 'payments']);
    expect(new Set(ids).size).toBe(2);
  });
});
