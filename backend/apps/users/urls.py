from django.urls import path

from . import views

app_name = 'users'

urlpatterns = [
    path('profile/me/', views.ProfileMeView.as_view(), name='profile-me'),
    path('profile/me/avatar/', views.AvatarMeView.as_view(), name='profile-me-avatar'),
    path('management/', views.UserListCreateView.as_view(), name='user-list-create'),
    path('management/<int:user_id>/', views.UserDetailView.as_view(), name='user-detail'),
]
