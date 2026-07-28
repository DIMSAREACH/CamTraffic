# Data Annotation Tools

Python scripts to help with YOLO dataset labeling and annotation.

---

## 📦 Installation

```powershell
# Install required packages
pip install opencv-python matplotlib numpy

# For LabelImg (annotation tool)
pip install labelImg
```

---

## 🛠️ Tool 1: Split Dataset

**File:** `split_dataset.py`  
**Purpose:** Automatically split images into train/val/test sets

### Usage:

```powershell
python tools/split_dataset.py `
  --images "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\images" `
  --labels "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\labels" `
  --output "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\split" `
  --train 0.7 `
  --val 0.2 `
  --test 0.1
```

### Output:

```
split/
├── images/
│   ├── train/
│   ├── val/
│   └── test/
└── labels/
    ├── train/
    ├── val/
    └── test/
```

---

## 🔍 Tool 2: Verify Annotations

**File:** `verify_annotations.py`  
**Purpose:** Check annotation format and find errors

### Usage:

```powershell
python tools/verify_annotations.py `
  --images "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\images\train" `
  --labels "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\labels\train" `
  --classes "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\classes.txt"
```

### Checks:

- ✅ Valid YOLO format (5 values per line)
- ✅ Coordinates in range 0.0-1.0
- ✅ All images have labels
- ✅ No empty label files
- ✅ Class distribution

---

## 🎨 Tool 3: Visualize Annotations

**File:** `visualize_annotations.py`  
**Purpose:** Draw boxes on images to verify accuracy

### Usage:

```powershell
python tools/visualize_annotations.py `
  --images "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\images\train" `
  --labels "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\labels\train" `
  --classes "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\classes.txt" `
  --output "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\visualizations" `
  --num 10
```

### Output:

Creates annotated images with bounding boxes drawn in the output directory.

---

## 📊 Tool 4: Count Classes

**File:** `count_classes.py`  
**Purpose:** Analyze class distribution

### Usage:

```powershell
python tools/count_classes.py `
  --labels "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\labels\train" `
  --classes "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\classes.txt" `
  --chart `
  --output "class_distribution.png"
```

### Output:

- Text report with class counts
- Bar chart visualization (if `--chart` flag used)
- Class imbalance warnings

---

## 🚀 Workflow Example

### Step 1: Annotate Images

```powershell
# Launch LabelImg
labelImg

# Configure:
# - Open Dir → your images folder
# - Change Save Dir → your labels folder
# - Click "PascalVOC" → Change to "YOLO"
# - Annotate all images
```

### Step 2: Verify Annotations

```powershell
python tools/verify_annotations.py `
  --images "your_images_folder" `
  --labels "your_labels_folder" `
  --classes "classes.txt"
```

### Step 3: Visualize Samples

```powershell
python tools/visualize_annotations.py `
  --images "your_images_folder" `
  --labels "your_labels_folder" `
  --classes "classes.txt" `
  --output "visualizations" `
  --num 20
```

### Step 4: Check Class Distribution

```powershell
python tools/count_classes.py `
  --labels "your_labels_folder" `
  --classes "classes.txt" `
  --chart `
  --output "distribution.png"
```

### Step 5: Split Dataset

```powershell
python tools/split_dataset.py `
  --images "your_images_folder" `
  --labels "your_labels_folder" `
  --output "split_dataset"
```

---

## 📝 Quick Reference

### YOLO Annotation Format:

```
<class_id> <x_center> <y_center> <width> <height>
```

All values normalized 0.0 to 1.0:
- `class_id`: Integer class index (0, 1, 2, ...)
- `x_center`: Center X / Image Width
- `y_center`: Center Y / Image Height
- `width`: Box Width / Image Width
- `height`: Box Height / Image Height

### Example:

```
0 0.5 0.3 0.2 0.15
1 0.7 0.6 0.3 0.4
```

---

## 🐛 Troubleshooting

### "No images found"
- Check path is correct
- Check file extensions (.jpg, .jpeg, .png)

### "Missing label file"
- Some images not annotated yet
- Label file name must match image name

### "Invalid format"
- Check 5 values per line
- Check space-separated (not comma)

### "Out of bounds"
- Coordinates must be 0.0 to 1.0
- Re-annotate problematic images

---

## 📚 Additional Resources

- **LabelImg:** https://github.com/tzutalin/labelImg
- **YOLO Format:** https://docs.ultralytics.com/datasets/
- **CVAT:** https://opencv.github.io/cvat/docs/

---

**Ready to start annotating!** 🎯
