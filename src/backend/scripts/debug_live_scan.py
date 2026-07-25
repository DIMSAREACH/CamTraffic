import os
import sys
from pathlib import Path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
import django
django.setup()

from django.conf import settings
from ai_detection.live_sign_presence import analyze_live_sign_presence
from ai_detection.services import _run_hybrid_detection

signs_dir = Path(settings.MEDIA_ROOT) / 'signs'
samples = list(signs_dir.glob('*.png'))[:15]
print('=== Reference signs (first 15) ===')
for p in samples:
    m = analyze_live_sign_presence(str(p))
    result, eng = _run_hybrid_detection(str(p), 'webcam-test.jpg')
    code = result.get('sign_code') or result.get('detection_mode')
    print(
        f"{p.name[:40]:40} pres={m['present']} col={m['sign_color_ratio']:.3f} "
        f"blob={m['sign_blob_ratio']:.3f} skin={m['skin_ratio']:.3f} "
        f"-> {code} ({eng}) {result.get('confidence')}"
    )

uploads = sorted(
    (Path(settings.MEDIA_ROOT) / 'ai' / 'uploads').glob('webcam-*.jpg'),
    key=lambda x: x.stat().st_mtime,
    reverse=True,
)[:8]
print('\n=== Recent webcam uploads ===')
for p in uploads:
    m = analyze_live_sign_presence(str(p))
    result, eng = _run_hybrid_detection(str(p), 'webcam-test.jpg')
    code = result.get('sign_code') or result.get('detection_mode')
    print(
        f"{p.name} pres={m['present']} col={m['sign_color_ratio']:.3f} "
        f"blob={m['sign_blob_ratio']:.3f} skin={m['skin_ratio']:.3f} "
        f"edge={m['edge_density']:.3f} -> {code} ({eng}) {result.get('confidence')}"
    )
