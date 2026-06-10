from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = [
    ROOT / "frontend-user/shared/pages/AIDetectionPage.tsx",
    ROOT / "frontend-admin/shared/pages/AIDetectionPage.tsx",
]
BLOCK = (Path(__file__).parent / "upload_card_block_before.tsx").read_text(encoding="utf-8")
START_MARKERS = [
    "            <CardWrap className={`flex flex-col overflow-hidden ${result ? 'flex-shrink-0' : 'flex-1'}`}>",
    '            <CardWrap className="flex flex-col overflow-hidden flex-1">',
]
END = "            {result && (\n              <RecentDetectionsCard"

for path in FILES:
    text = path.read_text(encoding="utf-8")
    start = -1
    for m in START_MARKERS:
        start = text.find(m)
        if start != -1:
            break
    end = text.find(END, start)
    if start == -1 or end == -1:
        raise SystemExit(f"markers not found in {path}")
    path.write_text(text[:start] + BLOCK + text[end:], encoding="utf-8")
    print("patched", path.name)
