"""Write Cambodia flag SVG from a single-line source file."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(__file__).resolve().parent / "kh-flag-source.txt"
OUT_ADMIN = ROOT / "frontend-admin" / "shared" / "assets" / "flags" / "cambodia-flag.svg"
OUT_USER = ROOT / "frontend-user" / "shared" / "assets" / "flags" / "cambodia-flag.svg"


def main() -> None:
    data = SRC.read_text(encoding="utf-8").strip()
    if "<svg" not in data:
        raise SystemExit("kh-flag-source.txt must contain <svg>...</svg>")
    OUT_ADMIN.parent.mkdir(parents=True, exist_ok=True)
    OUT_USER.parent.mkdir(parents=True, exist_ok=True)
    OUT_ADMIN.write_text(data, encoding="utf-8")
    OUT_USER.write_text(data, encoding="utf-8")
    print(f"Wrote {OUT_ADMIN.stat().st_size} bytes to admin and user")


if __name__ == "__main__":
    main()
