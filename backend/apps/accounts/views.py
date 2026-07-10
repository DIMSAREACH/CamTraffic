from django.contrib.auth import get_user_model
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.audit.models import LoginHistory
from apps.core.responses import success_response

from .serializers import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    ResetPasswordConfirmSerializer,
    SendVerificationEmailSerializer,
    UserSerializer,
    VerifyEmailSerializer,
)
from .services.email_verification import send_email_verification_email
from .services.password_reset import send_password_reset_email

FORGOT_PASSWORD_MESSAGE = (
    'If an account exists for that email, password reset instructions have been sent.'
)
RESET_PASSWORD_MESSAGE = 'Password has been reset successfully. Please login with your new password.'
CHANGE_PASSWORD_MESSAGE = 'Password changed successfully.'
VERIFICATION_EMAIL_SENT_MESSAGE = 'Verification email sent.'
EMAIL_VERIFIED_MESSAGE = 'Email verified successfully.'
User = get_user_model()


def _extract_ip_address(request) -> str | None:
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        attempted_user = User.objects.filter(email__iexact=email).first()
        ip_address = _extract_ip_address(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:255]

        serializer = LoginSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            if attempted_user is not None:
                LoginHistory.objects.create(
                    user=attempted_user,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False,
                    failure_reason='invalid_credentials_or_inactive',
                )
            raise
        user = serializer.validated_data['user']

        LoginHistory.objects.create(
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
        )

        refresh = RefreshToken.for_user(user)
        payload = {
            'user': UserSerializer(user, context={'request': request}).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
        }
        return success_response(payload, message='Login successful', status=status.HTTP_200_OK)


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return success_response(serializer.validated_data, message='Token refreshed')


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data['refresh']
        token = RefreshToken(refresh_token)
        token.blacklist()
        return success_response(None, message='Logout successful', status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success_response(
            UserSerializer(request.user, context={'request': request}).data,
        )


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        if user is not None:
            send_password_reset_email(user, serializer.validated_data['portal'])

        return success_response(None, message=FORGOT_PASSWORD_MESSAGE)


class ResetPasswordConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(None, message=RESET_PASSWORD_MESSAGE)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(None, message=CHANGE_PASSWORD_MESSAGE)


class SendVerificationEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SendVerificationEmailSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        send_email_verification_email(
            serializer.validated_data['user'],
            serializer.validated_data['portal'],
        )
        return success_response(None, message=VERIFICATION_EMAIL_SENT_MESSAGE)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        payload = UserSerializer(user, context={'request': request}).data
        return success_response(payload, message=EMAIL_VERIFIED_MESSAGE)
