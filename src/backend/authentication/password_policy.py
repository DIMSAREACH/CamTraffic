"""Shared strong-password rules for API and Django validators."""
import re

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

MIN_PASSWORD_LENGTH = 8


def password_complexity_errors(password: str) -> list[str]:
    errors: list[str] = []
    if len(password) < MIN_PASSWORD_LENGTH:
        errors.append(f'Password must be at least {MIN_PASSWORD_LENGTH} characters.')
    if not re.search(r'[A-Z]', password):
        errors.append('Password must include at least one uppercase letter.')
    if not re.search(r'[0-9]', password):
        errors.append('Password must include at least one number.')
    if not re.search(r'[^A-Za-z0-9]', password):
        errors.append('Password must include at least one special character.')
    return errors


def validate_strong_password(password: str, user=None, field_name: str = 'password'):
    """Raise DRF ValidationError when password fails complexity or Django checks."""
    errors = password_complexity_errors(password)
    if errors:
        raise serializers.ValidationError({field_name: errors})

    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({field_name: list(exc.messages)})
