from pathlib import Path

NEW_BLOCK = r"""        {/* ── Description + Guidance ── */}
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl overflow-hidden border border-blue-200/60 dark:border-blue-500/25">
            <div className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0.06) 100%)' }}>
              <motion className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.28)' }}>
                  <Info size={16} style={{ color: '#3B82F6' }} />
                </div>
                <p className="text-[15px] font-bold text-foreground leading-tight">{t('aiDetection.description')}</p>
              </div>
              <SpeakButton
                label={t('aiDetection.readDescription')}
                isActive={speakingId === 'desc'}
                onClick={() => speakKm(km.desc, 'desc')}
              />
            </div>
            <div className="px-4 py-4 bg-blue-50/50 dark:bg-blue-950/20">
              <p className="text-[15px] sm:text-[16px] text-foreground leading-[1.75] font-khmer">{km.desc}</p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-amber-200/70 dark:border-amber-500/25">
            <div className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(245,158,11,0.06) 100%)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.28)' }}>
                  <AlertCircle size={16} style={{ color: '#D97706' }} />
                </div>
                <p className="text-[15px] font-bold text-foreground leading-tight">{t('aiDetection.guidance')}</p>
              </div>
              <SpeakButton
                label={t('aiDetection.readGuidance')}
                isActive={speakingId === 'guide'}
                onClick={() => speakKm(guidanceSpeech, 'guide')}
              />
            </div>
            <div className="px-4 py-4 bg-amber-50/60 dark:bg-amber-950/20">
              <p className="text-[15px] sm:text-[16px] text-foreground leading-[1.75] font-khmer">{km.guide}</p>
            </div>
          </div>
        </div>

        {/* ── Processing stats row ── */}
        <div className="grid grid-cols-3 gap-3 border-t border-border/70 pt-4">
          {[
            { label: t('aiDetection.processTime'), value: `${result.processing_time}s`, Icon: Clock, color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
            { label: t('aiDetection.model'), value: 'YOLOv8', Icon: Cpu, color: '#06B6D4', bg: 'rgba(6,182,212,0.10)' },
            { label: t('aiDetection.region'), value: t('aiDetection.cambodia'), Icon: MapPin, color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-3 py-3 text-center border border-border/60"
              style={{ background: s.bg }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>
                <s.Icon size={15} style={{ color: s.color }} />
              </div>
              <p className="text-[14px] font-bold text-foreground leading-tight">{s.value}</p>
              <p className="text-[11.5px] text-muted-foreground mt-1 leading-snug">{s.label}</p>
            </motion>
          ))}
        </div>
"""

NEW_BLOCK = NEW_BLOCK.replace("<motion ", "<div ").replace("</motion>", "</div>")

root = Path(__file__).resolve().parent.parent
for rel in [
    "frontend-user/shared/pages/AIDetectionPage.tsx",
    "frontend-admin/shared/pages/AIDetectionPage.tsx",
]:
    p = root / rel
    lines = p.read_text(encoding="utf-8").splitlines(keepends=True)
    start = next(i for i, l in enumerate(lines) if "Description + Guidance" in l)
    end = next(i for i, l in enumerate(lines) if "Reset button" in l)
    lines[start:end] = [NEW_BLOCK + "\n\n"]
    p.write_text("".join(lines), encoding="utf-8")
    print("patched", rel)
