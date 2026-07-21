"""Helpers for writing immutable audit trail rows."""
from __future__ import annotations

from typing import Any

from audit.models import AuditLog


def client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip() or None
    return request.META.get('REMOTE_ADDR') or None


def write_audit_log(
    *,
    user,
    action: str,
    resource: str,
    resource_id: str = '',
    request=None,
    old_value: dict[str, Any] | None = None,
    new_value: dict[str, Any] | None = None,
    extra_data: dict[str, Any] | None = None,
) -> AuditLog:
    return AuditLog.objects.create(
        user=user if getattr(user, 'is_authenticated', False) else None,
        action=action,
        resource=resource,
        resource_id=str(resource_id or ''),
        ip_address=client_ip(request),
        old_value=old_value or {},
        new_value=new_value or {},
        extra_data=extra_data or {},
    )
