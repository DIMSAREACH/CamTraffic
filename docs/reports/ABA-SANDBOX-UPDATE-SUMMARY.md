# 🔧 ABA KHQR SANDBOX - QUICK UPDATE GUIDE

## ✅ DONE: Configuration Updated

I've updated your CamTraffic system with the **ABA Bank Sandbox credentials** you received.

---

## 📝 WHAT WAS UPDATED

### 1. ✅ Environment Configuration Files

**Updated files:**
- `src/backend/.env.example` - Added sandbox KHQR credentials
- `infrastructure/deploy/env/.env.render.camtraffic.store.example` - Added production template

**New sandbox configuration:**
```bash
KHQR_ENVIRONMENT=sandbox
KHQR_MERCHANT_NAME=CamTraffic Sandbox
KHQR_MERCHANT_ACCOUNT=712832071
KHQR_MERCHANT_MOBILE=+855712832071
KHQR_SANDBOX_PIN=1234
KHQR_QR_IMAGE_URL=/payments/aba-khqr-sandbox.png
```

### 2. ✅ Documentation Created

**New file:** `ABA-SANDBOX-CREDENTIALS.md`
- Complete setup guide
- Testing workflow
- Security best practices
- Production migration steps
- Troubleshooting tips

---

## 🚀 NEXT STEPS - TO START USING SANDBOX

### Step 1: Update Your Local `.env` File

Create or update `src/backend/.env` with:

```bash
# ABA KHQR - SANDBOX
KHQR_ENVIRONMENT=sandbox
KHQR_MERCHANT_NAME=CamTraffic Sandbox
KHQR_MERCHANT_ACCOUNT=712832071
KHQR_MERCHANT_MOBILE=+855712832071
KHQR_SANDBOX_PIN=1234
KHQR_QR_IMAGE_URL=/payments/aba-khqr-sandbox.png

# Stripe (optional - test mode)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
```

### Step 2: Restart Your Backend Server

```bash
cd src/backend
python manage.py runserver
```

### Step 3: Test KHQR Payment Flow

1. **Create a test fine** (or use existing fine)
2. **Generate KHQR session:**
   ```bash
   curl -X POST http://localhost:8000/api/fines/<fine_id>/checkout/khqr/ \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **You'll get:**
   ```json
   {
     "merchant_name": "CamTraffic Sandbox",
     "merchant_account": "712832071",
     "amount_usd": "10.00",
     "bill_reference": "CT-XXX",
     "qr_image_url": "/payments/aba-khqr-sandbox.png"
   }
   ```

4. **Simulate payment in ABA Mobile:**
   - Login: `+855712832071` / PIN: `1234`
   - Pay to account: `712832071`
   - Use bill reference from step 3

5. **Submit payment proof in CamTraffic:**
   ```bash
   curl -X POST http://localhost:8000/api/fines/<fine_id>/pay/ \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "payment_method=khqr" \
     -F "payment_reference=CT-XXX"
   ```

---

## 📱 TESTING WITH ABA MOBILE APP

### Option 1: Use Real ABA Mobile App (Sandbox Mode)

1. Install ABA Mobile app
2. Login with sandbox credentials:
   - Mobile: `+855712832071`
   - PIN: `1234`
3. Use KHQR scan feature
4. Test actual payment flow

### Option 2: Manual Testing (Without App)

Since you have sandbox credentials, you can:
1. Generate bill reference in CamTraffic
2. **Manually** submit payment reference
3. Officer verifies payment (simulating ABA confirmation)

---

## 🔒 SECURITY REMINDERS

### ✅ IMPORTANT:

1. **Never commit `.env` file to git**
   ```bash
   # Verify .env is in .gitignore
   git check-ignore src/backend/.env
   # Should output: src/backend/.env
   ```

2. **Sandbox vs Production:**
   - Sandbox: `712832071` (current setup)
   - Production: Get from ABA Bank (when ready to launch)

3. **Keep PIN secure:**
   - Store in `.env` only
   - Don't share publicly
   - Don't commit to version control

---

## 📚 DOCUMENTATION REFERENCE

### Files to Read:

1. **`ABA-SANDBOX-CREDENTIALS.md`**
   - Full sandbox setup guide
   - Testing workflow
   - Production migration

2. **`PAYMENT-MODULE-COMPLETE.md`**
   - Complete payment module documentation
   - API endpoint reference
   - Integration guide

3. **`src/backend/fines/khqr_gateway.py`**
   - KHQR implementation code
   - Session generation logic

---

## 🧪 TESTING CHECKLIST

Before deploying to production:

- [ ] Test KHQR session generation
- [ ] Test bill reference creation
- [ ] Test payment submission
- [ ] Test officer verification workflow
- [ ] Test payment status updates
- [ ] Test payment history display
- [ ] Test PDF receipt generation with KHQR payments
- [ ] Test with real ABA Mobile app (sandbox mode)
- [ ] Verify error handling

---

## 🚀 PRODUCTION MIGRATION (When Ready)

### When You're Ready to Go Live:

1. **Contact ABA Bank Business Department**
   - Request production merchant account
   - Provide business documents

2. **Update Production Environment:**
   ```bash
   # In Render.com dashboard, set:
   KHQR_ENVIRONMENT=production
   KHQR_MERCHANT_NAME=CamTraffic Cambodia
   KHQR_MERCHANT_ACCOUNT=YOUR_LIVE_ACCOUNT
   KHQR_MERCHANT_MOBILE=YOUR_LIVE_MOBILE
   # Remove KHQR_SANDBOX_PIN!
   ```

3. **Upload Production QR Code:**
   - Get official QR from ABA
   - Upload to: `/media/payments/aba-khqr-production.png`
   - Update `KHQR_QR_IMAGE_URL`

4. **Test in Production:**
   - Use real account for test transaction
   - Verify end-to-end flow
   - Monitor for errors

---

## 💡 CURRENT STATUS

✅ **Sandbox credentials configured**  
✅ **Documentation complete**  
✅ **Environment files updated**  
⏳ **Next: Update your local `.env` and test**  

---

## 📞 SUPPORT

**For Sandbox Issues:**
- Email: DigitalSupport@ababank.com
- Subject: "Sandbox KHQR – [Your Issue]"

**For System Integration:**
- Check: `ABA-SANDBOX-CREDENTIALS.md`
- Check: `PAYMENT-MODULE-COMPLETE.md`

---

**Updated:** 2026-07-23  
**Status:** Sandbox configuration ready ✅  
**Action Required:** Update local `.env` and start testing 🚀
