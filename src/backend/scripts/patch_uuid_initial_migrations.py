"""Patch early migrations: UUID PKs from the start (PostgreSQL cannot cast bigint→uuid)."""
from __future__ import annotations

import re
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
MIGRATIONS = BACKEND / "migrations" if False else None  # noqa: placeholder

UUID_FIELD = (
    "('id', models.UUIDField(default=uuid.uuid4, editable=False, "
    "primary_key=True, serialize=False))"
)
BIGINT_FIELD = (
    "('id', models.BigAutoField(auto_created=True, primary_key=True, "
    "serialize=False, verbose_name='ID'))"
)

# Initial / create migrations: replace BigAutoField PK with UUID (except traffic_signs, junction tables)
UUID_PK_FILES = [
    "users/migrations/0001_initial.py",
    "users/migrations/0003_driver_officer_alter_user_managers_and_more.py",
    "users/migrations/0004_user_preferences_login_events.py",
    "vehicles/migrations/0001_initial.py",
    "infrastructure/migrations/0001_initial.py",
    "audit/migrations/0001_foundation_prd.py",
    "ai_detection/migrations/0001_initial.py",
    "ai_detection/migrations/0007_vehicle_tracking_log.py",
    "fines/migrations/0001_initial.py",
    "violations/migrations/0001_initial.py",
    "violations/migrations/0002_violationrule_trafficviolation_detected_class_key_and_more.py",
    "rbac/migrations/0001_initial.py",  # Role + Permission only — patched selectively below
    "ai_models/migrations/0001_foundation_prd.py",
    "notifications/migrations/0001_initial.py",
    "unknown_vehicles/migrations/0001_foundation_prd.py",
    "appeals/migrations/0001_foundation_prd.py",
]

ALIGNMENT_GLOB = "*uuid_schema_alignment.py"


def ensure_uuid_import(text: str) -> str:
    if "import uuid" in text:
        return text
    if "import django.db.models.deletion" in text:
        return text.replace(
            "import django.db.models.deletion",
            "import django.db.models.deletion\nimport uuid",
        )
    return text.replace(
        "from django.db import migrations, models",
        "from django.db import migrations, models\nimport uuid",
    )


def patch_uuid_pk_file(rel: str) -> None:
    path = BACKEND / rel.replace("/", "\\") if "\\" in str(BACKEND) else BACKEND / rel
    text = path.read_text(encoding="utf-8")
    original = text

    if rel == "rbac/migrations/0001_initial.py":
        # Only Permission and Role blocks — keep junction table BigAutoField ids
        for model in ("Permission", "Role"):
            pattern = (
                rf"(name='{model}',\s+fields=\[\s+)"
                + re.escape(BIGINT_FIELD)
            )
            text, n = re.subn(pattern, rf"\1{UUID_FIELD}", text, count=1)
            if n != 1:
                raise RuntimeError(f"Expected 1 Role/Permission id patch in {rel}, got {n}")
    else:
        text = text.replace(BIGINT_FIELD, UUID_FIELD)

    text = ensure_uuid_import(text)
    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"Patched {rel}")


def strip_id_alter_in_alignment(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    blocks = text.split("        migrations.AlterField(\n")
    kept = [blocks[0]]
    removed = 0
    for block in blocks[1:]:
        if block.lstrip().startswith("model_name=") and "name='id'," in block.split("),")[0]:
            removed += 1
            continue
        kept.append("        migrations.AlterField(\n" + block)
    new_text = "".join(kept)
    if removed:
        path.write_text(new_text, encoding="utf-8")
        print(f"Stripped {removed} id AlterField(s) from {path.relative_to(BACKEND)}")


def main() -> None:
    for rel in UUID_PK_FILES:
        patch_uuid_pk_file(rel)

    for path in BACKEND.rglob(ALIGNMENT_GLOB):
        strip_id_alter_in_alignment(path)

    print("Done. Recreate camtraffic_db and run: python manage.py migrate")


if __name__ == "__main__":
    main()
