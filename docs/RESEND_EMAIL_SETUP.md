# Resend email setup (forgot password & resend)

CamTraffic sends password reset links through [Resend](https://resend.com) when `RESEND_API_KEY` is set in `backend/.env`.

## 1. Create a Resend account

1. Sign up at [https://resend.com](https://resend.com).
2. Open **API Keys** → **Create API Key**.
3. Copy the key (starts with `re_`).

## 2. Configure `backend/.env`

```env
RESEND_API_KEY=re_your_api_key_here
# Full email required — NOT just your domain name
RESEND_FROM_EMAIL=CamTraffic <noreply@camtraffic.store>
FRONTEND_PASSWORD_RESET_URL=http://localhost:5173/reset-password
```

**Wrong:** `CamTraffic <camtraffic.store>`  
**Right:** `CamTraffic <noreply@camtraffic.store>`

Restart Django after saving:

```bash
cd backend
python manage.py runserver
```

## 3. Testing (free tier)

Without a custom domain, Resend allows sending **from** `onboarding@resend.dev` and **to** only the email address on your Resend account.

Example: if you signed up as `you@gmail.com`, reset emails work when the user enters `you@gmail.com` in forgot password (and that account exists in CamTraffic).

## 4. Production (your domain)

1. In Resend → **Domains** → add your domain and verify DNS records.
2. Update `.env`:

```env
RESEND_FROM_EMAIL=CamTraffic <noreply@yourdomain.com>
```

## 5. Test from terminal

```bash
cd backend
pip install resend
python manage.py test_reset_email driver@camtraffic.kh
```

Use a **registered** CamTraffic email that matches your Resend test rules.

## SMTP fallback

If `RESEND_API_KEY` is empty, the app falls back to Gmail/SMTP when `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` are set.
