import logging

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
from users.profile_services import soft_delete_user, sync_profile_status
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


def _blacklist_refresh(request) -> None:
    try:
        refresh = request.data.get('refresh')
        if refresh:
            RefreshToken(refresh).blacklist()
    except Exception:
        pass


class DeactivateAccountView(APIView):
    """Temporarily disable sign-in (no deleted_at). Admin can reactivate.

    Drivers and officers may deactivate themselves. Admins cannot.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role == 'admin':
            return error_response(
                'Administrator accounts cannot be self-deactivated. Contact another administrator.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not user.is_active:
            return error_response('Account is already deactivated.', status_code=status.HTTP_400_BAD_REQUEST)
        user.is_active = False
        user.save(update_fields=['is_active', 'updated_at'])
        sync_profile_status(user)
        _blacklist_refresh(request)
        return success_response(message='Account deactivated')


class DeleteAccountView(APIView):
    """Soft-delete own account — drivers only (law-enforcement policy).

    Officers and administrators cannot self-delete so the system always
    retains accountable enforcement / admin access.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role != 'driver':
            if user.role == 'admin':
                return error_response(
                    'Administrator accounts cannot be self-deleted. Contact another administrator.',
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            return error_response(
                'Police officer accounts cannot be self-deleted. Contact an administrator.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if user.deleted_at and not user.is_active:
            return error_response('Account is already deleted.', status_code=status.HTTP_400_BAD_REQUEST)

        password = (request.data.get('password') or '').strip()
        confirm = (request.data.get('confirm') or '').strip().upper()
        # Email/password accounts must confirm with password.
        # Social (Google/GitHub) accounts confirm with the word DELETE.
        if user.auth_provider == 'email':
            if not password or not user.check_password(password):
                return error_response('Invalid password.', status_code=status.HTTP_400_BAD_REQUEST)
        elif confirm != 'DELETE':
            return error_response(
                'Type DELETE to confirm account deletion.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        soft_delete_user(user)
        _blacklist_refresh(request)
        return success_response(
            message='Account deleted. Sign-in is disabled; enforcement records are retained.',
        )


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
    try:
        record_login_event(user, request, success=True)
    except Exception:
        logging.getLogger(__name__).exception(
            'Login audit write failed for %s — login still allowed',
            user.email,
        )
