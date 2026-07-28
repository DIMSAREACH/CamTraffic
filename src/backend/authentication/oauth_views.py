from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from core.responses import error_response, success_response

from .oauth import OAuthError, build_authorization_url, default_redirect_uri, exchange_code, oauth_status


class OAuthStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return success_response(oauth_status())


class OAuthAuthorizeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, provider):
        redirect_uri = request.query_params.get('redirect_uri') or default_redirect_uri()
        try:
            data = build_authorization_url(provider, redirect_uri)
        except OAuthError as exc:
            return error_response(exc.message, status_code=exc.status_code)
        return success_response(data)


class OAuthCompleteView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        provider = request.data.get('provider')
        code = request.data.get('code')
        state = request.data.get('state')
        redirect_uri = request.data.get('redirect_uri') or default_redirect_uri()
        portal = request.data.get('portal')

        if not provider or not code or not state:
            return error_response('provider, code, and state are required.')

        try:
            data = exchange_code(provider, code, state, redirect_uri, portal=portal, request=request)
        except OAuthError as exc:
            return error_response(exc.message, status_code=exc.status_code)

        return success_response(data, message='Login successful')
