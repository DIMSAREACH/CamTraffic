"""
Split Dataset into Train/Val/Test
Automatically organize images and labels into YOLO format structure
"""
import os
import shutil
import random
from pathlib import Path


def split_dataset(
    source_images_dir,
    source_labels_dir,
    output_dir,
    train_ratio=0.7,
    val_ratio=0.2,
    test_ratio=0.1,
    seed=42
):
    """
    Split dataset into train/val/test sets
    
    Args:
        source_images_dir: Path to folder containing all images
        source_labels_dir: Path to folder containing all labels
        output_dir: Path to output directory
        train_ratio: Percentage for training (default 0.7)
        val_ratio: Percentage for validation (default 0.2)
        test_ratio: Percentage for testing (default 0.1)
        seed: Random seed for reproducibility
    """
    random.seed(seed)
    
    # Create output structure
    splits = ['train', 'val', 'test']
    for split in splits:
        Path(output_dir) / 'images' / split
        Path(output_dir) / 'labels' / split
        os.makedirs(Path(output_dir) / 'images' / split, exist_ok=True)
        os.makedirs(Path(output_dir) / 'labels' / split, exist_ok=True)
    
    # Get all image files
    image_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
    all_images = []
    for ext in image_extensions:
        all_images.extend(list(Path(source_images_dir).glob(f'*{ext}')))
    
    print(f"📊 Found {len(all_images)} images")
    
    if len(all_images) == 0:
        print("❌ No images found! Check source_images_dir path.")
        return
    
    # Shuffle images
    random.shuffle(all_images)
    
    # Calculate split indices
    total = len(all_images)
    train_end = int(total * train_ratio)
    val_end = train_end + int(total * val_ratio)
    
    train_images = all_images[:train_end]
    val_images = all_images[train_end:val_end]
    test_images = all_images[val_end:]
    
    print(f"\n📂 Split breakdown:")
    print(f"   Train: {len(train_images)} images ({len(train_images)/total*100:.1f}%)")
    print(f"   Val:   {len(val_images)} images ({len(val_images)/total*100:.1f}%)")
    print(f"   Test:  {len(test_images)} images ({len(test_images)/total*100:.1f}%)")
    
    # Copy files to appropriate directories
    def copy_split(images, split_name):
        images_copied = 0
        labels_copied = 0
        labels_missing = 0
        
        for img_path in images:
            # Copy image
            dest_img = Path(output_dir) / 'images' / split_name / img_path.name
            shutil.copy2(img_path, dest_img)
            images_copied += 1
            
            # Copy corresponding label
            label_name = img_path.stem + '.txt'
            label_path = Path(source_labels_dir) / label_name
            
            if label_path.exists():
                dest_label = Path(output_dir) / 'labels' / split_name / label_name
                shutil.copy2(label_path, dest_label)
                labels_copied += 1
            else:
                labels_missing += 1
                print(f"⚠️  Missing label for: {img_path.name}")
        
        return images_copied, labels_copied, labels_missing
    
    print(f"\n🚀 Copying files...")
    
    print(f"\n📁 Train:")
    train_img, train_lbl, train_miss = copy_split(train_images, 'train')
    print(f"   Images: {train_img}, Labels: {train_lbl}, Missing: {train_miss}")
    
    print(f"\n📁 Val:")
    val_img, val_lbl, val_miss = copy_split(val_images, 'val')
    print(f"   Images: {val_img}, Labels: {val_lbl}, Missing: {val_miss}")
    
    print(f"\n📁 Test:")
    test_img, test_lbl, test_miss = copy_split(test_images, 'test')
    print(f"   Images: {test_img}, Labels: {test_lbl}, Missing: {test_miss}")
    
    total_missing = train_miss + val_miss + test_miss
    
    print(f"\n✅ Dataset split complete!")
    print(f"   Total images: {total}")
    print(f"   Total labels: {train_lbl + val_lbl + test_lbl}")
    print(f"   Missing labels: {total_missing}")
    
    if total_missing > 0:
        print(f"\n⚠️  Warning: {total_missing} images have no annotations!")
        print(f"   You should either annotate these or remove them.")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Split dataset into train/val/test')
    parser.add_argument('--images', type=str, required=True,
                        help='Path to source images directory')
    parser.add_argument('--labels', type=str, required=True,
                        help='Path to source labels directory')
    parser.add_argument('--output', type=str, required=True,
                        help='Path to output directory')
    parser.add_argument('--train', type=float, default=0.7,
                        help='Train ratio (default: 0.7)')
    parser.add_argument('--val', type=float, default=0.2,
                        help='Validation ratio (default: 0.2)')
    parser.add_argument('--test', type=float, default=0.1,
                        help='Test ratio (default: 0.1)')
    parser.add_argument('--seed', type=int, default=42,
                        help='Random seed (default: 42)')
    
    args = parser.parse_args()
    
    # Validate ratios sum to 1.0
    total_ratio = args.train + args.val + args.test
    if abs(total_ratio - 1.0) > 0.01:
        print(f"❌ Error: Ratios must sum to 1.0 (current: {total_ratio})")
        exit(1)
    
    split_dataset(
        source_images_dir=args.images,
        source_labels_dir=args.labels,
        output_dir=args.output,
        train_ratio=args.train,
        val_ratio=args.val,
        test_ratio=args.test,
        seed=args.seed
    )
