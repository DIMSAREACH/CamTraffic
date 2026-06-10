from __future__ import annotations

import re
from pathlib import Path


_ROOT = Path(__file__).resolve().parents[1]
TASK_FILE = _ROOT / "TASK.md" if (_ROOT / "TASK.md").is_file() else _ROOT / "Task.md"

TASK_ROW_RE = re.compile(
    r"^\|\s+[A-Z]{2,3}-\d+\s+\|.*\|\s+(Pending|In Progress|Completed)\s+\|\s*$"
)

SUMMARY_RE = re.compile(
    r"(## 2\.1 Task Status Summary\s+"
    r"\| Status \| Count \|\s+"
    r"\| ------ \| ----- \|\s+"
    r"\| Completed \| )(\d+)( \|\s+"
    r"\| In Progress \| )(\d+)( \|\s+"
    r"\| Pending \| )(\d+)( \|\s+"
    r"\| \*\*Total\*\* \| \*\*)(\d+)(\*\* \|)",
    re.MULTILINE,
)


def count_statuses(content: str) -> tuple[int, int, int]:
    completed = 0
    in_progress = 0
    pending = 0

    for line in content.splitlines():
        match = TASK_ROW_RE.match(line)
        if not match:
            continue
        status = match.group(1)
        if status == "Completed":
            completed += 1
        elif status == "In Progress":
            in_progress += 1
        elif status == "Pending":
            pending += 1

    return completed, in_progress, pending


def update_summary(content: str) -> str:
    completed, in_progress, pending = count_statuses(content)
    total = completed + in_progress + pending

    def _repl(match: re.Match[str]) -> str:
        return (
            f"{match.group(1)}{completed}{match.group(3)}{in_progress}"
            f"{match.group(5)}{pending}{match.group(7)}{total}{match.group(9)}"
        )

    updated, count = SUMMARY_RE.subn(_repl, content, count=1)
    if count != 1:
        raise RuntimeError("Could not find exactly one 'Task Status Summary' section to update.")
    return updated


def main() -> None:
    content = TASK_FILE.read_text(encoding="utf-8")
    updated = update_summary(content)
    TASK_FILE.write_text(updated, encoding="utf-8")
    print(f"Updated summary in {TASK_FILE.name}")


if __name__ == "__main__":
    main()
