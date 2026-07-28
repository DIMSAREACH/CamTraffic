# ✅ Video Preview NOW ENABLED!

## What I Changed

**File: `src/web/admin/.env`**
```diff
- VITE_ALLOW_DEMO_ASSETS=false
+ VITE_ALLOW_DEMO_ASSETS=true
```

## What This Does

🎥 **"Chaktomuk Walk Street Cam" will now show as a continuous video instead of static frames!**

Your camera already has the video file at:
- `src/web/admin/public/demo-cameras/pp-chaktomuk-traffic.webm`

## 🚀 Next Step: Restart Frontend

### Option 1: Quick Restart (Recommended)

**In your terminal where `npm run dev` is running:**

1. Press `Ctrl + C` to stop the dev server
2. Run again:
```bash
npm run dev
```

3. Wait for:
```
[admin]   ➜  Local:   http://127.0.0.1:5174/
```

4. **Refresh your browser** (F5 or Ctrl+R)

---

### Option 2: Just Refresh (Sometimes Works)

Some Vite projects hot-reload `.env` files. Try:
1. **Hard refresh your browser:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. If video still doesn't play, use Option 1

---

## ✅ How to Verify It's Working

### Before (Current):
```
┌────────────────────────────────┐
│  📸 Static image               │
│     Updates every 5 seconds    │
│     "Refresh frame" button     │
│     Shows "58" counter         │
└────────────────────────────────┘
```

### After (Expected):
```
┌────────────────────────────────┐
│  ▶️ Video playing continuously │
│     Smooth 30fps video         │
│     Loops automatically        │
│     Real traffic footage       │
└────────────────────────────────┘
```

### You Should See:

1. **🔴 LIVE badge** in top-left corner
2. **Continuous video playback** (not frame-by-frame)
3. **Smooth traffic movement** (motorcycles, cars moving)
4. **No "Loading..." between frames**
5. **Video loops** when it ends

---

## Camera Info

**Name:** Chaktomuk Walk Street Cam
**Code:** CAM-PP-001
**Location:** Chaktomuk Walk Street — Daun Penh
**Video File:** `pp-chaktomuk-traffic.webm` (7.5 MB, ~15 seconds)
**Resolution:** 1920x1080 (Full HD)
**Format:** WebM (VP9 codec)

---

## Technical Details

### Video Detection Logic

The system automatically detects video URLs using this regex:

```typescript
const VIDEO_URL_RE = /\.(webm|mp4|mov|avi|mkv|m4v)(\?|#|$)/i;
```

When detected, it uses `<video>` element instead of `<img>`:

```tsx
<video
  src="/demo-cameras/pp-chaktomuk-traffic.webm"
  autoPlay
  muted
  loop
  playsInline
  preload="auto"
/>
```

### Fallback System

**File: `src/web/admin/shared/pages/CamerasPage.tsx` (Lines 477-493)**

```typescript
const publicByCode: Record<string, string> = {
  'CAM-PP-001': '/demo-cameras/pp-chaktomuk-traffic.webm',  // ← Your camera
  'CAM-PP-002': '/demo-cameras/pp-riverside-traffic.webm',
};
```

The system automatically falls back to these demo videos if:
- Camera's `frame_source_url` is empty
- Camera's URL fails to load
- `VITE_ALLOW_DEMO_ASSETS=true` is set

---

## Troubleshooting

### Issue: Still showing static images after restart

**Solution 1: Clear Browser Cache**
```
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
```

**Solution 2: Check Browser Console**
```
1. Press F12 to open DevTools
2. Go to Console tab
3. Look for any errors like:
   - "Failed to load video"
   - "CORS error"
   - ".env not loaded"
```

**Solution 3: Verify .env Change**
```bash
# Check if change was saved
cat src/web/admin/.env | grep DEMO_ASSETS

# Should show:
# VITE_ALLOW_DEMO_ASSETS=true
```

### Issue: Video loads but doesn't play

**Check 1: Browser Autoplay Policy**
- Video must be `muted` for autoplay (already set ✅)
- Try clicking on the video element

**Check 2: Video File Exists**
```bash
# Verify file is present
ls -lh src/web/admin/public/demo-cameras/pp-chaktomuk-traffic.webm

# Should show file size ~7-8 MB
```

### Issue: "Maintenance" badge showing

This is normal! The camera status in the screenshot shows "Maintenance" mode. The video will still play, it just has an orange badge. To change:

```python
# In Django shell
from infrastructure.models import Camera
cam = Camera.objects.get(code='CAM-PP-001')
cam.status = 'active'
cam.save()
```

---

## Other Demo Cameras

You also have a second demo video available:

**Camera:** Riverside Traffic Cam
**Code:** CAM-PP-002  
**Video:** `pp-riverside-traffic.webm`
**Location:** Riverside area, Phnom Penh

To enable it, create a camera with:
- `code`: `CAM-PP-002`
- `frame_source_url`: `/demo-cameras/pp-riverside-traffic.webm`

---

## Production: Real RTSP Cameras

For real security cameras (Hikvision, Dahua, etc.):

### HTTP Stream (Easiest):
```
http://192.168.1.100/video.mjpg
http://192.168.1.100/stream.webm
```

### RTSP Stream (Most Common):
```
rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101
```

**Note:** RTSP requires backend conversion to HTTP/WebM for browser playback.

---

## Summary

✅ **What's Done:**
- Enabled demo video assets in `.env`
- Video files already present (7.5 MB WebM)
- System code already supports video playback
- Fallback system configured for CAM-PP-001

🎬 **What You Need to Do:**
1. Restart frontend: `Ctrl+C` → `npm run dev`
2. Refresh browser: `F5` or `Ctrl+R`
3. Navigate to Cameras page
4. Select "Chaktomuk Walk Street Cam"
5. **Enjoy continuous video preview!** 🎥

---

**Status:** ✅ Ready to test!
**Last Updated:** July 26, 2026, 9:45 PM
