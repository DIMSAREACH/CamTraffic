import { describe, expect, it } from 'vitest';
import type { UserRole } from '@shared/types';

function roleAllowedOnUserPortal(role: UserRole): boolean {
  return role === 'police' || role === 'driver';
}

describe('user route guard rules', () => {
  it('allows driver and officer on user portal', () => {
    expect(roleAllowedOnUserPortal('driver')).toBe(true);
    expect(roleAllowedOnUserPortal('police')).toBe(true);
  });

  it('blocks admin from user portal routes', () => {
    expect(roleAllowedOnUserPortal('admin')).toBe(false);
  });
});
