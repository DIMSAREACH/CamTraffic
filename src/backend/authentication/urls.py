from django.urls import path

from .oauth_views import OAuthAuthorizeView, OAuthCompleteView, OAuthStatusView
from .profile_views import (
    DeactivateAccountView,
    DeleteAccountView,
    LogoutOtherSessionsView,
    ProfileOverviewView,
    ProfilePreferencesView,
)
from .views import (
    ChangePasswordView,
    EmailVerifyConfirmView,
    EmailVerifySendView,
    LoginView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetContinueView,
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
    path('profile/overview/', ProfileOverviewView.as_view(), name='profile-overview'),
    path('profile/preferences/', ProfilePreferencesView.as_view(), name='profile-preferences'),
    path('profile/deactivate/', DeactivateAccountView.as_view(), name='profile-deactivate'),
    path('profile/delete/', DeleteAccountView.as_view(), name='profile-delete'),
    path('profile/logout-others/', LogoutOtherSessionsView.as_view(), name='profile-logout-others'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/continue/', PasswordResetContinueView.as_view(), name='password-reset-continue'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('verify-email/send/', EmailVerifySendView.as_view(), name='verify-email-send'),
    path('verify-email/confirm/', EmailVerifyConfirmView.as_view(), name='verify-email-confirm'),
]
