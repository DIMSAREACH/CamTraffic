import { useState } from 'react';
import {
  Activity, AlertCircle, Camera, Car, ChevronRight, Eye, Hash, History, ImageIcon, Trash2,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
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
  onDelete?: (log: AIDetectionLog) => void;
  /** Max logs to keep in the list before paginating (default: all). */
  limit?: number;
  pageSize?: number;
}

const TABLE_COLUMNS = [
  { key: 'thumb', labelKey: 'aiLogs.colImage', colClass: 'ai-center-recent-table__col--thumb' },
  { key: 'detection', labelKey: 'aiCenter.colObject', colClass: 'ai-center-recent-table__col--detection' },
  { key: 'confidence', labelKey: 'aiCenter.colConfidence', colClass: 'ai-center-recent-table__col--confidence' },
  { key: 'user', labelKey: 'aiLogs.colUser', colClass: 'ai-center-recent-table__col--user' },
  { key: 'date', labelKey: 'aiLogs.colDate', colClass: 'ai-center-recent-table__col--date' },
  { key: 'actions', labelKey: 'aiCenter.colActions', colClass: 'ai-center-recent-table__col--actions' },
] as const;

function modeIcon(mode: string) {
  if (mode === 'vehicle') return Car;
  if (mode === 'plate') return Hash;
  if (mode === 'no_sign' || mode === 'unknown_sign') return AlertCircle;
  return Camera;
}

function RecentDetectionThumb({
  log,
  accent,
  mode,
  onClick,
}: {
  log: AIDetectionLog;
  accent: string;
  mode: string;
  onClick?: () => void;
}) {
  const { locale } = useLanguage();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const hero = logDisplay(log, speechLocale);
  const [imgFailed, setImgFailed] = useState(false);
  const src = getProfileImageUrl(log.uploaded_image);
  const FallbackIcon = modeIcon(mode);

  if (src && !imgFailed) {
    return (
      <button type="button" className="enforcement-page__log-thumb" onClick={onClick}>
        <img
          src={src}
          alt={hero.title}
          title={hero.title}
          className="enforcement-page__log-thumb-img"
          style={{ boxShadow: `0 0 0 1.5px ${accent}30` }}
          onError={() => setImgFailed(true)}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="enforcement-page__log-thumb enforcement-page__log-thumb--empty"
      style={{ background: `${accent}18`, borderColor: `${accent}35` }}
      onClick={onClick}
      aria-label={hero.title}
    >
      <FallbackIcon size={16} style={{ color: accent }} />
    </button>
  );
}

export function RecentDetectionsTable({
  logs,
  loading = false,
  onViewAll,
  onViewLog,
  onDelete,
  limit,
  pageSize = 10,
}: RecentDetectionsTableProps) {
  const { t, locale } = useLanguage();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const dateLocale = locale === 'en' ? 'en-US' : 'km-KH';
  const pool = typeof limit === 'number' ? logs.slice(0, limit) : logs;
  const pagination = usePagination(pool, pageSize);

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

      <div className="overflow-x-auto">
        <Table className="enforcement-page__table mgmt-table__grid enforcement-page__table--ai-center-recent">
          <TableHeader>
            <TableRow className="enforcement-page__table-head">
              {TABLE_COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  className={`enforcement-page__th text-left ${col.colClass}${col.key === 'actions' ? ' text-right' : ''}`}
                >
                  {t(col.labelKey)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(Math.min(pageSize, 5))].map((_, i) => (
                <TableRow key={i} className="enforcement-page__table-row">
                  {TABLE_COLUMNS.map((col) => (
                    <TableCell key={col.key} className={`py-3.5 ${col.colClass}`}>
                      <div className="enforcement-page__skeleton" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : pool.length === 0 ? (
              <TableEmptyState
                colSpan={TABLE_COLUMNS.length}
                tone="violet"
                icon={<Activity size={28} />}
                title={t('aiDetection.noDetections')}
                subtitle={t('aiDetection.noDetectionsHint')}
              />
            ) : (
              pagination.pageItems.map((log) => {
                const hero = logDisplay(log, speechLocale);
                const accent = logDisplayColor(hero.mode);
                const ModeIcon = modeIcon(hero.mode);
                const createdAt = new Date(log.created_at);
                const confColor =
                  hero.confidence >= 95 ? '#10B981' : hero.confidence >= 80 ? '#F59E0B' : '#EF4444';

                return (
                  <TableRow key={log.id} className="enforcement-page__table-row ai-center-recent-table__row">
                    <TableCell className={`py-3.5 ${TABLE_COLUMNS[0].colClass}`}>
                      <RecentDetectionThumb
                        log={log}
                        accent={accent}
                        mode={hero.mode}
                        onClick={() => onViewLog?.(log)}
                      />
                    </TableCell>
                    <TableCell className={`py-3.5 ${TABLE_COLUMNS[1].colClass}`}>
                      <div className="ai-center-recent-table__detection">
                        <ModeIcon size={13} style={{ color: accent, flexShrink: 0 }} />
                        <div className="min-w-0">
                          <p className="enforcement-page__cell-primary truncate" title={hero.title}>
                            {hero.title}
                          </p>
                          {hero.description ? (
                            <p className="enforcement-page__cell-secondary truncate" title={hero.description}>
                              {hero.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`py-3.5 ${TABLE_COLUMNS[2].colClass}`}>
                      <span
                        className="enforcement-page__badge"
                        style={{ background: `${confColor}18`, color: confColor }}
                      >
                        {hero.confidence.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className={`py-3.5 ${TABLE_COLUMNS[3].colClass}`}>
                      <span className="enforcement-page__cell-primary truncate" title={log.user_name || log.detected_plate || ''}>
                        {log.user_name || log.detected_plate || '—'}
                      </span>
                    </TableCell>
                    <TableCell className={`py-3.5 ${TABLE_COLUMNS[4].colClass}`}>
                      <div className="ai-center-recent-table__date">
                        <span className="enforcement-page__cell-primary">
                          {createdAt.toLocaleDateString(dateLocale)}
                        </span>
                        <span className="enforcement-page__cell-secondary">
                          {createdAt.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={`py-3.5 ${TABLE_COLUMNS[5].colClass}`}>
                      <div className="enforcement-page__table-actions ai-center-recent-table__actions">
                        <button
                          type="button"
                          className="ai-center-history-table__action-btn ai-center-history-table__action-btn--view"
                          onClick={() => onViewLog?.(log)}
                          title={t('aiLogs.view')}
                          aria-label={t('aiLogs.view')}
                        >
                          <Eye size={13} />
                        </button>
                        {onDelete ? (
                          <button
                            type="button"
                            className="ai-center-history-table__action-btn ai-center-history-table__action-btn--reject"
                            onClick={() => onDelete(log)}
                            title={t('aiLogs.delete')}
                            aria-label={t('aiLogs.delete')}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <span className="enforcement-page__cell-secondary" aria-hidden>
                            <ImageIcon size={13} className="opacity-0" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && pool.length > 0 ? (
        <TablePagination
          pagination={pagination}
          labelKey="pagination.label.logs"
        />
      ) : null}
    </section>
  );
}
