"""
Convert YOLO Segmentation (Polygon) to YOLO Detection (Bounding Box)
Converts polygon coordinates to axis-aligned bounding boxes
"""
import os
import shutil
from pathlib import Path
from tqdm import tqdm


def polygon_to_bbox(polygon_coords):
    """
    Convert polygon coordinates to bounding box
    
    Args:
        polygon_coords: List of [x1, y1, x2, y2, ..., xn, yn]
    
    Returns:
        (x_center, y_center, width, height) in normalized coordinates
    """
    # Split into x and y coordinates
    x_coords = [polygon_coords[i] for i in range(0, len(polygon_coords), 2)]
    y_coords = [polygon_coords[i] for i in range(1, len(polygon_coords), 2)]
    
    # Calculate bounding box
    x_min = min(x_coords)
    x_max = max(x_coords)
    y_min = min(y_coords)
    y_max = max(y_coords)
    
    # Convert to YOLO format (center + width/height)
    x_center = (x_min + x_max) / 2.0
    y_center = (y_min + y_max) / 2.0
    width = x_max - x_min
    height = y_max - y_min
    
    return x_center, y_center, width, height


def convert_label_file(input_file, output_file):
    """Convert a single segmentation label file to detection format"""
    with open(input_file, 'r') as f:
        lines = f.readlines()
    
    converted_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        parts = line.split()
        if len(parts) < 3:  # Need at least class + 1 point
            continue
        
        try:
            class_id = int(parts[0])
            coords = [float(x) for x in parts[1:]]
            
            # Check if it's already in bbox format (5 values)
            if len(coords) == 4:
                # Already bounding box format
                converted_lines.append(f"{class_id} {' '.join(parts[1:])}\n")
                continue
            
            # Convert polygon to bbox
            if len(coords) % 2 != 0:
                print(f"⚠️  Odd number of coordinates in {input_file.name}, skipping line")
                continue
            
            x_center, y_center, width, height = polygon_to_bbox(coords)
            
            # Clamp to [0, 1] range
            x_center = max(0.0, min(1.0, x_center))
            y_center = max(0.0, min(1.0, y_center))
            width = max(0.0, min(1.0, width))
            height = max(0.0, min(1.0, height))
            
            # Write in YOLO detection format
            converted_lines.append(f"{class_id} {x_center} {y_center} {width} {height}\n")
        
        except (ValueError, IndexError) as e:
            print(f"⚠️  Error parsing line in {input_file.name}: {e}")
            continue
    
    # Write converted labels
    with open(output_file, 'w') as f:
        f.writelines(converted_lines)
    
    return len(converted_lines)


def convert_dataset(input_dir, output_dir):
    """
    Convert entire YOLO segmentation dataset to detection format
    
    Args:
        input_dir: Path to input dataset (with train/valid/test folders)
        output_dir: Path to output dataset
    """
    print(f"🔧 Converting dataset from segmentation to detection format...")
    print(f"   Input:  {input_dir}")
    print(f"   Output: {output_dir}\n")
    
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    
    # Check if input exists
    if not input_path.exists():
        print(f"❌ Input directory not found: {input_dir}")
        return
    
    # Create output structure
    splits = ['train', 'valid', 'test']
    total_images = 0
    total_annotations = 0
    
    for split in splits:
        split_images_input = input_path / split / 'images'
        split_labels_input = input_path / split / 'labels'
        split_images_output = output_path / split / 'images'
        split_labels_output = output_path / split / 'labels'
        
        if not split_images_input.exists():
            print(f"⚠️  Skipping {split} (not found)")
            continue
        
        print(f"📂 Converting {split} split...")
        
        # Create output directories
        split_images_output.mkdir(parents=True, exist_ok=True)
        split_labels_output.mkdir(parents=True, exist_ok=True)
        
        # Get all images
        image_files = list(split_images_input.glob('*.jpg')) + \
                     list(split_images_input.glob('*.jpeg')) + \
                     list(split_images_input.glob('*.png'))
        
        if len(image_files) == 0:
            print(f"   No images found in {split}")
            continue
        
        print(f"   Found {len(image_files)} images")
        
        # Process each image
        converted = 0
        annotations = 0
        
        for img_file in tqdm(image_files, desc=f"   {split}", unit="img"):
            # Copy image
            output_img = split_images_output / img_file.name
            shutil.copy2(img_file, output_img)
            
            # Convert label
            label_file = split_labels_input / (img_file.stem + '.txt')
            output_label = split_labels_output / (img_file.stem + '.txt')
            
            if label_file.exists():
                annot_count = convert_label_file(label_file, output_label)
                annotations += annot_count
                converted += 1
            else:
                # Create empty label file
                output_label.touch()
        
        print(f"   ✅ Converted {converted} images, {annotations} annotations\n")
        total_images += len(image_files)
        total_annotations += annotations
    
    # Copy data.yaml if it exists
    data_yaml = input_path / 'data.yaml'
    if data_yaml.exists():
        shutil.copy2(data_yaml, output_path / 'data.yaml')
        print(f"📝 Copied data.yaml")
        
        # Update paths in data.yaml
        with open(output_path / 'data.yaml', 'r') as f:
            content = f.read()
        
        # Update path to point to converted dataset
        content = content.replace(
            f"path: {input_path.absolute()}",
            f"path: {output_path.absolute()}"
        )
        
        with open(output_path / 'data.yaml', 'w') as f:
            f.write(content)
        
        print(f"✅ Updated data.yaml paths\n")
    
    # Summary
    print(f"{'='*70}")
    print(f"✅ CONVERSION COMPLETE")
    print(f"{'='*70}")
    print(f"Total Images:       {total_images}")
    print(f"Total Annotations:  {total_annotations}")
    print(f"Output Directory:   {output_path}")
    print(f"\n📋 Next Steps:")
    print(f"1. Verify converted annotations:")
    print(f"   python tools/verify_annotations.py --images \"{output_path}/train/images\" --labels \"{output_path}/train/labels\"")
    print(f"2. Visualize samples:")
    print(f"   python tools/visualize_annotations.py --images \"{output_path}/train/images\" --labels \"{output_path}/train/labels\" --output verification_output --num 10")
    print(f"3. Start training!")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Convert YOLO segmentation to detection format')
    parser.add_argument('--input', type=str, required=True,
                        help='Path to input dataset (with train/valid/test folders)')
    parser.add_argument('--output', type=str, required=True,
                        help='Path to output dataset')
    
    args = parser.parse_args()
    
    convert_dataset(args.input, args.output)
