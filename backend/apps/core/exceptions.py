from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """Normalize DRF errors to CamTraffic `{ success, message, errors? }` shape."""
    response = exception_handler(exc, context)
    if response is None:
        return response

    message = 'Request failed'
    errors = None
    data = response.data

    if isinstance(data, dict):
        if 'detail' in data:
            detail = data['detail']
            message = str(detail[0] if isinstance(detail, list) else detail)
        else:
            errors = {
                key: value if isinstance(value, list) else [str(value)]
                for key, value in data.items()
            }
            message = 'Validation failed'
    elif isinstance(data, list):
        message = str(data[0])

    response.data = {
        'success': False,
        'message': message,
        **({'errors': errors} if errors else {}),
    }
    return response
