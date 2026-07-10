from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import error_response, success_response
from apps.rbac.permissions import HasRBACRole

from .serializers import (
    AvatarUploadSerializer,
    ProfileSerializer,
    UserCreateSerializer,
    UserManageSerializer,
)

User = get_user_model()

AVATAR_UPLOADED_MESSAGE = 'Avatar uploaded successfully.'
AVATAR_REMOVED_MESSAGE = 'Avatar removed successfully.'


class ProfileMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user, context={'request': request})
        return success_response(serializer.data)

    def patch(self, request):
        serializer = ProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response = ProfileSerializer(user, context={'request': request})
        return success_response(response.data, message='Profile updated successfully.')


class AvatarMeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = AvatarUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if user.avatar:
            user.avatar.delete(save=False)
        user.avatar = serializer.validated_data['avatar']
        user.save(update_fields=['avatar'])

        profile = ProfileSerializer(user, context={'request': request})
        return success_response(profile.data, message=AVATAR_UPLOADED_MESSAGE)

    def delete(self, request):
        user = request.user
        if user.avatar:
            user.avatar.delete(save=False)
            user.avatar = None
            user.save(update_fields=['avatar'])

        profile = ProfileSerializer(user, context={'request': request})
        return success_response(profile.data, message=AVATAR_REMOVED_MESSAGE)


class UserListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = User.objects.order_by('-date_joined')
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(email__icontains=search)
        role = request.query_params.get('role', '').strip()
        if role:
            queryset = queryset.filter(role=role)
        serializer = UserManageSerializer(queryset, many=True)
        return success_response(serializer.data)

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return success_response(
            UserManageSerializer(user).data,
            message='User created successfully.',
            status=status.HTTP_201_CREATED,
        )


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_user(user_id: str) -> User:
        return get_object_or_404(User, id=user_id)

    def get(self, request, user_id: str):
        user = self._get_user(user_id)
        serializer = UserManageSerializer(user)
        return success_response(serializer.data)

    def patch(self, request, user_id: str):
        user = self._get_user(user_id)
        serializer = UserManageSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, message='User updated successfully.')

    def delete(self, request, user_id: str):
        user = self._get_user(user_id)
        if user.id == request.user.id:
            return error_response(
                'You cannot delete your own account.',
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.delete()
        return success_response(None, message='User deleted successfully.')
