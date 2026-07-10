from django.urls import path

from . import views

app_name = 'rbac'

urlpatterns = [
    path('my-access/', views.MyAccessView.as_view(), name='my-access'),
    path('roles/', views.RoleCatalogView.as_view(), name='roles'),
    path('roles/manage/', views.RoleListCreateView.as_view(), name='roles-manage'),
    path('roles/manage/<int:role_id>/', views.RoleDetailView.as_view(), name='role-detail'),
    path('permissions/', views.PermissionCatalogView.as_view(), name='permissions'),
    path('permissions/manage/', views.PermissionListCreateView.as_view(), name='permissions-manage'),
    path('permissions/manage/<int:permission_id>/', views.PermissionDetailView.as_view(), name='permission-detail'),
    path('roles/<int:role_id>/permissions/', views.RolePermissionUpdateView.as_view(), name='role-permissions-update'),
]
