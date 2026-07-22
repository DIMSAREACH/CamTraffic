/** Matches backend authentication/login_messages.py */
export const LOGIN_ERRORS = {
  invalidCredentials: 'Invalid email or password. Please try again.',
  adminOnUserPortal:
    'This email is for an Administrator account. Please use the Administrator sign-in page instead of Driver or Officer.',
  nonAdminOnAdminPortal:
    'This email is not an Administrator account. Please sign in on the Driver or Officer page with this email.',
  wrongOfficerTab:
    'This email belongs to an Officer account. Select the Officer tab above, then try again.',
  wrongDriverTab:
    'This email belongs to a Driver account. Select the Driver tab above, then try again.',
  deactivated: 'This account has been deactivated. Please contact your administrator.',
} as const;
