"""
Create data.yaml files for existing YOLO datasets
"""
import os
from pathlib import Path
import yaml


def create_cambodia_traffic_yaml(dataset_path, output_path):
    """Create data.yaml for Cambodia Traffic dataset"""
    data = {
        'path': str(Path(dataset_path).absolute()),
        'train': 'train/images',
        'val': 'valid/images',
        'test': 'test/images',
        'nc': 4,  # Adjust based on actual classes
        'names': {
            0: 'car',
            1: 'motorcycle',
            2: 'truck',
            3: 'bus'
        }
    }
    
    with open(output_path, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)
    
    print(f"✅ Created: {output_path}")


def create_helmet_detection_yaml(dataset_path, output_path):
    """Create data.yaml for Helmet Detection dataset"""
    data = {
        'path': str(Path(dataset_path).absolute()),
        'train': 'train/images',
        'val': 'valid/images',
        'test': 'test/images',
        'nc': 2,  # Adjust based on actual classes
        'names': {
            0: 'helmet',
            1: 'no_helmet'
        }
    }
    
    with open(output_path, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)
    
    print(f"✅ Created: {output_path}")


def create_license_plate_yaml(dataset_path, output_path):
    """Create data.yaml for License Plate dataset"""
    data = {
        'path': str(Path(dataset_path).absolute()),
        'train': 'train/images',
        'val': 'valid/images',
        'test': 'test/images',
        'nc': 1,
        'names': {
            0: 'license_plate'
        }
    }
    
    with open(output_path, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)
    
    print(f"✅ Created: {output_path}")


def create_traffic_signs_yaml(dataset_path, output_path):
    """Create data.yaml template for Traffic Signs dataset"""
    # This will need to be updated after annotation
    data = {
        'path': str(Path(dataset_path).absolute()),
        'train': 'train/images',
        'val': 'valid/images',
        'test': 'test/images',
        'nc': 12,  # Update based on actual sign categories
        'names': {
            0: 'additional_sign',
            1: 'built_up_area',
            2: 'direction_sign',
            3: 'information_sign',
            4: 'mandatory_sign',
            5: 'priority_sign',
            6: 'prohibitory_sign',
            7: 'road_marking',
            8: 'signpost',
            9: 'street_name',
            10: 'temporary_sign',
            11: 'warning_sign'
        }
    }
    
    with open(output_path, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)
    
    print(f"✅ Created: {output_path}")
    print(f"⚠️  Note: Update class names after annotating traffic signs")


if __name__ == '__main__':
    base_path = r"d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset"
    
    print("📝 Creating data.yaml files for all datasets...\n")
    
    # Cambodia Traffic
    dataset1 = Path(base_path) / "Cambodia Traffic.v1i.yolov8"
    if dataset1.exists():
        create_cambodia_traffic_yaml(
            dataset1,
            dataset1 / "data.yaml"
        )
    
    # Helmet Detection
    dataset2 = Path(base_path) / "helmet detection cambodia.v1-version-1.yolov8"
    if dataset2.exists():
        create_helmet_detection_yaml(
            dataset2,
            dataset2 / "data.yaml"
        )
    
    # License Plate
    dataset3 = Path(base_path) / "License Plate.v3-license-plate_v1.yolov8"
    if dataset3.exists():
        create_license_plate_yaml(
            dataset3,
            dataset3 / "data.yaml"
        )
    
    # Traffic Signs (template only - needs annotation first)
    dataset4 = Path(base_path) / "Traffic Sign Detection Model (YOLOv8)"
    if dataset4.exists():
        create_traffic_signs_yaml(
            dataset4,
            Path(base_path) / "traffic_signs_data_template.yaml"
        )
    
    print("\n✅ All data.yaml files created!")
    print("\n📋 Next Steps:")
    print("1. Run verification scripts to check annotations")
    print("2. Update class names if needed (check actual label files)")
    print("3. Start training models!")
