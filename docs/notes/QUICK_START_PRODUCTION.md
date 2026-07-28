# 🚀 QUICK START - PRODUCTION DEPLOYMENT

**CamTraffic System v1.0.0 - Production Ready**

---

## ⚡ NEW FEATURES GUIDE

### 1. Bulk Violation Processing

**Approve Multiple Violations:**
```bash
POST /api/violations/bulk-approve/
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "violation_ids": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ],
  "officer_note": "Bulk approved after review"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "approved_count": 3,
    "message": "3 violation(s) approved"
  }
}
```

**Reject Multiple Violations:**
```bash
POST /api/violations/bulk-reject/
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "violation_ids": ["uuid-1", "uuid-2"],
  "officer_note": "Insufficient evidence"
}
```

**Frontend Integration:**
```typescript
// Example: Bulk approve from violations page
const handleBulkApprove = async (selectedIds: string[]) => {
  const response = await fetch('/api/violations/bulk-approve/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      violation_ids: selectedIds,
      officer_note: 'Reviewed and approved',
    }),
  });
  
  if (response.ok) {
    toast.success('Violations approved successfully');
    refetchViolations();
  }
};
```

---

### 2. Email Notifications

**Automatic Emails Sent:**
1. **Violation Created** → Driver receives notification immediately
2. **Fine Issued** → Driver receives payment instructions
3. **Payment Confirmed** → Driver receives receipt
4. **Payment Overdue** → Reminder sent automatically
5. **Appeal Status Changed** → Driver notified of decision

**Manual Email Trigger:**
```python
from notifications.email_service import EmailNotificationService

# Send violation notification
EmailNotificationService.send_violation_notification(violation)

# Send fine notification
EmailNotificationService.send_fine_notification(fine)

# Send payment confirmation
EmailNotificationService.send_payment_confirmation(fine)

# Send payment reminder
EmailNotificationService.send_payment_reminder(fine)

# Send appeal status update
EmailNotificationService.send_appeal_status_update(appeal, 'approved')
```

**Configuration (.env):**
```env
# Option 1: Resend (Recommended - https://resend.com)
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=CamTraffic <noreply@camtraffic.store>

# Option 2: SMTP (Gmail, SendGrid, etc.)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=CamTraffic <noreply@camtraffic.store>
```

**Test Emails:**
```bash
cd src/backend
python manage.py shell

from notifications.email_service import EmailNotificationService
from violations.models import TrafficViolation

violation = TrafficViolation.objects.first()
result = EmailNotificationService.send_violation_notification(violation)
print(f"Email sent: {result}")
```

---

### 3. Database Optimization

**Already Applied (16 Indexes):**
```sql
-- Violations
idx_violation_driver_date_v2
idx_violation_status_driver_v2
idx_violation_created_status
idx_violation_officer_status

-- Fines
idx_fine_status_driver
idx_fine_due_date_status

-- AI Detection
idx_detection_user_confidence
idx_detection_plate_created
idx_detection_review_status

-- Vehicles
idx_vehicle_owner_type_status
idx_vehicle_plate_trgm (fuzzy search)
idx_vehicle_driver_owner

-- Notifications
idx_notification_user_read_created

-- Users
idx_user_role_active_created

-- Drivers & Officers
idx_driver_kyc_status
idx_officer_station_status
```

**Verify Indexes:**
```bash
cd src/backend
python manage.py dbshell
```

```sql
-- List all indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check index usage
SELECT
    relname,
    idx_scan as index_scans,
    seq_scan as table_scans
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

### 4. Redis Caching

**Enable Redis:**
```env
# .env
USE_REDIS=True
REDIS_URL=redis://127.0.0.1:6379/0
```

**Start Redis (Docker):**
```bash
docker run -d -p 6379:6379 redis:alpine
```

**Start Redis (Windows):**
Download from: https://github.com/microsoftarchive/redis/releases

**Cached Endpoints:**
- ✅ `/api/violations/stats/` - Cached for 5 minutes
- Future: Dashboard stats, user profiles, report data

**Clear Cache Manually:**
```python
from django.core.cache import cache

# Clear specific cache
cache.delete('violation_stats_summary')

# Clear all cache
cache.clear()
```

**Monitor Cache:**
```bash
redis-cli
> KEYS camtraffic:*
> GET camtraffic:violation_stats_summary
> TTL camtraffic:violation_stats_summary
```

---

### 5. Security Features

**Rate Limiting (Active):**
```
Anonymous Users: 600/min (debug) or 60/min (production)
Authenticated Users: 1200/min burst, 50000/hour sustained
Login Attempts: 10 per 5 minutes per IP
```

**Security Headers (Enabled):**
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000 (production)
```

**Test Rate Limiting:**
```bash
# Try to login 11 times quickly
for i in {1..11}; do
  curl -X POST http://localhost:8000/api/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@test.com","password":"wrong"}'
  echo "\nAttempt $i"
done

# You should see "Rate limit exceeded" after 10 attempts
```

---

## 📊 PRODUCTION DEPLOYMENT

### Step 1: Environment Setup
```bash
# Copy production environment
cp src/backend/.env.example src/backend/.env.production

# Edit production values
nano src/backend/.env.production
```

### Step 2: Production .env
```env
DEBUG=False
SECRET_KEY=<generate-strong-secret-key>
ALLOWED_HOSTS=camtraffic.store,api.camtraffic.store

# PostgreSQL
USE_SQLITE=False
DB_NAME=camtraffic_production
DB_USER=camtraffic_user
DB_PASSWORD=<strong-password>
DB_HOST=localhost
DB_PORT=5432

# Redis
USE_REDIS=True
REDIS_URL=redis://localhost:6379/0

# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Email
RESEND_API_KEY=<your-resend-key>
RESEND_FROM_EMAIL=CamTraffic <noreply@camtraffic.store>

# Rate Limits (production values)
LOGIN_RATE_LIMIT_MAX=10
API_THROTTLE_ANON=60/min
API_THROTTLE_BURST=120/min
API_THROTTLE_SUSTAINED=2000/hour

# Cloud Media (Optional)
USE_S3_MEDIA=True
AWS_ACCESS_KEY_ID=<r2-access-key>
AWS_SECRET_ACCESS_KEY=<r2-secret-key>
AWS_STORAGE_BUCKET_NAME=camtraffic-media
AWS_S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
```

### Step 3: Database Setup
```bash
cd src/backend

# Run migrations
python manage.py migrate

# Create indexes
python manage.py optimize_database

# Analyze database
python manage.py dbshell -c "ANALYZE;"

# Create superuser
python manage.py createsuperuser
```

### Step 4: Static Files & Frontend
```bash
# Collect static files
python manage.py collectstatic --nohint

# Build frontends
cd ../../
npm run build
```

### Step 5: Start Services
```bash
# Start Redis
docker run -d -p 6379:6379 redis:alpine

# Start Gunicorn (production server)
cd src/backend
gunicorn camtraffic.wsgi:application --bind 0.0.0.0:8000 --workers 4

# Start Celery worker (background tasks)
celery -A camtraffic worker -l INFO

# Start Celery beat (scheduled tasks)
celery -A camtraffic beat -l INFO
```

### Step 6: Nginx Configuration
```nginx
server {
    listen 80;
    server_name camtraffic.store;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name camtraffic.store;

    ssl_certificate /etc/letsencrypt/live/camtraffic.store/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/camtraffic.store/privkey.pem;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_req zone=api_limit burst=200 nodelay;

    # API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Media files
    location /media/ {
        alias /var/www/camtraffic/backend/media/;
        expires 30d;
    }

    # Static files
    location /static/ {
        alias /var/www/camtraffic/backend/staticfiles/;
        expires 30d;
    }

    # Frontend
    location / {
        root /var/www/camtraffic/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### Step 7: SSL Certificate
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d camtraffic.store -d api.camtraffic.store

# Auto-renewal
sudo certbot renew --dry-run
```

---

## 🧪 TESTING

### Backend Tests
```bash
cd src/backend

# Run all tests
python manage.py test

# Run specific tests
python manage.py test violations.tests
python manage.py test fines.tests

# Check coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
```

### API Tests (Manual)
```bash
# Health check
curl http://localhost:8000/health/

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Get violations (with token)
curl http://localhost:8000/api/violations/ \
  -H "Authorization: Bearer <your-token>"

# Bulk approve
curl -X POST http://localhost:8000/api/violations/bulk-approve/ \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"violation_ids":["uuid1","uuid2"],"officer_note":"Approved"}'
```

### Load Testing
```bash
# Install locust
pip install locust

# Create locustfile.py
# Run: locust -f locustfile.py --host=http://localhost:8000
```

---

## 📈 MONITORING

### Performance Monitoring
```python
# Add to settings.py for production
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/camtraffic/django.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
        },
    },
}
```

### Database Monitoring
```sql
-- Slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Cache hit ratio (should be > 99%)
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Redis Monitoring
```bash
redis-cli INFO stats
redis-cli INFO memory
redis-cli SLOWLOG GET 10
```

---

## 🎉 SUCCESS METRICS

After deployment, you should see:

**Performance:**
- ✅ Violation list loads in <200ms
- ✅ Dashboard stats load in <100ms (cached)
- ✅ API response time <500ms (p95)

**Security:**
- ✅ No successful brute force attempts
- ✅ All security headers present
- ✅ Rate limits protecting endpoints

**Features:**
- ✅ Bulk operations save 90% of officer time
- ✅ Email notifications have >95% delivery rate
- ✅ Cache hit ratio >80%

---

## 📞 SUPPORT

**Documentation:**
- System Audit: `SYSTEM_AUDIT_REPORT.md`
- Completion Summary: `SYSTEM_COMPLETION_SUMMARY.md`
- Action Plan: `NEXT_STEPS_ACTION_PLAN.md`

**Troubleshooting:**
```bash
# Check logs
tail -f /var/log/camtraffic/django.log

# Check Redis
redis-cli PING

# Check database connections
python manage.py dbshell -c "SELECT count(*) FROM pg_stat_activity;"

# Restart services
systemctl restart camtraffic
systemctl restart redis
systemctl restart nginx
```

---

**Version:** 1.0.0 - Production Ready  
**Last Updated:** July 26, 2026  
**Status:** ✅ All systems operational
