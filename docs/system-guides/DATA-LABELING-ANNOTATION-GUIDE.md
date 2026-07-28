# Complete Data Labeling & Annotation Guide

**Date:** July 26, 2026  
**Dataset Location:** `d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset`  
**Purpose:** Create training data for YOLO models (Signs, Vehicles, Plates)

---

## 📋 Overview

Data labeling is the process of:
1. Drawing bounding boxes around objects in images
2. Assigning class labels (e.g., "car", "motorcycle", "no_entry_sign")
3. Saving annotations in YOLO format
4. Organizing data for training

---

## 🎯 What Needs to be Labeled

### 1. Traffic Signs (248 classes)
- No Entry, Stop, Speed Limits, Yield, etc.
- All Cambodian traffic signs
- **Bounding Box:** Tightly around sign
- **Label Format:** `sign_class_name`

### 2. Vehicles (4 main classes)
- Cars, Motorcycles, Trucks, Buses
- **Bounding Box:** Full vehicle body
- **Label Format:** `car`, `motorcycle`, `truck`, `bus`

### 3. License Plates
- Cambodia format plates (2A-1234)
- **Bounding Box:** Plate rectangle only
- **Label Format:** `license_plate`

---

## 🛠️ Recommended Tools

### Option 1: LabelImg (Best for Beginners)
**Pros:**
- ✅ Free and open-source
- ✅ Easy to use
- ✅ Exports YOLO format directly
- ✅ Keyboard shortcuts for speed

**Install:**
```powershell
pip install labelImg
labelImg
```

**Quick Start:**
1. Open Dir: Select your image folder
2. Change Save Dir: Create labels folder
3. Click "Create RectBox" or press 'W'
4. Draw box around object
5. Select class from list
6. Press 'Ctrl+S' to save
7. Press 'D' for next image

### Option 2: CVAT (Best for Large Datasets)
**Pros:**
- ✅ Web-based, works anywhere
- ✅ Team collaboration
- ✅ Auto-annotation with AI
- ✅ Quality control tools

**Setup:**
```powershell
# Run CVAT with Docker
docker run -d -p 8080:8080 cvat/server
```

**Access:** http://localhost:8080

### Option 3: Roboflow (Best for Management)
**Pros:**
- ✅ Cloud-based
- ✅ Dataset versioning
- ✅ Auto-augmentation
- ✅ Export to any format

**URL:** https://roboflow.com

---

## 📁 Folder Structure

### Before Annotation:
```
Image Dataset/
├── images/
│   ├── img001.jpg
│   ├── img002.jpg
│   └── ...
└── README.md
```

### After Annotation (YOLO Format):
```
Image Dataset/
├── images/
│   ├── train/
│   │   ├── img001.jpg
│   │   ├── img002.jpg
│   │   └── ...
│   ├── val/
│   │   ├── img101.jpg
│   │   └── ...
│   └── test/
│       ├── img201.jpg
│       └── ...
├── labels/
│   ├── train/
│   │   ├── img001.txt
│   │   ├── img002.txt
│   │   └── ...
│   ├── val/
│   │   ├── img101.txt
│   │   └── ...
│   └── test/
│       ├── img201.txt
│       └── ...
├── data.yaml
└── classes.txt
```

---

## 📝 YOLO Annotation Format

### Format:
```
<class_id> <x_center> <y_center> <width> <height>
```

All coordinates are **normalized** (0.0 to 1.0):
- `class_id`: Integer index of class (0, 1, 2, ...)
- `x_center`: Center X / Image Width
- `y_center`: Center Y / Image Height
- `width`: Box Width / Image Width
- `height`: Box Height / Image Height

### Example: `img001.txt`
```
0 0.5 0.3 0.2 0.15
1 0.7 0.6 0.3 0.4
2 0.2 0.8 0.1 0.05
```

**Translation:**
- Class 0 (sign): Center at 50% width, 30% height, 20% wide, 15% tall
- Class 1 (car): Center at 70% width, 60% height, 30% wide, 40% tall
- Class 2 (plate): Center at 20% width, 80% height, 10% wide, 5% tall

---

## 📊 Dataset Split (Standard Practice)

### Recommended Split:
- **Train:** 70% (for learning)
- **Val:** 20% (for validation during training)
- **Test:** 10% (for final evaluation)

### Example with 1000 images:
- Train: 700 images
- Val: 200 images
- Test: 100 images

---

## 🎨 Class Definitions

### Classes.txt
Create a file listing all classes (one per line):

```txt
no_entry
stop
speed_limit_40
speed_limit_60
yield
car
motorcycle
truck
bus
license_plate
```

### data.yaml (YOLO Configuration)
```yaml
# Dataset configuration for YOLO training

# Paths (relative to data.yaml location)
path: ../Image Dataset  # Root directory
train: images/train     # Train images
val: images/val         # Validation images
test: images/test       # Test images (optional)

# Classes
nc: 10  # Number of classes

# Class names (index matches class_id in annotations)
names:
  0: no_entry
  1: stop
  2: speed_limit_40
  3: speed_limit_60
  4: yield
  5: car
  6: motorcycle
  7: truck
  8: bus
  9: license_plate
```

---

## 🚀 Step-by-Step Process

### Phase 1: Setup (30 minutes)

1. **Install LabelImg:**
   ```powershell
   pip install labelImg
   ```

2. **Create Folder Structure:**
   ```powershell
   cd "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset"
   mkdir images\train images\val images\test
   mkdir labels\train labels\val labels\test
   ```

3. **Create classes.txt:**
   List all your classes (see above)

4. **Create data.yaml:**
   YOLO configuration (see above)

### Phase 2: Annotation (Main Work)

1. **Launch LabelImg:**
   ```powershell
   labelImg
   ```

2. **Configure:**
   - Click "Open Dir" → Select `images/train`
   - Click "Change Save Dir" → Select `labels/train`
   - Click "PascalVOC" button → Change to "YOLO"
   - Click "Use Default Label" → Load your classes

3. **Annotate Images:**
   - Press **W** → Draw bounding box
   - Select class from dropdown
   - Press **Ctrl+S** → Save
   - Press **D** → Next image
   - Repeat for all images

4. **Quality Checks:**
   - Box should tightly fit object
   - No cut-off objects at image edges
   - Consistent class naming
   - One label file per image

### Phase 3: Validation (2-4 hours)

1. **Count Files:**
   - Images count = Labels count
   - All label files have content

2. **Check Format:**
   - Values between 0.0 and 1.0
   - 5 values per line
   - Class IDs match data.yaml

3. **Visual Verification:**
   - Use verification script (below)
   - Check random samples

### Phase 4: Organization (1 hour)

1. **Split Dataset:**
   - Use split script (below)
   - Move images to train/val/test
   - Move labels to train/val/test

2. **Final Structure:**
   - Verify folder structure matches YOLO format
   - Test with small training run

---

## 📊 Annotation Best Practices

### DO ✅

1. **Tight Bounding Boxes**
   - Box should tightly fit object
   - Include all parts (mirrors, wheels, etc.)
   - No excessive padding

2. **Consistent Labels**
   - Same class for same object type
   - Don't mix "car" and "sedan"
   - Use standard names

3. **Complete Annotation**
   - Label ALL objects in image
   - Don't skip small/distant objects
   - Include partially visible objects (>50% visible)

4. **Quality Over Speed**
   - Take time for accurate boxes
   - Double-check before moving on
   - Review difficult cases

### DON'T ❌

1. **Overlapping Boxes**
   - Don't draw multiple boxes for same object
   - One box per object

2. **Incorrect Classes**
   - Don't label motorcycle as car
   - Don't guess if unsure

3. **Cut-Off Objects**
   - Skip objects <30% visible
   - Don't annotate tiny/unclear objects

4. **Inconsistent Naming**
   - Don't use "Speed-Limit-40" and "speed_limit_40"
   - Stick to one naming convention

---

## ⏱️ Time Estimates

### Per Image (Average):
- **Simple** (1-2 objects): 10-20 seconds
- **Medium** (3-5 objects): 30-60 seconds
- **Complex** (6+ objects): 1-2 minutes

### Full Dataset:
- **100 images**: 1-2 hours
- **500 images**: 5-10 hours
- **1000 images**: 10-20 hours
- **5000 images**: 50-100 hours

### Recommendation:
- Start with 100-200 high-quality images
- Train a model to see results
- Add more images based on model weaknesses

---

## 🤖 Automation Helpers

I've created several Python scripts to help automate parts of the process:

### 1. `split_dataset.py`
Automatically split images into train/val/test

### 2. `verify_annotations.py`
Check annotation format and consistency

### 3. `visualize_annotations.py`
Draw boxes on images to verify accuracy

### 4. `count_classes.py`
Count instances of each class

### 5. `fix_annotations.py`
Auto-fix common annotation errors

---

## 📈 Progress Tracking

### Create a Progress Log:

```csv
Date,Images Annotated,Total Annotations,Hours Spent,Notes
2026-07-26,50,150,1.5,Traffic signs mostly
2026-07-27,100,320,2.0,Added vehicles
2026-07-28,150,480,2.5,License plates
...
```

### Milestones:
- [ ] 100 images annotated
- [ ] 500 images annotated
- [ ] 1000 images annotated
- [ ] Dataset split into train/val/test
- [ ] First model trained
- [ ] Model evaluation complete

---

## 🎓 Training After Annotation

Once annotation is complete:

### 1. Verify Dataset:
```python
python verify_annotations.py
```

### 2. Train YOLO Model:
```python
from ultralytics import YOLO

model = YOLO('yolov8n.pt')  # Start with nano model
results = model.train(
    data='data.yaml',
    epochs=100,
    imgsz=640,
    batch=16,
    name='traffic_detection'
)
```

### 3. Evaluate Results:
```python
metrics = model.val()
print(f"mAP50: {metrics.box.map50}")
print(f"mAP50-95: {metrics.box.map}")
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "No labels found"
**Cause:** Label files not in correct folder  
**Fix:** Ensure labels/ mirrors images/ structure

### Issue 2: "Invalid annotation format"
**Cause:** Wrong coordinate format  
**Fix:** Values must be 0.0-1.0, space-separated

### Issue 3: "Class ID out of range"
**Cause:** Class ID not in data.yaml  
**Fix:** Update nc and names in data.yaml

### Issue 4: "Empty label file"
**Cause:** Image has no annotations  
**Fix:** Either annotate or remove image

### Issue 5: "Box outside image bounds"
**Cause:** Coordinates > 1.0  
**Fix:** Normalize coordinates properly

---

## 📚 Resources

### Tutorials:
- **LabelImg Guide:** https://github.com/tzutalin/labelImg
- **YOLO Format:** https://docs.ultralytics.com/datasets/
- **CVAT Docs:** https://opencv.github.io/cvat/docs/

### Dataset Inspiration:
- **COCO Dataset:** https://cocodataset.org
- **Pascal VOC:** http://host.robots.ox.ac.uk/pascal/VOC/
- **Traffic Sign Datasets:** Multiple available on Kaggle

---

## ✅ Quality Checklist

Before considering annotation complete:

- [ ] All images have corresponding label files
- [ ] All label files have valid YOLO format
- [ ] Class IDs match data.yaml
- [ ] Bounding boxes are tight and accurate
- [ ] Dataset split is 70/20/10
- [ ] data.yaml is configured correctly
- [ ] Visual verification looks good
- [ ] Sample training run succeeds
- [ ] Model produces reasonable predictions

---

## 🎯 Next Steps

After completing annotation:

1. **Train Initial Model** (100-200 images)
2. **Evaluate Performance**
3. **Identify Weak Classes**
4. **Add More Images** for weak classes
5. **Iterate** until satisfactory accuracy
6. **Deploy Model** to your system

---

## 📞 Getting Help

If you get stuck:
1. Check error messages carefully
2. Verify file paths and structure
3. Review sample annotations
4. Test with small subset first
5. Check YOLO documentation

---

**Status:** Ready to begin annotation!  
**Estimated Time:** 10-100 hours depending on dataset size  
**Recommended Approach:** Start small (100 images), train, iterate

---

**Note:** I'll now create the automation scripts to help you with the process!
