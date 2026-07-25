"""Profile activity, login audit, and preference helpers."""
from __future__ import annotations

from django.utils import timezone

from .models import LoginEvent, User, UserPreference

ACTIVITY_COLORS = {
    'fine': '#EF4444',
    'detection': '#7C3AED',
    'system': '#2563EB',
    'alert': '#D97706',
    'profile': '#2563EB',
    'security': '#D97706',
    'vehicle': '#059669',
    'login': '#7C3AED',
}


def get_client_ip(request) -> str | None:
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR') or None


def parse_device_label(user_agent: str) -> str:
    ua = (user_agent or '').lower()
    if 'edg/' in ua or 'edge/' in ua:
        browser = 'Edge'
    elif 'chrome/' in ua and 'chromium' not in ua:
        browser = 'Chrome'
    elif 'firefox/' in ua:
        browser = 'Firefox'
    elif 'safari/' in ua and 'chrome' not in ua:
        browser = 'Safari'
    else:
        browser = 'Browser'

    if 'iphone' in ua or 'ipad' in ua:
        os_name = 'iOS'
    elif 'android' in ua:
        os_name = 'Android'
    elif 'windows' in ua:
        os_name = 'Windows'
    elif 'mac os' in ua or 'macintosh' in ua:
        os_name = 'macOS'
    elif 'linux' in ua:
        os_name = 'Linux'
    else:
        os_name = 'Unknown'

    return f'{browser} · {os_name}'


def mask_ip(ip: str | None) -> str:
    if not ip:
        return '—'
    if ':' in ip:
        parts = ip.split(':')
        if len(parts) > 1:
            return f'{parts[0]}:{parts[1]}:x:x'
        return ip
    octets = ip.split('.')
    if len(octets) == 4:
        return f'{octets[0]}.{octets[1]}.x.x'
    return ip


def get_or_create_preferences(user: User) -> UserPreference:
    prefs, _ = UserPreference.objects.get_or_create(user=user)
    return prefs


def record_login_event(user: User, request, *, success: bool = True) -> LoginEvent:
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    return LoginEvent.objects.create(
        user=user,
        ip_address=get_client_ip(request),
        user_agent=user_agent[:500],
        device_label=parse_device_label(user_agent),
        status='success' if success else 'failed',
    )


def relative_time_label(dt) -> str:
    if not dt:
        return '—'
    now = timezone.now()
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    delta = now - dt
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return 'Just now'
    minutes = seconds // 60
    if minutes < 60:
        return f'{minutes} minute{"s" if minutes != 1 else ""} ago'
    hours = minutes // 60
    if hours < 24:
        return f'{hours} hour{"s" if hours != 1 else ""} ago'
    days = hours // 24
    if days < 7:
        return f'{days} day{"s" if days != 1 else ""} ago'
    weeks = days // 7
    return f'{weeks} week{"s" if weeks != 1 else ""} ago'


def get_user_activity(user: User, limit: int = 8) -> list[dict]:
    items: list[dict] = []

    from notifications.models import Notification

    for notification in Notification.objects.filter(user=user).order_by('-created_at')[:limit]:
        items.append({
            'action': notification.title,
            'time': notification.created_at.isoformat(),
            'time_label': relative_time_label(notification.created_at),
            'type': notification.type,
            'color': ACTIVITY_COLORS.get(notification.type, ACTIVITY_COLORS['system']),
        })

    if user.role == 'driver':
        from fines.models import Fine

        for fine in Fine.objects.filter(driver=user, status='paid').order_by('-paid_at', '-created_at')[:limit]:
            paid_at = fine.paid_at or fine.created_at
            items.append({
                'action': f'Fine #{fine.id} paid',
                'time': paid_at.isoformat(),
                'time_label': relative_time_label(paid_at),
                'type': 'fine',
                'color': ACTIVITY_COLORS['fine'],
            })

    from ai_detection.models import AIDetectionLog

    for log in AIDetectionLog.objects.filter(user=user).order_by('-created_at')[:limit]:
        items.append({
            'action': f'AI detection: {log.detected_sign or "sign"}',
            'time': log.created_at.isoformat(),
            'time_label': relative_time_label(log.created_at),
            'type': 'detection',
            'color': ACTIVITY_COLORS['detection'],
        })

    if user.updated_at and user.updated_at > user.created_at:
        items.append({
            'action': 'Profile updated',
            'time': user.updated_at.isoformat(),
            'time_label': relative_time_label(user.updated_at),
            'type': 'profile',
            'color': ACTIVITY_COLORS['profile'],
        })

    items.sort(key=lambda row: row['time'], reverse=True)
    return items[:limit]


def build_current_session(user: User, request) -> dict:
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    ip = get_client_ip(request)
    return {
        'device': parse_device_label(user_agent),
        'location': 'Current device',
        'ip_masked': mask_ip(ip),
        'time_label': relative_time_label(user.last_login),
        'current': True,
    }


def build_login_history(user: User, limit: int = 10) -> list[dict]:
    rows = []
    for event in LoginEvent.objects.filter(user=user).order_by('-created_at')[:limit]:
        rows.append({
            'status': event.status,
            'device': event.device_label or 'Unknown device',
            'ip_masked': mask_ip(event.ip_address),
            'time': event.created_at.isoformat(),
            'time_label': relative_time_label(event.created_at),
        })
    return rows


def build_active_sessions(user: User, request, limit: int = 5) -> list[dict]:
    current = build_current_session(user, request)
    sessions = [current]
    seen_devices = {current['device']}

    for event in LoginEvent.objects.filter(user=user, status='success').order_by('-created_at')[:limit]:
        device = event.device_label or 'Unknown device'
        if device in seen_devices:
            continue
        seen_devices.add(device)
        sessions.append({
            'id': event.id,
            'device': device,
            'location': 'Recent sign-in',
            'ip_masked': mask_ip(event.ip_address),
            'time_label': relative_time_label(event.created_at),
            'current': False,
        })
    return sessions
