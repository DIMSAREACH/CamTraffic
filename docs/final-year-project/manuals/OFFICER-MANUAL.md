# Traffic Officer Manual — CamTraffic

**Role:** Traffic Police  
**Portal:** http://localhost:5173 → **Officer** tab  
**Task:** 376

---

## 1. Login

1. Open the user portal.
2. Click **Officer** tab on login page.
3. Enter police email and password.
4. Dashboard shows enforcement KPIs for your jurisdiction.

---

## 2. Daily workflow

```
Detection → Review violation → Issue fine → Handle appeals
```

---

## 3. AI detection

**Navigation:** AI Detection

### Upload mode

1. Click **Upload** or drag image.
2. Wait for processing (sign + vehicle + plate).
3. Review:
   - Detected sign class (Khmer/English label)
   - Confidence score
   - Vehicle bounding box
   - License plate OCR result
4. If violation detected → confirm or edit before saving.

### Webcam mode

1. Click **Webcam** → allow camera permission.
2. Point at traffic scene or sign.
3. Click **Capture** → same pipeline as upload.

### Settings

| Option | Effect |
|--------|--------|
| Auto-create violation | Creates violation record when rule matches |
| Show bounding boxes | Overlay on result image |
| Khmer TTS | Play sign name in Khmer |

---

## 4. Violations

**Navigation:** Violations

| Status | Meaning |
|--------|---------|
| pending | Awaiting officer review |
| confirmed | Accepted violation |
| dismissed | Rejected / no action |

**Actions:**

- Filter by date, sign type, plate.
- Open detail → view evidence image.
- Confirm → proceed to fine issuance.
- Dismiss → add reason.

---

## 5. Issuing fines

**Navigation:** Fines → **Issue Fine**

1. Search driver by license number or plate (`lookup` API).
2. Select linked violation (if any).
3. Enter amount (default from violation rule).
4. Set due date.
5. Submit → driver receives notification.

**PDF receipt:** Fine detail → **Download PDF**

---

## 6. Driver lookup

From Fines page:

- Enter license number in search field.
- System returns driver name, vehicles, outstanding fines.

---

## 7. Appeals

**Navigation:** Appeals

| Action | Steps |
|--------|-------|
| Review pending | Open appeal → read driver reason |
| Approve | Select dismiss or reduce amount → add notes |
| Reject | Add rejection reason |
| Notify | System auto-notifies driver |

---

## 8. Evidence archive

**Navigation:** Evidence Archive (or Dashboard → Evidence)

- Browse violation evidence images by date.
- Filter by camera, sign type, plate.
- Use for court or audit reference.

---

## 8. Reports

**Navigation:** Reports

- View monthly enforcement summary.
- Export PDF for station records.
- Excel export via dashboard API.

---

## 9. Notifications

Bell icon in header:

- New appeals assigned
- Detection alerts
- System announcements

Mark read individually or **Mark all read**.

---

## 10. Profile

**Navigation:** Profile

- Update name, phone, profile photo.
- Change password.
- View login history.

---

## 11. Tips for defense demo

1. Use pre-loaded test images from `ai/test_samples/` if available.
2. Ensure driver account exists with matching license for fine flow.
3. Run detection with **Stop Sign** or **No Entry** sample for clear violation.
4. Show appeal flow end-to-end in second browser (driver login).

Demo script: `docs/final-year-project/DEMO-SCRIPT.md`
