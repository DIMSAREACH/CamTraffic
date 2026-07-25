# ABA KHQR Payment Integration - Frontend Assets

## 📁 This Folder

Contains static QR code images for ABA KHQR payment gateway integration.

---

## 🖼️ Files

### Development/Sandbox
- `aba-khqr-sandbox.png` - ABA Bank sandbox QR code for testing
  - Test account: 712832071
  - Environment: Development only
  - See: `ABA-SANDBOX-CREDENTIALS.md` in project root

### Production
- `aba-khqr-production.png` - Your live merchant QR code (when ready)
  - Replace with official QR from ABA Bank
  - Environment: Production only
  - Get from: ABA Bank Business Department

---

## 🔧 Configuration

The backend selects the correct QR code based on `KHQR_ENVIRONMENT`:

```bash
# Development (.env)
KHQR_ENVIRONMENT=sandbox
KHQR_QR_IMAGE_URL=/payments/aba-khqr-sandbox.png

# Production (Render.com)
KHQR_ENVIRONMENT=production
KHQR_QR_IMAGE_URL=/payments/aba-khqr-production.png
```

---

## 📱 How KHQR Payment Works

1. **Driver initiates payment** in CamTraffic app
2. **System generates unique bill reference** (e.g., `CT-8866692A092C-BBF1B5`)
3. **QR code displayed** from this folder
4. **Driver scans QR** with ABA Mobile app
5. **Driver enters:**
   - Amount (from fine)
   - Bill reference (from system)
6. **Driver completes payment** in ABA Mobile
7. **Driver submits payment proof** in CamTraffic (optional screenshot)
8. **Officer verifies payment** and approves
9. **Fine marked as paid** ✅

---

## 🧪 Testing with Sandbox

### Sandbox QR Code Setup

1. Get official sandbox QR from ABA Bank
2. Save as `aba-khqr-sandbox.png` in this folder
3. Or create test QR that links to account `712832071`

### Testing Flow

```bash
# 1. Start backend with sandbox config
cd src/backend
export KHQR_ENVIRONMENT=sandbox
python manage.py runserver

# 2. Frontend displays sandbox QR
# 3. Use ABA Mobile with test credentials:
#    Mobile: +855712832071
#    PIN: 1234

# 4. Scan QR and pay
# 5. Submit payment reference in CamTraffic
# 6. Verify in admin panel
```

---

## 🚀 Production Setup

### When Going Live:

1. **Get production merchant account** from ABA Bank Business Department
2. **Request official QR code** (static merchant QR)
3. **Save QR image** as `aba-khqr-production.png`
4. **Update production environment:**
   ```bash
   KHQR_ENVIRONMENT=production
   KHQR_QR_IMAGE_URL=/payments/aba-khqr-production.png
   ```
5. **Deploy and test** with real account

---

## 📊 Current Status

| File | Status | Environment | Used For |
|------|--------|-------------|----------|
| `aba-khqr-sandbox.png` | ⚠️ Placeholder | Sandbox | Development/Testing |
| `aba-khqr-production.png` | ❌ Not Ready | Production | Live Payments |

---

## 🔒 Security Notes

### ✅ Safe to Commit:
- ✅ Sandbox QR code image (test account)
- ✅ This README file

### ❌ DO NOT Commit:
- ❌ Production QR code with real merchant account
- ❌ Real account numbers in QR
- ❌ Real merchant credentials

**Production QR:** Deploy separately or load from secure environment

---

## 📚 Related Documentation

- **`ABA-SANDBOX-CREDENTIALS.md`** - Sandbox setup guide
- **`PAYMENT-MODULE-COMPLETE.md`** - Complete payment documentation
- **`src/backend/fines/khqr_gateway.py`** - Backend integration code

---

## 💡 Tips

### Generating QR Codes

If you need to generate a test QR:

1. Use online KHQR generator (if available)
2. Or create static QR linking to: `aba://pay?account=712832071`
3. Or get official QR from ABA Bank support

### Testing Without Real QR

You can test the full flow without actual QR scanning:
1. Generate bill reference in system
2. Manually enter payment reference
3. Officer verifies (simulating ABA confirmation)

---

**Last Updated:** 2026-07-23  
**For Issues:** Contact DigitalSupport@ababank.com  
**Status:** Sandbox ready, Production pending ⚠️
