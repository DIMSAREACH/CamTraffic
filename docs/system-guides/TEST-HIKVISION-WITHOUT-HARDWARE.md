# Testing Hikvision Camera Without Physical Hardware

## Overview
Complete guide to test the Hikvision iDS-TCD402-CR/12/64G camera integration without the actual camera hardware.

## 🎯 What You Can Test

### ✅ Without Hardware
- Camera model specifications
- Database storage
- API endpoints and responses
- Camera management UI
- Model specs in frontend
- Detection with simulated data
- Batch processing with test images

### ❌ Cannot Test (Needs Real Camera)
- Live RTSP stream capture
- Real-time radar speed measurement
- Actual 256-target tracking
- Physical all-weather performance

## 🚀 Quick Start

### Step 1: Create Test Cameras

```bash
cd src/backend

# Create 3 test cameras with Hikvision specs
python manage.py create_test_hikvision_cameras --count 3 --use-local-images

# Output:
# ✓ Created camera: TEST-HIK-001
#   Model: iDS-TCD402-CR/12/64G
#   Type: speed
#   Status: Ready for testing
```

### Step 2: Add Test Images

Copy sample traffic images to simulate camera output:

```bash
# Windows PowerShell
mkdir "src\backend\media\cctv" -Force
copy "ai\datasets\samples\live_camera_frames\monivong-intersection.jpg" "src\backend\media\cctv\test-hikvision-1.jpg"
copy "ai\datasets\samples\live_camera_frames\monivong-ptz.jpg" "src\backend\media\cctv\test-hikvision-2.jpg"
copy "ai\datasets\samples\live_camera_frames\nr6-highway.jpg" "src\backend\media\cctv\test-hikvision-3.jpg"
```

### Step 3: Test API Endpoints

```bash
# Get camera list with specs
curl http://localhost:8000/api/cameras/

# Get specific camera details
curl http://localhost:8000/api/cameras/TEST-HIK-001/
```

**Expected Response:**
```json
{
  "id": "uuid",
  "name": "Monivong-Sihanouk Intersection (TEST)",
  "code": "TEST-HIK-001",
  "model": "iDS-TCD402-CR/12/64G",
  "brand": "Hikvision",
  "model_specs": {
    "manufacturer": "Hikvision",
    "model_name": "Traffic Flow Detection Camera",
    "has_radar": true,
    "radar_frequency_ghz": 77.0,
    "radar_range_m": [15, 350],
    "max_targets": 256,
    "capture_rate_percent": 95.0,
    "lane_coverage": 4,
    "speed_range_kmh": [-300, 300],
    "speed_accuracy_kmh": 2.0,
    "supports_virtual_coils": true,
    "supports_anpr": true,
    "supports_traffic_flow": true,
    "supports_incident_detection": true
  }
}
```

## 📸 Test Detection with Simulated Camera Feed

### Method 1: Use Test Images as Camera Snapshots

```bash
# Test detection on simulated camera frame
curl -X POST http://localhost:8000/api/detection/process-frame/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@src/backend/media/cctv/test-hikvision-1.jpg" \
  -F "camera_id=TEST-HIK-001" \
  -F "live_fast=true"
```

### Method 2: Python Test Script

```python
# test_hikvision_camera.py
import requests
from pathlib import Path

# Get test camera
camera_response = requests.get(
    'http://localhost:8000/api/cameras/',
    params={'code': 'TEST-HIK-001'}
)
camera = camera_response.json()['results'][0]

print(f"Testing camera: {camera['name']}")
print(f"Model: {camera['model']}")
print(f"Has radar: {camera['model_specs']['has_radar']}")
print(f"Max targets: {camera['model_specs']['max_targets']}")

# Simulate detection from camera
test_image = Path('src/backend/media/cctv/test-hikvision-1.jpg')

with open(test_image, 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/detection/process-frame/',
        headers={'Authorization': 'Bearer YOUR_TOKEN'},
        files={'image': f},
        data={
            'camera_id': camera['id'],
            'live_fast': 'true',
            'enable_ocr': 'true',
        }
    )

result = response.json()
print(f"\nDetection results:")
print(f"Vehicles: {len(result['data']['vehicles'])}")
print(f"Plate: {result['data'].get('plate_text', 'None')}")
```

### Method 3: Batch Test Multiple Cameras

```python
# test_all_hikvision.py
from infrastructure.models import Camera
from infrastructure.camera_models import get_camera_model_spec

# Get all test Hikvision cameras
cameras = Camera.objects.filter(
    code__startswith='TEST-HIK',
    model='iDS-TCD402-CR/12/64G'
)

for camera in cameras:
    print(f"\n{'='*60}")
    print(f"Camera: {camera.name}")
    print(f"Code: {camera.code}")
    
    spec = get_camera_model_spec(camera.model)
    print(f"\nSpecs:")
    print(f"  Radar: {spec.radar_frequency_ghz} GHz")
    print(f"  Range: {spec.radar_range_m[0]}-{spec.radar_range_m[1]}m")
    print(f"  Max targets: {spec.max_targets}")
    print(f"  Lane coverage: {spec.lane_coverage}")
    print(f"  Capture rate: {spec.capture_rate_percent}%")
    
    # Simulate detection
    frame_path = camera.frame_source_url.replace('/media/', 'media/')
    if Path(frame_path).exists():
        print(f"\n✓ Test image available: {frame_path}")
        # Run detection here
    else:
        print(f"\n✗ Test image missing: {frame_path}")
```

## 🎨 Frontend Testing

### Display Camera with Specs

```typescript
// Test in your frontend
useEffect(() => {
  async function testHikvisionCamera() {
    const response = await fetch('/api/cameras/?code=TEST-HIK-001');
    const data = await response.json();
    const camera = data.results[0];
    
    console.log('Camera Model:', camera.model);
    console.log('Has Radar:', camera.model_specs?.has_radar);
    console.log('Max Targets:', camera.model_specs?.max_targets);
    
    // Display in UI
    setCamera(camera);
  }
  
  testHikvisionCamera();
}, []);

// Render
{camera.model_specs?.has_radar && (
  <div className="radar-badge">
    <span>🎯 Radar: {camera.model_specs.radar_frequency_ghz} GHz</span>
    <span>256 Targets | 4 Lanes | 95% Capture</span>
  </div>
)}
```

## 🧪 Mock Radar Data

### Simulate Radar Speed Measurements

```python
# infrastructure/camera_simulator.py
from dataclasses import dataclass
from random import uniform, randint

@dataclass
class SimulatedRadarData:
    """Simulate Hikvision radar detection data for testing."""
    target_count: int
    speeds: list[float]  # km/h
    lanes: list[int]
    vehicle_types: list[str]

def simulate_hikvision_radar_data(camera):
    """Generate realistic radar data for testing."""
    spec = get_camera_model_spec(camera.model)
    
    if not spec or not spec.has_radar:
        return None
    
    # Simulate 5-20 vehicles detected by radar
    target_count = randint(5, 20)
    
    speeds = [
        round(uniform(30, 80), 1)  # Speed in km/h
        for _ in range(target_count)
    ]
    
    lanes = [
        randint(1, spec.lane_coverage)
        for _ in range(target_count)
    ]
    
    vehicle_types = [
        'car' if uniform(0, 1) > 0.3 else 'truck'
        for _ in range(target_count)
    ]
    
    return SimulatedRadarData(
        target_count=target_count,
        speeds=speeds,
        lanes=lanes,
        vehicle_types=vehicle_types,
    )

# Usage
camera = Camera.objects.get(code='TEST-HIK-001')
radar_data = simulate_hikvision_radar_data(camera)

print(f"Radar detected {radar_data.target_count} vehicles")
print(f"Speeds: {radar_data.speeds[:5]}...")
print(f"Lanes: {radar_data.lanes[:5]}...")
```

## 📊 Mock Virtual Coils

```python
# Simulate virtual coil detections
def simulate_virtual_coils(camera):
    """Simulate virtual coil zone detection."""
    spec = get_camera_model_spec(camera.model)
    
    if not spec.supports_virtual_coils:
        return None
    
    # Virtual coil configuration
    coils = {
        'row_1': {
            'vehicles_detected': randint(0, 8),
            'average_speed': round(uniform(40, 70), 1),
            'lane_occupancy': {
                1: randint(0, 3),
                2: randint(0, 3),
                3: randint(0, 2),
                4: randint(0, 2),
            }
        },
        'row_2': {
            'vehicles_detected': randint(0, 8),
            'average_speed': round(uniform(40, 70), 1),
            'lane_occupancy': {
                1: randint(0, 3),
                2: randint(0, 3),
                3: randint(0, 2),
                4: randint(0, 2),
            }
        }
    }
    
    return coils
```

## 🎬 Video Simulation

### Create Mock RTSP Stream Response

```python
# For testing RTSP stream handling (without real stream)
def mock_camera_snapshot(camera):
    """Return a test image as if captured from camera RTSP stream."""
    # Map test cameras to test images
    test_images = {
        'TEST-HIK-001': 'media/cctv/test-hikvision-1.jpg',
        'TEST-HIK-002': 'media/cctv/test-hikvision-2.jpg',
        'TEST-HIK-003': 'media/cctv/test-hikvision-3.jpg',
    }
    
    image_path = test_images.get(camera.code)
    if image_path and Path(image_path).exists():
        return image_path
    
    # Fallback to sample images
    return 'ai/datasets/samples/live_camera_frames/monivong-intersection.jpg'
```

## ✅ Verification Checklist

### Database Tests
```bash
python manage.py shell
```

```python
from infrastructure.models import Camera
from infrastructure.camera_models import get_camera_model_spec

# 1. Check camera exists
camera = Camera.objects.get(code='TEST-HIK-001')
assert camera.model == 'iDS-TCD402-CR/12/64G'
assert camera.brand == 'Hikvision'

# 2. Check specs loaded
spec = get_camera_model_spec(camera.model)
assert spec.has_radar == True
assert spec.max_targets == 256
assert spec.lane_coverage == 4

# 3. Check camera type
assert camera.camera_type == 'speed'
assert camera.ai_enabled == True

print("✅ All database tests passed!")
```

### API Tests
```bash
# Test camera list
curl http://localhost:8000/api/cameras/ | jq '.results[] | select(.code | startswith("TEST-HIK"))'

# Test camera detail
curl http://localhost:8000/api/cameras/TEST-HIK-001/ | jq '.model_specs'

# Test detection (requires auth)
curl -X POST http://localhost:8000/api/detection/process-frame/ \
  -H "Authorization: Bearer TOKEN" \
  -F "image=@media/cctv/test-hikvision-1.jpg" \
  -F "camera_id=TEST-HIK-001"
```

## 🧹 Cleanup Test Data

```bash
# Remove all test cameras
python manage.py shell -c "
from infrastructure.models import Camera
deleted = Camera.objects.filter(code__startswith='TEST-HIK').delete()
print(f'Deleted {deleted[0]} test cameras')
"

# Remove test images
rm src/backend/media/cctv/test-hikvision-*.jpg
```

## 📝 Testing Checklist

- [ ] Test cameras created successfully
- [ ] Camera model specs returned in API
- [ ] Model specs display in frontend
- [ ] Detection works with test images
- [ ] Batch detection processes test cameras
- [ ] Camera list shows Hikvision badge
- [ ] Specs include radar information
- [ ] Virtual coil support indicated
- [ ] ANPR flag set correctly
- [ ] All-weather badge displayed

## 🎓 What This Tests

### ✅ Fully Tested
1. **Database integration** - Camera specs stored correctly
2. **API responses** - Model specs returned properly
3. **Frontend display** - Specs shown in UI
4. **Detection pipeline** - AI works with simulated feeds
5. **Batch processing** - Test cameras processed in bulk
6. **Management commands** - Camera creation automated

### ⚠️ Partially Tested (Simulated)
1. **Radar data** - Mocked, not real measurements
2. **Multi-target tracking** - Simulated counts
3. **Speed accuracy** - Cannot verify ±2 km/h
4. **Virtual coils** - Zones simulated
5. **All-weather** - Cannot test IP67 rating

### ❌ Cannot Test Without Hardware
1. **Live RTSP stream** - No real video feed
2. **77 GHz radar** - No physical radar
3. **350m range** - Cannot verify distance
4. **True 256 targets** - Cannot test capacity
5. **Environmental durability** - IP67 rating

## 🚀 When You Get Real Hardware

Once you have the physical camera:

1. **Update camera configuration:**
   ```python
   camera = Camera.objects.get(code='TEST-HIK-001')
   camera.code = 'CAM-PP-001'  # Remove TEST prefix
   camera.rtsp_url = 'rtsp://192.168.1.100:554/stream1'
   camera.frame_source_url = 'http://192.168.1.100/snapshot.jpg'
   camera.ip_address = '192.168.1.100'
   camera.save()
   ```

2. **Test real connection:**
   ```bash
   curl http://192.168.1.100/snapshot.jpg > test_real.jpg
   ```

3. **Run live detection:**
   ```bash
   python manage.py detect_all_cameras --camera-ids CAM-PP-001
   ```

---

**Testing Status:** ✅ Ready to test without hardware  
**Hardware Required:** Only for live RTSP and radar validation  
**Next Steps:** Create test cameras and run detection tests
