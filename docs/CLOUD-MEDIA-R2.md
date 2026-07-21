# Free cloud media — Cloudflare R2

CamTraffic can store uploads (sign images, evidence, profiles) on **Cloudflare R2** so files survive Render redeploys. R2’s free tier is enough for a thesis demo (10 GB storage, no egress fees).

## 1. Create a free R2 bucket

1. Sign up at [Cloudflare](https://dash.cloudflare.com/) (free).
2. **R2** → **Create bucket** → name e.g. `camtraffic-media`.
3. Open the bucket → **Settings** → **Public access** → **Allow Access** → copy the `*.r2.dev` public URL host (e.g. `pub-abc123.r2.dev`).
4. **R2** → **Manage R2 API Tokens** → create a token with **Object Read & Write** on that bucket. Copy:
   - Access Key ID  
   - Secret Access Key  
   - Account ID (from the R2 overview URL / sidebar)

## 2. Render / `.env` variables

```env
USE_S3_MEDIA=True
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_STORAGE_BUCKET_NAME=camtraffic-media
AWS_S3_REGION_NAME=auto
AWS_S3_ENDPOINT_URL=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
AWS_S3_CUSTOM_DOMAIN=pub-YOUR_ID.r2.dev
AWS_LOCATION=media
```

`SERVE_MEDIA` is forced **off** when `USE_S3_MEDIA=True` (API no longer serves local disk).

Redeploy the API after saving env vars. New uploads go to R2 and API responses return full `https://pub-….r2.dev/media/...` URLs.

## 3. Push existing local files (optional)

From a machine that has the files and the same R2 credentials:

```bash
cd backend
pip install -r requirements.txt
# set USE_S3_MEDIA + AWS_* in .env, then:
python manage.py sync_media_to_s3
```

Or re-sync catalog signs after enabling R2 (uploads land in the bucket).

## 4. Local development

Leave `USE_S3_MEDIA=False` (default) to keep using `backend/media/` on disk.

If `USE_S3_MEDIA=True` locally:

- Django still serves existing files from `backend/media/` at `/media/` (Vite proxies this).
- New uploads go to R2; API returns R2 URLs when the file is not on disk.
- Live camera demo paths (`/demo-cameras/...`) are read from `frontend-*/public/`.
- Browser `fetch` / canvas use of R2 images goes through `GET /api/media/proxy/?url=…` (avoids CORS). The SPA must not set `crossOrigin="anonymous"` on bare `*.r2.dev` URLs.

To push local catalog images into R2: `python manage.py sync_media_to_s3`.

## 5. Optional: allow direct browser CORS on R2

Not required for CamTraffic (proxy path above), but if you want `<img crossOrigin>` to hit R2 directly, open the bucket → **Settings** → **CORS policy**:

```json
[
  {
    "AllowedOrigins": [
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://localhost:5173",
      "http://localhost:5174",
      "https://camtraffic-admin.onrender.com",
      "https://camtraffic-user.onrender.com"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Notes

- Do **not** commit real R2 keys; paste them only in Render Environment / local `.env`.
- AWS S3 works with the same variables (omit `AWS_S3_ENDPOINT_URL` or set the regional endpoint; set `AWS_S3_CUSTOM_DOMAIN` to your CloudFront / public bucket host if needed).
