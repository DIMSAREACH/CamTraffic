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

## Notes

- Do **not** commit real R2 keys; paste them only in Render Environment / local `.env`.
- AWS S3 works with the same variables (omit `AWS_S3_ENDPOINT_URL` or set the regional endpoint; set `AWS_S3_CUSTOM_DOMAIN` to your CloudFront / public bucket host if needed).
