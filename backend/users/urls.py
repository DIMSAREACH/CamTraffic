from django.urls import path

from .views import DriverSearchView, ToggleActiveView, UserDetailView, UserListCreateView

urlpatterns = [
    path('', UserListCreateView.as_view(), name='user-list'),
    path('<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('<int:pk>/toggle-active/', ToggleActiveView.as_view(), name='user-toggle'),
    path('search/driver/', DriverSearchView.as_view(), name='driver-search'),
]
