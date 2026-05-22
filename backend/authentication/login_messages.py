"""User-facing login error messages (role / portal mismatch)."""

LOGIN_INVALID_CREDENTIALS = 'Invalid email or password. Please try again.'

LOGIN_ADMIN_ON_USER_PORTAL = (
    'This email is for an Administrator account. '
    'Please use the Administrator sign-in page instead of Driver or Officer.'
)

LOGIN_NON_ADMIN_ON_ADMIN_PORTAL = (
    'This email is not an Administrator account. '
    'Please sign in on the Driver or Officer page with this email.'
)

LOGIN_WRONG_OFFICER_TAB = (
    'This email belongs to an Officer account. '
    'Select the Officer tab above, then try again.'
)

LOGIN_WRONG_DRIVER_TAB = (
    'This email belongs to a Driver account. '
    'Select the Driver tab above, then try again.'
)

LOGIN_ACCOUNT_DEACTIVATED = (
    'This account has been deactivated. Please contact your administrator.'
)
