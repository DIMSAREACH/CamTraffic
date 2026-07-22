import { describe, expect, it } from 'vitest';
import { CITIZEN_QUICK_ROUTES, DRIVER_QUICK_ROUTES } from '@citizen/navigation/citizenNav';

describe('citizenNav', () => {
  it('maps citizen quick links to /citizen routes', () => {
    expect(CITIZEN_QUICK_ROUTES.payments).toBe('/citizen/fines/payments');
    expect(CITIZEN_QUICK_ROUTES.settings).toBe('/citizen/settings');
    expect(DRIVER_QUICK_ROUTES.payments).toBe(CITIZEN_QUICK_ROUTES.payments);
  });
});
