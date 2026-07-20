import logging

from django.contrib.auth import get_user_model
from rest_framework import parsers, status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.responses import error_response, success_response
from users.serializers import UserSerializer

from .login_messages import LOGIN_INVALID_CREDENTIALS
from .password_reset import PasswordResetError, request_password_reset
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    EmailVerifyConfirmSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
)

User = get_user_model()


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    throttle_classes = []
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as exc:
            message = self._login_error_message(exc)
            code = (
                status.HTTP_403_FORBIDDEN
                if message != LOGIN_INVALID_CREDENTIALS
                else status.HTTP_401_UNAUTHORIZED
            )
            return error_response(message, status_code=code)
        except AuthenticationFailed:
            # Expected for wrong password / unknown email (SimpleJWT).
            return error_response(LOGIN_INVALID_CREDENTIALS, status_code=status.HTTP_401_UNAUTHORIZED)
        except Exception:
            logging.getLogger(__name__).exception('Unexpected login failure')
            return error_response(LOGIN_INVALID_CREDENTIALS, status_code=status.HTTP_401_UNAUTHORIZED)
        data = serializer.validated_data
        return success_response({
            'access': data['access'],
            'refresh': data['refresh'],
            'user': data['user'],
        }, message='Login successful')

    @staticmethod
    def _login_error_message(exc: ValidationError) -> str:
        detail = exc.detail
        if isinstance(detail, dict):
            for key in ('portal', 'role', 'non_field_errors'):
                if key in detail:
                    val = detail[key]
                    if isinstance(val, list) and val:
                        return str(val[0])
                    return str(val)
        if isinstance(detail, list) and detail:
            return str(detail[0])
        return LOGIN_INVALID_CREDENTIALS


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return success_response({
            'user': UserSerializer(user, context={'request': request}).data,
        }, message='Registration successful. Please sign in.', status_code=status.HTTP_201_CREATED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh = request.data.get('refresh')
            if refresh:
                token = RefreshToken(refresh)
                token.blacklist()
        except Exception:
            pass
        return success_response(message='Logged out')


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.JSONParser, parsers.FormParser, parsers.MultiPartParser]

    def get(self, request):
        return success_response(
            UserSerializer(request.user, context={'request': request}).data,
        )

    def patch(self, request):
        from users.serializers import UserUpdateSerializer
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        request.user.refresh_from_db()
        return success_response(
            UserSerializer(request.user, context={'request': request}).data,
            message='Profile updated',
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return success_response(message='Password changed')


class PasswordResetRequestView(APIView):
    """Send or resend password reset email (same endpoint)."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            request_password_reset(serializer.validated_data['email'])
        except PasswordResetError as exc:
            if exc.code == 'not_found':
                status_code = status.HTTP_404_NOT_FOUND
            elif exc.code == 'send_failed':
                status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            else:
                status_code = status.HTTP_400_BAD_REQUEST
            return error_response(exc.message, status_code=status_code)
        except Exception:
            logging.getLogger(__name__).exception('Password reset request failed')
            return error_response(
                'Could not send the reset email. Please try again later.',
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        email = serializer.validated_data['email'].strip()
        return success_response(
            message=f'Password reset link has been sent to {email}. Check your inbox.',
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(message='Password reset successful')


class EmailVerifySendView(APIView):
    """Resend email verification link to the authenticated user."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.email_verified:
            return success_response(message='Email is already verified.')
        from .email_verification import request_email_verification

        try:
            request_email_verification(user)
        except ValueError as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logging.getLogger(__name__).exception('Email verification send failed')
            return error_response(
                'Could not send the verification email. Please try again later.',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return success_response(message=f'Verification link sent to {user.email}.')


class EmailVerifyConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailVerifyConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(message='Email verified successfully')
