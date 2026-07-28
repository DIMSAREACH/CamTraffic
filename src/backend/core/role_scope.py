"""Role-based queryset scope helpers.

Operational staff (admin + police/officer) share the same system-wide lists
for detections, fines, violations, and evidence. Drivers only see their own
records. This keeps Admin Portal and Officer Portal data consistent.
"""
from __future__ import annotations


def role_of(user) -> str:
    return getattr(user, 'role', None) or ''


def is_ops_staff(user) -> bool:
    """Admin and traffic officers share operational system data."""
    return role_of(user) in ('admin', 'police')


def is_driver(user) -> bool:
    return role_of(user) == 'driver'
