import { describe, expect, it } from 'vitest';
import {
  getAdminPort,
  getUserPort,
  isAdminPath,
  isUserPortalPath,
} from '@shared/utils/portal';

describe('portal helpers', () => {
  it('returns default dev ports', () => {
    expect(getAdminPort()).toBe(5174);
    expect(getUserPort()).toBe(5173);
  });

  it('detects admin routes', () => {
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/dashboard')).toBe(true);
    expect(isAdminPath('/dashboard')).toBe(false);
  });

  it('detects user portal routes', () => {
    expect(isUserPortalPath('/dashboard')).toBe(true);
    expect(isUserPortalPath('/dashboard/fines')).toBe(true);
    expect(isUserPortalPath('/admin/users')).toBe(false);
  });
});
