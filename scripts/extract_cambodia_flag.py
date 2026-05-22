import json
import re
from pathlib import Path

TRANSCRIPT = Path(
    r"C:\Users\dimsa\.cursor\projects\d-Year4-Project-Thesis-Expert-System-Project-CamTraffic"
    r"\agent-transcripts\ffc8add8-bdfe-410d-97cb-e7195476a66b"
    r"\ffc8add8-bdfe-410d-97cb-e7195476a66b.jsonl"
)
ROOT = Path(__file__).resolve().parents[1]
OUT_ADMIN = ROOT / "frontend-admin" / "shared" / "assets" / "flags" / "cambodia-flag.svg"
OUT_USER = ROOT / "frontend-user" / "shared" / "assets" / "flags" / "cambodia-flag.svg"
MARKER = "viewBox=\"0 0 512 356.18\""


def text_from_message(msg: dict) -> str:
    content = msg.get("content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(part.get("text", "") for part in content if isinstance(part, dict))
    return ""


def extract_svg(blob: str) -> str | None:
    match = re.search(r"(<svg[\s\S]*?</svg>)", blob)
    return match.group(1) if match else None


def main() -> None:
    OUT_ADMIN.parent.mkdir(parents=True, exist_ok=True)
    lines = TRANSCRIPT.read_text(encoding="utf-8").splitlines()
    for line in reversed(lines):
        if MARKER not in line:
            continue
        blob = line
        try:
            obj = json.loads(line)
            role = obj.get("role") or obj.get("type")
            if role in ("user", "human"):
                blob = text_from_message(obj.get("message", obj))
        except json.JSONDecodeError:
            pass
        svg = extract_svg(blob)
        if svg:
            OUT_ADMIN.write_text(svg, encoding="utf-8")
            OUT_USER.write_text(svg, encoding="utf-8")
            print(f"written {OUT_ADMIN.stat().st_size} bytes")
            return
    raise SystemExit("Cambodia SVG not found in transcript")


if __name__ == "__main__":
    main()
