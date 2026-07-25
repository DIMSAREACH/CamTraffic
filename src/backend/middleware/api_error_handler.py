"""
Custom middleware to handle API errors gracefully
"""

import json
import logging
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class APIErrorHandlerMiddleware(MiddlewareMixin):
    """
    Middleware to catch and handle API errors gracefully
    """
    
    def process_exception(self, request, exception):
        """Handle exceptions in API endpoints"""
        if not request.path.startswith('/api/'):
            return None
            
        logger.error(f'API Error {request.path}: {exception}', exc_info=True)
        
        # Return a proper JSON error response
        return JsonResponse({
            'error': 'Internal server error',
            'message': str(exception) if not request.path.startswith('/api/') else 'An error occurred processing your request',
            'path': request.path
        }, status=500)

    def process_response(self, request, response):
        """Add helpful headers to API responses"""
        if request.path.startswith('/api/'):
            response['X-API-Version'] = '1.0'
            response['X-Content-Type-Options'] = 'nosniff'
            
            # Log 400+ status codes for debugging
            if response.status_code >= 400:
                user_email = "Anonymous"
                if hasattr(request, 'user') and hasattr(request.user, 'email'):
                    user_email = request.user.email
                logger.warning(
                    f'API {response.status_code} {request.method} {request.path} - '
                    f'User: {user_email}'
                )
        
        return response