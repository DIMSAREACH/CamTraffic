from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

PORTAL_URLS = {
    'admin': lambda: settings.ADMIN_PORTAL_URL,
    'user': lambda: settings.USER_PORTAL_URL,
}


def build_password_reset_url(user, portal: str) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base_url = PORTAL_URLS[portal]().rstrip('/')
    return f'{base_url}/reset-password?uid={uid}&token={token}'


def send_password_reset_email(user, portal: str) -> None:
    reset_url = build_password_reset_url(user, portal)
    portal_label = 'Admin Portal' if portal == 'admin' else 'User Portal'

    subject = 'CamTraffic password reset'
    message = (
        f'Hello {user.get_full_name() or user.email},\n\n'
        f'We received a request to reset your CamTraffic {portal_label} password.\n'
        f'Open the link below to choose a new password:\n\n'
        f'{reset_url}\n\n'
        'If you did not request this, you can ignore this email.\n'
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
