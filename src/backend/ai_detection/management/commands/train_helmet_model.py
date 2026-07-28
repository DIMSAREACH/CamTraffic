"""
Train Cambodia helmet / no_helmet YOLO detector and optionally detect a video.

Recommended (CPU-friendly, more accurate than the first 600×10 run):
  python manage.py train_helmet_model --epochs 20 --subset 1800 --imgsz 512 --merge-head --name cambodia_helmet_v2

Full dataset (slow on CPU):
  python manage.py train_helmet_model --epochs 40 --subset 0 --imgsz 640 --merge-head --name cambodia_helmet_full
"""
from __future__ import annotations

import json
import shutil
import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Train Cambodia helmet YOLO model (helmet / no_helmet) and optionally detect a video'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dataset',
            default=str(
                Path(r'd:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Image Dataset')
                / 'helmet detection converted'
            ),
            help='Converted YOLO detection dataset root (with data.yaml)',
        )
        parser.add_argument('--epochs', type=int, default=20)
        parser.add_argument('--imgsz', type=int, default=512)
        parser.add_argument('--batch', type=int, default=4)
        parser.add_argument(
            '--subset',
            type=int,
            default=1800,
            help='If >0, train on this many train images (CPU-friendly). 0 = full set.',
        )
        parser.add_argument(
            '--merge-head',
            action='store_true',
            default=True,
            help='Remap class head(2) → no_helmet(1) for clearer 2-class training (default on)',
        )
        parser.add_argument(
            '--keep-head',
            action='store_true',
            help='Keep 3 classes (helmet / no_helmet / head). Overrides --merge-head.',
        )
        parser.add_argument('--model', default='yolov8n.pt', help='Base Ultralytics model')
        parser.add_argument('--name', default='cambodia_helmet_v2')
        parser.add_argument(
            '--detect-video',
            default='',
            help='After training (or with --weights-only), run no-helmet detect on this video',
        )
        parser.add_argument(
            '--weights-only',
            action='store_true',
            help='Skip training; only run video detect using existing weights',
        )
        parser.add_argument('--max-frames', type=int, default=16)
        parser.add_argument('--conf', type=float, default=0.35)
        parser.add_argument('--patience', type=int, default=10)

    def handle(self, *args, **options):
        from ultralytics import YOLO

        ai_root = Path(getattr(settings, 'AI_ROOT', Path(settings.BASE_DIR).parent.parent / 'ai'))
        weights_dir = ai_root / 'weights'
        weights_dir.mkdir(parents=True, exist_ok=True)
        export_path = weights_dir / 'best_cambodia_helmet.pt'

        dataset = Path(options['dataset'])
        merge_head = bool(options['merge_head']) and not bool(options['keep_head'])

        if not options['weights_only']:
            if not (dataset / 'train' / 'images').is_dir():
                raise CommandError(f'train/images not found under {dataset}')
            data_yaml = self._prepare_data_yaml(
                dataset,
                int(options['subset']),
                merge_head=merge_head,
            )
            self.stdout.write(self.style.NOTICE(
                f'Training helmet model epochs={options["epochs"]} imgsz={options["imgsz"]} '
                f'batch={options["batch"]} subset={options["subset"] or "full"} '
                f'merge_head={merge_head} name={options["name"]}'
            ))
            model = YOLO(options['model'])
            t0 = time.perf_counter()
            results = model.train(
                data=str(data_yaml),
                epochs=int(options['epochs']),
                imgsz=int(options['imgsz']),
                batch=int(options['batch']),
                name=str(options['name']),
                project=str(ai_root / 'runs' / 'helmet'),
                exist_ok=True,
                patience=int(options['patience']),
                workers=0,
                plots=True,
                verbose=True,
                # Slightly stronger focus on classification of helmet vs no_helmet
                cls=1.0,
                box=7.5,
            )
            elapsed = time.perf_counter() - t0
            best = Path(getattr(results, 'save_dir', ai_root / 'runs' / 'helmet' / options['name'])) / 'weights' / 'best.pt'
            if not best.is_file():
                cand = list((ai_root / 'runs' / 'helmet' / options['name']).rglob('best.pt'))
                best = cand[0] if cand else best
            if not best.is_file():
                raise CommandError(f'Training finished but best.pt not found near {best}')
            shutil.copy2(best, export_path)
            try:
                from ai_detection.helmet_detection import reset_helmet_model_cache
                reset_helmet_model_cache()
            except Exception:
                pass
            status = {
                'trained_at': time.strftime('%Y-%m-%dT%H:%M:%S'),
                'epochs': options['epochs'],
                'imgsz': options['imgsz'],
                'batch': options['batch'],
                'subset': options['subset'],
                'merge_head': merge_head,
                'elapsed_sec': round(elapsed, 1),
                'best_pt': str(best),
                'exported': str(export_path),
                'data_yaml': str(data_yaml),
                'name': options['name'],
            }
            (weights_dir / 'cambodia_helmet_training_status.json').write_text(
                json.dumps(status, indent=2), encoding='utf-8',
            )
            self.stdout.write(self.style.SUCCESS(
                f'Trained in {elapsed / 60:.1f} min → {export_path}'
            ))
        else:
            if not export_path.is_file():
                raise CommandError(f'No weights at {export_path}. Train first without --weights-only.')

        video = (options['detect_video'] or '').strip()
        if video:
            self._detect_video(
                video_path=Path(video),
                weights=export_path,
                max_frames=int(options['max_frames']),
                conf=float(options['conf']),
                imgsz=int(options['imgsz']),
            )

    def _remap_label_line(self, line: str, *, merge_head: bool) -> str | None:
        parts = line.strip().split()
        if len(parts) < 5:
            return None
        try:
            cls_id = int(float(parts[0]))
        except ValueError:
            return None
        if merge_head and cls_id == 2:
            cls_id = 1  # head → no_helmet
        if merge_head and cls_id not in (0, 1):
            return None
        if not merge_head and cls_id not in (0, 1, 2):
            return None
        return ' '.join([str(cls_id), *parts[1:]])

    def _copy_label(self, src: Path, dst: Path, *, merge_head: bool) -> None:
        if not src.is_file():
            dst.write_text('', encoding='utf-8')
            return
        out_lines = []
        for line in src.read_text(encoding='utf-8', errors='ignore').splitlines():
            remapped = self._remap_label_line(line, merge_head=merge_head)
            if remapped:
                out_lines.append(remapped)
        dst.write_text('\n'.join(out_lines) + ('\n' if out_lines else ''), encoding='utf-8')

    def _prepare_data_yaml(self, dataset: Path, subset: int, *, merge_head: bool) -> Path:
        """Build training yaml; optionally subset + merge head→no_helmet."""
        tag = '2cls' if merge_head else '3cls'
        if subset > 0:
            root = dataset / f'_subset_{subset}_{tag}'
        else:
            root = dataset / f'_train_{tag}'

        for split in ('train', 'valid'):
            (root / split / 'images').mkdir(parents=True, exist_ok=True)
            (root / split / 'labels').mkdir(parents=True, exist_ok=True)

        def score_label(lab: Path) -> int:
            if not lab.is_file():
                return 0
            text = lab.read_text(encoding='utf-8', errors='ignore')
            score = 0
            for line in text.splitlines():
                parts = line.split()
                if not parts:
                    continue
                try:
                    cid = int(float(parts[0]))
                except ValueError:
                    continue
                if merge_head and cid == 2:
                    cid = 1
                if cid == 1:
                    score += 3  # no_helmet
                elif cid == 0:
                    score += 2  # helmet
                elif cid == 2:
                    score += 1
            return score

        train_images = [
            p for p in (dataset / 'train' / 'images').glob('*.*')
            if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}
        ]
        scored = sorted(
            ((score_label(dataset / 'train' / 'labels' / f'{img.stem}.txt'), img) for img in train_images),
            key=lambda x: (-x[0], x[1].name),
        )
        if subset > 0:
            # Balance: take top no_helmet-heavy, then ensure some helmet-only images.
            picked = [p for _, p in scored[:subset]]
            helmet_extra = [p for s, p in scored if s > 0 and p not in picked]
            # Prefer images with class 0 present
            helmet_bias = []
            for img in helmet_extra:
                lab = dataset / 'train' / 'labels' / f'{img.stem}.txt'
                text = lab.read_text(encoding='utf-8', errors='ignore') if lab.is_file() else ''
                if text.startswith('0 ') or '\n0 ' in f'\n{text}':
                    helmet_bias.append(img)
                if len(helmet_bias) >= max(80, subset // 10):
                    break
            for img in helmet_bias:
                if img not in picked:
                    picked.append(img)
        else:
            picked = [p for _, p in scored]

        cut = max(int(len(picked) * 0.88), 1)
        for idx, img in enumerate(picked):
            split = 'train' if idx < cut else 'valid'
            shutil.copy2(img, root / split / 'images' / img.name)
            self._copy_label(
                dataset / 'train' / 'labels' / f'{img.stem}.txt',
                root / split / 'labels' / f'{img.stem}.txt',
                merge_head=merge_head,
            )

        # Top up valid from original valid split
        val_count = len(list((root / 'valid' / 'images').glob('*.*')))
        if val_count < 40:
            for img in list((dataset / 'valid' / 'images').glob('*.*'))[:80]:
                if img.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp'}:
                    continue
                shutil.copy2(img, root / 'valid' / 'images' / img.name)
                self._copy_label(
                    dataset / 'valid' / 'labels' / f'{img.stem}.txt',
                    root / 'valid' / 'labels' / f'{img.stem}.txt',
                    merge_head=merge_head,
                )

        if merge_head:
            names_block = ['nc: 2', 'names:', '  0: helmet', '  1: no_helmet']
        else:
            names_block = ['nc: 3', 'names:', '  0: helmet', '  1: no_helmet', '  2: head']

        yaml_path = root / 'data.yaml'
        yaml_path.write_text(
            '\n'.join([
                f'path: {root.as_posix()}',
                'train: train/images',
                'val: valid/images',
                *names_block,
                '',
            ]),
            encoding='utf-8',
        )
        n_train = len(list((root / 'train' / 'images').glob('*.*')))
        n_val = len(list((root / 'valid' / 'images').glob('*.*')))
        self.stdout.write(self.style.NOTICE(
            f'Dataset ready: {root} (train={n_train} val={n_val} merge_head={merge_head})'
        ))
        return yaml_path

    def _detect_video(self, *, video_path: Path, weights: Path, max_frames: int, conf: float, imgsz: int):
        import cv2
        from ultralytics import YOLO

        if not video_path.is_file():
            raise CommandError(f'Video not found: {video_path}')

        out_dir = Path(settings.BASE_DIR).parent.parent / 'ai' / 'datasets' / 'samples' / 'helmet_video_out'
        out_dir.mkdir(parents=True, exist_ok=True)
        frames_dir = out_dir / 'frames'
        if frames_dir.exists():
            shutil.rmtree(frames_dir)
        frames_dir.mkdir(parents=True, exist_ok=True)

        model = YOLO(str(weights))
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise CommandError(f'Could not open video: {video_path}')

        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 25)
        step = max(total // max_frames, 1) if total > 0 else 8

        report = {
            'video': str(video_path),
            'weights': str(weights),
            'fps': fps,
            'total_frames': total,
            'sampled': 0,
            'no_helmet_hits': 0,
            'helmet_hits': 0,
            'frames': [],
        }
        colors = {'helmet': (0, 200, 0), 'no_helmet': (0, 0, 255), 'head': (0, 0, 255)}

        idx = 0
        saved = 0
        while saved < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            if total > 0 and (idx % step) != 0:
                idx += 1
                continue

            results = model.predict(frame, conf=conf, imgsz=imgsz, verbose=False, iou=0.55)
            r0 = results[0] if results else None
            dets = []
            annotated = frame.copy()
            if r0 is not None and r0.boxes is not None:
                model_names = getattr(r0, 'names', None) or {}
                for box in r0.boxes:
                    cls_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                    key = str(model_names.get(cls_id, cls_id)).lower().replace('-', '_').replace(' ', '_')
                    if key in ('without_helmet', 'no-helmet', 'head', 'bare_head'):
                        key = 'no_helmet'
                    if key in ('with_helmet',):
                        key = 'helmet'
                    dets.append({'class': key, 'confidence': round(confidence, 3), 'bbox': [x1, y1, x2, y2]})
                    color = colors.get(key, (0, 255, 0))
                    label = f'{key} {confidence:.2f}'
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(
                        annotated, label, (x1, max(y1 - 6, 12)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2, cv2.LINE_AA,
                    )
                    if key == 'no_helmet':
                        report['no_helmet_hits'] += 1
                    elif key == 'helmet':
                        report['helmet_hits'] += 1

            t_sec = round(idx / max(fps, 1e-3), 2)
            out_name = f'frame_{saved:02d}_t{t_sec}s.jpg'
            cv2.imwrite(str(frames_dir / out_name), annotated)
            report['frames'].append({
                'file': out_name,
                'frame_index': idx,
                't_sec': t_sec,
                'detections': dets,
                'no_helmet': sum(1 for d in dets if d['class'] == 'no_helmet'),
            })
            saved += 1
            report['sampled'] = saved
            idx += 1

        cap.release()
        report_path = out_dir / 'report.json'
        report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
        self.stdout.write(self.style.SUCCESS(
            f'Video detect done: sampled={report["sampled"]} '
            f'no_helmet={report["no_helmet_hits"]} helmet={report["helmet_hits"]}'
        ))
        self.stdout.write(f'Annotated frames: {frames_dir}')
        self.stdout.write(f'Report: {report_path}')
