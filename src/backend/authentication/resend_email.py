"""Send mail via Resend (https://resend.com)."""
import logging
import re

from django.conf import settings

logger = logging.getLogger(__name__)

_EMAIL_IN_ANGLE = re.compile(r'<([^<>]+)>$')
_EMAIL_PLAIN = re.compile(r'^[^<\s]+@[^<\s]+\.[^<\s]+$')


def normalize_from_email(raw: str) -> str:
    """
    Fix common .env mistakes, e.g. CamTraffic <camtraffic.store>
    → CamTraffic <noreply@camtraffic.store>
    """
    value = (raw or '').strip()
    if not value:
        return value

    angle = _EMAIL_IN_ANGLE.search(value)
    if angle:
        inner = angle.group(1).strip()
        if '@' not in inner and '.' in inner:
            fixed = f'noreply@{inner}'
            return value[: angle.start(1)] + fixed + value[angle.end(1) :]
        return value

    if '@' not in value and '.' in value and ' ' not in value:
        return f'CamTraffic <noreply@{value}>'

    if _EMAIL_PLAIN.match(value):
        return value

    return value


def resend_configured() -> bool:
    key = getattr(settings, 'RESEND_API_KEY', '').strip()
    from_email = normalize_from_email(getattr(settings, 'RESEND_FROM_EMAIL', ''))
    return bool(key and from_email and '@' in from_email)


def get_resend_from_email() -> str:
    return normalize_from_email(getattr(settings, 'RESEND_FROM_EMAIL', '').strip())


def send_resend_email(*, to: str, subject: str, html: str, text: str) -> tuple[bool, str | None]:
    """
    Send via Resend API. Returns (success, error_message).
  """
    if not resend_configured():
        return False, 'Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL).'

    from_addr = get_resend_from_email()
    if '@' not in from_addr:
        return False, (
            'Invalid RESEND_FROM_EMAIL. Use: CamTraffic <noreply@yourdomain.com> '
            '(example: CamTraffic <noreply@camtraffic.store>).'
        )

    try:
        import resend
        from resend.exceptions import ResendError
    except ImportError:
        logger.exception('resend package not installed — run: pip install resend')
        return False, 'Resend package not installed on the server.'

    resend.api_key = settings.RESEND_API_KEY.strip()
    payload = {
        'from': from_addr,
        'to': [to.strip()],
        'subject': subject,
        'html': html,
    }
    if text:
        payload['text'] = text

    try:
        result = resend.Emails.send(payload)
        email_id = result.get('id') if isinstance(result, dict) else getattr(result, 'id', None)
        logger.info('Resend email sent to %s from %s (id=%s)', to, from_addr, email_id)
        return True, None
    except ResendError as exc:
        message = str(exc).strip() or 'Resend rejected the email.'
        logger.error('Resend failed to %s: %s', to, message)
        return False, message
    except Exception as exc:
        logger.exception('Resend failed to send email to %s', to)
        return False, str(exc).strip() or 'Unknown Resend error.'
