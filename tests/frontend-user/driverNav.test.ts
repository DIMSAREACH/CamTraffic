import { describe, expect, it } from 'vitest';
import { DRIVER_QUICK_ROUTES } from '@user/navigation/driverNav';

describe('driverNav', () => {
  it('maps driver quick links to dashboard routes', () => {
    expect(DRIVER_QUICK_ROUTES.payments).toBe('/dashboard/fines/payments');
    expect(DRIVER_QUICK_ROUTES.settings).toBe('/dashboard/settings');
  });
});
