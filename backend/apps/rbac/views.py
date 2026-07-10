from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.views import APIView

from apps.core.responses import success_response

from .models import Permission, Role, resolve_user_permissions, resolve_user_role_slugs
from .permissions import HasRBACRole
from .serializers import (
    PermissionManageSerializer,
    RoleManageSerializer,
    RolePermissionUpdateSerializer,
    RoleSerializer,
)


class MyAccessView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role_slugs = sorted(resolve_user_role_slugs(request.user))
        permissions = sorted(resolve_user_permissions(request.user))
        return success_response(
            {
                'roles': role_slugs,
                'permissions': permissions,
            },
        )


class RoleCatalogView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        roles = Role.objects.prefetch_related('permissions').order_by('name')
        return success_response(RoleSerializer(roles, many=True).data)


class PermissionCatalogView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        permissions = Permission.objects.order_by('module', 'codename').values(
            'id',
            'codename',
            'name',
            'module',
            'description',
        )
        return success_response(list(permissions))


class PermissionListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin')]

    def get(self, request):
        queryset = Permission.objects.order_by('module', 'codename')
        return success_response(PermissionManageSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = PermissionManageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        permission = serializer.save()
        return success_response(
            PermissionManageSerializer(permission).data,
            message='Permission created',
            status=status.HTTP_201_CREATED,
        )


class PermissionDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin')]

    @staticmethod
    def _get_permission(permission_id: int) -> Permission:
        return get_object_or_404(Permission, id=permission_id)

    def patch(self, request, permission_id: int):
        permission = self._get_permission(permission_id)
        serializer = PermissionManageSerializer(permission, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, message='Permission updated')

    def delete(self, request, permission_id: int):
        permission = self._get_permission(permission_id)
        permission.delete()
        return success_response(None, message='Permission deleted')


class RolePermissionUpdateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin')]

    @staticmethod
    def _get_role(role_id: int) -> Role:
        return get_object_or_404(Role.objects.prefetch_related('permissions'), id=role_id)

    def patch(self, request, role_id: int):
        role = self._get_role(role_id)
        serializer = RolePermissionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        permission_ids = serializer.validated_data['permission_ids']
        permissions = Permission.objects.filter(id__in=permission_ids)
        role.permissions.set(permissions)

        return success_response(
            RoleSerializer(role).data,
            message='Role permissions updated',
        )


class RoleListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin')]

    def get(self, request):
        queryset = Role.objects.order_by('name')
        return success_response(RoleManageSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = RoleManageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return success_response(
            RoleManageSerializer(role).data,
            message='Role created',
            status=status.HTTP_201_CREATED,
        )


class RoleDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin')]

    @staticmethod
    def _get_role(role_id: int) -> Role:
        return get_object_or_404(Role, id=role_id)

    def patch(self, request, role_id: int):
        role = self._get_role(role_id)
        serializer = RoleManageSerializer(role, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, message='Role updated')

    def delete(self, request, role_id: int):
        role = self._get_role(role_id)
        role.delete()
        return success_response(None, message='Role deleted')
