import logging

from rest_framework.views import exception_handler

from .api_errors import flatten_validation_errors, primary_validation_message

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        logger.warning('API error: %s — %s', exc, context.get('view'))
        raw = response.data
        errors = flatten_validation_errors(raw if isinstance(raw, (dict, list)) else {'detail': raw})
        message = primary_validation_message(errors)
        response.data = {
            'success': False,
            'message': message,
            'errors': errors,
        }
    return response
