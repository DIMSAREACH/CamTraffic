"""
Verify YOLO Annotations
Check format, consistency, and common errors
"""
import os
from pathlib import Path
from collections import defaultdict


def verify_annotations(images_dir, labels_dir, classes_file=None):
    """
    Verify YOLO format annotations
    
    Args:
        images_dir: Path to images directory
        labels_dir: Path to labels directory
        classes_file: Optional path to classes.txt
    """
    print("🔍 Verifying YOLO annotations...\n")
    
    # Get all images
    image_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
    all_images = []
    for ext in image_extensions:
        all_images.extend(list(Path(images_dir).glob(f'*{ext}')))
    
    total_images = len(all_images)
    print(f"📊 Found {total_images} images\n")
    
    if total_images == 0:
        print("❌ No images found! Check images_dir path.")
        return
    
    # Load class names if provided
    class_names = {}
    if classes_file and Path(classes_file).exists():
        with open(classes_file, 'r') as f:
            class_names = {i: line.strip() for i, line in enumerate(f)}
        print(f"📋 Loaded {len(class_names)} classes from {classes_file}")
    
    # Statistics
    stats = {
        'total_images': total_images,
        'images_with_labels': 0,
        'images_without_labels': 0,
        'total_annotations': 0,
        'empty_label_files': 0,
        'invalid_format': 0,
        'out_of_bounds': 0,
        'class_counts': defaultdict(int),
        'errors': []
    }
    
    missing_labels = []
    empty_labels = []
    invalid_labels = []
    out_of_bounds_labels = []
    
    # Verify each image
    for img_path in all_images:
        label_name = img_path.stem + '.txt'
        label_path = Path(labels_dir) / label_name
        
        # Check if label exists
        if not label_path.exists():
            stats['images_without_labels'] += 1
            missing_labels.append(img_path.name)
            continue
        
        stats['images_with_labels'] += 1
        
        # Read and verify label file
        with open(label_path, 'r') as f:
            lines = f.readlines()
        
        if len(lines) == 0:
            stats['empty_label_files'] += 1
            empty_labels.append(img_path.name)
            continue
        
        # Verify each annotation line
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue
            
            parts = line.split()
            
            # Check format: class_id x_center y_center width height
            if len(parts) != 5:
                stats['invalid_format'] += 1
                error = f"{img_path.name}:{line_num} - Invalid format (expected 5 values, got {len(parts)})"
                invalid_labels.append(error)
                stats['errors'].append(error)
                continue
            
            try:
                class_id = int(parts[0])
                x_center = float(parts[1])
                y_center = float(parts[2])
                width = float(parts[3])
                height = float(parts[4])
            except ValueError as e:
                stats['invalid_format'] += 1
                error = f"{img_path.name}:{line_num} - Cannot parse values: {e}"
                invalid_labels.append(error)
                stats['errors'].append(error)
                continue
            
            # Check bounds (0.0 to 1.0)
            if not (0.0 <= x_center <= 1.0 and 0.0 <= y_center <= 1.0 and
                    0.0 < width <= 1.0 and 0.0 < height <= 1.0):
                stats['out_of_bounds'] += 1
                error = f"{img_path.name}:{line_num} - Out of bounds: ({x_center:.3f}, {y_center:.3f}, {width:.3f}, {height:.3f})"
                out_of_bounds_labels.append(error)
                stats['errors'].append(error)
            
            # Count classes
            stats['class_counts'][class_id] += 1
            stats['total_annotations'] += 1
    
    # Print results
    print(f"\n📊 Verification Results:")
    print(f"{'='*60}")
    print(f"Total Images:              {stats['total_images']}")
    print(f"Images With Labels:        {stats['images_with_labels']} ({stats['images_with_labels']/stats['total_images']*100:.1f}%)")
    print(f"Images Without Labels:     {stats['images_without_labels']} ({stats['images_without_labels']/stats['total_images']*100:.1f}%)")
    print(f"Empty Label Files:         {stats['empty_label_files']}")
    print(f"Total Annotations:         {stats['total_annotations']}")
    print(f"Annotations Per Image:     {stats['total_annotations']/max(stats['images_with_labels'],1):.2f}")
    print(f"\n❌ Errors Found:")
    print(f"Invalid Format:            {stats['invalid_format']}")
    print(f"Out of Bounds:             {stats['out_of_bounds']}")
    
    # Class distribution
    if stats['class_counts']:
        print(f"\n📋 Class Distribution:")
        print(f"{'='*60}")
        sorted_classes = sorted(stats['class_counts'].items())
        for class_id, count in sorted_classes:
            class_name = class_names.get(class_id, f"Class {class_id}")
            percentage = count / stats['total_annotations'] * 100
            print(f"{class_name:30s} {count:6d} ({percentage:5.1f}%)")
    
    # Print errors (limited)
    if stats['errors']:
        print(f"\n⚠️  First 10 Errors:")
        print(f"{'='*60}")
        for error in stats['errors'][:10]:
            print(f"   {error}")
        if len(stats['errors']) > 10:
            print(f"   ... and {len(stats['errors']-10)} more errors")
    
    # Print missing labels (limited)
    if missing_labels:
        print(f"\n⚠️  First 10 Missing Labels:")
        print(f"{'='*60}")
        for img_name in missing_labels[:10]:
            print(f"   {img_name}")
        if len(missing_labels) > 10:
            print(f"   ... and {len(missing_labels)-10} more missing")
    
    # Final verdict
    print(f"\n{'='*60}")
    if stats['errors'] or missing_labels:
        print("❌ FAILED - Errors found! Please fix before training.")
        return False
    else:
        print("✅ PASSED - All annotations are valid!")
        return True


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Verify YOLO annotations')
    parser.add_argument('--images', type=str, required=True,
                        help='Path to images directory')
    parser.add_argument('--labels', type=str, required=True,
                        help='Path to labels directory')
    parser.add_argument('--classes', type=str, default=None,
                        help='Path to classes.txt (optional)')
    
    args = parser.parse_args()
    
    verify_annotations(
        images_dir=args.images,
        labels_dir=args.labels,
        classes_file=args.classes
    )
