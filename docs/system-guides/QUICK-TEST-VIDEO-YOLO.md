# Quick Test: YOLO-Style Video Detection

> **Quick command to test video detection with green YOLO boxes**

---

## 🚀 One-Line Test

```bash
cd src/backend && python manage.py test_video_yolo media/cctv/monivong-intersection.jpg
```

(Works with both images and videos!)

---

## 📝 Full Usage

### Basic Command

```bash
cd src/backend
python manage.py test_video_yolo <video_path>
```

### Examples

**Test with local video**:
```bash
python manage.py test_video_yolo media/cctv/traffic-sample.mp4
```

**Test with absolute path**:
```bash
python manage.py test_video_yolo "D:/Videos/dashcam-recording.mp4"
```

**Custom frame count**:
```bash
python manage.py test_video_yolo media/cctv/long-video.mp4 --max-frames 24
```

---

## ✅ What It Does

1. ✅ Extracts frames from video (default: 12 frames)
2. ✅ Runs AI detection on each frame
3. ✅ Draws **green YOLO-style boxes** with `0.XX` confidence
4. ✅ Creates annotated preview video
5. ✅ Saves sample frames and JSON report

---

## 📊 Output

**Console**:
```
🎬 Testing Video Detection with YOLO-Style Overlays
══════════════════════════════════════════════════════

📹 Video: traffic-sample.mp4
⏳ Extracting frames...
✓ Extracted 12 frames

🔍 Running detection on each frame...
[Frame 1/12] t=0.0s
  Vehicles: 3
    • Car - 0.85
    • motorcycle - 0.92
  Overlays: 3 bounding boxes
  ✓ Annotated frame created

...

🎥 Building annotated preview video...
✓ Preview video created: detect_out/annotated_preview.mp4

📊 Detection Statistics:
  Total frames: 12
  Frames with vehicles: 10
  Total vehicles detected: 28

✅ Video detection test complete!
🎉 All frames now match the YOLO style!
```

**Files Created** (in `detect_out/` folder):
```
detect_out/
├── annotated_preview.mp4         # Preview video with green boxes
├── frame_01_t0.0s_annotated.jpg  # Sample frames
├── frame_02_t2.5s_annotated.jpg
├── frame_03_t5.0s_annotated.jpg
├── frame_04_t7.5s_annotated.jpg
├── frame_05_t10.0s_annotated.jpg
└── report.json                   # Detection data
```

---

## 🎨 Visual Style

All frames will have:
- ✅ **Green boxes** `(0, 255, 0)`
- ✅ **Decimal confidence**: `Car 0.85` (not `Car 85%`)
- ✅ **YOLO label format**: `Class 0.92`
- ✅ **Filled label background**

Just like professional YOLO detection videos!

---

## 🔧 Options

```bash
python manage.py test_video_yolo <video_path> [options]

Options:
  --max-frames INT    Maximum frames to process (default: 12)
  --help              Show help message
```

---

## 📍 Where to Find Test Videos

**Use existing media**:
```bash
# If you have test cameras
python manage.py test_video_yolo media/cctv/monivong-intersection.jpg

# Sample videos (if available)
ls media/cctv/*.mp4
```

**Use your own**:
```bash
# Any traffic video works
python manage.py test_video_yolo ~/Downloads/dashcam.mp4
```

---

## ✅ Verify YOLO Style

After running, check:

1. **Open preview video**: `detect_out/annotated_preview.mp4`
2. **Check sample frames**: Green boxes? ✅
3. **Check confidence**: Shows `0.85` not `85%`? ✅
4. **Check report**: `detect_out/report.json`

---

## 🎉 Done!

Your video detection now produces professional YOLO-style output! 🚀
