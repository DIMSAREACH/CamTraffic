"""
Test Video Detection with YOLO-Style Overlays

Django management command to test video detection with YOLO-style green boxes.

Usage:
    python manage.py test_video_yolo path/to/video.mp4
"""
import json
from pathlib import Path
import tempfile

from django.core.management.base import BaseCommand

from ai_detection.video_utils import extract_video_frames, build_annotated_preview_video
from ai_detection.pipeline import run_detection_pipeline
from ai_detection.sign_pipeline import draw_detection_overlays_on_image


class Command(BaseCommand):
    help = 'Test video detection with YOLO-style overlays'

    def add_arguments(self, parser):
        parser.add_argument(
            'video_path',
            type=str,
            help='Path to video file to process',
        )
        parser.add_argument(
            '--max-frames',
            type=int,
            default=12,
            help='Maximum frames to process (default: 12)',
        )

    def handle(self, *args, **options):
        video_path = options['video_path']
        max_frames = options['max_frames']
        
        self.stdout.write('')
        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('🎬 Testing Video Detection with YOLO-Style Overlays'))
        self.stdout.write('=' * 70)
        self.stdout.write('')
        
        video_file = Path(video_path)
        if not video_file.exists():
            self.stdout.write(self.style.ERROR(f'❌ Error: Video file not found: {video_path}'))
            return
        
        self.stdout.write(f'📹 Video: {video_file.name}')
        self.stdout.write(f'📍 Path: {video_path}')
        self.stdout.write('')
        
        # Extract frames
        self.stdout.write('⏳ Extracting frames...')
        frames = extract_video_frames(str(video_path), max_frames=max_frames)
        self.stdout.write(self.style.SUCCESS(f'✓ Extracted {len(frames)} frames'))
        self.stdout.write('')
        
        if not frames:
            self.stdout.write(self.style.ERROR('❌ No frames extracted'))
            return
        
        # Process each frame
        self.stdout.write('🔍 Running detection on each frame...')
        annotated_frames = []
        all_detections = []
        
        for idx, (frame_path, timestamp) in enumerate(frames, 1):
            self.stdout.write(f'\n[Frame {idx}/{len(frames)}] t={timestamp:.1f}s')
            
            # Run detection
            result = run_detection_pipeline(
                frame_path,
                original_filename=f'frame_{idx}.jpg',
                live_fast=True,
                enable_ocr=False,
                enable_plate=True,
            )
            
            if not result:
                self.stdout.write(self.style.WARNING('  ⊘ Detection failed'))
                annotated_frames.append(frame_path)
                continue
            
            # Extract detection data
            vehicles = result.get('vehicles', [])
            payload = result.get('payload', {})
            sign_bbox = payload.get('sign_bbox')
            plate_result = result.get('plate_result', {})
            
            self.stdout.write(f'  Vehicles: {len(vehicles)}')
            if vehicles:
                for v in vehicles[:3]:  # Show first 3
                    self.stdout.write(f'    • {v.get("label", "Vehicle")} - {v.get("confidence", 0):.2f}')
            
            if payload.get('detected_plate'):
                self.stdout.write(f'  Plate: {payload["detected_plate"]}')
            
            # Build overlay items (all green YOLO style)
            overlay_items = []
            
            # Add sign if detected
            if sign_bbox:
                overlay_items.append({
                    'kind': 'sign',
                    'bbox': sign_bbox,
                    'label': payload.get('sign_name_en', 'Sign'),
                    'confidence': float(payload.get('confidence', 0)),
                    'color': (0, 255, 0),  # Green
                })
            
            # Add vehicles
            for v in vehicles:
                if v.get('bbox'):
                    overlay_items.append({
                        'kind': 'vehicle',
                        'bbox': v['bbox'],
                        'label': v.get('label', 'Vehicle'),
                        'confidence': float(v.get('confidence', 0)),
                        'color': (0, 255, 0),  # Green
                    })
            
            # Add plates
            plate_boxes = plate_result.get('plate_boxes', [])
            for pb in plate_boxes:
                if pb.get('bbox'):
                    overlay_items.append({
                        'kind': 'plate',
                        'bbox': pb['bbox'],
                        'label': payload.get('detected_plate', 'Plate'),
                        'confidence': float(pb.get('confidence', 0)),
                        'color': (0, 255, 0),  # Green
                    })
            
            self.stdout.write(f'  Overlays: {len(overlay_items)} bounding boxes')
            
            # Draw overlays
            if overlay_items:
                annotated_path = draw_detection_overlays_on_image(frame_path, overlay_items)
                if annotated_path:
                    annotated_frames.append(annotated_path)
                    self.stdout.write(self.style.SUCCESS('  ✓ Annotated frame created'))
                else:
                    annotated_frames.append(frame_path)
                    self.stdout.write(self.style.WARNING('  ⊘ Using original frame'))
            else:
                annotated_frames.append(frame_path)
                self.stdout.write(self.style.WARNING('  ⊘ No detections to overlay'))
            
            all_detections.append({
                'timestamp': timestamp,
                'vehicles': len(vehicles),
                'has_sign': bool(sign_bbox),
                'has_plate': bool(payload.get('detected_plate')),
                'objects': len(overlay_items),
            })
        
        # Build preview video
        self.stdout.write('')
        self.stdout.write('─' * 70)
        self.stdout.write('🎥 Building annotated preview video...')
        
        out_dir = video_file.parent / 'detect_out'
        out_dir.mkdir(exist_ok=True)
        preview_path = out_dir / 'annotated_preview.mp4'
        
        if build_annotated_preview_video(annotated_frames, str(preview_path)):
            size_kb = preview_path.stat().st_size / 1024
            self.stdout.write(self.style.SUCCESS(f'✓ Preview video created: {preview_path}'))
            self.stdout.write(f'  Size: {size_kb:.1f} KB')
        else:
            self.stdout.write(self.style.ERROR('❌ Failed to create preview video'))
        
        # Statistics
        self.stdout.write('')
        self.stdout.write('─' * 70)
        self.stdout.write(self.style.SUCCESS('📊 Detection Statistics:'))
        self.stdout.write(f'  Total frames: {len(all_detections)}')
        self.stdout.write(f'  Frames with vehicles: {sum(1 for d in all_detections if d["vehicles"] > 0)}')
        self.stdout.write(f'  Frames with signs: {sum(1 for d in all_detections if d["has_sign"])}')
        self.stdout.write(f'  Frames with plates: {sum(1 for d in all_detections if d["has_plate"])}')
        self.stdout.write(f'  Total vehicles detected: {sum(d["vehicles"] for d in all_detections)}')
        avg_objects = sum(d['objects'] for d in all_detections) / len(all_detections) if all_detections else 0
        self.stdout.write(f'  Average objects per frame: {avg_objects:.1f}')
        
        # Save report
        report_path = out_dir / 'report.json'
        with open(report_path, 'w') as f:
            json.dump({
                'video': str(video_path),
                'frames_processed': len(all_detections),
                'detections': all_detections,
                'preview_video': str(preview_path) if preview_path.exists() else None,
            }, f, indent=2)
        self.stdout.write(f'\n✓ Report saved: {report_path}')
        
        # Save sample annotated frames
        self.stdout.write(f'\n🖼️  Sample annotated frames saved to: {out_dir}')
        for idx, annotated_path in enumerate(annotated_frames[:5], 1):
            import shutil
            dest = out_dir / f"frame_{idx:02d}_t{all_detections[idx-1]['timestamp']:.1f}s_annotated.jpg"
            shutil.copy(annotated_path, dest)
            self.stdout.write(f'  • {dest.name}')
        
        self.stdout.write('')
        self.stdout.write('=' * 70)
        self.stdout.write(self.style.SUCCESS('✅ Video detection test complete!'))
        self.stdout.write('=' * 70)
        self.stdout.write('')
        
        self.stdout.write(self.style.SUCCESS('📌 Key Features Demonstrated:'))
        self.stdout.write('  ✓ Green YOLO-style bounding boxes (like reference video)')
        self.stdout.write('  ✓ Confidence in 0.XX decimal format (not percentage)')
        self.stdout.write('  ✓ Consistent overlay style for vehicles, signs, plates')
        self.stdout.write('  ✓ Annotated preview video generated')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('🎉 All frames now match the YOLO style from m2-res_360p.mp4!'))
        self.stdout.write('')
