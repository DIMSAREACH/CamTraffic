"""
Visualize YOLO Annotations
Draw bounding boxes on images to verify accuracy
"""
import os
import cv2
import random
from pathlib import Path


def load_classes(classes_file):
    """Load class names from file"""
    if not classes_file or not Path(classes_file).exists():
        return {}
    with open(classes_file, 'r') as f:
        return {i: line.strip() for i, line in enumerate(f)}


def draw_yolo_boxes(image_path, label_path, class_names, output_path=None):
    """
    Draw YOLO bounding boxes on image
    
    Args:
        image_path: Path to image
        label_path: Path to label file
        class_names: Dictionary of class names {id: name}
        output_path: Path to save annotated image (optional)
    
    Returns:
        Annotated image (numpy array)
    """
    # Read image
    img = cv2.imread(str(image_path))
    if img is None:
        print(f"❌ Cannot read image: {image_path}")
        return None
    
    h, w = img.shape[:2]
    
    # Read label file
    if not Path(label_path).exists():
        print(f"⚠️  No label file: {label_path}")
        return img
    
    with open(label_path, 'r') as f:
        lines = f.readlines()
    
    # Color palette for different classes
    colors = [
        (0, 255, 0),    # Green
        (255, 0, 0),    # Blue
        (0, 0, 255),    # Red
        (255, 255, 0),  # Cyan
        (255, 0, 255),  # Magenta
        (0, 255, 255),  # Yellow
        (128, 0, 128),  # Purple
        (255, 128, 0),  # Orange
    ]
    
    # Draw each box
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        parts = line.split()
        if len(parts) != 5:
            continue
        
        try:
            class_id = int(parts[0])
            x_center = float(parts[1])
            y_center = float(parts[2])
            box_w = float(parts[3])
            box_h = float(parts[4])
        except ValueError:
            continue
        
        # Convert YOLO format to pixel coordinates
        x1 = int((x_center - box_w/2) * w)
        y1 = int((y_center - box_h/2) * h)
        x2 = int((x_center + box_w/2) * w)
        y2 = int((y_center + box_h/2) * h)
        
        # Choose color based on class
        color = colors[class_id % len(colors)]
        
        # Draw bounding box
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        
        # Draw label
        class_name = class_names.get(class_id, f"Class {class_id}")
        label = f"{class_name}"
        
        # Draw label background
        (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(img, (x1, y1 - label_h - 10), (x1 + label_w + 10, y1), color, -1)
        
        # Draw label text
        cv2.putText(img, label, (x1 + 5, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    
    # Save if output path provided
    if output_path:
        cv2.imwrite(str(output_path), img)
        print(f"✅ Saved: {output_path}")
    
    return img


def visualize_random_samples(images_dir, labels_dir, classes_file, output_dir, num_samples=10):
    """
    Visualize random sample of annotated images
    
    Args:
        images_dir: Path to images directory
        labels_dir: Path to labels directory
        classes_file: Path to classes.txt
        output_dir: Path to save visualizations
        num_samples: Number of random samples to visualize
    """
    print(f"🎨 Visualizing {num_samples} random samples...\n")
    
    # Load class names
    class_names = load_classes(classes_file)
    print(f"📋 Loaded {len(class_names)} classes")
    
    # Get all images
    image_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
    all_images = []
    for ext in image_extensions:
        all_images.extend(list(Path(images_dir).glob(f'*{ext}')))
    
    if len(all_images) == 0:
        print("❌ No images found!")
        return
    
    print(f"📊 Found {len(all_images)} images")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Select random samples
    samples = random.sample(all_images, min(num_samples, len(all_images)))
    
    # Visualize each sample
    for i, img_path in enumerate(samples, 1):
        print(f"\n[{i}/{len(samples)}] Processing: {img_path.name}")
        
        label_path = Path(labels_dir) / (img_path.stem + '.txt')
        output_path = Path(output_dir) / f"annotated_{img_path.name}"
        
        draw_yolo_boxes(img_path, label_path, class_names, output_path)
    
    print(f"\n✅ Visualizations saved to: {output_dir}")
    print(f"📁 Open the folder to review annotated images")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Visualize YOLO annotations')
    parser.add_argument('--images', type=str, required=True,
                        help='Path to images directory')
    parser.add_argument('--labels', type=str, required=True,
                        help='Path to labels directory')
    parser.add_argument('--classes', type=str, default=None,
                        help='Path to classes.txt (optional)')
    parser.add_argument('--output', type=str, required=True,
                        help='Path to output directory')
    parser.add_argument('--num', type=int, default=10,
                        help='Number of random samples (default: 10)')
    
    args = parser.parse_args()
    
    visualize_random_samples(
        images_dir=args.images,
        labels_dir=args.labels,
        classes_file=args.classes,
        output_dir=args.output,
        num_samples=args.num
    )
