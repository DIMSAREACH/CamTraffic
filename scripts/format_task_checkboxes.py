"""Convert TASK.md items to GitHub-style markdown checkboxes."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "TASK.md"
text = path.read_text(encoding="utf-8")

text = re.sub(r"^\* `\[x\]── (\d+)\.` (.+)$", r"- [x] **\1.** \2", text, flags=re.MULTILINE)
text = re.sub(r"^\* `\[ \]── (\d+)\.` (.+)$", r"- [ ] **\1.** \2", text, flags=re.MULTILINE)
text = re.sub(r"^\* `\[x\]` (.+)$", r"- [x] \1", text, flags=re.MULTILINE)
text = re.sub(r"^\* `\[ \]` (.+)$", r"- [ ] \1", text, flags=re.MULTILINE)


def convert_codeblock(match: re.Match[str]) -> str:
    body = match.group(1)
    out: list[str] = []
    for line in body.splitlines():
        s = line.strip()
        if s.startswith("[x]"):
            out.append("- [x] " + s[3:].strip())
        elif s.startswith("[ ]"):
            out.append("- [ ] " + s[3:].strip())
        elif s.startswith("[~]"):
            out.append("- [ ] ~(partial)~ " + s[3:].strip())
        elif s:
            out.append(s)
    return "\n".join(out) + "\n"


text = re.sub(
    r"```text\n((?:\[.\].*(?:\n|$))+?)```",
    convert_codeblock,
    text,
)

text = re.sub(r"^\d+\. \*\*\[x\]\*\* (.+)$", r"- [x] \1", text, flags=re.MULTILINE)
text = re.sub(r"^### `\[ \]` (.+)$", r"### \1", text, flags=re.MULTILINE)

path.write_text(text, encoding="utf-8")
print(f"Updated {path}")
