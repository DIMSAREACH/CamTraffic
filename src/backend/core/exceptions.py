import logging

from rest_framework.exceptions import PermissionDenied
from rest_framework.views import exception_handler

from .api_errors import flatten_validation_errors, primary_validation_message

logger = logging.getLogger(__name__)
rbac_logger = logging.getLogger('camtraffic.rbac')


def custom_exception_handler(exc, context):
    request = context.get('request')
    view = context.get('view')

    if isinstance(exc, PermissionDenied):
        user = getattr(request, 'user', None)
        rbac_logger.warning(
            'RBAC denied rid=%s user=%s role=%s path=%s view=%s',
            getattr(request, 'request_id', '-'),
            getattr(user, 'email', 'anon'),
            getattr(user, 'role', '-'),
            getattr(request, 'path', '-'),
            view.__class__.__name__ if view else '-',
        )

    response = exception_handler(exc, context)
    if response is not None:
        logger.warning('API error: %s — %s', exc, view)
        raw = response.data
        errors = flatten_validation_errors(raw if isinstance(raw, (dict, list)) else {'detail': raw})
        message = primary_validation_message(errors)
        payload = {
            'success': False,
            'message': message,
            'errors': errors,
        }
        request_id = getattr(request, 'request_id', None) if request else None
        if request_id:
            payload['request_id'] = request_id
        response.data = payload
    return response
