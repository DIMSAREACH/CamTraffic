# 🏦 ABA BANK SANDBOX/TEST CREDENTIALS

## 📧 Official Email from ABA Digital Support

**From:** Digital Support <DigitalSupport@ababank.com>  
**Sent:** Friday, July 17, 2026 7:29 AM  
**To:** Sareach Dim <dimsareach009@gmail.com>  
**Subject:** Re: Sandbox KHQR – Transaction not found when scanning

---

## 🧪 SANDBOX TEST ACCOUNT

### Test Account Credentials

```
Account Number:  712832071
Mobile Number:   +855712832071
PIN:             1234
```

**⚠️ IMPORTANT:** These are **SANDBOX/TEST** credentials only. Do not use for production.

---

## 🔧 CONFIGURATION SETUP

### 1. Backend Environment Variables

Add to your `.env` file (in `src/backend/`):

```bash
# ══════════════════════════════════════════════════════════════
# ABA KHQR PAYMENT GATEWAY - SANDBOX/TEST ENVIRONMENT
# ══════════════════════════════════════════════════════════════

# Merchant Information
KHQR_MERCHANT_NAME=CamTraffic Sandbox
KHQR_MERCHANT_ACCOUNT=712832071         # Sandbox account
KHQR_MERCHANT_MOBILE=+855712832071      # Sandbox mobile
KHQR_SANDBOX_PIN=1234                   # For testing only

# For production, you'll use both USD and KHR accounts:
# KHQR_MERCHANT_ACCOUNT_USD=712832071   # Sandbox USD account
# KHQR_MERCHANT_ACCOUNT_KHR=712832071   # Sandbox KHR account (same for sandbox)

# QR Code Image URL (static QR code for testing)
KHQR_QR_IMAGE_URL=/payments/aba-khqr-sandbox.png

# Payment Environment
KHQR_ENVIRONMENT=sandbox                # sandbox | production
```

### 2. Production vs Sandbox Configuration

**Sandbox (Development/Testing):**
```bash
KHQR_ENVIRONMENT=sandbox
KHQR_MERCHANT_ACCOUNT=712832071
KHQR_MERCHANT_MOBILE=+855712832071
```

**Production (Live Environment):**
```bash
KHQR_ENVIRONMENT=production
KHQR_MERCHANT_ACCOUNT=YOUR_LIVE_ACCOUNT_NUMBER
KHQR_MERCHANT_MOBILE=YOUR_LIVE_MOBILE
# Remove KHQR_SANDBOX_PIN from production!
```

---

## 📱 TESTING WORKFLOW

### How to Test KHQR Payments (Sandbox)

1. **Generate Payment Session:**
   ```bash
   POST /api/fines/<fine_id>/checkout/khqr/
   ```
   
2. **Get QR Code & Bill Reference:**
   ```json
   {
     "merchant_name": "CamTraffic Sandbox",
     "merchant_account": "712832071",
     "amount_usd": "10.00",
     "bill_reference": "CT-8866692A092C-BBF1B5",
     "qr_image_url": "/payments/aba-khqr-sandbox.png"
   }
   ```

3. **Simulate ABA Mobile Payment:**
   - Open ABA Mobile app (or use sandbox simulator)
   - Login with: `+855712832071` / PIN: `1234`
   - Scan QR code or enter merchant account: `712832071`
   - Enter amount and bill reference
   - Complete payment

4. **Submit Payment Proof in CamTraffic:**
   ```bash
   POST /api/fines/<fine_id>/pay/
   {
     "payment_method": "khqr",
     "payment_reference": "CT-8866692A092C-BBF1B5",
     "payment_screenshot": <optional file>
   }
   ```

5. **Officer Verifies Payment:**
   ```bash
   POST /api/fines/<fine_id>/verify-payment/
   {
     "approved": true,
     "notes": "Payment verified in ABA sandbox"
   }
   ```

---

## 🔐 SECURITY NOTES

### ✅ DO:
- ✅ Use sandbox credentials for development/testing only
- ✅ Store credentials in `.env` file (never commit to git)
- ✅ Add `.env` to `.gitignore`
- ✅ Use different accounts for production
- ✅ Rotate production credentials regularly

### ❌ DON'T:
- ❌ Commit credentials to version control
- ❌ Use sandbox account in production
- ❌ Share PIN publicly
- ❌ Hard-code credentials in source files
- ❌ Mix sandbox and production configs

---

## 📝 ENVIRONMENT FILE TEMPLATE

### `src/backend/.env` (Development)

```bash
# ══════════════════════════════════════════════════════════════
# CAMTRAFFIC BACKEND - DEVELOPMENT ENVIRONMENT
# ══════════════════════════════════════════════════════════════

# Django Settings
DEBUG=True
SECRET_KEY=dev-secret-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_SETTINGS_MODULE=camtraffic.settings

# Database (Development - SQLite)
USE_SQLITE=True
# For PostgreSQL in dev:
# USE_SQLITE=False
# DB_NAME=camtraffic_dev
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_HOST=localhost
# DB_PORT=5432

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# ══════════════════════════════════════════════════════════════
# PAYMENT GATEWAYS
# ══════════════════════════════════════════════════════════════

# ── ABA KHQR (SANDBOX) ────────────────────────────────────────
KHQR_ENVIRONMENT=sandbox
KHQR_MERCHANT_NAME=CamTraffic Sandbox
KHQR_MERCHANT_ACCOUNT=712832071
KHQR_MERCHANT_MOBILE=+855712832071
KHQR_SANDBOX_PIN=1234
KHQR_QR_IMAGE_URL=/payments/aba-khqr-sandbox.png

# ── Stripe (Test Mode) ────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_TEST_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_SUCCESS_URL=http://localhost:5173/dashboard/fines?paid=1
STRIPE_CANCEL_URL=http://localhost:5173/dashboard/fines?cancel=1
PAYMENT_CURRENCY=usd

# ══════════════════════════════════════════════════════════════
# AI DETECTION (Development)
# ══════════════════════════════════════════════════════════════
AI_DETECTION_MODE=local
AI_USE_MOCK=True
AI_WARMUP_MODELS=False

# Email (Development - Console)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Celery/Redis (Optional in dev)
USE_REDIS=False
# REDIS_URL=redis://localhost:6379/0
```

---

## 🚀 PRODUCTION CONFIGURATION

### For Render.com Deployment

Add to **Render Dashboard → Environment Variables:**

```bash
# ABA KHQR - PRODUCTION (Get real credentials from ABA Bank)
KHQR_ENVIRONMENT=production
KHQR_MERCHANT_NAME=CamTraffic Cambodia
KHQR_MERCHANT_ACCOUNT=YOUR_PRODUCTION_ACCOUNT
KHQR_MERCHANT_MOBILE=YOUR_PRODUCTION_MOBILE
KHQR_QR_IMAGE_URL=https://api.camtraffic.store/media/payments/aba-khqr-production.png

# DO NOT include KHQR_SANDBOX_PIN in production!
```

---

## 🧪 TESTING CHECKLIST

### Before Going Live

- [ ] Test KHQR payment in sandbox environment
- [ ] Verify bill reference generation
- [ ] Test payment submission workflow
- [ ] Test officer verification
- [ ] Verify payment status updates
- [ ] Test with real ABA Mobile app (sandbox mode)
- [ ] Check error handling for invalid references
- [ ] Test screenshot upload (optional feature)
- [ ] Verify payment history displays correctly
- [ ] Test PDF receipt generation for KHQR payments

### Production Readiness

- [ ] Obtain production ABA merchant account
- [ ] Update production environment variables
- [ ] Upload production QR code image
- [ ] Remove all sandbox credentials
- [ ] Test end-to-end in production environment
- [ ] Set up monitoring for payment failures
- [ ] Configure webhook callbacks (if supported)
- [ ] Document production support contacts

---

## 📞 ABA BANK SUPPORT CONTACTS

**For Sandbox/Testing Issues:**
- Email: DigitalSupport@ababank.com
- Subject: "Sandbox KHQR – [Your Issue]"

**For Production Setup:**
- Contact ABA Bank's Business Department
- Request: "KHQR Merchant Account for CamTraffic System"
- Provide: Business registration, tax ID, system documentation

---

## 📚 RELATED DOCUMENTATION

- **Payment Module Documentation:** `PAYMENT-MODULE-COMPLETE.md`
- **KHQR Gateway Implementation:** `src/backend/fines/khqr_gateway.py`
- **Environment Configuration:** `infrastructure/deploy/env/.env.render.camtraffic.store.example`
- **Deployment Guide:** `infrastructure/deploy/RENDER.md`

---

## 📊 SANDBOX TESTING LOG

Track your sandbox tests here:

| Date | Test Type | Amount | Result | Notes |
|------|-----------|--------|--------|-------|
| 2026-07-17 | Initial Setup | - | ✅ Success | Credentials received from ABA |
| _Add your tests_ | | | | |

---

**Last Updated:** 2026-07-23  
**Status:** Sandbox credentials active ✅  
**Environment:** Development/Testing only 🧪

**⚠️ SECURITY REMINDER:**  
Never commit this file with real credentials to version control!  
Keep production credentials in Render Dashboard environment variables only.
