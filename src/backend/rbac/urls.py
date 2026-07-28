from django.urls import path

from .views import (
    PermissionListView,
    RoleDetailView,
    RoleListCreateView,
    RolePermissionAssignView,
)

urlpatterns = [
    path('permissions/', PermissionListView.as_view(), name='rbac-permission-list'),
    path('roles/', RoleListCreateView.as_view(), name='rbac-role-list'),
    path('roles/<uuid:pk>/', RoleDetailView.as_view(), name='rbac-role-detail'),
    path('roles/<uuid:pk>/permissions/', RolePermissionAssignView.as_view(), name='rbac-role-permissions'),
]
