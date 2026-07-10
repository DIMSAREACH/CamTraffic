import { describe, expect, it } from 'vitest';
import {
  DRIVER_DEFAULT_ROUTE,
  DRIVER_PORTAL_BASE,
  OFFICER_DEFAULT_ROUTE,
  OFFICER_PORTAL_BASE,
  getPortalBasePath,
  getPortalHomeRoute,
} from '../../frontend-user/src/lib/constants';

describe('User portal constants', () => {
  it('maps roles to the correct default routes', () => {
    expect(getPortalHomeRoute('officer')).toBe(OFFICER_DEFAULT_ROUTE);
    expect(getPortalHomeRoute('driver')).toBe(DRIVER_DEFAULT_ROUTE);
  });

  it('maps roles to the correct base paths', () => {
    expect(getPortalBasePath('officer')).toBe(OFFICER_PORTAL_BASE);
    expect(getPortalBasePath('driver')).toBe(DRIVER_PORTAL_BASE);
  });
});
