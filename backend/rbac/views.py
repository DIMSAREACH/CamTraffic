from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsAdmin
from core.responses import error_response, success_response

from .models import Permission, Role, RolePermission
from .serializers import (
    PermissionSerializer,
    RolePermissionAssignSerializer,
    RoleSerializer,
    RoleWriteSerializer,
)


class PermissionListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = PermissionSerializer
    queryset = Permission.objects.all().order_by('resource', 'action_type')

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response(serializer.data)


class RoleListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Role.objects.all().order_by('role_name')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RoleWriteSerializer
        return RoleSerializer

    def list(self, request, *args, **kwargs):
        serializer = RoleSerializer(self.get_queryset(), many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return success_response(
            RoleSerializer(role).data,
            message='Role created',
            status_code=status.HTTP_201_CREATED,
        )


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Role.objects.all()
    lookup_url_kwarg = 'pk'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return RoleWriteSerializer
        return RoleSerializer

    def retrieve(self, request, *args, **kwargs):
        role = self.get_object()
        return success_response(RoleSerializer(role).data)

    def update(self, request, *args, **kwargs):
        role = self.get_object()
        serializer = RoleWriteSerializer(role, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return success_response(RoleSerializer(role).data, message='Role updated')

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        role.delete()
        return success_response(message='Role deleted')


class RolePermissionAssignView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            role = Role.objects.get(pk=pk)
        except Role.DoesNotExist:
            return error_response('Role not found', status_code=status.HTTP_404_NOT_FOUND)

        serializer = RolePermissionAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        permission_ids = serializer.validated_data['permission_ids']
        permissions = list(Permission.objects.filter(id__in=permission_ids))
        if len(permissions) != len(set(permission_ids)):
            return error_response('One or more permissions were not found', status_code=status.HTTP_400_BAD_REQUEST)

        RolePermission.objects.filter(role=role).delete()
        RolePermission.objects.bulk_create([
            RolePermission(role=role, permission=permission)
            for permission in permissions
        ])
        return success_response(
            RoleSerializer(role).data,
            message='Role permissions updated',
        )
