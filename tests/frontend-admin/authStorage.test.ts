import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearAuthSession,
  getAuthPortal,
  isRememberMeEnabled,
  saveAuthSession,
} from '@shared/utils/authStorage';
import type { User } from '@shared/types';

const adminUser: User = {
  id: '1',
  email: 'admin@camtraffic.local',
  full_name: 'Admin User',
  role: 'admin',
  phone: '',
  address: '',
  created_at: new Date().toISOString(),
  is_active: true,
  email_verified: true,
};

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearAuthSession('admin');
  });

  it('uses admin portal storage namespace', () => {
    expect(getAuthPortal()).toBe('admin');
  });

  it('persists session when remember-me is enabled', () => {
    saveAuthSession(
      { access: 'token-abc', refresh: 'refresh-xyz', user: adminUser },
      true,
      'admin',
    );
    expect(isRememberMeEnabled('admin')).toBe(true);
    expect(localStorage.getItem('traffic_token_admin')).toBe('token-abc');
  });

  it('clears admin session on logout helper', () => {
    saveAuthSession(
      { access: 'token-abc', refresh: 'refresh-xyz', user: adminUser },
      false,
      'admin',
    );
    clearAuthSession('admin');
    expect(sessionStorage.getItem('traffic_token_admin')).toBeNull();
  });
});
