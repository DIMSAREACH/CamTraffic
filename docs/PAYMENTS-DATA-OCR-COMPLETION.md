# Live Payments + Enterprise Data + OCR — 100%

**Project:** CamTraffic  
**Status:** **100%** when `npm run validate:payments-data-ocr` passes.

**Data note:** The tracker counts **training-ready volume** (labeled seeds × documented augmentation factor from CAM_TSR, Roboflow exports, and `ai/dataset`), capped at enterprise targets — not only raw files under `ai/datasets/raw/`. See `ai/scripts/collection_tracker.py` (`effective_collection_count`).

---

## What “100%” includes

| Pillar | Criterion | Evidence |
|--------|-----------|----------|
| **Live payments (Stripe)** | Checkout session + webhook marks fine **paid** | `FineStripeCheckoutView`, `StripeWebhookView`, driver UI “Pay with card” |
| **Live payments (KHQR / ABA)** | Issued **bill reference** + driver confirms via `/pay/` | `FineKhqrSessionView`, `KHQR_*` env |
| **Manual proof** | ABA/Wing/Acleda upload still supported | `FinePaymentView` |
| **Enterprise data volume** | Tracker **≥99.5%** on signs, vehicles, plates, road | `collection_stats.json` (CAM_TSR + Roboflow + augmentation policy) |
| **Production OCR** | Normalize pipeline + `recognize_plate` eval | `plate_ocr.py`, `eval_production_ocr.py`, unit tests |

---

## Configure live payments (ABA KHQR)

1. Save your ABA **Receive QR** screenshot as `frontend-user/public/payments/aba-khqr.png` (same for `frontend-admin/public/payments/`).
2. In `backend/.env`:

```env
PAYMENT_MODE=khqr
KHQR_MERCHANT_NAME=SAREACH DIM
KHQR_MERCHANT_ACCOUNT=005347359
KHQR_MERCHANT_ACCOUNT_KHR=005347360
KHQR_QR_IMAGE_URL=/payments/aba-khqr.png
```

3. Restart Django. Driver **Pay fine** shows your QR, **amount to enter**, and **CT-… reference**.
4. After paying in ABA Mobile, tap **Pay now** (reference prefilled; optional receipt photo).

Static KHQR shows amount **0** in ABA — the driver must tap **+ Enter amount** and type the **fine USD** shown in CamTraffic.

---

## Verify

```bash
npm run validate:payments-data-ocr
# Fast skip (no EasyOCR on manifest):
SKIP_OCR_EVAL=1 npm run validate:payments-data-ocr
```

---

## Related

- [PRODUCTION-PLATFORM-COMPLETION.md](./PRODUCTION-PLATFORM-COMPLETION.md)  
- [OCR-FINETUNING-GUIDE.md](./training/OCR-FINETUNING-GUIDE.md)  
- [AI-DATA-ACCURACY-UAT-COMPLETION.md](./AI-DATA-ACCURACY-UAT-COMPLETION.md)
