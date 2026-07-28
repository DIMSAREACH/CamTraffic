"""
Count Class Instances
Analyze class distribution in dataset
"""
from pathlib import Path
from collections import defaultdict
import matplotlib.pyplot as plt


def count_classes(labels_dir, classes_file=None, create_chart=False, output_chart=None):
    """
    Count instances of each class in dataset
    
    Args:
        labels_dir: Path to labels directory
        classes_file: Path to classes.txt (optional)
        create_chart: Create bar chart visualization
        output_chart: Path to save chart (optional)
    """
    print("📊 Counting class instances...\n")
    
    # Load class names
    class_names = {}
    if classes_file and Path(classes_file).exists():
        with open(classes_file, 'r') as f:
            class_names = {i: line.strip() for i, line in enumerate(f)}
        print(f"📋 Loaded {len(class_names)} classes from {classes_file}\n")
    
    # Count classes
    class_counts = defaultdict(int)
    total_annotations = 0
    files_processed = 0
    
    for label_file in Path(labels_dir).glob('*.txt'):
        files_processed += 1
        with open(label_file, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split()
                if len(parts) == 5:
                    try:
                        class_id = int(parts[0])
                        class_counts[class_id] += 1
                        total_annotations += 1
                    except ValueError:
                        pass
    
    # Print results
    print(f"📊 Class Distribution:")
    print(f"{'='*70}")
    print(f"{'Class Name':<30} {'Count':>10} {'Percentage':>15} {'Bar':<20}")
    print(f"{'='*70}")
    
    # Sort by count (descending)
    sorted_classes = sorted(class_counts.items(), key=lambda x: x[1], reverse=True)
    
    for class_id, count in sorted_classes:
        class_name = class_names.get(class_id, f"Class {class_id}")
        percentage = count / total_annotations * 100 if total_annotations > 0 else 0
        bar_length = int(percentage / 5)  # 5% = 1 character
        bar = '█' * bar_length
        print(f"{class_name:<30} {count:>10} {percentage:>14.1f}% {bar:<20}")
    
    print(f"{'='*70}")
    print(f"{'Total Annotations':<30} {total_annotations:>10}")
    print(f"{'Total Label Files':<30} {files_processed:>10}")
    print(f"{'Unique Classes':<30} {len(class_counts):>10}")
    print(f"{'Annotations Per File':<30} {total_annotations/max(files_processed,1):>10.2f}")
    
    # Check for class imbalance
    if len(sorted_classes) > 0:
        max_count = sorted_classes[0][1]
        min_count = sorted_classes[-1][1]
        imbalance_ratio = max_count / max(min_count, 1)
        
        print(f"\n⚖️  Class Balance:")
        print(f"   Most Common: {class_names.get(sorted_classes[0][0], f'Class {sorted_classes[0][0]}')} ({max_count})")
        print(f"   Least Common: {class_names.get(sorted_classes[-1][0], f'Class {sorted_classes[-1][0]}')} ({min_count})")
        print(f"   Imbalance Ratio: {imbalance_ratio:.1f}x")
        
        if imbalance_ratio > 10:
            print(f"\n⚠️  Warning: High class imbalance detected!")
            print(f"   Consider adding more images for underrepresented classes.")
    
    # Create chart if requested
    if create_chart and sorted_classes:
        plt.figure(figsize=(12, 6))
        
        class_labels = [class_names.get(cid, f"Class {cid}") for cid, _ in sorted_classes]
        counts = [count for _, count in sorted_classes]
        
        plt.bar(range(len(class_labels)), counts, color='steelblue')
        plt.xlabel('Class')
        plt.ylabel('Count')
        plt.title(f'Class Distribution ({total_annotations} total annotations)')
        plt.xticks(range(len(class_labels)), class_labels, rotation=45, ha='right')
        plt.tight_layout()
        
        if output_chart:
            plt.savefig(output_chart, dpi=150)
            print(f"\n📈 Chart saved to: {output_chart}")
        else:
            plt.show()
    
    return class_counts, total_annotations


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Count class instances in dataset')
    parser.add_argument('--labels', type=str, required=True,
                        help='Path to labels directory')
    parser.add_argument('--classes', type=str, default=None,
                        help='Path to classes.txt (optional)')
    parser.add_argument('--chart', action='store_true',
                        help='Create bar chart visualization')
    parser.add_argument('--output', type=str, default=None,
                        help='Path to save chart (optional)')
    
    args = parser.parse_args()
    
    count_classes(
        labels_dir=args.labels,
        classes_file=args.classes,
        create_chart=args.chart,
        output_chart=args.output
    )
