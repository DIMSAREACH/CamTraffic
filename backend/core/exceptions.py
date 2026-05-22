import logging

from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        logger.warning('API error: %s — %s', exc, context.get('view'))
        custom_data = {
            'success': False,
            'message': str(exc),
            'errors': response.data if isinstance(response.data, dict) else {'detail': response.data},
        }
        response.data = custom_data
    return response
