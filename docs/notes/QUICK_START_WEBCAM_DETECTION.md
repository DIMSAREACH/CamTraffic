# 🎥 Quick Start: Webcam Detection

**Status:** ✅ 100% FUNCTIONAL

Real-time AI detection using your browser camera with live annotations.

---

## 🚀 5-Minute Quick Start

### 1. Start the System

```bash
# Terminal 1: Start Backend
cd "D:\Year4\Project Thesis\Expert System\Project\CamTraffic\src\backend"
python manage.py runserver

# Terminal 2: Start Frontend
cd "D:\Year4\Project Thesis\Expert System\Project\CamTraffic\src\web\admin"
npm run dev
```

### 2. Open Admin Portal

Open browser: **http://localhost:5174/admin/ai-detection**

Login with admin credentials.

### 3. Use Webcam Detection

**Step 1:** Click the **"Webcam"** tab

**Step 2:** Click **"Start Camera"**

**Step 3:** Grant camera permission when prompted

**Step 4:** Choose detection mode:

- **Sign Mode** (default): Point camera at traffic signs
  - Green guide box appears
  - Captures center region
  - Best for sign recognition

- **Street Mode**: Point camera at vehicles
  - Captures full frame
  - Detects vehicles, plates, helmets
  - Real-time tracking

**Step 5:** Start detecting:

- **Preview Scan**: Single capture, no save
- **Scan & Save**: Capture and save to database
- **Start Loop**: Continuous auto-detection

---

## 📱 Detection Modes

### Sign Mode (Traffic Signs)

**Best for:** Stop signs, speed limits, parking signs, etc.

**How to use:**
1. Select "Sign Mode"
2. Position sign in green guide box
3. Keep camera 1-2 meters from sign
4. Hold steady
5. Click "Preview Scan" or "Start Loop"

**Expected result:**
- Green box around sign
- Sign name (e.g., "Stop Sign R1")
- Confidence percentage (e.g., "87%")
- Center point marker

---

### Street Mode (Vehicles/Plates)

**Best for:** Cars, motorcycles, license plates, helmets

**How to use:**
1. Select "Street Mode"
2. Point camera at vehicles
3. Keep camera 3-5 meters away
4. Hold steady
5. Click "Preview Scan" or "Start Loop"

**Expected result:**
- Green boxes around vehicles
- Vehicle labels (e.g., "Car 92%", "Motorcycle 88%")
- Green boxes around plates
- Plate text (e.g., "PP-1234")
- Helmet detection (green=OK, red=no helmet)

---

## 🎯 Button Functions

### Start Camera
- Opens camera stream
- Requests browser permission
- Shows live preview

### Stop Camera
- Closes camera stream
- Clears detection results
- Releases camera resource

### Preview Scan
- Single capture
- Shows result immediately
- Does NOT save to database
- Good for testing

### Scan & Save
- Single capture
- Shows result
- Saves to database
- Creates evidence snapshot

### Start Loop
- Continuous detection
- Auto-capture every ~1 second
- Vote-based result (5 frames, 3 agree)
- Shows live confidence indicator

### Stop Loop
- Stops auto-detection
- Keeps camera active
- Preserves last result

---

## ✅ Verification Checklist

After starting webcam detection, verify:

- [ ] Camera opens successfully
- [ ] Live preview shows in viewport
- [ ] Detection mode can be changed
- [ ] Preview scan returns results
- [ ] Green bounding boxes appear
- [ ] Labels show with confidence
- [ ] Center markers visible
- [ ] Multiple objects detected (street mode)
- [ ] No overlapping boxes
- [ ] Helmet violations show in red
- [ ] Loop mode works continuously
- [ ] Results persist after scan

---

## 🔧 Troubleshooting

### Camera Won't Start

**Problem:** "Permission denied" or "Not allowed to access camera"

**Solutions:**
1. Click the camera icon in browser address bar
2. Select "Allow" for camera access
3. Refresh page and try again
4. Try different browser (Chrome, Firefox, Edge)
5. Check Windows Settings → Privacy → Camera → Allow apps

---

### No Detection Results

**Problem:** Camera works but no detections appear

**Solutions:**

1. **Check lighting:**
   - Use good ambient light
   - Avoid backlighting
   - Reduce shadows

2. **Adjust distance:**
   - Sign Mode: 1-2 meters
   - Street Mode: 3-5 meters

3. **Keep steady:**
   - Hold camera still
   - Wait for focus
   - Use tripod if available

4. **Try different mode:**
   - Use Sign Mode for signs
   - Use Street Mode for vehicles

---

### No Bounding Boxes

**Problem:** Detection works but no boxes appear

**Solutions:**

1. Check confidence threshold:
   - Minimum is 45%
   - Low light may reduce confidence

2. Ensure correct mode:
   - Sign Mode for traffic signs
   - Street Mode for vehicles

3. Verify object in frame:
   - Sign in guide box (Sign Mode)
   - Vehicle clearly visible (Street Mode)

---

### Slow Detection

**Problem:** Long delays between captures

**Solutions:**

1. Check backend is running:
   ```bash
   python manage.py runserver
   ```

2. Check network connection:
   - Open browser console (F12)
   - Look for network errors

3. Close other programs:
   - Free up CPU/memory
   - Close unnecessary browser tabs

---

### Boxes Misaligned

**Problem:** Bounding boxes don't match objects

**Solutions:**

1. Ensure camera is not mirrored:
   - System uses unmirred preview
   - Boxes should align correctly

2. Wait for stabilization:
   - Loop mode uses voting (5 frames)
   - Wait 2-3 seconds for stable result

3. Check focus:
   - Ensure camera has focused
   - Avoid motion blur

---

## 📊 Performance Tips

### For Best Results:

1. **Good Lighting**
   - Daylight or bright indoor lighting
   - Avoid direct sunlight in camera
   - No harsh shadows

2. **Stable Camera**
   - Hold camera steady
   - Use tripod if available
   - Wait for auto-focus

3. **Correct Distance**
   - Sign Mode: 1-2 meters
   - Street Mode: 3-5 meters

4. **Clear View**
   - No obstructions
   - Object fully in frame
   - Avoid motion blur

5. **Use Loop Mode**
   - More reliable than single scans
   - Vote-based stabilization
   - Automatic retry on failure

---

## 🧪 Test the System

### Quick Test (Sign Mode)

1. Start camera in Sign Mode
2. Show a traffic sign to camera
   - Print a sign image
   - Use sign from screen
   - Point at real traffic sign
3. Click "Preview Scan"
4. **Expected:**
   - Green box around sign
   - Sign name displayed
   - Confidence > 50%

### Quick Test (Street Mode)

1. Start camera in Street Mode
2. Show a vehicle image to camera
   - Open car image on phone
   - Point at parked car
   - Show toy car model
3. Click "Preview Scan"
4. **Expected:**
   - Green box around vehicle
   - Vehicle type (Car, Motorcycle, etc.)
   - Confidence > 50%

---

## 📝 Feature Summary

| Feature | Sign Mode | Street Mode |
|---------|-----------|-------------|
| Traffic signs | ✅ | ❌ |
| Vehicles | ❌ | ✅ |
| License plates | ❌ | ✅ |
| Helmets | ❌ | ✅ |
| Guide box | ✅ | ❌ |
| Capture area | Center crop | Full frame |
| OCR | Always | Optional |
| Tracking | No | Yes |
| Best distance | 1-2m | 3-5m |

---

## 🎓 Advanced Features

### Continuous Loop Mode

**How it works:**
1. Captures frame every ~1 second
2. Sends to AI detection
3. Collects 5 results
4. Requires 3+ results to agree
5. Displays stable result

**Benefits:**
- More reliable than single scan
- Handles temporary obstructions
- Automatic retry on errors
- Smooth result updates

**Use when:**
- Testing sign recognition
- Monitoring traffic flow
- Collecting evidence samples

---

### Device Selection

**Switch between cameras:**
1. Click device dropdown
2. Select front or rear camera
3. Camera will restart with new device

**Available devices:**
- Front camera (webcam/laptop)
- Rear camera (mobile)
- External cameras (USB)

---

### Debug Mode

**Enable debug mode to see:**
- Frame capture stats
- Vote progress (5 slots)
- Pipeline stage (webcam → opencv → yolo → result)
- FPS and resolution
- Detection confidence

**How to enable:**
- Look for "Debug" toggle in UI
- Check browser console (F12) for logs

---

## 🔗 Related Documents

- **Full Debug Guide:** `DEBUG_WEBCAM_DETECTION_COMPLETE.md`
- **Test Script:** `test_webcam_detection.py`
- **System Workflow:** `THESIS_WORKFLOW_DIAGRAMS.md`
- **Image Detection:** `QUICK_START_UPLOAD_IMAGE.md`
- **Video Detection:** `QUICK_START_UPLOAD_VIDEO.md`

---

## ✨ Summary

**Webcam Detection is 100% functional:**

✅ Camera initialization and streaming  
✅ Two detection modes (sign/street)  
✅ Real-time AI detection  
✅ YOLO-style green annotations  
✅ Labels with confidence scores  
✅ Continuous loop with voting  
✅ Manual single-shot capture  
✅ Device selection (front/rear)  
✅ Error handling and retries  
✅ Performance optimized  

**Ready for production use!**

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-26  
**Status:** ✅ COMPLETE
