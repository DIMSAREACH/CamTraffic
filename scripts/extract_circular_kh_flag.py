"""Extract circular Cambodia flag SVG from agent transcript JSONL."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRANSCRIPT = (
    Path.home()
    / ".cursor"
    / "projects"
    / "d-Year4-Project-Thesis-Expert-System-Project-CamTraffic"
    / "agent-transcripts"
    / "ffc8add8-bdfe-410d-97cb-e7195476a66b"
    / "ffc8add8-bdfe-410d-97cb-e7195476a66b.jsonl"
)
MARKER = 'viewBox=\\"0 0 512 512\\"'
PATH_MARKER = 'M256 0c70.683'
OUT_PATHS = [
    ROOT / "frontend-admin" / "shared" / "assets" / "flags" / "cambodia-flag.svg",
    ROOT / "frontend-user" / "shared" / "assets" / "flags" / "cambodia-flag.svg",
    ROOT / "scripts" / "kh-flag-source.txt",
]


def main() -> None:
    text = TRANSCRIPT.read_text(encoding="utf-8", errors="ignore")
    view_idx = text.find(MARKER)
    if view_idx < 0:
        raise SystemExit(f"viewBox marker not found in {TRANSCRIPT}")
    start = text.rfind("<svg", 0, view_idx)
    if start < 0:
        raise SystemExit("svg start not found")
    end = text.find("</svg>", view_idx) + len("</svg>")
    chunk = text[start:end]
    if PATH_MARKER not in chunk.replace("\\", ""):
        raise SystemExit("Expected circular flag path missing — wrong SVG slice")
    svg = chunk.replace('\\"', '"')
    if 'viewBox="0 0 512 512"' not in svg:
        raise SystemExit(f"Unexpected viewBox in extracted SVG: {svg[0:200]!r}")
    if not svg.startswith("<svg"):
        raise SystemExit("Unescape failed")
    # Gray outer ring is heavy at small sizes; keep the white/blue/red artwork.
    svg = re.sub(r'<path fill="#4D4D4D"[^/]*/>', "", svg, count=1)
    for path in OUT_PATHS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(svg, encoding="utf-8")
    print(f"Wrote {len(svg.encode('utf-8'))} bytes to {len(OUT_PATHS)} paths")


if __name__ == "__main__":
    main()
