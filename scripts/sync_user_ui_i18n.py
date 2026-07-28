"""Sync enterprise UI i18n blocks from admin to user portal."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
admin = (ROOT / "frontend-admin/shared/i18n/translations.ts").read_text(encoding="utf-8")
user_path = ROOT / "frontend-user/shared/i18n/translations.ts"
user = user_path.read_text(encoding="utf-8")

ANCHOR = "    aiDetection: {"


def split_locales(text: str) -> tuple[str, str]:
    return text.split("\n  km: {", 1)


def extract_block(text: str, key: str, next_keys: list[str]) -> str:
    start = text.index(f"    {key}: {{")
    for nk in next_keys:
        marker = f"    {nk}: {{"
        idx = text.find(marker, start + 1)
        if idx != -1:
            return text[start:idx]
    raise ValueError(f"Could not find end for {key}")


def inject_before_anchor(locale_text: str, block: str) -> str:
    idx = locale_text.index(ANCHOR)
    return locale_text[:idx] + block + locale_text[idx:]


def sync_locale(en_admin: str, en_user: str, km_admin: str, km_user: str) -> tuple[str, str]:
    if "    aiCenter: {" not in en_user:
        ai = extract_block(en_admin, "aiCenter", ["aiSettings"])
        notif = extract_block(en_admin, "notifCenter", ["notifications", "aiCenter", "aiSettings"])
        en_user = inject_before_anchor(en_user, notif + ai)
        print("Injected EN notifCenter + aiCenter")

    if "    aiCenter: {" not in km_user:
        ai = extract_block("  km: {" + km_admin, "aiCenter", ["aiSettings"])
        notif = extract_block("  km: {" + km_admin, "notifCenter", ["notifications", "aiCenter", "aiSettings"])
        km_user = inject_before_anchor(km_user, notif + ai)
        print("Injected KM notifCenter + aiCenter")

    return en_user, km_user


def patch_footer_and_subnav(text: str) -> str:
    text = text.replace(
        "    footer: {\n      adminTagline: 'Traffic enforcement administration portal',\n    },",
        "    footer: {\n      adminTagline: 'Traffic enforcement administration portal',\n      userTagline: 'Traffic enforcement portal for officers and drivers',\n    },",
        1,
    )
    text = text.replace(
        "    footer: { adminTagline: 'ផortal គ្រប់គ្រងចរាចរច្បាប់' },",
        "    footer: { adminTagline: 'ផortal គ្រប់គ្រងចរាចរច្បាប់', userTagline: 'ផortal អនុវត្តច្បាប់សម្រាប់មន្ត្រី និងអ្នកបើកបរ' },",
        1,
    )
    if "reportCenter:" not in text:
        text = text.replace(
            "        paymentHistory: 'Payments',\n      },",
            "        paymentHistory: 'Payments',\n        reportsDashboard: 'Reports Dashboard',\n        reportCenter: 'Report Center',\n        reportAnalytics: 'Analytics',\n        scheduledReports: 'Scheduled Reports',\n      },",
            1,
        )
    if text.count("reportCenter:") < 2:
        text = text.replace(
            "        paymentHistory: 'ប្រវត្តិបង់ប្រាក់',\n      },",
            "        paymentHistory: 'ប្រវត្តិបង់ប្រាក់',\n        reportsDashboard: 'ផanel របាយការណ៍',\n        reportCenter: 'មជ្ឈមណ្ឌលរបាយការណ៍',\n        reportAnalytics: 'វិភាគ',\n        scheduledReports: 'កាលវិភាគ',\n      },",
            1,
        )
    return text


def dedupe_ai_center_keys(text: str) -> str:
    dup_en = """      colObject: 'Object',
      colConfidence: 'Confidence',
      colCategory: 'Category',
      colStatus: 'Status',
      colActions: 'Actions',
      colCamera: 'Camera',
"""
    repl_en = """      colObject: 'Object',
      colCategory: 'Category',
      colStatus: 'Status',
      colCamera: 'Camera',
"""
    dup_km = """      colObject: 'វត្ថុ',
      colConfidence: 'ភាពជឿជាក់',
      colCategory: 'ប្រភេទ',
      colStatus: 'ស្ថានភាព',
      colActions: 'សកម្មភាព',
      colCamera: 'កាមេរ៉ា',
"""
    repl_km = """      colObject: 'វត្ថុ',
      colCategory: 'ប្រភេទ',
      colStatus: 'ស្ថានភាព',
      colCamera: 'កាមេរ៉ា',
"""
    return text.replace(dup_en, repl_en).replace(dup_km, repl_km)


def main() -> None:
    user_text = user_path.read_text(encoding="utf-8")
    en_admin, km_admin = split_locales(admin)
    en_user, km_user = split_locales(user_text)
    en_user, km_user = sync_locale(en_admin, en_user, km_admin, km_user)
    merged = en_user + "\n  km: {" + km_user
    merged = patch_footer_and_subnav(merged)
    merged = dedupe_ai_center_keys(merged)
    user_path.write_text(merged, encoding="utf-8")
    print("Done")


if __name__ == "__main__":
    main()
