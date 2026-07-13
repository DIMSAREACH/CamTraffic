import { describe, expect, it } from 'vitest';
import type { UserRole } from '@shared/types';

function roleAllowedOnAdminPortal(role: UserRole): boolean {
  return role === 'admin';
}

function roleAllowedOnUserPortal(role: UserRole): boolean {
  return role === 'police' || role === 'driver';
}

describe('admin route guard rules', () => {
  it('allows only admin on admin portal', () => {
    expect(roleAllowedOnAdminPortal('admin')).toBe(true);
    expect(roleAllowedOnAdminPortal('police')).toBe(false);
    expect(roleAllowedOnAdminPortal('driver')).toBe(false);
  });

  it('allows officer and driver on user portal', () => {
    expect(roleAllowedOnUserPortal('police')).toBe(true);
    expect(roleAllowedOnUserPortal('driver')).toBe(true);
    expect(roleAllowedOnUserPortal('admin')).toBe(false);
  });
});
