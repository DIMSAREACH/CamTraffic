# Google sign-in setup (Google Cloud Console)

CamTraffic uses **OAuth 2.0 Client ID** credentials (not an API key).

## 1. Create a project

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project (e.g. `CamTraffic`)

## 2. OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**
2. User type: **External** (for testing) or Internal (Workspace only)
3. Fill app name: `CamTraffic`, support email, developer email
4. **Scopes** → Add: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
5. **Test users** (if External + Testing): add your Gmail address

## 3. Create OAuth client

1. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `CamTraffic User Portal`
4. **Authorized JavaScript origins** (optional for this app):
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
5. **Authorized redirect URIs** (required — must match exactly):
   - `http://localhost:5173/auth/oauth/callback`
   - `http://127.0.0.1:5173/auth/oauth/callback` (if you open the app via 127.0.0.1)

6. Click **Create** and copy:
   - **Client ID** → `GOOGLE_OAUTH_CLIENT_ID`
   - **Client secret** → `GOOGLE_OAUTH_CLIENT_SECRET`

## 4. Configure CamTraffic backend

Edit `backend/.env`:

```env
GOOGLE_OAUTH_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-your-secret-here
OAUTH_FRONTEND_CALLBACK_URL=http://localhost:5173/auth/oauth/callback
```

Restart Django:

```bash
cd backend
python manage.py runserver
```

## 5. Test

1. Open http://localhost:5173
2. Click **Google** under “or continue with”
3. Sign in with your Google account (must be a test user if app is in Testing mode)
4. You should land on the dashboard as a **driver**

Check configuration:

```bash
curl http://127.0.0.1:8000/api/auth/oauth/status/
```

Expected: `"google": true` when Client ID and secret are set.

## Troubleshooting

| Error | Fix |
|--------|-----|
| `redirect_uri_mismatch` | Redirect URI in Google Console must match `OAUTH_FRONTEND_CALLBACK_URL` exactly |
| `Google sign-in is not configured` | Add both Client ID and secret to `backend/.env` and restart server |
| `access_denied` | Add your Gmail under OAuth consent screen → Test users |
| App blocked / unverified | Keep app in **Testing** and use test users, or publish consent screen |
