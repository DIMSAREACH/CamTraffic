# CamTraffic — Render “all portals working” checklist
#
# Live hosts (preferred until app.camtraffic.store DNS exists):
#   Admin:  https://camtraffic-admin.onrender.com
#   User:   https://camtraffic-user.onrender.com   (Officer + Driver)
#   API:    https://camtraffic-api.onrender.com
#
# Honest scope: login, dashboards, CRUD pages, AI detect (mock on hobby),
# fines/payments (manual/KHQR demo), OAuth, password reset, durable media via R2.
# Real YOLO + EasyOCR need a larger plan + weight files — not free hobby RAM.

## A. API env (camtraffic-api) — paste / merge

Use `deploy/env/.env.render.example` then ensure these are set:

```env
PUBLIC_API_URL=https://camtraffic-api.onrender.com
CORS_ALLOWED_ORIGINS=https://camtraffic-admin.onrender.com,https://camtraffic-user.onrender.com
OAUTH_FRONTEND_CALLBACK_URL=https://camtraffic-user.onrender.com/auth/oauth/callback
FRONTEND_PASSWORD_RESET_URL=https://camtraffic-user.onrender.com/reset-password
CAMTRAFFIC_SYNC_DEMO_ACCOUNTS=true
CAMTRAFFIC_SEED_DEMO_DATA=true
CAMTRAFFIC_BACKFILL_RBAC=true
AI_USE_MOCK=True
AI_VEHICLE_ENABLED=False
AI_PLATE_OCR_ENABLED=False
PAYMENT_MODE=manual
STRIPE_SUCCESS_URL=https://camtraffic-user.onrender.com/dashboard/fines?paid=1
STRIPE_CANCEL_URL=https://camtraffic-user.onrender.com/dashboard/fines?cancel=1
```

Cloud media (recommended — keeps images after redeploy):

```env
USE_S3_MEDIA=True
AWS_ACCESS_KEY_ID=…
AWS_SECRET_ACCESS_KEY=…
AWS_STORAGE_BUCKET_NAME=camtraffic-media
AWS_S3_REGION_NAME=auto
AWS_S3_ENDPOINT_URL=https://ACCOUNT_ID.r2.cloudflarestorage.com
AWS_S3_CUSTOM_DOMAIN=pub-….r2.dev
AWS_LOCATION=media
```

OAuth + email (fill real values):

```env
GOOGLE_OAUTH_CLIENT_ID=…
GOOGLE_OAUTH_CLIENT_SECRET=…
GITHUB_OAUTH_CLIENT_ID=…
GITHUB_OAUTH_CLIENT_SECRET=…
RESEND_API_KEY=…
RESEND_FROM_EMAIL=CamTraffic <noreply@your-domain.com>
```

## B. Static site build env

**camtraffic-admin** and **camtraffic-user**:

```env
VITE_API_URL=https://camtraffic-api.onrender.com/api
VITE_USE_MOCK=false
VITE_ADMIN_PORTAL_URL=https://camtraffic-admin.onrender.com
VITE_USER_PORTAL_URL=https://camtraffic-user.onrender.com
```

Rebuild both after changing `VITE_*`.

## C. Google + GitHub consoles

Authorized callback (exact):

```
https://camtraffic-user.onrender.com/auth/oauth/callback
```

## D. Demo logins (seeded on each API boot)

Password for all: `CamTraffic@2026!`

| Portal | URL | Email |
|--------|-----|--------|
| Admin | https://camtraffic-admin.onrender.com | admin@camtraffic.demo |
| Officer | https://camtraffic-user.onrender.com | officer@camtraffic.demo |
| Driver | https://camtraffic-user.onrender.com | driver@camtraffic.demo |

## E. Smoke test (after deploy Live)

1. API `GET /health/` → 200  
2. Admin login → Dashboard, Users, Signs, Violations, Fines, AI Detection, Settings  
3. Officer login → Dashboard, AI Detection, Violations, Fines, Evidence  
4. Driver login → Dashboard, Vehicles, Fines, Payments, Appeals, Signs  
5. Forgot password → email link opens user portal (not app.camtraffic.store)  
6. Google / GitHub sign-in on user portal  
7. Upload a sign/profile image → URL on `pub-….r2.dev` if R2 enabled  

## F. Do not expect on free Render

- Real YOLO GPU/CPU heavy detection (use mock)
- `app.camtraffic.store` until you add DNS CNAME
- Instant cold starts (first request may take 30–60s)

## Related

- `deploy/RENDER-COMPLETE-RUNBOOK.md` — create services from scratch  
- `docs/CLOUD-MEDIA-R2.md` — free image storage  
- `docs/PRODUCTION-PLATFORM-COMPLETION.md` — thesis “100%” definition  
