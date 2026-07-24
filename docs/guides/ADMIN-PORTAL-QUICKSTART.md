# 🚀 CamTraffic Admin Portal - Quick Start Guide

## Access the Admin Portal

**URL**: http://localhost:5174

### Default Admin Credentials
```
Email: admin@camtraffic.store
Password: [Your configured admin password]
```

## Current System Status

### ✅ Backend Server
- **Status**: Running
- **URL**: http://127.0.0.1:8000
- **Port**: 8000

### ✅ Frontend Admin
- **Status**: Running  
- **URL**: http://127.0.0.1:5174
- **Port**: 5174

### ✅ Database (PostgreSQL)
- **Status**: Connected
- **Database**: camtraffic_db
- **Real Data**: 
  - 56 Users (admins, officers, drivers)
  - 412 Traffic Signs
  - 90 AI Detection Logs
  - 6 Fines
  - 2 Violations
  - 9 Roads
  - 2 Vehicles

## Available Admin Features

### 1. Dashboard
- View real-time statistics
- See monthly charts and trends
- Monitor system performance

### 2. User Management
- Create/edit/delete users
- Manage roles (Admin, Police, Driver)
- Reset passwords
- Toggle account status

### 3. Officers & Stations
- Manage police officers
- Create/edit police stations
- Assign officers to stations

### 4. Drivers & KYC
- Manage driver profiles
- Review KYC documents
- Approve/reject verifications

### 5. Vehicles
- Register new vehicles
- Manage vehicle ownership
- Track vehicle details

### 6. Fines Management
- View all fines
- Process payments
- Verify payment proofs
- Export to PDF

### 7. Violations
- Review AI-detected violations
- Confirm or reject violations
- Issue fines directly

### 8. Camera Management
- Monitor live cameras
- Add/edit camera locations
- Test camera feeds

### 9. AI Detection
- Upload images for detection
- Process videos
- View detection logs
- Test live webcam

### 10. Traffic Signs
- Browse sign catalog (412 signs)
- Add/edit traffic signs
- Manage sign images

### 11. Reports & Analytics
- Generate PDF reports
- Export Excel files
- View analytics dashboards

### 12. System Settings
- Configure AI settings
- Manage payment methods
- System preferences

## Quick Test Scenarios

### Test 1: Create New User
1. Go to **Users** page
2. Click **"+ Add User"**
3. Fill in details
4. Click **Save**
5. ✅ User appears in list

### Test 2: AI Detection
1. Go to **AI Detection** → **New Detection**
2. Upload a traffic sign image
3. Wait for processing
4. ✅ See detected sign with confidence score

### Test 3: Create Fine
1. Go to **Fines** page
2. Click **"+ Create Fine"**
3. Select driver and fill details
4. Upload evidence
5. Click **Save**
6. ✅ Fine appears in list

### Test 4: Generate Report
1. Go to **Reports** page
2. Click **"Generate PDF Report"**
3. ✅ PDF downloads with real data

## API Testing

### Test Dashboard API
```bash
curl http://127.0.0.1:8000/api/v1/admin/dashboard/
```

### Test Users API
```bash
curl http://127.0.0.1:8000/api/v1/admin/users/
```

### Test Traffic Signs API
```bash
curl http://127.0.0.1:8000/api/v1/signs/
```

## Environment Check

### Check Backend
```bash
cd src/backend
python manage.py check
```

### Check Database Connection
```bash
cd src/backend  
python manage.py dbshell
\dt  # List all tables
\q   # Quit
```

### Check Frontend
```bash
cd src/web/admin
npm run dev
```

## Troubleshooting

### Backend Not Running
```bash
cd src/backend
python manage.py runserver 0.0.0.0:8000
```

### Frontend Not Running
```bash
cd src/web/admin
npm install
npm run dev
```

### Database Issues
```bash
cd src/backend
python manage.py migrate
```

### AI Model Not Loading
- Check `AI_MODEL_PATH` in `.env`
- Verify model file exists at: `ai/weights/best_b2_named.pt`

## Production Deployment Notes

### Environment Variables to Update
```bash
# Security
DEBUG=False
SECRET_KEY=[Generate new secret]

# Database
DB_HOST=[Production DB host]
DB_PASSWORD=[Strong password]

# CORS
CORS_ALLOWED_ORIGINS=[Production frontend URL]

# Cloud Storage
AWS_ACCESS_KEY_ID=[Your R2 key]
AWS_SECRET_ACCESS_KEY=[Your R2 secret]
```

### Deployment Checklist
- [ ] Set DEBUG=False
- [ ] Update SECRET_KEY
- [ ] Configure production database
- [ ] Set up HTTPS
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up SSL certificates
- [ ] Configure backup schedule
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Test all API endpoints
- [ ] Load test with production data

## Support

### Documentation
- Full API docs available at admin login
- Check `docs/` folder for detailed documentation
- See `ADMIN-PORTAL-COMPLETE.md` for complete module list

### Common Issues
1. **CORS errors**: Add frontend URL to `CORS_ALLOWED_ORIGINS`
2. **401 Unauthorized**: Login and get fresh JWT token
3. **AI detection slow**: Check GPU availability and model size
4. **Image upload fails**: Check `MEDIA_ROOT` permissions

---

**Last Updated**: July 23, 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅
