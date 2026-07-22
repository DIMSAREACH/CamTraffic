#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
django.setup()

from ai_detection.models import AIDetectionLog

# Check the latest detection logs
logs = AIDetectionLog.objects.order_by('-created_at')[:5]
print(f"Total logs: {AIDetectionLog.objects.count()}")
print()

for log in logs:
    print(f"Log ID: {log.id}")
    print(f"  Created: {log.created_at}")
    print(f"  Detected Sign: {log.detected_sign}")
    print(f"  Confidence: {log.confidence}")
    print(f"  Detected Vehicles: {log.detected_vehicles}")
    print(f"  Vehicle Count: {log.vehicle_count}")
    print(f"  Detected Plate: {log.detected_plate}")
    print(f"  Plate Confidence: {log.plate_confidence}")
    print(f"  Plate OCR Details: {log.plate_ocr_details}")
    print(f"  Matched Vehicle: {log.matched_vehicle}")
    print()
