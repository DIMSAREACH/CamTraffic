# Driver Manual — CamTraffic

**Role:** Driver / Vehicle Owner  
**Portal:** http://localhost:5173 → **Driver** tab  
**Task:** 377

---

## 1. Registration & login

### New driver

1. Open user portal → **Driver** tab.
2. Click **Register**.
3. Fill: full name, email, password, license number, phone.
4. Verify email (check inbox for verification link).
5. Log in with email and password.

### Returning driver

1. **Driver** tab → email + password → **Login**.
2. Dashboard shows your violations, fines, and vehicles summary.

---

## 2. Dashboard

| Card | Information |
|------|-------------|
| Outstanding fines | Total amount due |
| Recent violations | Last 5 records |
| Vehicles | Registered plate count |
| Notifications | Unread count |

---

## 3. Violations

**Navigation:** Violations

View violations linked to your license:

| Field | Description |
|-------|-------------|
| Date & time | When detected |
| Sign type | Detected traffic sign |
| Location | Camera / road if available |
| Status | pending, confirmed, dismissed |
| Evidence | Thumbnail — click to enlarge |

You cannot edit violations — submit an **Appeal** if incorrect.

---

## 4. Fines

**Navigation:** Fines

### Manage tab

- List all fines with amount, status, due date.
- Status: `pending`, `paid`, `overdue`, `appealed`, `dismissed`.
- Click fine → view detail + linked violation.

### Payments tab

- Payment history with date and reference.
- Download PDF receipt per fine.

### Pay a fine

1. Open unpaid fine.
2. Click **Pay Now** (demo records payment — no real gateway in thesis build).
3. Status changes to **paid**; receipt available.

---

## 5. Appeals

**Navigation:** Appeals

### Submit appeal

1. Click **New Appeal**.
2. Select fine to contest.
3. Write reason (required — e.g., wrong plate, sign not visible).
4. Submit → status **pending**.

### Track appeal

| Status | Meaning |
|--------|---------|
| pending | Awaiting officer review |
| approved | Fine reduced or dismissed |
| rejected | Original fine stands |

You receive a notification when decided.

---

## 6. Vehicles

**Navigation:** Vehicles

| Action | Steps |
|--------|-------|
| Add vehicle | Plate number, type (car/motorcycle/truck), color |
| Edit | Update details |
| Remove | Delete if sold — ensure no active fines |

Plate must match registration for automatic violation linking.

---

## 7. Notifications

Bell icon (top right):

- New fine issued
- Appeal decision
- Payment confirmation
- System messages

**Mark all read** or click individual notification.

---

## 8. Profile & settings

### Profile

- Update name, phone, address.
- Upload profile photo (crop dialog).
- View license number (read-only after verification).

### Settings

- Language: **English** / **ខ្មែរ** (Khmer)
- Email notification preferences
- Change password
- Deactivate account (contact admin to reactivate)

---

## 9. Sign chatbot

**Navigation:** Traffic Signs → **Ask about signs**

Ask questions about Cambodian traffic signs in Khmer or English. Useful for learning sign meanings before driving.

---

## 10. Privacy & data

- Your data is scoped to your account — you see only your violations and fines.
- Evidence images are stored securely; access limited to you and authorized officers.
- Account deletion: Profile → Delete account (requires confirmation).

---

## 11. Getting help

| Resource | Location |
|----------|----------|
| User manual overview | `docs/USER-MANUAL.md` |
| Installation (self-host) | `docs/INSTALLATION-GUIDE.md` |
| Contact admin | Use notification or station contact from fine PDF |
