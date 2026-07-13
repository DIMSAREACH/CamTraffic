"""Write immutable audit log entries for sensitive actions."""
from __future__ import annotations

from audit.models import AuditLog


def get_client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_audit(
    *,
    user=None,
    action: str,
    resource: str,
    resource_id: str = '',
    request=None,
    old_value: dict | None = None,
    new_value: dict | None = None,
    extra_data: dict | None = None,
) -> AuditLog:
    return AuditLog.objects.create(
        user=user,
        action=action,
        resource=resource,
        resource_id=str(resource_id) if resource_id else '',
        ip_address=get_client_ip(request),
        old_value=old_value or {},
        new_value=new_value or {},
        extra_data=extra_data or {},
    )
