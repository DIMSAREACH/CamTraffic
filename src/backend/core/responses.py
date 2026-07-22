"""Standardized API response helpers."""
from rest_framework import status
from rest_framework.response import Response


def success_response(data=None, message='Success', status_code=status.HTTP_200_OK, **kwargs):
    payload = {'success': True, 'message': message, 'data': data}
    payload.update(kwargs)
    return Response(payload, status=status_code)


def error_response(message='Error', errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    return Response(
        {'success': False, 'message': message, 'errors': errors or {}},
        status=status_code,
    )
