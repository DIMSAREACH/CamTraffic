"""Password reset email helper."""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .resend_email import get_resend_from_email, resend_configured, send_resend_email

logger = logging.getLogger(__name__)
User = get_user_model()

DEFAULT_RESET_URL = 'http://localhost:5173/reset-password'


def _reset_base_url() -> str:
    return getattr(settings, 'FRONTEND_PASSWORD_RESET_URL', DEFAULT_RESET_URL).rstrip('/')


def smtp_configured() -> bool:
    return bool(getattr(settings, 'EMAIL_HOST_USER', '') and getattr(settings, 'EMAIL_HOST_PASSWORD', ''))


def email_configured() -> bool:
    return resend_configured() or smtp_configured()


def from_email() -> str:
    if resend_configured():
        return get_resend_from_email()
    return (
        getattr(settings, 'DEFAULT_FROM_EMAIL', '')
        or getattr(settings, 'EMAIL_HOST_USER', '')
        or 'noreply@camtraffic.kh'
    )


def build_reset_link(user) -> tuple[str, str, str]:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base = _reset_base_url()
    link = f'{base}?uid={uid}&token={token}'
    return link, uid, token


def _render_reset_bodies(user, to_email: str) -> tuple[str, str, str, str]:
    recipient = to_email.strip()
    link, _, _ = build_reset_link(user)
    name = user.full_name or recipient.split('@')[0]
    context = {
        'name': name,
        'email': recipient,
        'reset_link': link,
    }
    subject = 'CamTraffic — Reset your password'
    text_body = render_to_string('authentication/email/password_reset.txt', context)
    html_body = render_to_string('authentication/email/password_reset.html', context)
    return recipient, subject, text_body, html_body


def _send_via_smtp(recipient: str, subject: str, text_body: str, html_body: str) -> bool:
    try:
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=from_email(),
            to=[recipient],
        )
        message.attach_alternative(html_body, 'text/html')
        message.send(fail_silently=False)
        logger.info('SMTP password reset email sent to %s', recipient)
        return True
    except Exception:
        logger.exception('SMTP failed to send password reset email to %s', recipient)
        return False


_last_send_error: str | None = None


def get_last_send_error() -> str | None:
    return _last_send_error


def send_password_reset_email(user, to_email: str) -> bool:
    """Send HTML reset email to the address entered on the forgot-password form."""
    global _last_send_error
    _last_send_error = None
    recipient, subject, text_body, html_body = _render_reset_bodies(user, to_email)

    if resend_configured():
        ok, err = send_resend_email(to=recipient, subject=subject, html=html_body, text=text_body)
        if ok:
            return True
        _last_send_error = err
        if not smtp_configured():
            return False

    if smtp_configured():
        return _send_via_smtp(recipient, subject, text_body, html_body)

    if settings.DEBUG:
        link = build_reset_link(user)[0]
        print(f'\n[CamTraffic] Email not configured — reset link for {recipient}:\n{link}\n')
        print('Set RESEND_API_KEY + RESEND_FROM_EMAIL (recommended) or SMTP in backend/.env.\n')
        return True

    return False


class PasswordResetError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def request_password_reset(email: str) -> User:
    """Send reset email only when a registered, active account exists."""
    email = email.strip()
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        raise PasswordResetError(
            'not_found',
            'No account found with this email address.',
        )
    if not user.is_active:
        raise PasswordResetError(
            'inactive',
            'This account is deactivated. Please contact support.',
        )
    if not email_configured() and not settings.DEBUG:
        raise PasswordResetError(
            'send_failed',
            'Email delivery is not configured on the server.',
        )
    if not send_password_reset_email(user, to_email=email):
        detail = get_last_send_error() or 'Check RESEND_API_KEY and RESEND_FROM_EMAIL in backend/.env.'
        raise PasswordResetError('send_failed', f'Could not send the reset email. {detail}')
    return user
