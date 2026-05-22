# GitHub sign-in setup

CamTraffic uses a **GitHub OAuth App** (Client ID + Client secret). This is separate from a Personal Access Token or fine-grained token.

## 1. Create a GitHub OAuth App

1. Sign in to [GitHub](https://github.com/)
2. **Profile photo** → **Settings**
3. Scroll down → **Developer settings** (left sidebar)
4. **OAuth Apps** → **New OAuth App**

## 2. Fill in the form

| Field | Value |
|--------|--------|
| **Application name** | `CamTraffic` (or your thesis project name) |
| **Homepage URL** | `http://localhost:5173` |
| **Authorization callback URL** | `http://localhost:5173/auth/oauth/callback` |

If you sometimes open the app as `127.0.0.1`, GitHub only allows **one** callback URL per app. Use `localhost` consistently, or create a second OAuth app for `http://127.0.0.1:5173/auth/oauth/callback`.

5. Click **Register application**

## 3. Copy credentials

1. On the app page, note the **Client ID**
2. Click **Generate a new client secret**
3. Copy the secret immediately (GitHub shows it only once)

## 4. Configure CamTraffic

Edit `backend/.env`:

```env
GITHUB_OAUTH_CLIENT_ID=Ov23lixxxxxxxxxxxx
GITHUB_OAUTH_CLIENT_SECRET=your_github_client_secret_here
OAUTH_FRONTEND_CALLBACK_URL=http://localhost:5173/auth/oauth/callback
```

Google and GitHub can both be set at the same time. Restart Django after saving:

```bash
cd backend
python manage.py runserver
```

## 5. Test

1. Open http://localhost:5173
2. Click **GitHub** under “or continue with”
3. Approve access on GitHub
4. You should return to the app and land on the dashboard as a **driver**

Verify backend config:

```bash
curl http://127.0.0.1:8000/api/auth/oauth/status/
```

Expected when GitHub is configured: `"github": true`

## Email requirement

GitHub must provide an email for your account:

- Set a **public email** on GitHub, or
- Ensure the OAuth app can read email (`user:email` scope is already requested)

If sign-in fails with “no public email”, add a verified email on GitHub and set it visible or primary.

## Troubleshooting

| Error | Fix |
|--------|-----|
| `Redirect URI mismatch` | Callback URL in GitHub must match `OAUTH_FRONTEND_CALLBACK_URL` exactly |
| `GitHub sign-in is not configured` | Set both `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`, restart Django |
| `no public email` | Add verified email on GitHub → Settings → Emails |
| `access_denied` | You cancelled on GitHub; try again |

## Security

- Do not commit `backend/.env` to Git public repos
- Rotate the client secret if it is ever exposed
