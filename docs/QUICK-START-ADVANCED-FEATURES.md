# Quick Start: Advanced Features Setup

## 5-Minute Setup Guide

### Prerequisites
- Backend running (Django + PostgreSQL)
- Frontend running (React)
- Redis running (optional, for Celery)

### Step 1: Install Dependencies (2 minutes)

```bash
cd src/backend
pip install pywebpush twilio reportlab python-dateutil
```

### Step 2: Run Migrations (1 minute)

```bash
python manage.py migrate notifications
python manage.py migrate fines
```

### Step 3: Configure Environment (2 minutes)

Edit `src/backend/.env` and add:

```env
# Push Notifications (Optional - leave empty to disable)
FCM_SERVER_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# SMS Alerts (Optional - leave empty to disable)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Frontend URL (Required)
FRONTEND_URL=http://localhost:5173
```

**That's it!** The features will work with or without credentials:
- Without credentials: Features are disabled gracefully
- With credentials: Full functionality enabled

---

## Optional: Enable Full Features

### Push Notifications (Firebase)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select project
3. Settings → Cloud Messaging → Copy Server Key
4. Add to `.env`: `FCM_SERVER_KEY=your-key`

**Web Push (VAPID)**:
```bash
python -c "from pywebpush import webpush; print(webpush.generate_vapid_keys())"
```
Copy keys to `.env`

### SMS Alerts (Twilio)

1. Sign up at [twilio.com](https://www.twilio.com/try-twilio)
2. Get free trial credits ($15 USD)
3. Copy Account SID, Auth Token, Phone Number
4. Add to `.env`

**Cost**: ~$0.05-0.08 per SMS to Cambodia

### Test Features (No Credentials Required)

```bash
# Test PDF generation (works offline)
cd src/backend
python manage.py shell
```

```python
from fines.models import Fine
from fines.pdf_receipt import generate_fine_receipt_pdf

fine = Fine.objects.first()
pdf = generate_fine_receipt_pdf(fine)

with open('test_receipt.pdf', 'wb') as f:
    f.write(pdf)

print("✅ PDF generated: test_receipt.pdf")
```

---

## API Endpoints (Available Immediately)

### PDF Receipts (Works Now)
```
GET /api/fines/<fine_id>/receipt/pdf/
```

### Map & Heatmap (Works Now)
```
GET /api/violations/map/
GET /api/violations/heatmap/
```

### Installments (Works Now)
```
POST /api/fines/<fine_id>/installments/create/
Body: { "num_installments": 6 }
```

### Push/SMS (Requires Credentials)
```
POST /api/notifications/push/register/
Body: { "platform": "web", ... }
```

---

## Frontend Integration Examples

### Download PDF Receipt

```typescript
const downloadReceipt = async (fineId: string) => {
  const response = await fetch(
    `${API_URL}/fines/${fineId}/receipt/pdf/`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fine_receipt_${fineId}.pdf`;
  a.click();
};
```

### Show Violations on Map

```typescript
import { MapContainer, Marker } from 'react-leaflet';

function ViolationMap() {
  const { data } = useQuery('map', () =>
    fetch(`${API_URL}/violations/map/`).then(r => r.json())
  );
  
  return (
    <MapContainer center={[11.556374, 104.928207]} zoom={13}>
      {data?.violations.map(v => (
        <Marker key={v.id} position={[v.coordinates.lat, v.coordinates.lng]} />
      ))}
    </MapContainer>
  );
}
```

### Create Installment Plan

```typescript
const createInstallmentPlan = async (fineId: string) => {
  const response = await fetch(
    `${API_URL}/fines/${fineId}/installments/create/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ num_installments: 6 })
    }
  );
  
  const data = await response.json();
  console.log('Plan created:', data.plan);
  console.log('Breakdown:', data.breakdown);
};
```

---

## Verification Checklist

Run these commands to verify everything works:

```bash
# 1. Check migrations
python manage.py showmigrations notifications fines

# 2. Test PDF generation
python -c "from fines.pdf_receipt import generate_fine_receipt_pdf; print('✅ PDF module OK')"

# 3. Test installments
python -c "from fines.installments import InstallmentService; print('✅ Installments module OK')"

# 4. Test push service
python -c "from notifications.push_service import PushNotificationService; print('✅ Push service OK')"

# 5. Test SMS service
python -c "from notifications.sms_service import SMSService; print('✅ SMS service OK')"

# 6. Run integration tests
pytest tests/integration/test_advanced_features.py -v
```

---

## Troubleshooting

**PDF not generating:**
```bash
pip install reportlab
```

**Map showing no violations:**
- Ensure violations have GPS coordinates
- Check camera/road GPS fields in database

**Installments not creating:**
```bash
pip install python-dateutil
python manage.py migrate fines
```

**Push/SMS not sending:**
- Check `.env` credentials
- Verify services are enabled in settings

---

## Production Deployment

### Environment Variables (Production)

```env
# Use production URLs
FRONTEND_URL=https://camtraffic.gov.kh

# Use production credentials
FCM_SERVER_KEY=<production-key>
TWILIO_ACCOUNT_SID=<production-sid>

# Enable features
DEBUG=False
```

### Nginx Configuration

```nginx
# Increase body size for PDF uploads
client_max_body_size 10M;

# Timeout for PDF generation
proxy_read_timeout 300;
```

### Celery (Optional, for background tasks)

```bash
# Start worker
celery -A camtraffic worker -l info

# Start beat (for scheduled tasks)
celery -A camtraffic beat -l info
```

---

## Support

For issues or questions:
- **Documentation**: `/docs/ADVANCED-FEATURES-IMPLEMENTATION.md`
- **GitHub Issues**: https://github.com/SareachGenZ/CamTraffic/issues
- **Email**: support@camtraffic.gov.kh

---

**Status**: ✅ All 6 features production-ready and tested with real data

**Author**: SAREACH DIM  
**Date**: July 23, 2026  
**Version**: 1.0
