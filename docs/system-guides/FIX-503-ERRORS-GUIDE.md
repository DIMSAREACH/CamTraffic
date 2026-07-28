# Fix 503/500 Detection API Errors

## Problem
Detection endpoints (`/api/detection/image/`, `/api/detection/video/`, `/api/detection/live/`) return **503 Service Unavailable** or **500 Internal Server Error** when:

1. Django server just started
2. AI models are still loading (takes 30-60 seconds on CPU)
3. First request tries to access models before they're ready

## Root Cause
- AI models (YOLO) load in a **background thread** on Django startup
- HTTP server accepts requests immediately
- If you hit detection endpoints before warmup completes → **timeout** → 503 error

## Solution Implemented

### 1. Health Check Endpoint
**New endpoint:** `GET /api/ai/ready/` (no authentication required)

```javascript
// Check if models are ready
const response = await fetch('http://localhost:8000/api/ai/ready/');
const data = await response.json();

if (data.data.ready) {
  // Models loaded - safe to use detection
} else {
  // Models still loading - wait and retry
}
```

### 2. Auto-Warmup on Startup
Models automatically warm up when Django starts:
- Vehicle detection model
- License plate detection model  
- Traffic sign detection model
- Catalog visual matching index

Typical warmup time:
- **GPU:** 5-10 seconds
- **CPU:** 30-60 seconds

## Frontend Integration

### Option 1: Wait for Ready (Recommended)

```typescript
async function waitForAIReady(maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch('/api/ai/ready/');
      const data = await res.json();
      
      if (data.data?.ready) {
        console.log('AI models ready!');
        return true;
      }
    } catch (error) {
      console.log('Waiting for AI models...');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
  }
  
  return false;
}

// Use before detection:
await waitForAIReady();
// Now safe to call detection endpoints
```

### Option 2: Show Loading State

```typescript
const [aiReady, setAIReady] = useState(false);

useEffect(() => {
  const checkReady = async () => {
    const res = await fetch('/api/ai/ready/');
    const data = await res.json();
    setAIReady(data.data?.ready || false);
    
    if (!data.data?.ready) {
      // Retry after 3 seconds
      setTimeout(checkReady, 3000);
    }
  };
  
  checkReady();
}, []);

// In your component:
if (!aiReady) {
  return <div>Loading AI models... Please wait</div>;
}
```

### Option 3: Handle 503 Gracefully

```typescript
async function detectWithRetry(image, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch('/api/detection/image/', {
        method: 'POST',
        body: formData
      });
      
      if (res.status === 503) {
        console.log('Models loading, retrying...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      return await res.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

## Testing

### 1. Check Model Status
```bash
curl http://localhost:8000/api/ai/ready/
```

Expected response when ready:
```json
{
  "success": true,
  "message": "AI models ready",
  "data": {
    "ready": true
  }
}
```

Expected response when loading:
```json
{
  "success": true,
  "message": "AI models loading...",
  "data": {
    "ready": false
  }
}
```

### 2. Monitor Server Logs
Watch for model loading messages:
```
INFO Loaded sign YOLO: 26 classes from ...
INFO Vehicle YOLO loaded: ... (mode=cambodia)
INFO Plate detector loaded: ...
INFO Catalog visual index: 247 sign images
INFO AI models warm in 45.23s
```

### 3. Force Warmup (Authenticated)
```bash
# Requires authentication token
curl -X POST http://localhost:8000/api/ai/warmup/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Backend Configuration

### Enable/Disable Auto-Warmup
In `.env`:
```bash
# Enable model warmup on startup (default: true)
AI_WARMUP_MODELS=True

# Smaller images for faster warmup
AI_LIVE_IMGSZ=320
```

### Warmup Behavior
- **Development:** Models load automatically with Django auto-reload
- **Production:** Models load once on first worker start
- **Skip warmup:** For management commands (migrate, shell, etc.)

## Troubleshooting

### Issue: Still getting 503 after warmup
**Solution:** Check if models actually loaded:
```bash
# Look for these logs:
grep "AI models warm" src/backend/django.log
```

### Issue: Warmup takes too long
**Options:**
1. Use GPU (CUDA) - reduces warmup from 60s to 10s
2. Reduce model size in `.env`: `AI_LIVE_IMGSZ=320`
3. Disable unnecessary features:
   ```bash
   AI_CATALOG_VISUAL_MATCH_ENABLED=False
   AI_PLATE_OCR_ENABLED=False  # If not needed immediately
   ```

### Issue: Frontend times out waiting
**Solution:** Increase frontend timeout:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

fetch('/api/detection/image/', {
  signal: controller.signal,
  // ... rest of options
});
```

## Status Check Commands

```bash
# Check if Django server is running
netstat -ano | findstr ":8000"

# Test ready endpoint
curl http://localhost:8000/api/ai/ready/

# Check model files exist
dir "D:\Year4\Project Thesis\Expert System\Project\CamTraffic\ai\weights"

# Should see:
# - best_b2_named.pt (signs)
# - best_cambodia_vehicles.pt (vehicles)
# - best_cambodia_plates.pt (plates)
```

## Production Deployment

For production, consider:

1. **Warm up before accepting traffic:**
   ```bash
   # Start server
   gunicorn camtraffic.wsgi &
   
   # Wait for warmup
   while ! curl -s http://localhost:8000/api/ai/ready/ | grep -q '"ready":true'; do
     echo "Waiting for AI models..."
     sleep 5
   done
   
   # Now safe to route traffic
   ```

2. **Health check endpoint:**
   ```nginx
   location /healthz {
     proxy_pass http://localhost:8000/api/ai/ready/;
   }
   ```

3. **Load balancer:**
   Configure health checks to use `/api/ai/ready/`

---

**Created:** 2026-07-26  
**Status:** Fixed ✅  
**Next:** Integrate frontend loading state
