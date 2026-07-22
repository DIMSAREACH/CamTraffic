"""Remove id AlterField blocks from *uuid_schema_alignment.py (UUID PKs now in initial migrations)."""
import re
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
PAT = re.compile(
    r"        migrations\.AlterField\(\n"
    r"            model_name='[^']+',\n"
    r"            name='id',\n"
    r"            field=models\.UUIDField\([^)]+\),\n"
    r"        \),\n",
    re.MULTILINE,
)


def main() -> None:
    for path in BACKEND.rglob("*uuid_schema_alignment.py"):
        if path.name == "0007_uuid_schema_alignment.py" and "users" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        new = PAT.sub("", text)
        if new == text:
            continue
        if "UUIDField" not in new and "import uuid\n" in new:
            new = new.replace("import uuid\n", "")
        path.write_text(new, encoding="utf-8")
        print(f"fixed {path.relative_to(BACKEND)}")


if __name__ == "__main__":
    main()
