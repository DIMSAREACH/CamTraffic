from django.urls import path

from .views import DriverSearchView, ToggleActiveView, UserDetailView, UserListCreateView

urlpatterns = [
    path('', UserListCreateView.as_view(), name='user-list'),
    path('<uuid:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('<uuid:pk>/toggle-active/', ToggleActiveView.as_view(), name='user-toggle'),
    path('search/driver/', DriverSearchView.as_view(), name='driver-search'),
]
