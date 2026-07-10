from django.conf import settings
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.accounts.tokens import email_verification_token_generator

PORTAL_URLS = {
    'admin': lambda: settings.ADMIN_PORTAL_URL,
    'user': lambda: settings.USER_PORTAL_URL,
}


def build_email_verification_url(user, portal: str) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token_generator.make_token(user)
    base_url = PORTAL_URLS[portal]().rstrip('/')
    return f'{base_url}/verify-email?uid={uid}&token={token}'


def send_email_verification_email(user, portal: str) -> None:
    verification_url = build_email_verification_url(user, portal)
    portal_label = 'Admin Portal' if portal == 'admin' else 'User Portal'

    subject = 'CamTraffic email verification'
    message = (
        f'Hello {user.get_full_name() or user.email},\n\n'
        f'Please verify your email address for CamTraffic {portal_label}.\n'
        f'Open the link below to confirm your email:\n\n'
        f'{verification_url}\n\n'
        'If you did not create this account, you can ignore this email.\n'
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
