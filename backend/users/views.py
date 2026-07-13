from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.deletion import ProtectedError
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
        serializer = self.get_serializer(data=request.data)
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
        if instance.pk == request.user.pk:
            return error_response('You cannot delete your own account.', status_code=status.HTTP_400_BAD_REQUEST)
        try:
            instance.delete()
        except ProtectedError:
            return error_response(
                'Cannot delete this user because they have linked violations or records. '
                'Deactivate the account instead.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        return success_response(message='User deleted')


class ToggleActiveView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return error_response('User not found', status_code=status.HTTP_404_NOT_FOUND)
        if user.pk == request.user.pk and user.is_active:
            return error_response('You cannot deactivate your own account.', status_code=status.HTTP_400_BAD_REQUEST)
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        from users.profile_services import sync_profile_status

        sync_profile_status(user)
        return success_response(UserSerializer(user).data, message='Status toggled')


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
