from django.urls import path

from .oauth_views import OAuthAuthorizeView, OAuthCompleteView, OAuthStatusView
from .views import (
    ChangePasswordView,
    LoginView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RefreshView,
    RegisterView,
)

urlpatterns = [
    path('oauth/status/', OAuthStatusView.as_view(), name='oauth-status'),
    path('oauth/<str:provider>/authorize/', OAuthAuthorizeView.as_view(), name='oauth-authorize'),
    path('oauth/complete/', OAuthCompleteView.as_view(), name='oauth-complete'),
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', RefreshView.as_view(), name='token-refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
