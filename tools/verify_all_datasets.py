"""
Master Verification Script
Verify all YOLO datasets at once and generate comprehensive report
"""
import os
from pathlib import Path
from collections import defaultdict
import sys


def verify_dataset(dataset_name, images_dir, labels_dir):
    """Verify a single dataset and return statistics"""
    print(f"\n{'='*70}")
    print(f"🔍 Verifying: {dataset_name}")
    print(f"{'='*70}")
    
    if not Path(images_dir).exists():
        print(f"❌ Images directory not found: {images_dir}")
        return None
    
    if not Path(labels_dir).exists():
        print(f"❌ Labels directory not found: {labels_dir}")
        return None
    
    # Get all images
    image_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
    all_images = []
    for ext in image_extensions:
        all_images.extend(list(Path(images_dir).glob(f'*{ext}')))
    
    total_images = len(all_images)
    print(f"📊 Found {total_images} images")
    
    if total_images == 0:
        print("⚠️  No images found!")
        return None
    
    # Statistics
    stats = {
        'dataset_name': dataset_name,
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
    
    # Verify each image
    for img_path in all_images:
        label_name = img_path.stem + '.txt'
        label_path = Path(labels_dir) / label_name
        
        if not label_path.exists():
            stats['images_without_labels'] += 1
            continue
        
        stats['images_with_labels'] += 1
        
        # Read label file
        with open(label_path, 'r') as f:
            lines = f.readlines()
        
        if len(lines) == 0:
            stats['empty_label_files'] += 1
            continue
        
        # Verify each annotation line
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue
            
            parts = line.split()
            
            if len(parts) != 5:
                stats['invalid_format'] += 1
                error = f"{img_path.name}:{line_num} - Invalid format"
                stats['errors'].append(error)
                continue
            
            try:
                class_id = int(parts[0])
                x_center = float(parts[1])
                y_center = float(parts[2])
                width = float(parts[3])
                height = float(parts[4])
            except ValueError:
                stats['invalid_format'] += 1
                error = f"{img_path.name}:{line_num} - Cannot parse values"
                stats['errors'].append(error)
                continue
            
            # Check bounds
            if not (0.0 <= x_center <= 1.0 and 0.0 <= y_center <= 1.0 and
                    0.0 < width <= 1.0 and 0.0 < height <= 1.0):
                stats['out_of_bounds'] += 1
                error = f"{img_path.name}:{line_num} - Out of bounds"
                stats['errors'].append(error)
            
            # Count classes
            stats['class_counts'][class_id] += 1
            stats['total_annotations'] += 1
    
    # Print results
    print(f"\n📊 Results:")
    print(f"   Total Images:          {stats['total_images']}")
    print(f"   Images With Labels:    {stats['images_with_labels']} ({stats['images_with_labels']/stats['total_images']*100:.1f}%)")
    print(f"   Images Without Labels: {stats['images_without_labels']} ({stats['images_without_labels']/stats['total_images']*100:.1f}%)")
    print(f"   Total Annotations:     {stats['total_annotations']}")
    print(f"   Annotations Per Image: {stats['total_annotations']/max(stats['images_with_labels'],1):.2f}")
    
    print(f"\n❌ Errors:")
    print(f"   Invalid Format:        {stats['invalid_format']}")
    print(f"   Out of Bounds:         {stats['out_of_bounds']}")
    print(f"   Empty Label Files:     {stats['empty_label_files']}")
    
    # Class distribution
    if stats['class_counts']:
        print(f"\n📋 Class Distribution:")
        sorted_classes = sorted(stats['class_counts'].items())
        for class_id, count in sorted_classes:
            percentage = count / stats['total_annotations'] * 100
            print(f"   Class {class_id}: {count:6d} ({percentage:5.1f}%)")
    
    # First few errors
    if stats['errors']:
        print(f"\n⚠️  First 5 Errors:")
        for error in stats['errors'][:5]:
            print(f"   {error}")
        if len(stats['errors']) > 5:
            print(f"   ... and {len(stats['errors'])-5} more")
    
    # Verdict
    if stats['errors'] or stats['images_without_labels'] > 0:
        print(f"\n❌ FAILED - Issues found!")
        return stats
    else:
        print(f"\n✅ PASSED - All annotations valid!")
        return stats


def verify_all_datasets():
    """Verify all YOLO datasets and generate summary report"""
    base_path = r"d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset"
    
    print("="*70)
    print("🔍 MASTER DATASET VERIFICATION")
    print("="*70)
    
    datasets = []
    
    # 1. Cambodia Traffic - Train
    dataset1 = verify_dataset(
        "Cambodia Traffic (Train)",
        Path(base_path) / "Cambodia Traffic.v1i.yolov8" / "train" / "images",
        Path(base_path) / "Cambodia Traffic.v1i.yolov8" / "train" / "labels"
    )
    if dataset1:
        datasets.append(dataset1)
    
    # 2. Cambodia Traffic - Valid
    dataset2 = verify_dataset(
        "Cambodia Traffic (Valid)",
        Path(base_path) / "Cambodia Traffic.v1i.yolov8" / "valid" / "images",
        Path(base_path) / "Cambodia Traffic.v1i.yolov8" / "valid" / "labels"
    )
    if dataset2:
        datasets.append(dataset2)
    
    # 3. Cambodia Traffic - Test
    dataset3 = verify_dataset(
        "Cambodia Traffic (Test)",
        Path(base_path) / "Cambodia Traffic.v1i.yolov8" / "test" / "images",
        Path(base_path) / "Cambodia Traffic.v1i.yolov8" / "test" / "labels"
    )
    if dataset3:
        datasets.append(dataset3)
    
    # 4. Helmet Detection - Train
    dataset4 = verify_dataset(
        "Helmet Detection (Train)",
        Path(base_path) / "helmet detection cambodia.v1-version-1.yolov8" / "train" / "images",
        Path(base_path) / "helmet detection cambodia.v1-version-1.yolov8" / "train" / "labels"
    )
    if dataset4:
        datasets.append(dataset4)
    
    # 5. Helmet Detection - Valid
    dataset5 = verify_dataset(
        "Helmet Detection (Valid)",
        Path(base_path) / "helmet detection cambodia.v1-version-1.yolov8" / "valid" / "images",
        Path(base_path) / "helmet detection cambodia.v1-version-1.yolov8" / "valid" / "labels"
    )
    if dataset5:
        datasets.append(dataset5)
    
    # 6. Helmet Detection - Test
    dataset6 = verify_dataset(
        "Helmet Detection (Test)",
        Path(base_path) / "helmet detection cambodia.v1-version-1.yolov8" / "test" / "images",
        Path(base_path) / "helmet detection cambodia.v1-version-1.yolov8" / "test" / "labels"
    )
    if dataset6:
        datasets.append(dataset6)
    
    # 7. License Plate - Train
    dataset7 = verify_dataset(
        "License Plate (Train)",
        Path(base_path) / "License Plate.v3-license-plate_v1.yolov8" / "train" / "images",
        Path(base_path) / "License Plate.v3-license-plate_v1.yolov8" / "train" / "labels"
    )
    if dataset7:
        datasets.append(dataset7)
    
    # 8. License Plate - Valid
    dataset8 = verify_dataset(
        "License Plate (Valid)",
        Path(base_path) / "License Plate.v3-license-plate_v1.yolov8" / "valid" / "images",
        Path(base_path) / "License Plate.v3-license-plate_v1.yolov8" / "valid" / "labels"
    )
    if dataset8:
        datasets.append(dataset8)
    
    # 9. License Plate - Test
    dataset9 = verify_dataset(
        "License Plate (Test)",
        Path(base_path) / "License Plate.v3-license-plate_v1.yolov8" / "test" / "images",
        Path(base_path) / "License Plate.v3-license-plate_v1.yolov8" / "test" / "labels"
    )
    if dataset9:
        datasets.append(dataset9)
    
    # Summary Report
    print("\n\n" + "="*70)
    print("📊 SUMMARY REPORT")
    print("="*70)
    
    total_images = sum(d['total_images'] for d in datasets)
    total_annotations = sum(d['total_annotations'] for d in datasets)
    total_errors = sum(d['invalid_format'] + d['out_of_bounds'] for d in datasets)
    total_missing = sum(d['images_without_labels'] for d in datasets)
    
    print(f"\n📈 Overall Statistics:")
    print(f"   Total Datasets Verified: {len(datasets)}")
    print(f"   Total Images:            {total_images}")
    print(f"   Total Annotations:       {total_annotations}")
    print(f"   Total Errors:            {total_errors}")
    print(f"   Missing Labels:          {total_missing}")
    print(f"   Average Annotations/Image: {total_annotations/total_images:.2f}")
    
    print(f"\n📋 Dataset Breakdown:")
    for ds in datasets:
        status = "✅" if len(ds['errors']) == 0 and ds['images_without_labels'] == 0 else "❌"
        print(f"   {status} {ds['dataset_name']:<30} {ds['total_images']:>6} images, {ds['total_annotations']:>7} annotations")
    
    # Final verdict
    print(f"\n{'='*70}")
    if total_errors == 0 and total_missing == 0:
        print("✅ ALL DATASETS PASSED - Ready for training!")
    else:
        print(f"⚠️  ISSUES FOUND - {total_errors} errors, {total_missing} missing labels")
        print("   Please review and fix issues before training.")
    print(f"{'='*70}\n")
    
    return datasets


if __name__ == '__main__':
    verify_all_datasets()
