"""Email address verification helper."""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from authentication.password_reset import email_configured, from_email, smtp_configured
from authentication.resend_email import resend_configured, send_resend_email

logger = logging.getLogger(__name__)
User = get_user_model()

DEFAULT_VERIFY_URL = 'http://localhost:5173/verify-email'


def _verify_base_url() -> str:
    return getattr(settings, 'FRONTEND_EMAIL_VERIFY_URL', DEFAULT_VERIFY_URL).rstrip('/')


def build_verify_link(user) -> tuple[str, str, str]:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f'{_verify_base_url()}?uid={uid}&token={token}'
    return link, uid, token


def _render_verify_bodies(user) -> tuple[str, str, str, str]:
    recipient = user.email.strip()
    link, _, _ = build_verify_link(user)
    name = user.full_name or recipient.split('@')[0]
    context = {
        'name': name,
        'email': recipient,
        'verify_link': link,
    }
    subject = 'CamTraffic — Verify your email'
    text_body = render_to_string('authentication/email/email_verify.txt', context)
    html_body = render_to_string('authentication/email/email_verify.html', context)
    return recipient, subject, text_body, html_body


def send_verification_email(user) -> bool:
    if user.email_verified:
        return True

    recipient, subject, text_body, html_body = _render_verify_bodies(user)

    if resend_configured():
        ok, err = send_resend_email(to=recipient, subject=subject, html=html_body, text=text_body)
        if ok:
            return True
        logger.warning('Resend verification email failed: %s', err)
        if not smtp_configured():
            if settings.DEBUG:
                print(f'\n[CamTraffic] Verify link for {recipient}:\n{build_verify_link(user)[0]}\n')
                return True
            return False

    if smtp_configured():
        try:
            message = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=from_email(),
                to=[recipient],
            )
            message.attach_alternative(html_body, 'text/html')
            message.send(fail_silently=False)
            return True
        except Exception:
            logger.exception('SMTP failed to send verification email to %s', recipient)
            return False

    if settings.DEBUG:
        print(f'\n[CamTraffic] Email not configured — verify link for {recipient}:\n{build_verify_link(user)[0]}\n')
        return True

    return False


def request_email_verification(user) -> None:
    if user.email_verified:
        return
    if not email_configured() and not settings.DEBUG:
        raise ValueError('Email delivery is not configured on the server.')
    if not send_verification_email(user):
        raise ValueError('Could not send the verification email right now.')
