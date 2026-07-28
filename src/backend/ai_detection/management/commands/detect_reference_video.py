"""
Detect the thesis reference street video (m2-res_360p.mp4) with the same
pipeline used for upload video + live camera — multi-frame, refined vehicle boxes.

Usage:
  python manage.py detect_reference_video
  python manage.py detect_reference_video --video path/to/other.mp4 --frames 12
"""
from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from ai_detection.image_utils import prepare_detection_image
from ai_detection.pipeline import run_detection_pipeline
from ai_detection.sign_pipeline import draw_detection_overlays_on_image
from ai_detection.video_utils import build_annotated_preview_video, extract_video_frames


def _default_video() -> Path:
    ai_root = Path(getattr(settings, 'AI_ROOT', Path(settings.BASE_DIR).parent.parent / 'ai'))
    candidates = [
        ai_root / 'datasets' / 'samples' / 'reference_video' / 'm2-res_360p.mp4',
        Path(settings.MEDIA_ROOT) / 'cctv' / 'm2-res_360p.mp4',
        Path(r'd:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset\Image\m2-res_360p.mp4'),
    ]
    for p in candidates:
        if p.is_file():
            return p
    return candidates[0]


class Command(BaseCommand):
    help = 'Run reference-quality video detection (like m2-res_360p.mp4 sample)'

    def add_arguments(self, parser):
        parser.add_argument('--video', type=str, default='', help='Path to video file')
        parser.add_argument('--frames', type=int, default=12, help='Frames to sample (default 12)')
        parser.add_argument('--out', type=str, default='', help='Output directory')

    def handle(self, *args, **options):
        video = Path(options['video']) if options['video'] else _default_video()
        if not video.is_file():
            self.stderr.write(self.style.ERROR(f'Video not found: {video}'))
            return

        frames_n = max(2, min(24, int(options['frames'])))
        out_dir = Path(options['out']) if options['out'] else (
            Path(getattr(settings, 'AI_ROOT', Path(settings.BASE_DIR).parent.parent / 'ai'))
            / 'datasets' / 'samples' / 'reference_video' / 'detect_out'
        )
        out_dir.mkdir(parents=True, exist_ok=True)

        self.stdout.write(self.style.SUCCESS(f'Reference video: {video}'))
        self.stdout.write(f'Sampling {frames_n} frames → {out_dir}')

        sampled = extract_video_frames(str(video), max_frames=frames_n)
        if not sampled:
            self.stderr.write(self.style.ERROR('No frames extracted'))
            return

        annotated_paths: list[str] = []
        report_frames: list[dict] = []
        total_vehicles = 0

        for idx, (frame_path, ts) in enumerate(sampled):
            detect_path, jpeg_path, extra = prepare_detection_image(frame_path, max_edge=960)
            pipeline_out = run_detection_pipeline(
                detect_path,
                original_filename=f'video-frame-{ts:.1f}s.jpg',
                sign_only=False,
                live_fast=True,
                unified_prep=False,
                enable_ocr=False,
                enable_plate=False,
            )
            vehicles = pipeline_out.get('vehicles') or []
            vehicles = [v for v in vehicles if float(v.get('confidence') or 0) >= 40]
            total_vehicles += len(vehicles)

            overlay = []
            for v in vehicles[:24]:
                bb = v.get('bbox')
                if not bb:
                    continue
                overlay.append({
                    'kind': 'vehicle',
                    'bbox': bb,
                    'label': v.get('label') or v.get('vehicle_type') or 'Vehicle',
                    'confidence': float(v.get('confidence') or 0),
                    'color': (214, 182, 6),
                })

            ann = draw_detection_overlays_on_image(detect_path, overlay) if overlay else None
            out_jpg = out_dir / f'frame_{idx:02d}_t{ts:.1f}s_annotated.jpg'
            if ann and Path(ann).is_file():
                Path(ann).replace(out_jpg)
                annotated_paths.append(str(out_jpg))
            else:
                # Save raw frame if no boxes
                import shutil
                shutil.copyfile(detect_path, out_jpg)
                annotated_paths.append(str(out_jpg))

            types = {}
            for v in vehicles:
                t = v.get('vehicle_type') or 'unknown'
                types[t] = types.get(t, 0) + 1

            self.stdout.write(
                f'  [{idx+1}/{len(sampled)}] t={ts:.1f}s → {len(vehicles)} vehicles {types}'
            )
            report_frames.append({
                'index': idx,
                'timestamp_s': ts,
                'vehicles': len(vehicles),
                'types': types,
                'annotated': str(out_jpg),
            })

            for p in [jpeg_path, *extra]:
                if p:
                    Path(p).unlink(missing_ok=True)

        preview = out_dir / 'annotated_preview.mp4'
        build_annotated_preview_video(annotated_paths, str(preview), fps=2.0)

        report = {
            'video': str(video),
            'frames_sampled': len(sampled),
            'frames_with_boxes': sum(1 for f in report_frames if f['vehicles'] > 0),
            'total_vehicle_detections': total_vehicles,
            'annotated_preview': str(preview) if preview.is_file() else None,
            'frames': report_frames,
        }
        (out_dir / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Reference detection complete'))
        self.stdout.write(f'  Frames: {report["frames_sampled"]}')
        self.stdout.write(f'  With boxes: {report["frames_with_boxes"]}')
        self.stdout.write(f'  Total vehicles: {total_vehicles}')
        if preview.is_file():
            self.stdout.write(f'  Preview: {preview}')
