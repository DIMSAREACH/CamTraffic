# Deployment Guide — CamTraffic

## Production stack

- **Frontend:** Vite build → Nginx / Vercel / Netlify
- **Backend:** Gunicorn + Django
- **Database:** PostgreSQL 14+
- **AI:** YOLOv8 weights on server or separate inference service

## Backend (Ubuntu)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt gunicorn

cp .env.example .env
# Set USE_SQLITE=False, PostgreSQL credentials, SECRET_KEY, DEBUG=False

python manage.py migrate
python manage.py collectstatic --noinput
python manage.py create_admin   # your admin email + password
python manage.py seed_data      # sample signs only (no demo users)

gunicorn camtraffic.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

## Frontend

```bash
npm install
# .env: VITE_API_URL=https://api.yourdomain.com/api
npm run build
# Serve dist/ with Nginx
```

### Nginx example

```nginx
server {
    listen 80;
    server_name camtraffic.example.com;
    root /var/www/camtraffic/dist;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        client_max_body_size 10M;
    }
    location /media/ {
        alias /var/www/camtraffic/backend/media/;
    }
}
```

## Environment checklist

| Variable | Production |
|----------|------------|
| `DEBUG` | `False` |
| `SECRET_KEY` | Strong random key |
| `USE_SQLITE` | `False` |
| `AI_USE_MOCK` | `False` (with trained model) |
| `CORS_ALLOWED_ORIGINS` | Your frontend URL |
| `ALLOWED_HOSTS` | Your domain |

## Docker (optional)

Use separate containers for `postgres`, `backend`, and `frontend` with docker-compose. Mount `media/` and `ai/weights/` as volumes.

## SSL

Use Certbot with Nginx for HTTPS. Update `CORS_ALLOWED_ORIGINS` to `https://` URLs.
