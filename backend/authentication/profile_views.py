from django.contrib.auth.models import update_last_login
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.responses import error_response, success_response
from users.profile_audit import (
    build_active_sessions,
    build_login_history,
    get_or_create_preferences,
    get_user_activity,
    record_login_event,
)
from users.profile_services import sync_profile_status
from users.preference_serializers import UserPreferenceSerializer
from users.serializers import UserSerializer


class ProfileOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        prefs = get_or_create_preferences(user)
        return success_response({
            'user': UserSerializer(user, context={'request': request}).data,
            'preferences': UserPreferenceSerializer(prefs).data,
            'activity': get_user_activity(user),
            'sessions': build_active_sessions(user, request),
            'login_history': build_login_history(user),
        })


class ProfilePreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        prefs = get_or_create_preferences(request.user)
        serializer = UserPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, message='Preferences updated')


class DeactivateAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.is_active:
            return error_response('Account is already deactivated.', status_code=status.HTTP_400_BAD_REQUEST)
        user.is_active = False
        user.save(update_fields=['is_active', 'updated_at'])
        sync_profile_status(user)
        try:
            refresh = request.data.get('refresh')
            if refresh:
                RefreshToken(refresh).blacklist()
        except Exception:
            pass
        return success_response(message='Account deactivated')


class LogoutOtherSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_raw = request.data.get('refresh')
        if not refresh_raw:
            return error_response('Refresh token required.', status_code=status.HTTP_400_BAD_REQUEST)
        try:
            current = RefreshToken(refresh_raw)
            current_jti = current.get('jti')
        except Exception:
            return error_response('Invalid refresh token.', status_code=status.HTTP_400_BAD_REQUEST)

        try:
            from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

            tokens = OutstandingToken.objects.filter(user=request.user)
            revoked = 0
            for token in tokens:
                if token.jti == current_jti:
                    continue
                _, created = BlacklistedToken.objects.get_or_create(token=token)
                if created:
                    revoked += 1
        except Exception:
            return error_response('Could not revoke other sessions.', status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return success_response({'revoked': revoked}, message='Other sessions revoked')


def finalize_successful_login(user, request) -> None:
    update_last_login(None, user)
    record_login_event(user, request, success=True)
