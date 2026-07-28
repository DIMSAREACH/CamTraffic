/**
 * Officer Detection Review Queue — government human-in-the-loop enforcement.
 * AI detections create pending_review violations; officers approve/reject and issue fines.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  RefreshCw,
  Shield,
  Sparkles,
  UserRound,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@shared/components/ui/button';
import { Textarea } from '@shared/components/ui/textarea';
import { Label } from '@shared/components/ui/label';
import { Switch } from '@shared/components/ui/switch';
import { FieldError, FormErrorBanner } from '@shared/components/ui/FieldError';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { useLanguage } from '@shared/context/LanguageContext';
import { useFieldErrors } from '@shared/hooks/useFieldErrors';
import { usePagination } from '@shared/hooks/usePagination';
import { formatAppCurrency, formatAppDate } from '@shared/i18n/localeFormat';
import { apiClient, unwrap } from '@shared/services/axiosClient';
import { OFFICER_API } from '@shared/constants/domainApi';
import { OFFICER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';
import { getProfileImageUrl } from '@shared/utils/profileImage';
import type { TrafficViolation } from '@shared/types';

type MatchStatus =
  | 'matched'
  | 'linked'
  | 'repaired'
  | 'plate_mismatch'
  | 'registry_hit'
  | 'fuzzy'
  | 'stale_seed'
  | 'unmatched';

type QueueViolation = TrafficViolation & {
  match_status?: MatchStatus | null;
  linked_vehicle_plate?: string | null;
  vehicle_linked?: boolean;
};

type QueuePayload = {
  results: QueueViolation[];
  count: number;
};

/** Severity tint for the violation-type chip. */
function violationTone(type?: string | null): 'rose' | 'amber' | 'sky' | 'violet' | 'slate' {
  const key = (type || '').toLowerCase();
  if (key.includes('speed') || key.includes('red_light') || key.includes('helmet')) return 'rose';
  if (key.includes('turn') || key.includes('stop') || key.includes('parking')) return 'amber';
  if (key.includes('entry') || key.includes('closed') || key.includes('lane')) return 'violet';
  if (key.includes('light') || key.includes('signal')) return 'sky';
  return 'slate';
}

function formatTypeLabel(type: string | undefined | null, t: (k: string) => string) {
  const key = (type || '').toUpperCase();
  if (!key) return '—';
  const label = t(`violations.types.${key}`);
  if (label && label !== `violations.types.${key}`) return label;
  return key.replace(/_/g, ' ');
}

function evidenceUrl(v: TrafficViolation): string | null {
  return v.evidence_image || v.vehicle_evidence_image || v.plate_evidence_image || null;
}

function formatObservedAction(value: string | undefined | null, t: (k: string) => string) {
  if (!value) return '—';
  const key = `violations.actions.${value}`;
  const translated = t(key);
  return translated !== key ? translated : value.replace(/_/g, ' ');
}

function matchTone(status?: MatchStatus | null): 'emerald' | 'amber' | 'rose' | 'sky' | 'slate' {
  switch (status) {
    case 'matched':
    case 'linked':
    case 'repaired':
    case 'registry_hit':
      return 'emerald';
    case 'fuzzy':
      return 'sky';
    case 'plate_mismatch':
    case 'stale_seed':
      return 'amber';
    case 'unmatched':
      return 'rose';
    default:
      return 'slate';
  }
}

function matchLabel(status: MatchStatus | undefined | null, t: (k: string) => string): string {
  const key = `detectionQueue.match.${status || 'unmatched'}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return (status || 'unmatched').replace(/_/g, ' ');
}

function displayPlate(v: QueueViolation): string {
  return (
    v.vehicle_plate
    || v.plate_detected
    || v.linked_vehicle_plate
    || ''
  ).trim();
}

export function OfficerDetectionQueuePage() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<QueueViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<QueueViolation | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const rejectErrors = useFieldErrors<'rejectReason'>();
  const [officerNote, setOfficerNote] = useState('');
  const [issueFine, setIssueFine] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = unwrap<QueuePayload>(await apiClient.get(OFFICER_API.detectionQueue));
      setItems(data.results ?? []);
    } catch {
      toast.error(t('detectionQueue.loadFailed'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((v) =>
      displayPlate(v).toLowerCase().includes(q)
      || (v.plate_detected || '').toLowerCase().includes(q)
      || (v.linked_vehicle_plate || '').toLowerCase().includes(q)
      || (v.driver_name || '').toLowerCase().includes(q)
      || (v.driver_license || '').toLowerCase().includes(q)
      || (v.location || '').toLowerCase().includes(q)
      || (v.violation_type || '').toLowerCase().includes(q)
      || (v.detected_class_key || '').toLowerCase().includes(q)
      || (v.detected_sign_code || '').toLowerCase().includes(q)
      || (v.match_status || '').toLowerCase().includes(q),
    );
  }, [items, search]);

  const pagination = usePagination(filtered);

  const pendingCount = items.length;
  const withEvidence = useMemo(
    () => items.filter((v) => Boolean(evidenceUrl(v))).length,
    [items],
  );
  const withDriver = useMemo(
    () => items.filter((v) => Boolean(v.driver_id || v.driver_user_id || v.driver_name)).length,
    [items],
  );
  const matchedCount = useMemo(
    () => items.filter((v) =>
      v.vehicle_linked
      || v.match_status === 'matched'
      || v.match_status === 'repaired'
      || v.match_status === 'registry_hit'
      || v.match_status === 'fuzzy',
    ).length,
    [items],
  );

  const stats = useMemo(
    () => [
      {
        label: t('detectionQueue.statPending'),
        value: String(pendingCount),
        icon: ClipboardList,
        tone: 'amber' as const,
      },
      {
        label: t('detectionQueue.statMatched'),
        value: String(matchedCount),
        icon: CheckCircle2,
        tone: 'emerald' as const,
      },
      {
        label: t('detectionQueue.statWithEvidence'),
        value: String(withEvidence),
        icon: ImageIcon,
        tone: 'teal' as const,
      },
      {
        label: t('detectionQueue.statLinkedDrivers'),
        value: String(withDriver),
        icon: UserRound,
        tone: 'violet' as const,
      },
    ],
    [pendingCount, matchedCount, withEvidence, withDriver, t],
  );

  const closeReview = () => {
    setReviewTarget(null);
    setRejectMode(false);
    setRejectReason('');
    setOfficerNote('');
    setIssueFine(true);
    rejectErrors.clearErrors();
  };

  const openReview = (v: QueueViolation) => {
    setReviewTarget(v);
    setRejectMode(false);
    setRejectReason('');
    setOfficerNote('');
    setIssueFine(Boolean(v.driver_id || v.driver_user_id));
    rejectErrors.clearErrors();
  };

  const handleApprove = async () => {
    if (!reviewTarget) return;
    setActingId(reviewTarget.id);
    try {
      await apiClient.post(`${OFFICER_API.violations}${reviewTarget.id}/approve/`, {
        issue_fine: issueFine,
        officer_note: officerNote.trim() || undefined,
      });
      toast.success(
        issueFine ? t('detectionQueue.approvedWithFine') : t('detectionQueue.approved'),
      );
      closeReview();
      await load();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const data = axiosErr?.response?.data;
      const serverMsg =
        (typeof data?.message === 'string' && data.message)
        || (typeof data?.detail === 'string' && data.detail)
        || undefined;
      toast.error(serverMsg || t('detectionQueue.approveFailed'));
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async () => {
    if (!reviewTarget) return;
    if (!rejectMode) {
      setRejectMode(true);
      return;
    }
    const ok = rejectErrors.validateRequired(
      { rejectReason },
      {
        rejectReason:
          t('detectionQueue.rejectReasonRequired') !== 'detectionQueue.rejectReasonRequired'
            ? t('detectionQueue.rejectReasonRequired')
            : t('common.fieldRequired'),
      },
    );
    if (!ok) {
      toast.error(t('common.formIncomplete'));
      return;
    }
    setActingId(reviewTarget.id);
    try {
      await apiClient.post(`${OFFICER_API.violations}${reviewTarget.id}/reject/`, {
        dismissal_reason: rejectReason.trim(),
      });
      toast.success(t('detectionQueue.rejected'));
      closeReview();
      await load();
    } catch {
      toast.error(t('detectionQueue.rejectFailed'));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="enforcement-page enforcement-page--detection-queue dashboard-page--detection-queue">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Sparkles size={14} />
              </span>
              {t('detectionQueue.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('detectionQueue.title')}</h1>
            <p className="enforcement-page__subtitle">{t('detectionQueue.subtitle')}</p>
          </div>
          <button
            type="button"
            className="enforcement-page__hero-btn enforcement-page__hero-btn--amber"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {t('common.refresh')}
          </button>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four detection-queue__stats">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${s.tone} detection-queue__stat detection-queue__stat--${s.tone}`}
            >
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${s.tone}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{s.value}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${s.tone}`}>
                  {s.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="enforcement-page__toolbar detection-queue__toolbar">
        <div className="enforcement-page__search-wrap">
          <svg className="enforcement-page__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('detectionQueue.searchPlaceholder')}
            className="enforcement-page__search"
          />
        </div>
        <div className="detection-queue__toolbar-meta">
          <span className="detection-queue__live-pill">
            <span className="detection-queue__live-dot" aria-hidden />
            {pendingCount} {t('detectionQueue.statPending').toLowerCase()}
          </span>
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--roads detection-queue__panel">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid detection-queue__table">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                <TableHead className="enforcement-page__th detection-queue__col detection-queue__col--evidence text-left">
                  {t('detectionQueue.colEvidence')}
                </TableHead>
                <TableHead className="enforcement-page__th detection-queue__col detection-queue__col--date text-left">
                  {t('detectionQueue.colDate')}
                </TableHead>
                <TableHead className="enforcement-page__th detection-queue__col detection-queue__col--type text-left">
                  {t('detectionQueue.colType')}
                </TableHead>
                <TableHead className="enforcement-page__th detection-queue__col detection-queue__col--plate text-left">
                  {t('detectionQueue.colPlate')}
                </TableHead>
                <TableHead className="enforcement-page__th detection-queue__col detection-queue__col--match text-left">
                  {t('detectionQueue.colMatch')}
                </TableHead>
                <TableHead className="enforcement-page__th detection-queue__col detection-queue__col--driver text-left">
                  {t('detectionQueue.colDriver')}
                </TableHead>
                <TableHead className="enforcement-page__th detection-queue__col detection-queue__col--location text-left">
                  {t('detectionQueue.colLocation')}
                </TableHead>
                <TableHead className="enforcement-page__th detection-queue__col detection-queue__col--sign text-left">
                  {t('detectionQueue.colSign')}
                </TableHead>
                <TableHead className="enforcement-page__th detection-queue__col detection-queue__col--actions text-left">
                  {t('detectionQueue.colActions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((__, j) => (
                      <TableCell key={j}>
                        <div className="enforcement-page__skeleton roads-page__skeleton" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pagination.pageItems.length === 0 ? (
                <TableEmptyState
                  colSpan={9}
                  icon={<ClipboardList size={28} />}
                  title={t('detectionQueue.emptyTitle')}
                  subtitle={t('detectionQueue.emptyDesc')}
                  tone="amber"
                />
              ) : (
                pagination.pageItems.map((v) => {
                  const ev = evidenceUrl(v);
                  const tone = violationTone(v.violation_type);
                  const plate = displayPlate(v);
                  const mTone = matchTone(v.match_status);
                  return (
                    <TableRow key={v.id} className="enforcement-page__table-row detection-queue__row">
                      <TableCell className="detection-queue__col detection-queue__col--evidence">
                        {ev ? (
                          <button
                            type="button"
                            className="detection-queue__thumb"
                            onClick={() => setPreviewUrl(ev)}
                            title={t('detectionQueue.colEvidence')}
                          >
                            <img src={ev} alt="" className="detection-queue__thumb-img" />
                            <span className="detection-queue__thumb-overlay">
                              <Eye size={14} />
                            </span>
                          </button>
                        ) : (
                          <span className="detection-queue__thumb detection-queue__thumb--empty">
                            <ImageIcon size={16} />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="detection-queue__col detection-queue__col--date">
                        <div className="detection-queue__datetime">
                          <span className="detection-queue__date">
                            {formatAppDate(locale, v.violation_date, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="detection-queue__time">
                            {formatAppDate(locale, v.violation_date, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="detection-queue__col detection-queue__col--type">
                        <span className={`detection-queue__type detection-queue__type--${tone}`}>
                          {formatTypeLabel(v.violation_type, t)}
                        </span>
                      </TableCell>
                      <TableCell className="detection-queue__col detection-queue__col--plate">
                        {plate ? (
                          <span className="detection-queue__plate">{plate}</span>
                        ) : (
                          <span className="detection-queue__muted">—</span>
                        )}
                      </TableCell>
                      <TableCell className="detection-queue__col detection-queue__col--match">
                        <span
                          className={`detection-queue__match detection-queue__match--${mTone}`}
                          title={v.linked_vehicle_plate || undefined}
                        >
                          {matchLabel(v.match_status, t)}
                        </span>
                      </TableCell>
                      <TableCell className="detection-queue__col detection-queue__col--driver">
                        <div className="detection-queue__driver-cell">
                          <span className="detection-queue__driver">{v.driver_name || '—'}</span>
                          {v.driver_license ? (
                            <span className="detection-queue__license">{v.driver_license}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="detection-queue__col detection-queue__col--location">
                        <span className="detection-queue__location" title={v.location || undefined}>
                          <MapPin size={13} aria-hidden />
                          <span>{v.location || '—'}</span>
                        </span>
                      </TableCell>
                      <TableCell className="detection-queue__col detection-queue__col--sign">
                        {v.detected_class_key || v.detected_sign_code ? (
                          <span className="detection-queue__sign">
                            {v.detected_class_key || v.detected_sign_code}
                          </span>
                        ) : (
                          <span className="detection-queue__muted">—</span>
                        )}
                      </TableCell>
                      <TableCell className="detection-queue__col detection-queue__col--actions">
                        <div className="detection-queue__actions">
                          <button
                            type="button"
                            className="detection-queue__btn detection-queue__btn--approve"
                            disabled={actingId === v.id}
                            onClick={() => openReview(v)}
                          >
                            <Eye size={14} />
                            {t('violations.view') !== 'violations.view' ? t('violations.view') : 'Review'}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.detections" />
      </div>

      {/* Detection review dialog */}
      <Dialog
        open={!!reviewTarget}
        onOpenChange={(o) => {
          if (!o) closeReview();
        }}
      >
        <DialogContent accent="rose" className="violations-view-dialog max-w-[58rem] sm:max-w-[58rem] p-0 gap-0 overflow-hidden">
          {reviewTarget ? (() => {
            const shortId = String(reviewTarget.id).slice(0, 8);
            const signCode = reviewTarget.detected_sign_code || reviewTarget.detected_class_key || '—';
            const evidenceItems = [
              reviewTarget.evidence_image && {
                url: getProfileImageUrl(reviewTarget.evidence_image) || reviewTarget.evidence_image,
                label: t('violations.evidence'),
              },
              reviewTarget.plate_evidence_image && {
                url: getProfileImageUrl(reviewTarget.plate_evidence_image) || reviewTarget.plate_evidence_image,
                label: t('violations.plateEvidence'),
              },
              reviewTarget.vehicle_evidence_image && {
                url: getProfileImageUrl(reviewTarget.vehicle_evidence_image) || reviewTarget.vehicle_evidence_image,
                label: t('violations.vehicleEvidence'),
              },
            ].filter((item): item is { url: string; label: string } => Boolean(item && item.url));

            const detailRows = [
              {
                key: 'plate',
                label: t('violations.vehiclePlate'),
                value: displayPlate(reviewTarget) || '—',
                mono: true,
              },
              {
                key: 'match',
                label: t('detectionQueue.colMatch'),
                value: matchLabel(reviewTarget.match_status, t),
                mono: false,
              },
              {
                key: 'license',
                label: t('violations.licenseNo'),
                value: reviewTarget.driver_license || '—',
                mono: true,
              },
              {
                key: 'action',
                label: t('violations.colAction'),
                value: formatObservedAction(reviewTarget.observed_action, t),
              },
              { key: 'sign', label: t('violations.colSign'), value: signCode, mono: true },
              {
                key: 'type',
                label: t('violations.colType'),
                value: formatTypeLabel(reviewTarget.violation_type, t),
              },
              {
                key: 'officer',
                label: t('violations.officer'),
                value: reviewTarget.officer_name || '—',
              },
              {
                key: 'date',
                label: t('violations.colDate'),
                value: new Date(reviewTarget.violation_date).toLocaleString(),
              },
              {
                key: 'location',
                label: t('violations.colLocation'),
                value: reviewTarget.location || '—',
              },
            ];

            return (
              <div className="violations-view-dialog__shell">
                <div className="violations-view-dialog__topbar">
                  <div className="violations-view-dialog__topbar-left">
                    <div className="violations-view-dialog__header-copy">
                      <div className="violations-view-dialog__title-row">
                        <h2 className="violations-view-dialog__header-title">
                          {formatTypeLabel(reviewTarget.violation_type, t)}
                        </h2>
                        <span className="violations-view-dialog__id-chip" title={String(reviewTarget.id)}>
                          #{shortId}
                        </span>
                        <span
                          className="violations-view-dialog__status-pill"
                          style={{
                            background: 'rgba(245,158,11,0.12)',
                            color: '#D97706',
                            borderColor: 'rgba(217,119,6,0.25)',
                          }}
                        >
                          <Clock size={11} />
                          {t('violations.status.pending_review')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="violations-view-dialog__identity">
                  <div className="violations-view-dialog__driver-block">
                    <span className="violations-view-dialog__driver-avatar" aria-hidden>
                      {(reviewTarget.driver_name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <div className="violations-view-dialog__driver-copy">
                      <span className="violations-view-dialog__driver-label">{t('violations.colDriver')}</span>
                      <span className="violations-view-dialog__driver-name">
                        {reviewTarget.driver_name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="violations-view-dialog__identity-meta">
                    <span className="violations-view-dialog__meta-chip">
                      <MapPin size={13} />
                      {reviewTarget.location || '—'}
                    </span>
                    {displayPlate(reviewTarget) ? (
                      <span className="violations-view-dialog__meta-chip">
                        {displayPlate(reviewTarget)}
                      </span>
                    ) : null}
                    <span
                      className={`detection-queue__match detection-queue__match--${matchTone(reviewTarget.match_status)}`}
                    >
                      {matchLabel(reviewTarget.match_status, t)}
                    </span>
                    {signCode !== '—' ? (
                      <span className="violations-view-dialog__meta-chip violations-view-dialog__meta-chip--sign">
                        <Shield size={13} />
                        {signCode}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="violations-view-dialog__body">
                  <div className="violations-view-dialog__main">
                    <p className="violations-view-dialog__section-label">{t('violations.detailsSection')}</p>
                    <div className="violations-view-dialog__rows">
                      {detailRows.map((row) => (
                        <div key={row.key} className="violations-view-dialog__row">
                          <span className="violations-view-dialog__row-label">{row.label}</span>
                          <span className={`violations-view-dialog__row-value${row.mono ? ' is-mono' : ''}`}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {reviewTarget.description ? (
                      <div className="violations-view-dialog__description">
                        <div className="violations-view-dialog__description-head">
                          <FileText size={14} />
                          <span>{t('violations.description')}</span>
                        </div>
                        <p className="violations-view-dialog__description-text">{reviewTarget.description}</p>
                      </div>
                    ) : null}

                    {!rejectMode ? (
                      <div className="detection-queue-review__options">
                        <div className="ct-dialog-field">
                          <Label htmlFor="officer-note">{t('detectionQueue.officerNote')}</Label>
                          <Textarea
                            id="officer-note"
                            value={officerNote}
                            onChange={(e) => setOfficerNote(e.target.value)}
                            rows={2}
                            placeholder={t('detectionQueue.officerNotePlaceholder')}
                          />
                        </div>
                        <label className="detection-queue-dialog__toggle">
                          <div>
                            <span className="detection-queue-dialog__toggle-title">
                              {t('detectionQueue.issueFineWithApprove')}
                            </span>
                            <span className="detection-queue-dialog__toggle-hint">
                              {issueFine && (reviewTarget.driver_id || reviewTarget.driver_user_id)
                                ? `${t('detectionQueue.fineHint')} (${formatAppCurrency(locale, 10)}–${formatAppCurrency(locale, 50)})`
                                : t('detectionQueue.noDriverFineHint')}
                            </span>
                          </div>
                          <Switch
                            checked={issueFine}
                            disabled={!reviewTarget.driver_id && !reviewTarget.driver_user_id}
                            onCheckedChange={setIssueFine}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="detection-queue-review__reject">
                        <FormErrorBanner message={rejectErrors.hasErrors ? t('common.formIncomplete') : null} />
                        <div className="ct-dialog-field">
                          <Label htmlFor="reject-reason">{t('detectionQueue.rejectReason')} *</Label>
                          <Textarea
                            id="reject-reason"
                            value={rejectReason}
                            className={rejectErrors.errors.rejectReason ? 'ct-field--invalid' : undefined}
                            aria-invalid={Boolean(rejectErrors.errors.rejectReason)}
                            onChange={(e) => {
                              rejectErrors.clearField('rejectReason');
                              setRejectReason(e.target.value);
                            }}
                            rows={3}
                            placeholder={t('detectionQueue.rejectReasonPlaceholder')}
                          />
                          <FieldError message={rejectErrors.errors.rejectReason} />
                        </div>
                      </div>
                    )}
                  </div>

                  <aside className="violations-view-dialog__evidence">
                    <div className="violations-view-dialog__evidence-head">
                      <ImageIcon size={14} />
                      <span>{t('violations.evidence')}</span>
                      <span className="violations-view-dialog__evidence-count">{evidenceItems.length}</span>
                    </div>
                    {evidenceItems.length > 0 ? (
                      <div className="violations-view-dialog__evidence-list">
                        {evidenceItems.map((item) => (
                          <button
                            key={item.url}
                            type="button"
                            className="violations-view-dialog__evidence-link"
                            onClick={() => setPreviewUrl(item.url)}
                          >
                            <img
                              src={item.url}
                              alt={item.label}
                              className="violations-view-dialog__evidence-image"
                              onError={(e) => {
                                const el = e.currentTarget;
                                el.style.display = 'none';
                                const wrap = el.closest('.violations-view-dialog__evidence-link');
                                if (wrap) wrap.classList.add('is-broken');
                              }}
                            />
                            <span className="violations-view-dialog__evidence-overlay">
                              <Eye size={15} />
                              {t('evidenceArchive.viewFullImage')}
                            </span>
                            <span className="violations-view-dialog__evidence-caption">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="violations-view-dialog__evidence-empty">{t('violations.noEvidence')}</div>
                    )}
                  </aside>
                </div>

                <div className="violations-view-dialog__footer">
                  <div className="violations-view-dialog__footer-primary">
                    {!rejectMode ? (
                      <Button
                        size="sm"
                        className="violations-view-dialog__btn violations-view-dialog__btn--confirm"
                        onClick={() => void handleApprove()}
                        disabled={!!actingId}
                      >
                        {actingId ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                        {t('violations.confirm')}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="violations-view-dialog__btn violations-view-dialog__btn--reject"
                      onClick={() => void handleReject()}
                      disabled={!!actingId}
                    >
                      {actingId && rejectMode ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
                      {rejectMode ? t('detectionQueue.confirmReject') : t('violations.reject')}
                    </Button>
                    {rejectMode ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="violations-view-dialog__btn"
                        onClick={() => {
                          setRejectMode(false);
                          setRejectReason('');
                          rejectErrors.clearErrors();
                        }}
                        disabled={!!actingId}
                      >
                        {t('common.cancel')}
                      </Button>
                    ) : null}
                  </div>
                  <div className="violations-view-dialog__footer-secondary">
                    <Button
                      size="sm"
                      variant="outline"
                      className="violations-view-dialog__btn"
                      onClick={() => {
                        closeReview();
                        navigate(OFFICER_PORTAL_ROUTES.violations);
                      }}
                    >
                      <Pencil size={14} /> {t('violations.editViolation')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })() : null}
        </DialogContent>
      </Dialog>

      {/* Evidence lightbox */}
      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent accent="amber" className="detection-queue-lightbox max-w-3xl sm:max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--amber">
                <ImageIcon size={15} />
              </div>
              <span className="enforcement-page__dialog-title">
                {t('detectionQueue.colEvidence')}
              </span>
            </DialogTitle>
          </DialogHeader>
          {previewUrl ? (
            <div className="detection-queue-lightbox__frame">
              <img src={previewUrl} alt="Detection evidence" />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
