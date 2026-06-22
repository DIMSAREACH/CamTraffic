"""Normalize DRF validation errors into user-facing API messages."""


def _stringify_error(value) -> str:
    return str(value).strip()


def flatten_validation_errors(data) -> dict[str, list[str]]:
    """Convert nested DRF validation payloads to {field: [message, ...]}."""
    if data is None:
        return {}
    if isinstance(data, list):
        return {'non_field_errors': [_stringify_error(item) for item in data]}
    if not isinstance(data, dict):
        return {'detail': [_stringify_error(data)]}

    flat: dict[str, list[str]] = {}
    for field, value in data.items():
        if isinstance(value, dict):
            nested = flatten_validation_errors(value)
            for nested_field, messages in nested.items():
                key = f'{field}.{nested_field}' if nested_field != 'detail' else field
                flat.setdefault(key, []).extend(messages)
        elif isinstance(value, list):
            flat[field] = [_stringify_error(item) for item in value]
        else:
            flat[field] = [_stringify_error(value)]
    return flat


def friendly_field_message(field: str, message: str) -> str:
    lower = message.lower()
    if field == 'email' and 'already exists' in lower:
        return (
            'An account with this email already exists. '
            'Please sign in or use a different email.'
        )
    if field == 'license_no' and 'already registered' in lower:
        return message
    if field in ('non_field_errors', 'detail'):
        return message
    label = field.replace('_', ' ').strip().capitalize()
    return f'{label}: {message}'


def primary_validation_message(errors: dict[str, list[str]]) -> str:
    if not errors:
        return 'Validation failed. Please check your input.'

    for field in ('email', 'non_field_errors', 'detail', 'password', 'password_confirm', 'license_no'):
        messages = errors.get(field)
        if messages:
            return friendly_field_message(field, messages[0])

    field, messages = next(iter(errors.items()))
    return friendly_field_message(field, messages[0])
