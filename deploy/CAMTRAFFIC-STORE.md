# camtraffic.store — production domain runbook

Official hostnames for CamTraffic production:

| Host | Role |
|------|------|
| `https://admin.camtraffic.store` | Administrator portal |
| `https://app.camtraffic.store` | Driver & officer portal |
| `https://api.camtraffic.store` | Django REST API |
| `https://www.camtraffic.store` | Redirect → admin |
| `https://camtraffic.store` | Redirect → admin (apex) |

---

## Option A — Full stack on your VPS (Docker)

Best match for thesis “production” demo: one server, TLS, Celery, AI worker, nginx serves both SPAs.

### 1. DNS (at your registrar)

Point **A records** to the VPS public IPv4:

```
camtraffic.store       →  YOUR_VPS_IP
www.camtraffic.store   →  YOUR_VPS_IP
admin.camtraffic.store →  YOUR_VPS_IP
app.camtraffic.store   →  YOUR_VPS_IP
api.camtraffic.store   →  YOUR_VPS_IP
```

Optional: **CAA** at apex — if you use CAA, allow `letsencrypt.org` and `pki.goog` (see [`deploy/DNS-RENDER-VERIFY.md`](../DNS-RENDER-VERIFY.md)). **Remove all AAAA** records before pointing subdomains to Render.

Verify:

```bash
dig +short admin.camtraffic.store
```

### 2. Environment on the server

```bash
git clone https://github.com/DIMSAREACH/CamTraffic.git /opt/camtraffic
cd /opt/camtraffic
cp deploy/env/.env.camtraffic.store.example deploy/env/.env.production
# Edit: SECRET_KEY, DB_PASSWORD, RESEND_API_KEY, OAuth secrets
```

Ensure `ai/weights/best_v2.pt` exists on the host (mounted read-only into containers).

### 3. Start stack + TLS

```bash
npm run docker:prod:up
bash deploy/ssl/certbot-init.sh
npm run docker:prod:restart
```

Nginx builds frontends with `VITE_API_URL=https://api.camtraffic.store/api` (see `deploy/docker/Dockerfile.nginx.prod`).

### 4. Smoke test

```bash
curl -sS https://api.camtraffic.store/health/
curl -sS -o /dev/null -w "%{http_code}\n" https://admin.camtraffic.store/
curl -sS -o /dev/null -w "%{http_code}\n" https://app.camtraffic.store/
```

Log in: demo accounts from `docs/final-year-project/DEMO-ACCOUNTS.md` after `seed_demo` on the server.

---

## Option B — Render + custom domains

Keep Postgres/Redis/API on Render; attach **custom domains** in each service’s **Settings → Custom Domains**.

| Render service | Custom domain | Notes |
|----------------|---------------|--------|
| Web Service (Docker API) | `api.camtraffic.store` | CNAME to Render target |
| Static site (admin) | `admin.camtraffic.store` | |
| Static site (user) | `app.camtraffic.store` | |

### API environment (after custom domain is active)

Use `deploy/env/.env.render.camtraffic.store.example` as a template. Critical keys:

```env
ALLOWED_HOSTS=api.camtraffic.store,camtraffic-api.onrender.com,.onrender.com
CORS_ALLOWED_ORIGINS=https://admin.camtraffic.store,https://app.camtraffic.store,https://camtraffic-user.onrender.com,https://camtraffic-admin.onrender.com
PUBLIC_API_URL=https://api.camtraffic.store
# Use onrender user host until app.camtraffic.store DNS exists (currently NXDOMAIN breaks email links).
OAUTH_FRONTEND_CALLBACK_URL=https://camtraffic-user.onrender.com/auth/oauth/callback
FRONTEND_PASSWORD_RESET_URL=https://camtraffic-user.onrender.com/reset-password
RESEND_FROM_EMAIL=CamTraffic <noreply@camtraffic.store>
```

Password-reset emails use `{PUBLIC_API_URL}/api/auth/password-reset/continue/?uid=&token=` then 302 to `FRONTEND_PASSWORD_RESET_URL`.

Do **not** set `GUNICORN_BIND` to a fixed port on Render; the image uses `PORT`.

### Static site build env (both admin & user)

```env
VITE_API_URL=https://api.camtraffic.store/api
```

Rebuild/redeploy static sites after changing `VITE_API_URL`.

### Apex / www on Render

Render static sites are per-hostname. For `www` or apex → admin, use your registrar’s **redirect** or a small DNS/Cloudflare page rule to `https://admin.camtraffic.store`.

---

## Email (Resend)

1. Add domain **camtraffic.store** in [Resend](https://resend.com) → DNS (SPF/DKIM).
2. Set on API:

```env
RESEND_FROM_EMAIL=CamTraffic <noreply@camtraffic.store>
DEFAULT_FROM_EMAIL=CamTraffic <noreply@camtraffic.store>
```

---

## OAuth (Google / GitHub)

Update authorized redirect URIs in each provider console:

| Provider | Redirect URI |
|----------|----------------|
| Google | `https://app.camtraffic.store/auth/oauth/callback` |
| GitHub | same |

Backend callback remains Django; user-facing URL is `OAUTH_FRONTEND_CALLBACK_URL`.

---

## Related files

| File | Purpose |
|------|---------|
| `deploy/env/.env.camtraffic.store.example` | VPS Docker `deploy/env/.env.production` |
| `deploy/env/.env.render.camtraffic.store.example` | Render API with custom domain |
| `frontend-admin/.env.production.example` | Manual admin production build |
| `frontend-user/.env.production.example` | Manual user production build |
| `deploy/ssl/README.md` | Certbot & DNS |
| `deploy/RENDER.md` | Render without custom domain |
