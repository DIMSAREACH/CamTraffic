from django.contrib.auth import get_user_model
from django.db import models
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsPoliceOrAdmin
from core.responses import error_response, success_response

from .serializers import UserCreateSerializer, UserSerializer, UserUpdateSerializer

User = get_user_model()


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['full_name', 'email', 'license_no', 'phone']
    ordering_fields = ['created_at', 'full_name']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        return User.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return success_response(
            UserSerializer(user).data,
            message='User created',
            status_code=status.HTTP_201_CREATED,
        )


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all()
    lookup_url_kwarg = 'pk'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if getattr(self, 'swagger_fake_view', False):
            return [IsAuthenticated()]
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        user = self.request.user
        if not user.is_authenticated:
            return [IsAuthenticated()]
        if user.role == 'admin' or self.kwargs.get('pk') == user.id:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role != 'admin' and instance.id != request.user.id:
            if request.user.role == 'police' and instance.role == 'driver':
                pass
            elif instance.id != request.user.id:
                return error_response('Permission denied', status_code=status.HTTP_403_FORBIDDEN)
        return success_response(UserSerializer(instance).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        if request.user.role != 'admin' and instance.id != request.user.id:
            return error_response('Permission denied', status_code=status.HTTP_403_FORBIDDEN)
        serializer = UserUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(UserSerializer(instance).data, message='Profile updated')

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return error_response('Permission denied', status_code=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        from users.profile_services import assert_admin_may_manage_account, safe_delete_user

        try:
            assert_admin_may_manage_account(request.user, instance, action='delete')
        except (PermissionError, ValueError) as exc:
            code = status.HTTP_403_FORBIDDEN if isinstance(exc, PermissionError) else status.HTTP_400_BAD_REQUEST
            return error_response(str(exc), status_code=code)

        # Prefer soft-delete. Pass ?hard=1 only for spam/test cleanup without linked records.
        hard = str(request.query_params.get('hard', '')).lower() in ('1', 'true', 'yes')
        hard_deleted, user, message = safe_delete_user(instance, hard=hard)
        if hard_deleted:
            return success_response(message=message)
        return success_response(UserSerializer(user).data, message=message)


class ToggleActiveView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return error_response('User not found', status_code=status.HTTP_404_NOT_FOUND)
        from users.profile_services import assert_admin_may_manage_account, restore_user, sync_profile_status

        if user.is_active:
            try:
                assert_admin_may_manage_account(request.user, user, action='deactivate')
            except (PermissionError, ValueError) as exc:
                code = status.HTTP_403_FORBIDDEN if isinstance(exc, PermissionError) else status.HTTP_400_BAD_REQUEST
                return error_response(str(exc), status_code=code)
            user.is_active = False
            user.save(update_fields=['is_active', 'updated_at'])
            sync_profile_status(user)
            message = 'Account deactivated'
        else:
            try:
                assert_admin_may_manage_account(request.user, user, action='reactivate')
            except (PermissionError, ValueError) as exc:
                code = status.HTTP_403_FORBIDDEN if isinstance(exc, PermissionError) else status.HTTP_400_BAD_REQUEST
                return error_response(str(exc), status_code=code)
            restore_user(user)
            message = 'Account reactivated'
        return success_response(UserSerializer(user).data, message=message)


class AdminResetPasswordView(APIView):
    """Admin triggers a secure password-reset email (never reads or sets a known password)."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return error_response('User not found', status_code=status.HTTP_404_NOT_FOUND)

        from users.profile_services import assert_admin_may_manage_account

        try:
            assert_admin_may_manage_account(request.user, target, action='reset password for')
        except (PermissionError, ValueError) as exc:
            code = status.HTTP_403_FORBIDDEN if isinstance(exc, PermissionError) else status.HTTP_400_BAD_REQUEST
            return error_response(str(exc), status_code=code)

        from authentication.password_reset import PasswordResetError, request_password_reset
        from audit.services import write_audit_log

        try:
            request_password_reset(target.email)
        except PasswordResetError as exc:
            if exc.code == 'send_failed':
                return error_response(exc.message, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)
            return error_response(exc.message, status_code=status.HTTP_400_BAD_REQUEST)

        write_audit_log(
            user=request.user,
            action='update',
            resource='user_password',
            resource_id=str(target.pk),
            request=request,
            new_value={'method': 'admin_reset_link', 'target_email': target.email},
            extra_data={'actor_role': request.user.role, 'target_role': target.role},
        )
        return success_response(
            message=f'Password reset link sent to {target.email}. The temporary link expires shortly.',
        )


class DriverSearchView(APIView):
    """Police: search driver by license number."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        license_no = request.query_params.get('license', '').strip()
        if not license_no:
            return error_response('License number required')
        from users.models import Driver

        driver_user_ids = Driver.objects.filter(
            license_no__icontains=license_no,
            status='active',
            user__is_active=True,
        ).values_list('user_id', flat=True)
        drivers = User.objects.filter(
            role='driver',
            is_active=True,
        ).filter(
            models.Q(pk__in=driver_user_ids) | models.Q(license_no__icontains=license_no),
        ).distinct()
        return success_response(UserSerializer(drivers, many=True).data)
