# 🎥 Enable Video Camera Preview

## Current Status
Your screenshot shows "Chaktomuk Walk Street Cam" displaying as a static image that refreshes. The system **already supports video playback** - we just need to enable it!

## Solution

### Option 1: Enable Demo Video Assets (Quickest)

1. **Update Frontend .env:**
```bash
# File: src/web/admin/.env
VITE_ALLOW_DEMO_ASSETS=true
```

2. **Restart the frontend:**
```bash
# Press Ctrl+C in the terminal running npm run dev
# Then restart:
npm run dev
```

3. **Result:**
- Camera code `CAM-PP-001` will automatically use `/demo-cameras/pp-chaktomuk-traffic.webm`
- Video will play continuously in a loop
- Shows actual traffic footage from Cambodia

---

### Option 2: Update Camera to Use Video URL

Update the camera's `frame_source_url` in the database to point to a video file:

**Via Django Admin:**
```bash
cd src/backend
python manage.py shell
```

```python
from infrastructure.models import Camera

# Update Chaktomuk camera to use video
camera = Camera.objects.filter(name__icontains='Chaktomuk').first()
if camera:
    camera.frame_source_url = '/demo-cameras/pp-chaktomuk-traffic.webm'
    camera.save()
    print(f"✅ Updated {camera.name} to use video")
```

**Or via SQL:**
```sql
UPDATE cameras 
SET frame_source_url = '/demo-cameras/pp-chaktomuk-traffic.webm'
WHERE name LIKE '%Chaktomuk%' OR code = 'CAM-PP-001';
```

---

### Option 3: Use Your Own Video File

1. **Add video file to public folder:**
```bash
# Place your video file:
src/web/admin/public/demo-cameras/your-video.webm
```

2. **Update camera frame_source_url:**
```python
camera.frame_source_url = '/demo-cameras/your-video.webm'
camera.save()
```

**Supported formats:**
- `.webm` (recommended - best compression)
- `.mp4` (most compatible)
- `.mov`, `.avi`, `.mkv`, `.m4v`

---

## How It Works

### Detection Logic (Already Implemented!)

**File: `src/web/admin/shared/pages/CamerasPage.tsx` (Lines 682-696)**

```tsx
{isVideoFeed ? (
  <video
    key={src}
    src={src}
    className="cameras-feed-image cameras-feed-image--live"
    autoPlay
    muted
    loop
    playsInline
    preload="auto"
    onLoadedData={handleLoad}
    onCanPlay={handleLoad}
    onPlaying={handleLoad}
    onError={handleError}
  />
) : (
  <img
    key={src}
    src={src}
    className="cameras-feed-image"
    onLoad={handleLoad}
    onError={handleError}
  />
)}
```

### Video Detection Function

**File: `src/web/admin/shared/constants/cameraFrameDemo.ts`**

```typescript
const VIDEO_URL_RE = /\.(webm|mp4|mov|avi|mkv|m4v)(\?|#|$)/i;

export function isCameraVideoUrl(url?: string | null): boolean {
  return VIDEO_URL_RE.test((url || '').trim());
}
```

### Demo Fallbacks

**Lines 477-493** in CamerasPage.tsx automatically fall back to demo videos:

```typescript
const publicByCode: Record<string, string> = {
  'CAM-PP-001': '/demo-cameras/pp-chaktomuk-traffic.webm',
  'CAM-PP-002': '/demo-cameras/pp-riverside-traffic.webm',
};
```

---

## Testing

### After Enabling:

1. **Go to Cameras page**
2. **Select "Chaktomuk Walk Street Cam"**
3. **You should see:**
   - ✅ Continuous video playback (not frame refresh)
   - ✅ "LIVE" badge in top-left
   - ✅ Smooth video stream
   - ✅ No "58" second counter
   - ✅ No "Refresh frame" needed

### Visual Difference

**Before (Static Images):**
```
🔴 LIVE  🔧 Maintenance    [Refresh frame] [AI Detect Sign]
┌─────────────────────────┐
│   Static Image          │
│   (updates every 5s)    │
│   Shows: "58" seconds   │
└─────────────────────────┘
```

**After (Video Stream):**
```
🔴 LIVE  58                [Refresh frame] [AI Detect Sign]
┌─────────────────────────┐
│   ▶️ Video Playing      │
│   (continuous loop)     │
│   Smooth 30fps          │
└─────────────────────────┘
```

---

## Video Element Features

When using video preview:
- ✅ **Auto-play** - Starts immediately
- ✅ **Muted** - No sound (allows autoplay in browsers)
- ✅ **Loop** - Plays continuously
- ✅ **Inline** - Works on mobile devices
- ✅ **Preload** - Loads video ahead of time
- ✅ **Responsive** - Scales to container

---

## Troubleshooting

### Issue: Video Not Playing

**Check 1: File Extension**
```typescript
// URL must end with video extension
'https://example.com/stream.webm'  ✅ Works
'https://example.com/stream'        ❌ Won't detect as video
'https://example.com/stream.jpg'    ❌ Shows as image
```

**Check 2: Demo Assets Enabled**
```env
# Must be true for /demo-cameras/ videos
VITE_ALLOW_DEMO_ASSETS=true
```

**Check 3: Browser Console**
```javascript
// Check if video element exists
document.querySelector('video')  // Should return <video> element

// Check video source
document.querySelector('video')?.src  // Should show .webm URL
```

### Issue: "LIVE 58" Showing

This is normal! The "58" is the countdown until next refresh, but with video it's just informational. The video itself plays continuously.

---

## Production: Real RTSP Cameras

For real security cameras (not demo):

### RTSP Stream URL Format:
```
rtsp://username:password@camera-ip:554/stream1
```

### HTTP Stream URL Format:
```
http://camera-ip/video.mjpg
http://camera-ip/stream.webm
```

### Example:
```python
# Hikvision camera
camera.frame_source_url = 'rtsp://admin:password123@192.168.1.100:554/Streaming/Channels/101'

# Or HTTP snapshot (falls back to image mode)
camera.frame_source_url = 'http://192.168.1.100/ISAPI/Streaming/channels/1/picture'
```

---

## Quick Fix Summary

**Fastest solution right now:**

1. **Enable demo assets:**
   ```bash
   # In src/web/admin/.env
   VITE_ALLOW_DEMO_ASSETS=true
   ```

2. **Restart frontend:**
   ```bash
   npm run dev
   ```

3. **Refresh browser** and select CAM-PP-001

**Result:** Video will play automatically! 🎥

---

**Status:** ✅ System already supports video - just needs configuration
**Last Updated:** July 26, 2026
