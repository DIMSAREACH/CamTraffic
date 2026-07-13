import { describe, expect, it } from 'vitest';
import { LOGIN_ERRORS } from '@shared/utils/loginErrors';

describe('loginErrors', () => {
  it('defines admin portal rejection copy', () => {
    expect(LOGIN_ERRORS.nonAdminOnAdminPortal).toMatch(/Administrator/i);
  });

  it('defines user portal admin rejection copy', () => {
    expect(LOGIN_ERRORS.adminOnUserPortal).toMatch(/Administrator sign-in page/i);
  });

  it('defines officer/driver tab hints', () => {
    expect(LOGIN_ERRORS.wrongOfficerTab).toMatch(/Officer tab/i);
    expect(LOGIN_ERRORS.wrongDriverTab).toMatch(/Driver tab/i);
  });
});
