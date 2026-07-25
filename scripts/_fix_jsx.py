from pathlib import Path

OLD = """                        ✓ {t('aiDetection.detected')}
                      </div>
                    </div>
                  </div>"""

NEW = """                        ✓ {t('aiDetection.detected')}
                      </div>
                    )}
                  </div>"""

for rel in [
    "frontend-user/shared/pages/AIDetectionPage.tsx",
    "frontend-admin/shared/pages/AIDetectionPage.tsx",
    "scripts/upload_card_block.tsx",
]:
    p = Path(__file__).resolve().parent.parent / rel
    t = p.read_text(encoding="utf-8")
    if OLD not in t:
        print("skip (no match):", rel)
        continue
    p.write_text(t.replace(OLD, NEW, 1), encoding="utf-8")
    print("fixed:", rel)
