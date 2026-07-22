import sqlite3
from pathlib import Path
from collections import Counter

signs_dir = Path(__file__).resolve().parents[1] / "backend" / "media" / "signs"
sizes = Counter()
missing = []
for p in signs_dir.glob("*.png"):
    sizes[p.stat().st_size] += 1

print("Top duplicate file sizes (likely placeholders):")
for size, count in sizes.most_common(10):
    if count > 1:
        print(f"  {size} bytes: {count} files")
        examples = [f.name for f in signs_dir.glob("*.png") if f.stat().st_size == size][:5]
        print(f"    e.g. {examples}")

db = Path(__file__).resolve().parents[1] / "backend" / "db.sqlite3"
c = sqlite3.connect(db)
for code in ("W2-10", "R1-01", "M3-07"):
    row = c.execute(
        "SELECT sign_code, image FROM traffic_signs WHERE sign_code = ?",
        (code,),
    ).fetchone()
    img = row[1] if row else None
    fp = signs_dir / Path(img).name if img else None
    exists = fp.is_file() if fp else False
    sz = fp.stat().st_size if exists else 0
    print(f"{code}: db={img} exists={exists} size={sz}")
