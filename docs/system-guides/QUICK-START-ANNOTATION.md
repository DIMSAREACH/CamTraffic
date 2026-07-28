# Quick Start: Data Annotation

**Goal:** Annotate your traffic dataset for YOLO training in the shortest time possible.

---

## ⚡ Fast Track (Beginners)

### 1. Install LabelImg (2 minutes)

```powershell
pip install labelImg
```

### 2. Prepare Folders (1 minute)

```powershell
cd "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset"
mkdir images labels
# Move all your images to the 'images' folder
```

### 3. Launch LabelImg (1 minute)

```powershell
labelImg
```

### 4. Configure LabelImg (2 minutes)

1. Click **"Open Dir"** → Select your `images` folder
2. Click **"Change Save Dir"** → Select your `labels` folder  
3. Click **"PascalVOC"** button → Change to **"YOLO"**
4. Click **"Use Default Label"** → Load `tools/classes.txt`

### 5. Start Annotating (Main Work)

**Keyboard Shortcuts:**
- `W` → Create bounding box
- `Ctrl+S` → Save annotation
- `D` → Next image
- `A` → Previous image
- `Del` → Delete selected box

**Process:**
1. Press `W`
2. Click and drag to draw box around object
3. Select class from dropdown
4. Press `Ctrl+S`
5. Press `D` for next image
6. Repeat!

### 6. Verify Annotations (5 minutes)

```powershell
python tools/verify_annotations.py `
  --images "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\images" `
  --labels "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\labels" `
  --classes "tools\classes.txt"
```

### 7. Split Dataset (2 minutes)

```powershell
python tools/split_dataset.py `
  --images "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\images" `
  --labels "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\labels" `
  --output "d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\split"
```

### 8. Train Model (Optional)

```python
from ultralytics import YOLO

model = YOLO('yolov8n.pt')
results = model.train(
    data='tools/data.yaml',
    epochs=50,
    imgsz=640,
    batch=16
)
```

---

## 🎯 Pro Tips

### Speed Up Annotation:

1. **Use Keyboard Shortcuts** → 3x faster than mouse
2. **Annotate Similar Images Together** → Less context switching
3. **Set Default Class** → Skip dropdown selection for common classes
4. **Use Auto-Save** → Don't forget to save
5. **Take Breaks** → Accuracy drops after 1 hour

### Quality Tips:

1. **Tight Boxes** → Box should fit object snugly
2. **Include All** → Don't skip small or partial objects
3. **Consistent Labels** → Always use same class name
4. **Review Samples** → Check visualizations regularly

### Time Estimates:

- **Simple images** (1-2 objects): 10-20 seconds
- **Medium images** (3-5 objects): 30-60 seconds  
- **Complex images** (6+ objects): 1-2 minutes

**For 100 images:** Expect 1-2 hours  
**For 500 images:** Expect 5-10 hours  
**For 1000 images:** Expect 10-20 hours

---

## 📊 Minimum Dataset Sizes

### For Testing/Prototyping:
- **50-100 images** → Quick proof of concept
- **Train:** 35 images
- **Val:** 10 images
- **Test:** 5 images

### For Thesis/Production:
- **500-1000 images** → Good results
- **Train:** 700 images
- **Val:** 200 images
- **Test:** 100 images

### For Best Performance:
- **2000+ images** → State-of-the-art
- **Train:** 1400 images
- **Val:** 400 images
- **Test:** 200 images

---

## 🛠️ Tools Reference

### Available Scripts:

1. **`split_dataset.py`** → Split into train/val/test
2. **`verify_annotations.py`** → Check for errors
3. **`visualize_annotations.py`** → Draw boxes on images
4. **`count_classes.py`** → Class distribution report

### Files Created:

1. **`classes.txt`** → List of class names
2. **`data.yaml`** → YOLO configuration
3. **`ANNOTATION-TOOLS-README.md`** → Full documentation

---

## ✅ Checklist

Before training:

- [ ] All images annotated
- [ ] Verification passed (no errors)
- [ ] Visualizations look correct
- [ ] Class distribution balanced
- [ ] Dataset split completed
- [ ] data.yaml configured
- [ ] Ready to train!

---

## 📚 Full Documentation

See `DATA-LABELING-ANNOTATION-GUIDE.md` for complete details!

---

**Start small (100 images), train, iterate!** 🚀
