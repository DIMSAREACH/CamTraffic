import { useState } from 'react';
import {
  Activity, AlertCircle, Camera, Car, ChevronRight, Hash, History,
} from 'lucide-react';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { useLanguage } from '@shared/context/LanguageContext';
import { usePagination } from '@shared/hooks/usePagination';
import { logDisplay, logDisplayColor } from '@shared/utils/detectionDisplay';
import { getProfileImageUrl } from '@shared/utils/profileImage';
import type { AIDetectionLog } from '@shared/types';

interface RecentDetectionsTableProps {
  logs: AIDetectionLog[];
  loading?: boolean;
  onViewAll?: () => void;
  onViewLog?: (log: AIDetectionLog) => void;
  /** Max logs to keep in the list before paginating (default: all). */
  limit?: number;
  pageSize?: number;
}

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
    mode === 'vehicle' ? Car
      : mode === 'plate' ? Hash
        : mode === 'no_sign' || mode === 'unknown_sign' ? AlertCircle
          : Camera;

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={hero.title}
        title={hero.title}
        className="ai-detection-recent-thumb ai-detection-recent-thumb--photo"
        style={{ boxShadow: `0 0 0 1.5px ${accent}30` }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className="ai-detection-recent-thumb ai-detection-recent-thumb--fallback"
      style={{ background: `${accent}18`, borderColor: `${accent}35` }}
    >
      <FallbackIcon size={18} strokeWidth={2.25} className="ai-detection-recent-thumb__icon" style={{ color: accent }} />
    </div>
  );
}

export function RecentDetectionsTable({
  logs,
  loading = false,
  onViewAll,
  onViewLog,
  limit,
  pageSize = 10,
}: RecentDetectionsTableProps) {
  const { t, locale } = useLanguage();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const pool = typeof limit === 'number' ? logs.slice(0, limit) : logs;
  const pagination = usePagination(pool, pageSize);
  const items = pagination.pageItems;

  return (
    <section className="enterprise-ai-recent enforcement-page__panel enterprise-ai-timeline">
      <header className="enterprise-ai-recent__head">
        <span className="enterprise-ai-chart-dot enterprise-ai-chart-dot--recent" aria-hidden />
        <div className="enterprise-ai-workspace__head-copy">
          <h2 className="enterprise-ai-recent__title">{t('aiCenter.recentDetectionTitle')}</h2>
          <p className="enterprise-ai-recent__subtitle">{t('aiDetection.recentSubtitle')}</p>
        </div>
        <div className="enterprise-ai-workspace__head-icon enterprise-ai-workspace__head-icon--recent">
          <History size={16} />
        </div>
        {onViewAll ? (
          <button type="button" className="enterprise-ai-recent__view-all" onClick={onViewAll}>
            {t('aiDetection.viewAll')}
            <ChevronRight size={12} />
          </button>
        ) : null}
      </header>

      <div className="enterprise-ai-recent__body">
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label={t('aiCenter.loadingRecent')}>
            {[...Array(Math.min(pageSize, 5))].map((_, i) => (
              <div key={i} className="h-[52px] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : pool.length === 0 ? (
          <div className="text-center py-8 px-3 rounded-xl border border-dashed border-border bg-muted/30">
            <Activity size={26} className="mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-[13px] font-semibold text-muted-foreground">{t('aiDetection.noDetections')}</p>
            <p className="text-[12px] text-muted-foreground mt-1">{t('aiDetection.noDetectionsHint')}</p>
          </div>
        ) : (
          <div className="enterprise-ai-recent__list">
            {items.map((log) => {
              const hero = logDisplay(log, speechLocale);
              const sc = logDisplayColor(hero.mode);
              const cc = confColor(hero.confidence);
              return (
                <button
                  key={log.id}
                  type="button"
                  className="enterprise-ai-recent__row"
                  onClick={() => onViewLog?.(log)}
                >
                  <RecentDetectionThumb log={log} accent={sc} mode={hero.mode} />
                  <div className="enterprise-ai-recent__row-copy">
                    <div className="enterprise-ai-recent__row-top">
                      <p className="enterprise-ai-recent__row-title">{hero.title}</p>
                      <span className="enterprise-ai-recent__row-conf" style={{ color: cc }}>
                        {hero.confidence.toFixed(1)}%
                      </span>
                    </div>
                    <div className="enterprise-ai-recent__row-meta">
                      <div className="enterprise-ai-recent__bar">
                        <div
                          className="enterprise-ai-recent__bar-fill"
                          style={{
                            width: `${Math.min(100, Math.max(hero.confidence, 0))}%`,
                            background: confGrad(hero.confidence),
                          }}
                        />
                      </div>
                      <span className="enterprise-ai-recent__row-user">
                        {log.user_name || log.detected_plate || '—'}
                      </span>
                    </div>
                  </div>
                  <span className="enterprise-ai-recent__row-date">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!loading && pool.length > 0 ? (
        <div className="enterprise-ai-recent__footer">
          <TablePagination
            pagination={pagination}
            rangeKey="pagination.rangeShort"
            variant="footer"
          />
        </div>
      ) : null}
    </section>
  );
}
