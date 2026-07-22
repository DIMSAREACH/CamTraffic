from django.core.exceptions import ValidationError

from .password_policy import password_complexity_errors


class StrongPasswordValidator:
    """Django auth validator: uppercase, digit, special, min length."""

    def validate(self, password, user=None):
        errors = password_complexity_errors(password)
        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return (
            'Your password must be at least 8 characters and include an uppercase letter, '
            'a number, and a special character.'
        )
