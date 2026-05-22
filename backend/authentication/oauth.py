"""Google & GitHub OAuth2 helpers for CamTraffic."""
from __future__ import annotations

import secrets
from dataclasses import dataclass
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from rest_framework_simplejwt.tokens import RefreshToken

from users.serializers import UserSerializer

User = get_user_model()

STATE_SALT = 'camtraffic-oauth-state'
STATE_MAX_AGE = 600


class OAuthError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass
class OAuthProfile:
    provider: str
    uid: str
    email: str
    full_name: str


def oauth_configured(provider: str) -> bool:
    if provider == 'google':
        return bool(settings.GOOGLE_OAUTH_CLIENT_ID and settings.GOOGLE_OAUTH_CLIENT_SECRET)
    if provider == 'github':
        return bool(settings.GITHUB_OAUTH_CLIENT_ID and settings.GITHUB_OAUTH_CLIENT_SECRET)
    return False


def default_redirect_uri() -> str:
    return settings.OAUTH_FRONTEND_CALLBACK_URL


def build_authorization_url(provider: str, redirect_uri: str | None = None) -> dict:
    if provider not in ('google', 'github'):
        raise OAuthError('Unsupported provider.', 400)
    if not oauth_configured(provider):
        raise OAuthError(
            f'{provider.title()} sign-in is not configured on the server. '
            'Add OAuth client credentials to backend/.env',
            503,
        )

    redirect_uri = redirect_uri or default_redirect_uri()
    state = signing.dumps(
        {'provider': provider, 'redirect_uri': redirect_uri, 'nonce': secrets.token_urlsafe(16)},
        salt=STATE_SALT,
    )

    if provider == 'google':
        params = {
            'client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': 'openid email profile',
            'state': state,
            'access_type': 'online',
            'prompt': 'select_account',
        }
        url = f'https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}'
    else:
        params = {
            'client_id': settings.GITHUB_OAUTH_CLIENT_ID,
            'redirect_uri': redirect_uri,
            'scope': 'read:user user:email',
            'state': state,
        }
        url = f'https://github.com/login/oauth/authorize?{urlencode(params)}'

    return {'authorization_url': url, 'state': state, 'redirect_uri': redirect_uri}


def _load_state(state: str) -> dict:
    try:
        return signing.loads(state, salt=STATE_SALT, max_age=STATE_MAX_AGE)
    except signing.BadSignature as exc:
        raise OAuthError('Invalid or expired sign-in session. Please try again.', 400) from exc


def exchange_code(
    provider: str,
    code: str,
    state: str,
    redirect_uri: str | None = None,
    *,
    request=None,
) -> dict:
    payload = _load_state(state)
    if payload.get('provider') != provider:
        raise OAuthError('Provider mismatch. Please try again.', 400)

    redirect_uri = redirect_uri or payload.get('redirect_uri') or default_redirect_uri()
    if payload.get('redirect_uri') and payload['redirect_uri'] != redirect_uri:
        raise OAuthError('Redirect URI mismatch.', 400)

    if provider == 'google':
        profile = _google_profile(code, redirect_uri)
    else:
        profile = _github_profile(code, redirect_uri)

    user = _get_or_create_user(profile)
    if not user.is_active:
        raise OAuthError('This account has been deactivated.', 403)

    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user, context={'request': request} if request else {}).data,
    }


def _google_profile(code: str, redirect_uri: str) -> OAuthProfile:
    token_res = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'code': code,
            'client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
            'client_secret': settings.GOOGLE_OAUTH_CLIENT_SECRET,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code',
        },
        timeout=15,
    )
    if token_res.status_code != 200:
        raise OAuthError('Google sign-in failed. Could not exchange authorization code.', 400)
    access_token = token_res.json().get('access_token')
    if not access_token:
        raise OAuthError('Google sign-in failed. No access token received.', 400)

    user_res = requests.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=15,
    )
    if user_res.status_code != 200:
        raise OAuthError('Google sign-in failed. Could not load profile.', 400)
    data = user_res.json()
    email = (data.get('email') or '').strip().lower()
    if not email:
        raise OAuthError('Google account has no email address available.', 400)
    return OAuthProfile(
        provider='google',
        uid=str(data.get('sub', '')),
        email=email,
        full_name=(data.get('name') or email.split('@')[0]).strip(),
    )


def _github_profile(code: str, redirect_uri: str) -> OAuthProfile:
    token_res = requests.post(
        'https://github.com/login/oauth/access_token',
        headers={'Accept': 'application/json'},
        data={
            'client_id': settings.GITHUB_OAUTH_CLIENT_ID,
            'client_secret': settings.GITHUB_OAUTH_CLIENT_SECRET,
            'code': code,
            'redirect_uri': redirect_uri,
        },
        timeout=15,
    )
    if token_res.status_code != 200:
        raise OAuthError('GitHub sign-in failed. Could not exchange authorization code.', 400)
    access_token = token_res.json().get('access_token')
    if not access_token:
        raise OAuthError('GitHub sign-in failed. No access token received.', 400)

    headers = {'Authorization': f'Bearer {access_token}', 'Accept': 'application/vnd.github+json'}
    user_res = requests.get('https://api.github.com/user', headers=headers, timeout=15)
    if user_res.status_code != 200:
        raise OAuthError('GitHub sign-in failed. Could not load profile.', 400)
    data = user_res.json()
    uid = str(data.get('id', ''))
    email = (data.get('email') or '').strip().lower()
    if not email:
        emails_res = requests.get('https://api.github.com/user/emails', headers=headers, timeout=15)
        if emails_res.status_code == 200:
            for item in emails_res.json():
                if item.get('primary') and item.get('verified'):
                    email = item.get('email', '').strip().lower()
                    break
            if not email:
                for item in emails_res.json():
                    if item.get('verified'):
                        email = item.get('email', '').strip().lower()
                        break
    if not email:
        raise OAuthError('GitHub account has no public email. Add a verified email on GitHub.', 400)
    full_name = (data.get('name') or data.get('login') or email.split('@')[0]).strip()
    return OAuthProfile(provider='github', uid=uid, email=email, full_name=full_name)


def _get_or_create_user(profile: OAuthProfile) -> User:
    user = User.objects.filter(auth_provider=profile.provider, social_uid=profile.uid).first()
    if user:
        return user

    user = User.objects.filter(email__iexact=profile.email).first()
    if user:
        user.auth_provider = profile.provider
        user.social_uid = profile.uid
        if not user.full_name:
            user.full_name = profile.full_name
        user.save(update_fields=['auth_provider', 'social_uid', 'full_name', 'updated_at'])
        return user

    return User.objects.create_user(
        email=profile.email,
        password=secrets.token_urlsafe(32),
        full_name=profile.full_name,
        role='driver',
        auth_provider=profile.provider,
        social_uid=profile.uid,
    )


def oauth_status() -> dict:
    return {
        'google': oauth_configured('google'),
        'github': oauth_configured('github'),
        'redirect_uri': default_redirect_uri(),
    }
