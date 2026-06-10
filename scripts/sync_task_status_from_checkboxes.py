from __future__ import annotations

import re
from pathlib import Path


_ROOT = Path(__file__).resolve().parents[1]
TASK_FILE = _ROOT / "TASK.md" if (_ROOT / "TASK.md").is_file() else _ROOT / "Task.md"

# Example accepted format:
# - [x] BE-02
# - [~] AI-06
# - [ ] TS-03
CHECKBOX_RE = re.compile(r"^\s*-\s*\[(?P<mark>[xX~ ])\]\s*(?P<id>[A-Z]{2,3}-\d+)\s*$")

TABLE_ROW_RE = re.compile(
    r"^(\|\s*)(?P<id>[A-Z]{2,3}-\d+)(\s*\|.*\|\s*)(?P<status>Pending|In Progress|Completed)(\s*\|\s*)$"
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


def parse_checkbox_updates(content: str) -> dict[str, str]:
    updates: dict[str, str] = {}
    for line in content.splitlines():
        m = CHECKBOX_RE.match(line)
        if not m:
            continue
        mark = m.group("mark")
        task_id = m.group("id")
        if mark in ("x", "X"):
            updates[task_id] = "Completed"
        elif mark == "~":
            updates[task_id] = "In Progress"
        else:
            updates[task_id] = "Pending"
    return updates


def apply_updates(content: str, updates: dict[str, str]) -> tuple[str, int]:
    changed = 0
    lines = []
    for line in content.splitlines():
        m = TABLE_ROW_RE.match(line)
        if not m:
            lines.append(line)
            continue
        task_id = m.group("id")
        if task_id not in updates:
            lines.append(line)
            continue
        new_status = updates[task_id]
        old_status = m.group("status")
        if old_status != new_status:
            changed += 1
        line = f"{m.group(1)}{task_id}{m.group(3)}{new_status}{m.group(5)}"
        lines.append(line)
    return "\n".join(lines) + "\n", changed


def count_statuses(content: str) -> tuple[int, int, int]:
    completed = 0
    in_progress = 0
    pending = 0
    for line in content.splitlines():
        m = TABLE_ROW_RE.match(line)
        if not m:
            continue
        status = m.group("status")
        if status == "Completed":
            completed += 1
        elif status == "In Progress":
            in_progress += 1
        else:
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
    updates = parse_checkbox_updates(content)
    if not updates:
        print("No checkbox status lines found. Nothing to sync.")
        return

    content, changed = apply_updates(content, updates)
    content = update_summary(content)
    TASK_FILE.write_text(content, encoding="utf-8")
    print(f"Updated {changed} table row(s) and refreshed summary in {TASK_FILE.name}")


if __name__ == "__main__":
    main()
