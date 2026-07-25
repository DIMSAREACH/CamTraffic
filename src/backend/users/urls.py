from django.urls import path

from .views import AdminResetPasswordView, DriverSearchView, ToggleActiveView, UserDetailView, UserListCreateView

urlpatterns = [
    path('', UserListCreateView.as_view(), name='user-list'),
    path('<uuid:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('<uuid:pk>/toggle-active/', ToggleActiveView.as_view(), name='user-toggle'),
    path('<uuid:pk>/reset-password/', AdminResetPasswordView.as_view(), name='user-reset-password'),
    path('search/driver/', DriverSearchView.as_view(), name='driver-search'),
]
