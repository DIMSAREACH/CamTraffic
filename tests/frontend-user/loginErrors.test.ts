import { describe, expect, it } from 'vitest';
import { LOGIN_ERRORS } from '@shared/utils/loginErrors';

describe('user portal login errors', () => {
  it('steers admin emails to admin portal', () => {
    expect(LOGIN_ERRORS.adminOnUserPortal).toMatch(/Administrator sign-in/i);
  });

  it('steers officer emails to officer tab', () => {
    expect(LOGIN_ERRORS.wrongOfficerTab).toMatch(/Officer tab/i);
  });
});
