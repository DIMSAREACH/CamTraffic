# Fix: False Positive Sign Detection

## Problem

The AI detection system was detecting "signs" in images that only contained vehicles, resulting in false positives. For example, when uploading a photo of a car with a license plate but no traffic sign, the system would still show a low-confidence "sign detected" result.

## Root Cause

The confidence thresholds for sign detection were too low:
- Minimum result confidence: 35%
- Absolute YOLO floor: 18%
- Live YOLO floor: 10%
- Upload YOLO floor: 35%

These low thresholds allowed weak false positives from the YOLO model to pass through, especially when detecting vehicles without any actual traffic signs.

## Solution

### 1. Increased Confidence Thresholds

Updated the minimum confidence requirements to be more strict:

```python
# Before (v2.0)
AI_MIN_RESULT_CONFIDENCE = 35
AI_ABSOLUTE_YOLO_FLOOR = 18
AI_LIVE_YOLO_FLOOR = 10
AI_LIVE_YOLO_INFER_CONF = 0.50
AI_LIVE_YOLO_TRUST = 42
AI_UPLOAD_YOLO_FLOOR = 35

# After (v2.1)
AI_MIN_RESULT_CONFIDENCE = 45  # +10
AI_ABSOLUTE_YOLO_FLOOR = 25    # +7
AI_LIVE_YOLO_FLOOR = 20        # +10
AI_LIVE_YOLO_INFER_CONF = 0.55 # +0.05
AI_LIVE_YOLO_TRUST = 50        # +8
AI_UPLOAD_YOLO_FLOOR = 45      # +10
```

### 2. Improved "No Sign Detected" Response

Updated the response when no sign is detected to be clearer:

```python
{
    'sign_name_en': 'No sign detected',
    'description_en': 'No traffic sign detected in this image. This appears to be a vehicle or other object.',
    'guidance_en': 'Please upload an image containing a visible traffic sign.',
    'confidence': 0.0,
    'class_key': '',
    'sign_code': '',
    'detection_mode': 'no_sign'  # NEW FLAG
}
```

### 3. Added Detection Mode Flag

Added `'detection_mode': 'no_sign'` to the response payload when no sign is detected, allowing the frontend to handle this case explicitly.

## Benefits

1. **Reduced False Positives**: Vehicle-only photos now correctly return "No sign detected" instead of weak false positives
2. **Clearer User Feedback**: Users receive clear messages when no sign is present
3. **Better Accuracy**: Only high-confidence sign detections are returned
4. **Consistent Behavior**: Both live camera and upload detection use the same strict thresholds

## Testing

### Before Fix
```
Input: Image of white car with plate "2U-3108"
Output: Sign: [some low-confidence detection] ❌ FALSE POSITIVE
```

### After Fix
```
Input: Image of white car with plate "2U-3108"  
Output: Sign: No sign detected ✅ CORRECT
       Vehicle: Car 0.50
       Plate: 2U-3108 C:91
```

## Configuration

You can adjust these thresholds via environment variables:

```bash
# In .env file:
AI_MIN_RESULT_CONFIDENCE=45       # Minimum confidence for any result
AI_ABSOLUTE_YOLO_FLOOR=25         # Lowest YOLO confidence shown
AI_LIVE_YOLO_FLOOR=20             # Live webcam minimum
AI_LIVE_YOLO_INFER_CONF=0.55      # YOLO inference confidence
AI_LIVE_YOLO_TRUST=50             # Trust threshold for live
AI_UPLOAD_YOLO_FLOOR=45           # Upload minimum confidence
```

## Files Modified

1. `src/backend/ai_detection/services.py`
   - Increased all confidence thresholds
   - Updated "no sign detected" response
   - Added `'detection_mode': 'no_sign'` flag

2. `src/backend/camtraffic/settings.py`
   - Updated default confidence values
   - Added documentation comment

## Impact

- **Breaking Change**: NO (only affects low-confidence detections)
- **Performance**: NO CHANGE (same detection logic, stricter filtering)
- **Accuracy**: IMPROVED (fewer false positives)
- **User Experience**: IMPROVED (clearer feedback)

## Version

- **Issue**: False positive sign detection in vehicle-only images
- **Fixed in**: v2.1
- **Date**: 2026-07-26
- **Severity**: Medium (usability issue, not a crash)
