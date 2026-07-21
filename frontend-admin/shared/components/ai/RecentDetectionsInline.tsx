import { useState } from 'react';
import { Activity, AlertCircle, Camera, Car, ChevronRight, Hash, History } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { logDisplay, logDisplayColor } from '@shared/utils/detectionDisplay';
import { getProfileImageUrl } from '@shared/utils/profileImage';
import type { AIDetectionLog } from '@shared/types';

const confColor = (c: number) => (c >= 95 ? '#10B981' : c >= 80 ? '#F59E0B' : '#EF4444');
const confGrad = (c: number) =>
  c >= 95
    ? 'linear-gradient(90deg,#10B981,#06B6D4)'
    : c >= 80
      ? 'linear-gradient(90deg,#F59E0B,#F97316)'
      : 'linear-gradient(90deg,#EF4444,#EC4899)';

function RecentDetectionThumb({
  log,
  accent,
  mode,
}: {
  log: AIDetectionLog;
  accent: string;
  mode: 'sign' | 'vehicle' | 'plate' | 'unknown_sign' | 'no_sign';
}) {
  const { locale } = useLanguage();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const hero = logDisplay(log, speechLocale);
  const [imgFailed, setImgFailed] = useState(false);
  const src = getProfileImageUrl(log.uploaded_image);
  const FallbackIcon =
    mode === 'vehicle' ? Car : mode === 'plate' ? Hash : mode === 'no_sign' || mode === 'unknown_sign' ? AlertCircle : Camera;

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={hero.title}
        className="ai-detection-recent-thumb ai-detection-recent-thumb--photo"
        style={{ boxShadow: `0 0 0 1.5px ${accent}35` }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className="ai-detection-recent-thumb ai-detection-recent-thumb--fallback"
      style={{ background: `${accent}18`, borderColor: `${accent}35` }}
    >
      <FallbackIcon size={17} strokeWidth={2.25} className="ai-detection-recent-thumb__icon" style={{ color: accent }} />
    </div>
  );
}

export function RecentDetectionsInline({
  logs,
  loading,
  onViewAll,
  limit = 3,
  variant = 'default',
}: {
  logs: AIDetectionLog[];
  loading: boolean;
  onViewAll: () => void;
  limit?: number;
  variant?: 'default' | 'enterprise';
}) {
  const { t, locale } = useLanguage();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const items = logs.slice(0, limit);
  const isEnterprise = variant === 'enterprise';

  const listContent = loading ? (
    <div className="space-y-2">
      {[...Array(limit)].map((_, i) => (
        <div key={i} className="h-[52px] rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  ) : items.length === 0 ? (
    <div className="text-center py-5 px-3 rounded-xl border border-dashed border-border bg-muted/30">
      <Activity size={22} className="mx-auto mb-2 text-muted-foreground opacity-35" />
      <p className="text-[12px] font-semibold text-muted-foreground">{t('aiDetection.noDetections')}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{t('aiDetection.noDetectionsHint')}</p>
    </div>
  ) : (
    <div className="space-y-2">
      {items.map((log) => {
        const hero = logDisplay(log, speechLocale);
        const accent = logDisplayColor(hero.mode);
        const cc = confColor(hero.confidence);
        return (
          <div
            key={log.id}
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 bg-muted/25 hover:bg-muted/50 transition-colors"
          >
            <RecentDetectionThumb log={log} accent={accent} mode={hero.mode} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[12px] font-bold truncate text-foreground">{hero.title}</p>
                <span className="text-[11px] font-black flex-shrink-0" style={{ color: cc }}>
                  {hero.confidence.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden border border-border/40">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, hero.confidence)}%`, background: confGrad(hero.confidence) }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground flex-shrink-0 truncate max-w-[64px]">
                  {log.user_name || log.detected_plate || '—'}
                </span>
              </div>
            </div>
            <span className="text-[9px] text-muted-foreground flex-shrink-0 hidden sm:block">
              {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        );
      })}
    </div>
  );

  if (isEnterprise) {
    return (
      <div className="enterprise-ai-recent enforcement-page__panel enterprise-ai-timeline">
        <header className="enterprise-ai-recent__head">
          <span className="enterprise-ai-workspace__head-glow" aria-hidden />
          <div className="enterprise-ai-workspace__head-icon">
            <History size={16} />
          </div>
          <div className="enterprise-ai-workspace__head-copy">
            <h2 className="enterprise-ai-recent__title">{t('aiCenter.recentDetectionTitle')}</h2>
            <p className="enterprise-ai-recent__subtitle">{t('aiDetection.recentSubtitle')}</p>
          </div>
          <button type="button" onClick={onViewAll} className="enterprise-ai-recent__view-all">
            {t('aiDetection.viewAll')} <ChevronRight size={12} />
          </button>
        </header>
        <div className="enterprise-ai-recent__body">{listContent}</div>
      </div>
    );
  }

  return (
    <div className="pt-3 border-t border-border">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}
          >
            <History size={14} color="white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-foreground truncate">
              {t('aiDetection.recentTitle')}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{t('aiDetection.recentSubtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 cursor-pointer transition-colors hover:bg-muted"
          style={{ color: '#059669' }}
        >
          {t('aiDetection.viewAll')} <ChevronRight size={11} />
        </button>
      </div>

      {listContent}
    </div>
  );
}
