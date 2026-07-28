# Debug Configuration Guide

**Date:** July 26, 2026 12:05 PM  
**Purpose:** Configure debug settings for development and production

---

## 🔍 CURRENT DEBUG STATUS

### Backend Debug Settings: ✅ PROPERLY CONFIGURED

```env
DEBUG=True  # ✅ Correct for development
SECRET_KEY=change-me-to-a-long-random-secret-key  # ⚠️ Change for production
ALLOWED_HOSTS=localhost,127.0.0.1  # ✅ Correct for development
```

### Frontend Status: ✅ WORKING

- No critical console errors
- Backend connection stable
- Hot Module Replacement (HMR) working
- Proxy configured correctly

---

## 🛠️ ISSUES FOUND & FIXED

### Issue 1: Backend Connection Errors ✅ RESOLVED

**Error Seen:**
```
Backend not reachable at http://127.0.0.1:8000 (read ECONNRESET)
http proxy error: /api/ai/logs/?page_size=200
Error: read ECONNRESET
```

**Cause:** Backend was restarting when frontend tried to connect

**Status:** ✅ Backend is now running stable (see terminal 2)

**Verification:**
```powershell
# Check backend is running
curl http://127.0.0.1:8000/api/
```

### Issue 2: AI Model Loading Warnings ⚠️ INFORMATIONAL ONLY

**Warning Seen:**
```
WARNING 'half' is deprecated and will be removed in the future. Use 'quantize' instead.
```

**Status:** ⚠️ Informational - not critical
**Action:** Can be ignored for now, models work fine
**Future Fix:** Update YOLO when new version available

---

## 📋 DEBUG CONFIGURATION CHECKLIST

### For Development (Current Setup):

- [x] `DEBUG=True` in backend `.env`
- [x] Backend server running: `python manage.py runserver`
- [x] Frontend servers running: `npm run dev` (both portals)
- [x] Console logs enabled for debugging
- [x] Hot reload working
- [x] Detailed error messages shown
- [x] SQL queries logged (if needed)

### For Production Deployment:

**⚠️ IMPORTANT: Change these before deploying to production!**

#### Backend `.env` Changes:
```env
# FROM (Development):
DEBUG=True
SECRET_KEY=change-me-to-a-long-random-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

# TO (Production):
DEBUG=False
SECRET_KEY=<generate-strong-random-key-minimum-50-chars>
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
```

#### Generate Production Secret Key:
```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

Or:
```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### Additional Production Settings:
```env
# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000

# HTTPS
SECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,https

# Static files
USE_S3_MEDIA=True  # Use S3/R2 for media files
```

---

## 🔧 CONFIGURATION BY ENVIRONMENT

### Local Development (Current):

```env
# .env (Development)
DEBUG=True
SECRET_KEY=change-me-to-a-long-random-secret-key  # OK for dev
ALLOWED_HOSTS=localhost,127.0.0.1
USE_SQLITE=False  # Using PostgreSQL
USE_REDIS=False   # Not needed for dev
USE_S3_MEDIA=False  # Use local media

# AI Settings (Optimized for development)
AI_LIVE_IMGSZ=320
AI_VIDEO_MAX_FRAMES=12
AI_VEHICLE_CONFIDENCE_THRESHOLD=0.30
AI_SIGN_CONFIDENCE_THRESHOLD=0.40
AI_PLATE_CONFIDENCE_THRESHOLD=0.40
```

**Start Commands:**
```powershell
# Terminal 1: Backend
cd src/backend
python manage.py runserver

# Terminal 2: Admin Frontend
cd src/web/admin
npm run dev

# Terminal 3: User Frontend
cd src/web/user
npm run dev
```

### Staging Environment:

```env
# .env (Staging)
DEBUG=True  # Can keep True for staging to see detailed errors
SECRET_KEY=<staging-secret-key>
ALLOWED_HOSTS=staging.camtraffic.com
USE_SQLITE=False
USE_REDIS=True
USE_S3_MEDIA=True

# Staging URLs
CORS_ALLOWED_ORIGINS=https://staging.camtraffic.com
FRONTEND_PASSWORD_RESET_URL=https://staging.camtraffic.com/reset-password
```

### Production Environment:

```env
# .env (Production)
DEBUG=False  # ⚠️ MUST be False!
SECRET_KEY=<production-secret-key-very-long-and-random>
ALLOWED_HOSTS=camtraffic.com,www.camtraffic.com
USE_SQLITE=False
USE_REDIS=True
USE_S3_MEDIA=True

# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Production URLs
CORS_ALLOWED_ORIGINS=https://camtraffic.com,https://www.camtraffic.com
FRONTEND_PASSWORD_RESET_URL=https://camtraffic.com/reset-password
```

---

## 🐛 DEBUG TOOLS & COMMANDS

### Backend Debugging:

#### 1. Check System Status:
```powershell
cd src/backend
python manage.py check
python manage.py check --deploy  # Production readiness
```

#### 2. View Logs:
```powershell
# Live tail
Get-Content logs\camtraffic.log -Wait -Tail 50

# Search for errors
Get-Content logs\camtraffic.log | Select-String "ERROR|Exception"
```

#### 3. Test Database Connection:
```powershell
python manage.py dbshell
# Then in psql:
\l  # List databases
\dt  # List tables
\q  # Quit
```

#### 4. Django Shell:
```powershell
python manage.py shell
```
```python
# Test AI models
from ai_detection.warmup import warmup_models
warmup_models()

# Test database
from users.models import User
User.objects.count()
```

#### 5. Check Migrations:
```powershell
python manage.py showmigrations
python manage.py migrate --plan
```

### Frontend Debugging:

#### 1. Check for TypeScript Errors:
```powershell
cd src/web/admin
npm run build  # Will show any TS errors
```

#### 2. Check Dependencies:
```powershell
npm list --depth=0
npm outdated
```

#### 3. Clear Cache:
```powershell
# NPM cache
npm cache clean --force

# Browser cache
# Press Ctrl+Shift+Delete in browser
```

#### 4. Rebuild:
```powershell
# Remove and reinstall
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install
```

### Network Debugging:

#### 1. Test Backend API:
```powershell
# Test endpoint
curl http://127.0.0.1:8000/api/

# Test AI detection ready
curl http://127.0.0.1:8000/api/ai/ready/

# Test with authentication
$token = "your-jwt-token"
curl -H "Authorization: Bearer $token" http://127.0.0.1:8000/api/users/
```

#### 2. Check Ports:
```powershell
# Check if port is in use
netstat -ano | findstr :8000
netstat -ano | findstr :5173
netstat -ano | findstr :5174
```

#### 3. Check Proxy:
- Frontend logs show proxy status
- Look for "Backend not reachable" messages
- Verify `apiProxy.ts` timeout settings

---

## 🎯 COMMON DEBUG SCENARIOS

### Scenario 1: "502 Bad Gateway" on AI Detection

**Symptoms:**
- AI detection returns 502 error
- Frontend shows "Backend not reachable"

**Debug Steps:**
1. Check if backend is running:
   ```powershell
   netstat -ano | findstr :8000
   ```

2. Check if AI models loaded:
   ```powershell
   # Look for "AI models warm" in backend logs
   Get-Content src\backend\logs\camtraffic.log | Select-String "AI models"
   ```

3. Test AI endpoint directly:
   ```powershell
   curl http://127.0.0.1:8000/api/ai/ready/
   ```

**Solutions:**
- Restart backend server
- Wait for AI models to load (50-60 seconds)
- Check `.env` AI settings
- Verify model files exist in `ai/weights/`

### Scenario 2: Frontend Not Connecting to Backend

**Symptoms:**
- "ECONNRESET" errors
- API calls fail
- Proxy errors in terminal

**Debug Steps:**
1. Verify backend is running on port 8000
2. Check `apiProxy.ts` configuration
3. Check CORS settings in backend `.env`
4. Test with curl

**Solutions:**
- Restart both frontend and backend
- Verify `CORS_ALLOWED_ORIGINS` includes frontend URLs
- Check firewall/antivirus not blocking connections
- Try different port if 8000 is in use

### Scenario 3: Database Connection Errors

**Symptoms:**
- "OperationalError: could not connect to server"
- "connection refused"
- "authentication failed"

**Debug Steps:**
1. Check PostgreSQL is running:
   ```powershell
   Get-Service -Name postgresql*
   ```

2. Test connection:
   ```powershell
   psql -U postgres -d camtraffic_db
   ```

3. Verify `.env` database settings

**Solutions:**
- Start PostgreSQL service
- Verify DB credentials in `.env`
- Check DB_HOST (localhost vs 127.0.0.1)
- Create database if not exists:
  ```sql
  CREATE DATABASE camtraffic_db;
  ```

### Scenario 4: AI Models Not Loading

**Symptoms:**
- "Model file not found"
- Detection fails immediately
- Empty bounding boxes

**Debug Steps:**
1. Check model files exist:
   ```powershell
   dir ai\weights\*.pt
   ```

2. Verify paths in `.env`:
   ```env
   AI_SIGN_MODEL=ai/weights/best_b2_named.pt
   AI_VEHICLE_MODEL=ai/weights/best_cambodia_vehicles.pt
   AI_PLATE_MODEL=ai/weights/best_cambodia_plates.pt
   ```

3. Check file permissions

**Solutions:**
- Download model files if missing
- Verify file paths are correct
- Check disk space (models are large)
- Ensure paths use forward slashes

---

## 📊 DEBUG LOGGING LEVELS

### Backend Logging Configuration:

In `settings.py`, logging is configured for different levels:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',  # Change to 'INFO' or 'WARNING' for production
            'class': 'logging.FileHandler',
            'filename': 'logs/camtraffic.log',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
        },
        'ai_detection': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',  # Detailed AI logs
        },
    },
}
```

### Log Levels:
- **DEBUG:** Detailed information for diagnosing problems
- **INFO:** Confirmation that things are working as expected
- **WARNING:** Indication of something unexpected
- **ERROR:** Serious problem, but application still works
- **CRITICAL:** Very serious error, application may not continue

### Recommended Levels by Environment:

| Environment | Django | AI Detection | Custom Apps |
|-------------|--------|--------------|-------------|
| Development | DEBUG  | DEBUG        | DEBUG       |
| Staging     | INFO   | DEBUG        | INFO        |
| Production  | WARNING| INFO         | WARNING     |

---

## ✅ CURRENT SYSTEM STATUS

### Backend: ✅ RUNNING SMOOTHLY

```
System check identified no issues (0 silenced).
Django version 6.0.7, using settings 'camtraffic.settings'
Starting development server at http://127.0.0.1:8000/

AI models loaded successfully:
✅ Sign YOLO: 26 classes
✅ Vehicle YOLO: Cambodia model
✅ Plate detector: Cambodia plates
✅ Catalog visual index: 247 sign images

Status: OPERATIONAL
```

### Frontend: ✅ RUNNING SMOOTHLY

```
Admin Portal: http://localhost:5173
User Portal: http://localhost:5174

Hot Module Replacement: ✅ Working
Proxy Configuration: ✅ Connected
Console Errors: ✅ None critical
```

### Issues: ✅ RESOLVED

1. ✅ Backend connection stable
2. ✅ AI models loaded
3. ✅ No critical errors
4. ✅ HMR working properly

---

## 🎯 PRE-PRODUCTION DEBUG CHECKLIST

Before deploying to production:

### Security:
- [ ] Change `DEBUG=False`
- [ ] Generate new `SECRET_KEY`
- [ ] Update `ALLOWED_HOSTS`
- [ ] Enable HTTPS settings
- [ ] Update CORS origins

### Performance:
- [ ] Set log level to WARNING/INFO
- [ ] Enable Redis caching
- [ ] Configure CDN for static files
- [ ] Optimize database indexes
- [ ] Enable gzip compression

### Testing:
- [ ] Run full test suite
- [ ] Test with `DEBUG=False` locally
- [ ] Performance testing
- [ ] Security audit
- [ ] Load testing

### Monitoring:
- [ ] Set up error tracking (Sentry)
- [ ] Configure performance monitoring
- [ ] Set up log aggregation
- [ ] Create health check endpoints
- [ ] Set up uptime monitoring

---

## 📞 DEBUG SUPPORT

### Quick Fixes:

**"Everything broke after git pull":**
```powershell
# Backend
cd src/backend
pip install -r requirements.txt
python manage.py migrate

# Frontend
cd src/web/admin
npm install
cd ../user
npm install
```

**"Port already in use":**
```powershell
# Find and kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**"Can't connect to database":**
```powershell
# Restart PostgreSQL
Restart-Service postgresql-x64-15  # Adjust version number
```

**"AI models won't load":**
```powershell
# Re-download models or check paths
dir ai\weights\
# Verify in .env that paths are correct
```

---

## 🎉 SUMMARY

### Current Debug Status: ✅ EXCELLENT

- ✅ No critical errors
- ✅ All systems operational
- ✅ Development environment properly configured
- ✅ Ready for continued development

### Production Readiness: ⚠️ CONFIGURE BEFORE DEPLOYMENT

- ⚠️ Change `DEBUG=False`
- ⚠️ Generate new `SECRET_KEY`
- ⚠️ Update security settings
- ⚠️ Configure production URLs

### Next Steps:

1. **Continue Development:** System is ready for use ✅
2. **When Ready for Production:** Follow production checklist
3. **If Issues Occur:** Use debug commands above
4. **For Thesis Defense:** Current setup is perfect ✅

---

**Last Updated:** July 26, 2026 12:05 PM  
**Debug Status:** SYSTEM HEALTHY ✅  
**Action Required:** None for development, configure for production deployment
