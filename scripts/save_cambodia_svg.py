"""Save Cambodia flag SVG from stdin to shared assets."""
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "frontend-admin" / "shared" / "assets" / "flags" / "cambodia-flag.svg"

def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = sys.stdin.read().strip()
    if "<svg" not in data:
        raise SystemExit("stdin must contain <svg>...</svg>")
    OUT.write_text(data, encoding="utf-8")
    user_out = Path(__file__).resolve().parents[1] / "frontend-user" / "shared" / "assets" / "flags" / "cambodia-flag.svg"
    user_out.parent.mkdir(parents=True, exist_ok=True)
    user_out.write_text(data, encoding="utf-8")
    print(f"saved {OUT.stat().st_size} bytes")

if __name__ == "__main__":
    main()
