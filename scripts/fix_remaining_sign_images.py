"""
Assign real images to the 16 custom-code signs that have no image at all.
Usage: python scripts/fix_remaining_sign_images.py
"""
import os, sys, shutil
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
MEDIA_SIGNS = BACKEND_DIR / "media" / "signs"
SOURCE_ROOT = Path(r"D:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Road signs in Cambodia")

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "camtraffic.settings")
import django; django.setup()
from traffic_signs.models import TrafficSign

# Manual mapping: sign_code → (subfolder, filename)
MANUAL = {
    "KH-ROUND":      ("Warning signs",    "Roundabout ahead.png"),
    "GIVE-WAY":      ("Priority signs",   "Yield (Give way).png"),
    "KH-ONEWAY":     ("Information signs","One-way traffic.png"),
    "KH-SP40":       ("Prohibitory signs","Speed limit 20 km-h.png"),   # closest available
    "KH-SP60":       ("Prohibitory signs","Speed limit 50 km-h.png"),   # closest available
    "SCHOOL-ZONE":   ("Warning signs",    "School ahead (only applies to public schools).png"),
    "SPEED-LIMIT-40":("Prohibitory signs","Speed limit 20 km-h.png"),
    "STOP":          ("Priority signs",   "Stop (Khmer and English languages).png"),
    "KH-NO-ENTRY":   ("Prohibitory signs","No entry.png"),
    "R1-01":         ("Prohibitory signs","No left turn.png"),
    "KH-NOPARK":     ("Prohibitory signs","No parking.png"),
    "KH-NOUT":       ("Prohibitory signs","No U-turn.png"),
    "KH-PED":        ("Warning signs",    "Pedestrian crossing.png"),
    "KH-STOP":       ("Priority signs",   "Stop.png"),
    "NO-ENTRY":      ("Prohibitory signs","No entry.png"),
    "KH-YIELD":      ("Priority signs",   "Yield (Give way).png"),
}

replaced = 0
for code, (folder, filename) in MANUAL.items():
    src = SOURCE_ROOT / folder / filename
    if not src.exists():
        print(f"[NOT FOUND] {code} — {folder}/{filename}")
        continue

    dest_name = f"{code.replace('-','_')}_{src.stem[:20]}.png"
    dest = MEDIA_SIGNS / dest_name
    shutil.copy2(src, dest)

    try:
        sign = TrafficSign.objects.get(sign_code=code)
        sign.image = f"signs/{dest_name}"
        sign.save(update_fields=["image"])
        print(f"[OK] {code:20} → {dest_name}")
        replaced += 1
    except TrafficSign.DoesNotExist:
        print(f"[SKIP] {code} not in DB")

print(f"\nDone. Replaced: {replaced}")
