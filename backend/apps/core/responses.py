from rest_framework.response import Response


def success_response(data, message: str | None = None, status: int = 200) -> Response:
    payload = {'success': True, 'data': data}
    if message:
        payload['message'] = message
    return Response(payload, status=status)


def error_response(
    message: str,
    *,
    status: int = 400,
    errors: dict | None = None,
) -> Response:
    payload = {'success': False, 'message': message}
    if errors:
        payload['errors'] = errors
    return Response(payload, status=status)
