# Quick Start: 4 AI Detection Options

> **TL;DR**: All 4 detection options are complete and ready to use!

---

## 🚀 Quick Start (3 Steps)

### 1. Start Servers
```bash
# Terminal 1: Backend
cd src/backend
python manage.py runserver

# Terminal 2: User Frontend
cd src/web/user
npm run dev

# Terminal 3: Admin Frontend (optional)
cd src/web/admin
npm run dev
```

### 2. Create Test Data
```bash
cd src/backend
python manage.py create_test_hikvision_cameras
```

### 3. Access AI Detection Center
- **User Portal**: http://localhost:5173/citizen/ai-detection-center
- **Admin Portal**: http://localhost:5174/admin/ai-detection-center

---

## 📊 4 Detection Options Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  AI DETECTION CENTER                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 📸 IMAGE     │  │ 🎬 VIDEO     │  │ 📹 WEBCAM    │     │
│  │    UPLOAD    │  │    UPLOAD    │  │   DETECTION  │     │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤     │
│  │ ✅ Complete  │  │ ✅ Complete  │  │ ✅ Complete  │     │
│  │ • Drag/Drop  │  │ • 12 Frames  │  │ • Real-time  │     │
│  │ • Fast Mode  │  │ • 960px Res  │  │ • 2 Modes    │     │
│  │ • OCR        │  │ • Progress   │  │ • Vote Sys   │     │
│  │ • <2s        │  │ • Preview    │  │ • Loop Mode  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📡 LIVE CAMERA DETECTION                             │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ✅ Complete                                           │  │
│  │ • Camera Catalog  • Test Cameras  • RTSP/HTTP       │  │
│  │ • Hikvision      • Local Images   • Auto-log        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  All options use:                                           │
│  • Green YOLO boxes  • 0.XX confidence  • Fast detection   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Use Cases

### 1. Single Image Analysis
**Use**: Image Upload  
**When**: You have a photo from a violation report  
**Time**: ~2 seconds  

### 2. Video Evidence Review
**Use**: Video Upload  
**When**: You have dashcam or CCTV footage  
**Time**: ~20 seconds (12 frames)  

### 3. Live Sign Verification
**Use**: Webcam (Sign Mode)  
**When**: Officer needs to verify a traffic sign in field  
**Time**: ~2-3 seconds per scan  

### 4. Real-time Traffic Monitoring
**Use**: Live Camera  
**When**: Monitoring intersection/highway via CCTV  
**Time**: ~2-4 seconds per capture  

---

## 🎨 Visual Output (All Options)

### What You'll See:

```
╔════════════════════════════════════════╗
║  🖼️  Detection Result                 ║
╠════════════════════════════════════════╣
║                                        ║
║     ┌──────────┐  Car 0.85            ║
║     │          │                       ║
║     │   🚗     │                       ║
║     │          │                       ║
║     └──────────┘                       ║
║                                        ║
║  ┌─────┐  motorcycle 0.92              ║
║  │  🏍️  │                              ║
║  └─────┘                               ║
║                                        ║
║  Detected: 2 vehicles, 1 plate         ║
║  Confidence: High (>0.80)              ║
║                                        ║
╚════════════════════════════════════════╝
```

**Key Features**:
- **Green boxes** (not red or yellow)
- **Decimal confidence**: 0.85 (not 85%)
- **YOLO style**: Class name + confidence
- **Consistent across all 4 options**

---

## 🧪 Quick Test

### Test All 4 Options in 5 Minutes:

1. **Image** (1 min)
   - Open AI Detection Center
   - Drop any traffic image
   - Click "Run Detection"

2. **Video** (1 min)
   - Switch to Video tab
   - Upload short video (or record from webcam)
   - Click "Run Detection"

3. **Webcam** (1 min)
   - Switch to Webcam tab
   - Click "Enable Camera"
   - Point at traffic scene
   - Click "Scan & Save"

4. **Live Camera** (2 min)
   - Switch to Live Camera tab
   - Select TEST-HIK-001
   - Click "Capture & Detect"

**Result**: All 4 options should show green boxes with decimal confidence!

---

## 📱 Access Points

### User Portal (Citizen)
- URL: http://localhost:5173/citizen/ai-detection-center
- Login: Any citizen account
- Features: All 4 detection options

### Officer Portal
- URL: http://localhost:5173/officer/ai-detection-center
- Login: Officer account
- Features: All 4 detection options + enforcement tools

### Admin Portal
- URL: http://localhost:5174/admin/ai-detection-center
- Login: Admin account
- Features: All 4 detection options + analytics

---

## 🔧 Common Commands

### Backend Management
```bash
cd src/backend

# Check AI models ready
curl http://127.0.0.1:8000/api/ai/ready/

# Create test cameras
python manage.py create_test_hikvision_cameras

# Batch process images
python manage.py batch_detect_all --limit 10

# Process all cameras
python manage.py detect_all_cameras --active-only

# Reference video detection
python manage.py detect_reference_video path/to/video.mp4
```

---

## 🎓 Tips & Tricks

### For Best Results:

**Image Upload**:
- Use clear, well-lit images
- Higher resolution = better detection
- Vehicles should be >50px in size

**Video Upload**:
- Keep videos under 100 MB
- 12 frames default is optimal
- Increase frames for slower videos

**Webcam**:
- Use Sign Mode for traffic signs
- Use Street Mode for vehicles
- Hold steady for 2-3 seconds
- Enable Loop for continuous scanning

**Live Camera**:
- Test cameras (TEST-HIK-*) work offline
- Use local images for reliable testing
- RTSP streams require network access

---

## 🚨 If Something Goes Wrong

### Models Not Loading
```bash
# Check status
curl http://127.0.0.1:8000/api/ai/ready/

# Wait 30-60 seconds for warmup
# Or manually warmup:
curl -X POST http://127.0.0.1:8000/api/ai/warmup/
```

### Wrong Overlay Style
1. Clear browser cache (Ctrl+Shift+R)
2. Restart frontend server
3. Check for console errors

### Camera Not Working
1. Check permissions
2. Try different browser
3. Ensure camera not in use

---

## 📚 Full Documentation

- `AI-DETECTION-MODULE-COMPLETE.md` - Complete feature list
- `VERIFICATION-4-DETECTION-OPTIONS.md` - Testing guide
- `HIKVISION-CAMERA-INTEGRATION.md` - Camera setup
- `TEST-HIKVISION-WITHOUT-HARDWARE.md` - Testing without cameras

---

## ✅ Success Indicators

You know it's working when:

- ✅ Green boxes appear on detected objects
- ✅ Confidence shows as 0.XX (decimal)
- ✅ Detection completes in <5 seconds
- ✅ Results save to Recent Detections
- ✅ No red errors in console

---

## 🎉 Ready to Use!

All 4 detection options are:
- ✅ **Fully functional**
- ✅ **Visually consistent**
- ✅ **Performance optimized**
- ✅ **Production ready**

**Start detecting now!** 🚀
