# 📹 Quick Start: Live Camera Detection

**Status:** ✅ 100% FUNCTIONAL

Real-time AI detection from infrastructure cameras (CCTV/IP cameras) with live annotations.

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

### 2. Open AI Detection Center

Open browser: **http://localhost:5174/admin/ai-detection-center**

Login with admin credentials.

### 3. Select Live Camera Input

Click the **"Live Camera"** input source panel (cyan/teal color).

### 4. Choose Camera Source

**Option A: Catalog Camera (Recommended)**
1. Protocol: "Registered camera" (default)
2. Select camera from dropdown (e.g., CAM-PP-001)
3. Click "Connect"

**Option B: RTSP Stream**
1. Protocol: "RTSP / IP"
2. Enter RTSP URL: `rtsp://username:password@192.168.1.100:554/stream1`
3. Click "Connect"

**Option C: HTTP Snapshot**
1. Protocol: "HTTP / CCTV snapshot"
2. Enter HTTP URL: `http://192.168.1.100/snapshot.jpg`
3. Click "Connect"

### 5. Watch Auto-Detection

- Detections run automatically every 3 seconds
- Green bounding boxes appear on objects
- Labels show confidence scores
- FPS counter shows detection speed
- Click "Pause" to pause auto-detection
- Click "Detect" for manual single-shot

---

## 📱 Camera Protocols

### Catalog Camera (Registered)

**Best for:** Pre-configured infrastructure cameras

**How to use:**
1. Select "Registered camera" protocol
2. Choose camera from dropdown
3. Click "Connect"

**Expected result:**
- Camera feed appears (video or snapshot)
- Auto-detection starts
- Green boxes on detected objects
- Labels with confidence scores

---

### RTSP Stream

**Best for:** IP cameras with RTSP support (Hikvision, Dahua, Axis)

**URL Format:**
```
rtsp://username:password@ip:port/stream
```

**Example:**
```
rtsp://admin:password123@192.168.1.100:554/stream1
```

**How to use:**
1. Select "RTSP / IP" protocol
2. Enter RTSP URL
3. Click "Connect"

**Note:** Browser cannot play RTSP directly. Backend captures frames server-side using OpenCV.

**Expected result:**
- Frames captured from RTSP stream
- Auto-detection on each frame
- Green boxes and labels

---

### HTTP Snapshot

**Best for:** Cameras with HTTP snapshot API

**URL Format:**
```
http://ip:port/path/to/snapshot.jpg
```

**Example:**
```
http://192.168.1.100/cgi-bin/snapshot.cgi
```

**How to use:**
1. Select "HTTP / CCTV snapshot" protocol
2. Enter HTTP URL
3. Click "Connect"

**Expected result:**
- Snapshot fetched via HTTP
- Auto-refresh every 3 seconds
- Green boxes and labels on each frame

---

### Video File Feed

**Best for:** Testing with pre-recorded video

**URL Format:**
```
/media/cctv/test-feed.mp4
/media/cctv/demo-traffic.webm
```

**How to use:**
1. Camera frame_source_url points to video file
2. Select camera from catalog
3. Click "Connect"

**Expected result:**
- Video plays in browser
- Detection overlays on playback
- Perfect alignment between video and boxes

---

## 🎮 Controls

### Connect Button
- Starts camera connection
- Initiates auto-detection loop
- Shows toast: "Live camera connected"

### Disconnect Button
- Stops auto-detection loop
- Closes camera connection
- Clears detection results

### Pause Button
- Pauses auto-detection
- Keeps camera connected
- Preserves last detection

### Resume Button
- Resumes auto-detection
- Continues from current state

### Detect Button
- Manual single-shot detection
- Saves to database
- Shows full result panel

### Auto-Save Toggle
- OFF: Preview mode (no database save)
- ON: Persist all detections

### Interval Selector
- 2.5s: Fast detection (higher CPU)
- 3.0s: Balanced (recommended)
- 5.0s: Slow detection (lower CPU)

### Screenshot Button
- Downloads current annotated frame
- Filename: `live-camera-{code}-{timestamp}.jpg`

---

## ✅ Verification Checklist

After connecting to live camera, verify:

- [ ] Camera feed appears (video or image)
- [ ] Auto-detection starts automatically
- [ ] Green boxes appear on objects
- [ ] Labels show with confidence scores
- [ ] Legend displays detected object types
- [ ] FPS counter shows detection speed
- [ ] Status shows "LIVE" or "Scanning..."
- [ ] Pause/Resume works correctly
- [ ] Manual Detect button works
- [ ] Auto-save toggle works
- [ ] Screenshot download works

---

## 🔧 Troubleshooting

### Camera Won't Connect

**Problem:** "Camera offline or frame capture failed"

**Solutions:**

1. **Check camera status:**
   - Is camera powered on?
   - Is camera accessible on network?
   - Is frame_source_url correct?

2. **Test camera URL:**
   - RTSP: Test with VLC media player
   - HTTP: Test in browser
   - Catalog: Check database

3. **Check backend logs:**
   ```bash
   # In backend terminal
   Look for frame capture errors
   ```

---

### No Bounding Boxes

**Problem:** Camera feed shows but no boxes appear

**Solutions:**

1. **Check detection confidence:**
   - Minimum confidence is 45%
   - Low light may reduce confidence
   - Try better lighting conditions

2. **Verify objects in frame:**
   - Signs: Position sign clearly
   - Vehicles: Show full vehicle
   - Plates: Ensure readable

3. **Check browser console:**
   ```
   F12 → Console
   Look for overlay errors
   ```

---

### Slow Detection Speed

**Problem:** Long delays between detections

**Solutions:**

1. **Increase interval:**
   - Select 5.0s instead of 2.5s
   - Reduces server load

2. **Check server resources:**
   - Monitor CPU/GPU usage
   - Check backend logs

3. **Disable auto-save:**
   - Turn OFF Auto-save toggle
   - Skips database writes
   - Skips OCR processing

---

### Misaligned Boxes

**Problem:** Boxes don't match object positions

**Solutions:**

1. **For video feeds:**
   - Ensure client-side capture is enabled
   - Check `useClientFrame` logic

2. **For snapshot feeds:**
   - Check backend annotation alignment
   - Verify normalized coordinates (0-1)

3. **Refresh page:**
   - Sometimes fixes CSS rendering issues

---

## 📊 Performance Tips

### For Best Results:

1. **Camera Selection:**
   - Use local video files for testing (fastest)
   - HTTP snapshots are more reliable than RTSP
   - Choose cameras with good internet connection

2. **Detection Interval:**
   - 3.0s is optimal for most use cases
   - 2.5s for high-speed traffic
   - 5.0s for low-traffic areas

3. **Auto-Save:**
   - Keep OFF for live monitoring
   - Turn ON only when recording violations

4. **Network:**
   - Ensure stable internet connection
   - Test camera URL before connecting

---

## 🧪 Test the Feature

### Quick Test with Catalog Camera

1. Open AI Detection Center
2. Click "Live Camera" panel
3. Select "CAM-PP-001" from dropdown
4. Click "Connect"
5. **Expected:**
   - Camera feed appears
   - Auto-detection starts
   - Green boxes on vehicles
   - Labels with confidence
   - FPS counter shows ~0.3-1.0 FPS

### Quick Test with HTTP Snapshot

1. Open AI Detection Center
2. Click "Live Camera" panel
3. Select "HTTP / CCTV snapshot" protocol
4. Enter URL: `http://your-camera-ip/snapshot.jpg`
5. Click "Connect"
6. **Expected:**
   - Snapshot loads
   - Refreshes every 3 seconds
   - Green boxes appear
   - Labels displayed

---

## 📝 Feature Summary

| Feature | Catalog Camera | RTSP | HTTP | Video File |
|---------|---------------|------|------|------------|
| Auto-detection | ✅ | ✅ | ✅ | ✅ |
| Manual detect | ✅ | ✅ | ✅ | ✅ |
| Auto-save | ✅ | ✅ | ✅ | ✅ |
| Pause/Resume | ✅ | ✅ | ✅ | ✅ |
| Screenshot | ✅ | ✅ | ✅ | ✅ |
| FPS monitoring | ✅ | ✅ | ✅ | ✅ |
| Browser playback | Video only | ❌ | ❌ | ✅ |
| Server capture | Always | ✅ | ✅ | Optional |

---

## 🎓 Advanced Features

### Multi-Camera Setup

To monitor multiple cameras:

1. Open multiple browser tabs
2. Select different camera in each tab
3. Connect to all cameras
4. Monitor all feeds simultaneously

**Note:** Each tab runs independent auto-detection loop

---

### Custom Interval

To use custom interval:

1. Open browser console (F12)
2. Run: `setIntervalMs(4000)` for 4 seconds
3. Or modify `INTERVAL_OPTIONS` in source code

---

### Auto-Violation Recording

To automatically record violations:

1. Turn ON "Auto-save" toggle
2. Select demo violation type
3. Connect to camera
4. All violations automatically saved to database

---

### Live Monitoring Dashboard

For 24/7 monitoring:

1. Open AI Detection Center
2. Connect to all active cameras
3. Enable auto-save
4. Leave browser tab open
5. System records violations automatically

---

## 🔗 Related Documents

- **Full Debug Guide:** `DEBUG_LIVE_CAMERA_COMPLETE.md`
- **System Status:** `LIVE_CAMERA_STATUS.md` (coming soon)
- **System Workflow:** `THESIS_WORKFLOW_DIAGRAMS.md`
- **Webcam Detection:** `QUICK_START_WEBCAM_DETECTION.md`
- **Image Detection:** `QUICK_START_UPLOAD_IMAGE.md`
- **Video Detection:** `QUICK_START_UPLOAD_VIDEO.md`

---

## ✨ Summary

**Live Camera Detection is 100% functional:**

✅ Camera catalog integration  
✅ RTSP stream support  
✅ HTTP snapshot support  
✅ Video file playback  
✅ Auto-detection loop  
✅ YOLO-style annotations  
✅ Labels with confidence  
✅ Pause/Resume controls  
✅ Manual detect & auto-save  
✅ FPS monitoring  
✅ Screenshot capture  
✅ Error handling & retry  

**Ready for production use and thesis defense!**

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-26  
**Status:** ✅ COMPLETE
