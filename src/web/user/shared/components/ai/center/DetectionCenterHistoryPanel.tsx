import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Download, Eye, CheckCircle, XCircle, Clock, RefreshCw, Loader2, History,
} from 'lucide-react';
import { Dialog, DialogContent } from '@shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { usePagination } from '@shared/hooks/usePagination';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { aiAPI } from '@shared/services/api';
import { toast } from 'sonner';
import { logDisplay, logDisplayColor } from '@shared/utils/detectionDisplay';
import { AnnotatedDetectionImage } from '@shared/components/ai/center/AnnotatedDetectionImage';
import type { AIDetectionLog } from '@shared/types';
import { cn } from '@shared/components/ui/utils';

const REVIEW_TABS = ['all', 'pending', 'approved', 'rejected'] as const;
type ReviewTab = typeof REVIEW_TABS[number];

const REVIEW_FILTER_STYLE: Record<ReviewTab, string | null> = {
  all: 'linear-gradient(135deg, #0F172A, #1E293B)',
  pending: 'linear-gradient(135deg, #F59E0B, #D97706)',
  approved: 'linear-gradient(135deg, #10B981, #059669)',
  rejected: 'linear-gradient(135deg, #EF4444, #DC2626)',
};

const REVIEW_BADGE: Record<string, {
  icon: typeof Clock;
  bg: string;
  color: string;
}> = {
  pending: { icon: Clock, bg: 'rgba(245,158,11,0.12)', color: '#D97706' },
  approved: { icon: CheckCircle, bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  rejected: { icon: XCircle, bg: 'rgba(239,68,68,0.1)', color: '#DC2626' },
};

function reviewBadge(status: string | undefined, t: (k: string) => string) {
  const s = status || 'pending';
  const meta = REVIEW_BADGE[s] ?? REVIEW_BADGE.pending;
  const Icon = meta.icon;
  return (
    <span className="enforcement-page__badge" style={{ background: meta.bg, color: meta.color }}>
      <Icon size={11} />
      {s === 'approved' ? t('aiCenter.reviewApproved')
        : s === 'rejected' ? t('aiCenter.reviewRejected')
          : t('aiCenter.reviewPending')}
    </span>
  );
}

const TABLE_COLUMNS = [
  { key: 'time', labelKey: 'aiCenter.colTime' },
  { key: 'sign', labelKey: 'aiCenter.colSign' },
  { key: 'plate', labelKey: 'aiCenter.colPlate' },
  { key: 'confidence', labelKey: 'aiCenter.colConfidence' },
  { key: 'review', labelKey: 'aiCenter.colReview' },
  { key: 'actions', labelKey: 'aiCenter.colActions' },
] as const;

export function DetectionCenterHistoryPanel() {
  const { t, locale } = useLanguage();
  const dateLocale = locale === 'km' ? 'km-KH' : 'en-US';
  const [search, setSearch] = useState('');
  const [reviewTab, setReviewTab] = useState<ReviewTab>('all');
  const [detail, setDetail] = useState<AIDetectionLog | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [logs, setLogs] = useState<AIDetectionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await aiAPI.getLogs();
      setLogs(data);
    } catch {
      if (!quiet) toast.error(t('aiCenter.historyLoadFailed'));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadLogs(); }, [loadLogs]);
  useLiveData(() => loadLogs(true), 15_000, true);

  const counts = useMemo(() => ({
    all: logs.length,
    pending: logs.filter((l) => (l.review_status || 'pending') === 'pending').length,
    approved: logs.filter((l) => l.review_status === 'approved').length,
    rejected: logs.filter((l) => l.review_status === 'rejected').length,
  }), [logs]);

  const filtered = useMemo(() => {
    let rows = logs ?? [];
    if (reviewTab !== 'all') {
      rows = rows.filter((l) => (l.review_status || 'pending') === reviewTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((l) =>
        l.detected_sign.toLowerCase().includes(q)
        || (l.detected_plate || '').toLowerCase().includes(q)
        || l.user_name.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [logs, reviewTab, search]);

  const pagination = usePagination(filtered);

  const handleReview = async (log: AIDetectionLog, status: 'approved' | 'rejected') => {
    setReviewing(String(log.id));
    try {
      await aiAPI.reviewLog(String(log.id), status);
      toast.success(status === 'approved' ? t('aiCenter.approveSuccess') : t('aiCenter.rejectSuccess'));
      await loadLogs(true);
      if (detail?.id === log.id) {
        setDetail({ ...detail, review_status: status });
      }
    } catch {
      toast.error(t('aiCenter.reviewFailed'));
    } finally {
      setReviewing(null);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await aiAPI.exportLogsCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-detection-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('aiCenter.exportSuccess'));
    } catch {
      toast.error(t('aiCenter.exportFailed'));
    }
  };

  return (
    <div className="ai-center-history enforcement-page__panel enforcement-page__panel--ai-center-history">
      <header className="ai-center-history__hero">
        <span className="ai-center-panel__header-glow" aria-hidden />
        <div className="ai-center-panel__header-icon ai-center-panel__header-icon--amber">
          <History size={18} />
        </div>
        <div>
          <h2 className="ai-center-panel__title">{t('aiCenter.tabHistory')}</h2>
          <p className="ai-center-panel__subtitle">{t('aiCenter.historySubtitle')}</p>
        </div>
      </header>

      <div className="enforcement-page__toolbar ai-center-history__toolbar">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3 w-full">
          <div className="enforcement-page__filters">
            {REVIEW_TABS.map((tab) => {
              const active = reviewTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  className={cn(
                    'enforcement-page__filter-btn',
                    active && 'enforcement-page__filter-btn--active',
                  )}
                  style={active ? { background: REVIEW_FILTER_STYLE[tab] ?? undefined } : undefined}
                  onClick={() => setReviewTab(tab)}
                >
                  {t(`aiCenter.reviewTab.${tab}`)}
                  <span className={cn(
                    'enforcement-page__filter-count',
                    active && 'enforcement-page__filter-count--active',
                  )}
                  >
                    {counts[tab]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="enforcement-page__search-wrap ai-center-history__search-wrap">
            <Search size={14} className="enforcement-page__search-icon" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('aiCenter.historySearch')}
              className="enforcement-page__search"
            />
          </div>

          <div className="ai-center-history__actions">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--slate ai-center-history__action"
              onClick={() => void loadLogs()}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {t('aiCenter.refresh')}
            </button>
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--teal ai-center-history__action"
              onClick={() => void handleExport()}
            >
              <Download size={14} />
              {t('aiCenter.exportCsv')}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="enforcement-page__table mgmt-table__grid enforcement-page__table--ai-center-history">
          <TableHeader>
            <TableRow className="enforcement-page__table-head">
              {TABLE_COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    'enforcement-page__th text-left',
                    col.key === 'actions' && 'text-right',
                    `ai-center-history-table__col--${col.key}`,
                  )}
                >
                  {t(col.labelKey)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !logs.length ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="enforcement-page__table-row">
                  {TABLE_COLUMNS.map((col) => (
                    <TableCell key={col.key} className="py-3.5">
                      <div className="enforcement-page__skeleton" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableEmptyState
                colSpan={TABLE_COLUMNS.length}
                tone="violet"
                icon={<History size={28} />}
                title={t('aiCenter.historyEmpty')}
                subtitle={t('aiCenter.historySubtitle')}
              />
            ) : pagination.pageItems.map((log) => {
              const hero = logDisplay(log, locale);
              const confColor = logDisplayColor(hero.confidence);
              const isReviewing = reviewing === String(log.id);
              const createdAt = new Date(log.created_at);
              const isPending = (log.review_status || 'pending') === 'pending';

              return (
                <TableRow key={String(log.id)} className="enforcement-page__table-row ai-center-history-table__row">
                  <TableCell className="py-3.5 ai-center-history-table__col--time">
                    <div className="ai-center-history-table__date">
                      <span className="enforcement-page__cell-primary">
                        {createdAt.toLocaleDateString(dateLocale)}
                      </span>
                      <span className="enforcement-page__cell-secondary">
                        {createdAt.toLocaleTimeString(dateLocale)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 ai-center-history-table__col--sign">
                    <p className="enforcement-page__cell-primary ai-center-history-table__truncate" title={hero.title}>
                      {hero.title}
                    </p>
                    {hero.description ? (
                      <p className="enforcement-page__cell-secondary ai-center-history-table__truncate" title={hero.description}>
                        {hero.description}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-3.5 ai-center-history-table__col--plate">
                    <span className="enforcement-page__cell-mono">
                      {log.detected_plate || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5 ai-center-history-table__col--confidence">
                    <span className="enforcement-page__badge" style={{ background: `${confColor}18`, color: confColor }}>
                      {hero.confidence.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5 ai-center-history-table__col--review">
                    {reviewBadge(log.review_status, t)}
                  </TableCell>
                  <TableCell className="py-3.5 ai-center-history-table__col--actions">
                    <div className="enforcement-page__table-actions ai-center-history-table__actions">
                      <button
                        type="button"
                        className="ai-center-history-table__action-btn ai-center-history-table__action-btn--view"
                        onClick={() => setDetail(log)}
                        title={t('aiCenter.colActions')}
                        aria-label={t('aiCenter.colActions')}
                      >
                        <Eye size={13} />
                      </button>
                      {isPending && (
                        <>
                          <button
                            type="button"
                            className="ai-center-history-table__action-btn ai-center-history-table__action-btn--approve"
                            disabled={isReviewing}
                            onClick={() => void handleReview(log, 'approved')}
                            title={t('aiCenter.approve')}
                            aria-label={t('aiCenter.approve')}
                          >
                            <CheckCircle size={13} />
                          </button>
                          <button
                            type="button"
                            className="ai-center-history-table__action-btn ai-center-history-table__action-btn--reject"
                            disabled={isReviewing}
                            onClick={() => void handleReview(log, 'rejected')}
                            title={t('aiCenter.reject')}
                            aria-label={t('aiCenter.reject')}
                          >
                            <XCircle size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!loading && filtered.length > 0 && (
        <TablePagination pagination={pagination} labelKey="pagination.label.logs" />
      )}

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="ai-center-history-dialog max-w-3xl">
          {detail && (
            <div className="ai-center-history-dialog__body">
              <h3 className="ai-center-history-dialog__title">{logDisplay(detail, locale).title}</h3>
              <p className="ai-center-history-dialog__meta">
                <Clock size={14} />
                {new Date(detail.created_at).toLocaleString(dateLocale)}
                {' · '}
                {detail.model_version || 'YOLO'}
                {' · '}
                {reviewBadge(detail.review_status, t)}
              </p>
              {detail.uploaded_image && (
                <AnnotatedDetectionImage
                  src={detail.uploaded_image}
                  alt=""
                  result={{
                    sign_name: detail.detected_sign,
                    confidence: detail.confidence,
                    display_confidence: detail.display_confidence,
                    vehicles: detail.detected_vehicles,
                    detected_plate: detail.detected_plate,
                    plate_confidence: detail.plate_confidence,
                  }}
                />
              )}
              <div className="ai-center-history-dialog__actions">
                {(detail.review_status || 'pending') === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="enforcement-page__hero-btn enforcement-page__hero-btn--teal"
                      onClick={() => void handleReview(detail, 'approved')}
                    >
                      <CheckCircle size={16} />
                      {t('aiCenter.approve')}
                    </button>
                    <button
                      type="button"
                      className="enforcement-page__hero-btn"
                      style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
                      onClick={() => void handleReview(detail, 'rejected')}
                    >
                      <XCircle size={16} />
                      {t('aiCenter.reject')}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
