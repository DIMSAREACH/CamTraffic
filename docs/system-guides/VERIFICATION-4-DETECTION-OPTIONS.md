# Verification Guide: 4 Detection Options

This guide helps you verify that all 4 AI detection options are working correctly.

---

## ✅ Pre-Verification Checklist

Before testing, ensure:

1. **Backend Server is Running**
   ```bash
   cd src/backend
   python manage.py runserver
   ```

2. **Frontend Servers are Running**
   ```bash
   # Admin Portal
   cd src/web/admin
   npm run dev

   # User Portal
   cd src/web/user
   npm run dev
   ```

3. **AI Models are Warm**
   - Visit: `http://127.0.0.1:8000/api/ai/ready/`
   - Should return: `{"ready": true}`
   - If `false`, wait 30-60s for models to load

4. **Test Data is Available**
   ```bash
   cd src/backend
   python manage.py create_test_hikvision_cameras
   ```
   This creates 3 test cameras with local image sources.

---

## 🧪 Test Each Detection Option

### 1. Image Upload Detection

**User Portal**: `http://localhost:5173/citizen/ai-detection-center`  
**Admin Portal**: `http://localhost:5174/admin/ai-detection-center`

#### Steps:
1. Navigate to AI Detection Center
2. Ensure "Image Upload" tab is selected (should be default)
3. Prepare a test image:
   - Use any traffic image with vehicles
   - Or use: `D:\Year4\Project Thesis\Expert System\Project\CamTraffic\src\backend\media\cctv\monivong-intersection.jpg`
4. Drag & drop or click to browse for the image
5. (Optional) Select a demo violation rule
6. Click "Run Detection"

#### Expected Result:
- ✅ Detection completes in 2-5 seconds
- ✅ Results show detected vehicles (if any)
- ✅ Green bounding boxes displayed
- ✅ Confidence shown as `0.XX` format (e.g., "Car 0.85")
- ✅ License plate detected (if visible)
- ✅ Detection saved in "Recent Detections"

#### Visual Check:
- Bounding boxes should be **green** (not red or yellow)
- Confidence format: `Class 0.92` (not `Class 92%`)

---

### 2. Video Upload Detection

**Same location as Image Upload**

#### Steps:
1. Navigate to AI Detection Center
2. Select "Video Upload" tab
3. Prepare a test video:
   - Use any traffic video
   - Or record a short video from your webcam
4. Upload the video file
5. Adjust "Max Frames" slider (default: 12)
6. Click "Run Detection"

#### Expected Result:
- ✅ Progress indicator shows frame processing
- ✅ Detection completes in 15-30 seconds (for 12 frames)
- ✅ Frame-by-frame results displayed
- ✅ Each frame shows green bounding boxes
- ✅ Confidence in `0.XX` format
- ✅ Annotated preview video available for download
- ✅ JSON report shows all detected objects per frame

#### Visual Check:
- All frames should have consistent green box style
- Confidence values should be decimal (0.00-1.00)
- Video preview should show YOLO-style overlays

---

### 3. Webcam Detection

**Same location as Image/Video**

#### Steps:
1. Navigate to AI Detection Center
2. Select "Webcam" tab
3. Click "Enable Camera"
4. Grant camera permissions in browser
5. Choose detection mode:
   - **Sign Mode**: For detecting traffic signs (hold sign in region)
   - **Street Mode**: For detecting vehicles in full frame
6. Point camera at test scene
7. Click "Scan Frame" to preview (doesn't save)
8. Click "Scan & Save" to store in detection logs

#### Expected Result:
- ✅ Camera stream appears in viewport
- ✅ FPS counter shows (15-30 fps)
- ✅ Resolution displayed (e.g., "1280x720")
- ✅ Detection completes in 2-3 seconds per scan
- ✅ Green overlays appear on detected objects
- ✅ Confidence shows as `0.XX` format
- ✅ "Scan & Save" creates entry in Recent Detections
- ✅ Continuous loop mode works (Start Loop button)

#### Visual Check:
- Sign mode shows purple guide box
- Street mode shows full-frame detection
- Overlays are green with decimal confidence
- Vote progress shown in Sign mode (e.g., "3/5")

---

### 4. Live Camera Detection

**Same location as other options**

#### Steps:
1. Navigate to AI Detection Center
2. Select "Live Camera" tab
3. Camera catalog loads automatically
4. Select a test camera:
   - Look for **TEST-HIK-001**, **TEST-HIK-002**, or **TEST-HIK-003**
   - These are prioritized at the top of the list
5. Click "Capture & Detect"

#### Expected Result:
- ✅ Frame captured from camera source
- ✅ Detection runs automatically
- ✅ Results show detected vehicles, signs, plates
- ✅ Green bounding boxes with decimal confidence
- ✅ Detection log created automatically
- ✅ Unmatched plates queued in Unknown Vehicles

#### Alternative Test (Custom URL):
1. Instead of catalog camera, use "Enter Stream URL"
2. Paste a local image path:
   ```
   /media/cctv/monivong-intersection.jpg
   ```
3. Click "Capture & Detect"
4. Should work the same as catalog camera

#### Visual Check:
- Camera list shows test cameras at top
- Detection results match the camera's current view
- Overlays use green YOLO style
- Confidence in decimal format

---

## 🎨 Visual Style Verification

All 4 options should have **identical visual style**:

### Bounding Box Checklist:
- [ ] Color is **green** (not red, yellow, or blue)
- [ ] Label format is `Class 0.XX` (not `Class XX%`)
- [ ] Label has filled background
- [ ] Box thickness is consistent (2px)

### Confidence Format:
- [ ] Vehicle: `Car 0.85`, `motorcycle 0.92`, etc.
- [ ] Sign: `Sign 0.78`, `W43 0.95`, etc.
- [ ] Plate: `Plate 0.88` or actual text with confidence

### Example Correct Format:
```
Car 0.85
motorcycle 0.92
tuk_tuk 0.78
Sign 0.95
Plate 0.88
```

### Example Incorrect Format (Old Style):
```
Car 85%          ❌ Should be 0.85
motorcycle 92    ❌ Should be 0.92
```

---

## 🔍 Backend API Verification

Test the API endpoints directly:

### 1. Health Check
```bash
curl http://127.0.0.1:8000/api/ai/ready/
```
Expected: `{"status": "success", "data": {"ready": true}, "message": "AI models ready"}`

### 2. Warmup
```bash
curl -X POST http://127.0.0.1:8000/api/ai/warmup/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected: `{"status": "success", "message": "Models warmed up"}`

### 3. Image Detection
```bash
curl -X POST http://127.0.0.1:8000/api/ai/image/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@path/to/test-image.jpg" \
  -F "live_fast=true" \
  -F "enable_ocr=true"
```

### 4. Detection Logs
```bash
curl http://127.0.0.1:8000/api/ai/history/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Should list recent detections from all 4 options.

---

## 📊 Database Verification

Check that detections are being logged:

```bash
cd src/backend
python manage.py shell
```

```python
from ai_detection.models import AIDetectionLog

# Count total detections
print("Total detections:", AIDetectionLog.objects.count())

# Recent detections
recent = AIDetectionLog.objects.order_by('-created_at')[:5]
for log in recent:
    print(f"- {log.created_at}: {log.vehicle_count} vehicles, {log.detected_plate or 'no plate'}")

# Detections with vehicles
with_vehicles = AIDetectionLog.objects.filter(vehicle_count__gt=0).count()
print(f"Detections with vehicles: {with_vehicles}")

# Detections with plates
with_plates = AIDetectionLog.objects.exclude(detected_plate='').exclude(detected_plate__isnull=True).count()
print(f"Detections with plates: {with_plates}")
```

---

## 🚨 Troubleshooting

### Issue: "AI models loading..."
**Solution**: Wait 30-60 seconds for models to warm up on first request. Check `/api/ai/ready/` endpoint.

### Issue: 503 Service Unavailable
**Solution**: 
1. Increase Vite proxy timeout (already done in `apiProxy.ts`)
2. Check backend server is running
3. Check `/api/ai/ready/` shows `ready: true`

### Issue: 404 on camera images
**Solution**:
1. Ensure test cameras are created: `python manage.py create_test_hikvision_cameras`
2. Check images exist in `src/backend/media/cctv/`
3. Verify Django is serving media files in development

### Issue: Wrong overlay style (red boxes, percentage)
**Solution**:
1. Clear browser cache (Ctrl+Shift+R)
2. Restart frontend dev server
3. Check `LiveDetectionOverlay.tsx` has latest code
4. Verify `sign_pipeline.py` has green color setting

### Issue: Webcam not starting
**Solution**:
1. Grant camera permissions in browser
2. Check browser console for errors
3. Try different browser (Chrome/Edge recommended)
4. Ensure no other app is using the webcam

---

## ✅ Success Criteria

All 4 detection options are verified complete when:

- [x] Image upload detects and displays results correctly
- [x] Video upload processes frames with progress indicator
- [x] Webcam streams and detects in real-time
- [x] Live camera connects and detects from catalog
- [x] All options use green bounding boxes
- [x] All options show confidence in 0.XX decimal format
- [x] Detection logs are created in database
- [x] Recent Detections shows results from all 4 options
- [x] No console errors during detection
- [x] Overlay style is consistent across all modes

---

## 📝 Test Report Template

Use this template to document your verification:

```
=== AI Detection 4 Options Verification ===

Date: ___________
Tester: ___________

1. Image Upload Detection
   [ ] Test passed
   [ ] Green boxes
   [ ] Decimal confidence
   Issues: ___________

2. Video Upload Detection
   [ ] Test passed
   [ ] Green boxes
   [ ] Decimal confidence
   [ ] Preview video generated
   Issues: ___________

3. Webcam Detection
   [ ] Test passed
   [ ] Green boxes
   [ ] Decimal confidence
   [ ] Both modes work (Sign/Street)
   Issues: ___________

4. Live Camera Detection
   [ ] Test passed
   [ ] Green boxes
   [ ] Decimal confidence
   [ ] Test cameras work
   Issues: ___________

Overall Status: [ PASS / FAIL ]
Notes: ___________
```

---

## 🎉 Verification Complete!

If all tests pass, the AI Detection Module is **production-ready** with all 4 detection options fully functional and visually consistent.

For ongoing monitoring, check:
- Detection logs dashboard
- System health endpoint
- Error logs: `src/backend/logs/camtraffic.log`
