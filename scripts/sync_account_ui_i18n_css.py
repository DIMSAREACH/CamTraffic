from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
admin_css = ROOT / "frontend-admin/shared/styles/dashboard.css"
user_css = ROOT / "frontend-user/shared/styles/dashboard.css"
admin_i18n = ROOT / "frontend-admin/shared/i18n/translations.ts"
user_i18n = ROOT / "frontend-user/shared/i18n/translations.ts"

marker = "/* Notifications — blue accent */"
admin_text = admin_css.read_text(encoding="utf-8")
user_text = user_css.read_text(encoding="utf-8")
if marker not in user_text:
    user_css.write_text(user_text.rstrip() + "\n\n" + admin_text[admin_text.index(marker):], encoding="utf-8")
    print("CSS appended")

admin = admin_i18n.read_text(encoding="utf-8")
user = user_i18n.read_text(encoding="utf-8")

old_pages = "      notifications: { title: 'ការជូនដំណឹង', subtitle: 'ការជូនដំណឹង និងសារប្រព័ន្ធ' },"
if old_pages in user:
    start = admin.index("      notifications: {\n        title: 'ការជូនដំណឹង',")
    end = admin.index("      users:", start)
    user = user.replace(old_pages, admin[start:end].rstrip())

if "prefRealtimeDesc" not in user.split("exportSuccess: 'បាននាំចេញ")[1][:800]:
    start = admin.index("    notifications: {\n      statTotal:")
    end = admin.index("    vehicles: {", start)
    insert = "      exportSuccess: 'បាននាំចេញរបាយការណ៍ PDF (សាកល្បង)',\n    },\n"
    user = user.replace(insert, insert + admin[start:end], 1)

old_profile = "      recentActivity: 'សកម្មភាពថ្មីៗ',\n    },\n    aiDetection:"
if "personalInformation" not in user[user.index("recentActivity: 'សកម្ម"):user.index("recentActivity: 'សកម្ម") + 120]:
    start = admin.index("      recentActivity: 'សកម្មភាពថ្មីៗ',")
    end = admin.index("    aiDetection:", start)
    user = user.replace(old_profile, admin[start:end] + "    aiDetection:", 1)

user_i18n.write_text(user, encoding="utf-8")
print("i18n synced")
