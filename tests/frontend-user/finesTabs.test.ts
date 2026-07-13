import { describe, expect, it } from 'vitest';
import { USER_PORTAL_ROUTES } from '@shared/constants/portalRoutes';

/** Tab config mirrors FinesTabs.tsx — manage vs payments paths. */
const FINES_TABS = [
  { id: 'manage' as const, path: USER_PORTAL_ROUTES.fines },
  { id: 'payments' as const, path: USER_PORTAL_ROUTES.finesPayments },
];

describe('FinesTabs routes', () => {
  it('defines manage and payments tab paths', () => {
    expect(FINES_TABS).toHaveLength(2);
    expect(FINES_TABS[0].path).toBe('/dashboard/fines');
    expect(FINES_TABS[1].path).toBe('/dashboard/fines/payments');
  });

  it('uses distinct tab ids for navigation state', () => {
    const ids = FINES_TABS.map((tab) => tab.id);
    expect(ids).toEqual(['manage', 'payments']);
    expect(new Set(ids).size).toBe(2);
  });
});
