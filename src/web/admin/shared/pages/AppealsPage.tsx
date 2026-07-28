import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import {
  Search, Plus, CheckCircle, XCircle, Clock, Scale, MapPin, FileText, Gavel,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Textarea } from '@shared/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { EntityDetailField, EntityViewDialog } from '@shared/components/admin/EntityViewDialog';
import { formatCambodiaPlate } from '@shared/components/admin/CambodiaPlateField';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate } from '@shared/i18n/localeFormat';
import { useLiveData } from '@shared/hooks/useLiveData';
import { useFieldErrors } from '@shared/hooks/useFieldErrors';
import { FieldError, FormErrorBanner } from '@shared/components/ui/FieldError';
import { appealsAPI, violationsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { TrafficViolation, ViolationAppeal } from '@shared/types';

type AppealFormField = 'violation_id' | 'reason';

const STATUS_TABS = ['all', 'pending', 'upheld', 'dismissed'] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_STYLE: Record<string, { icon: React.ReactNode; bg: string; color: string; gradient: string }> = {
  pending: {
    icon: <Clock size={11} />,
    bg: 'rgba(245,158,11,0.1)',
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
  },
  upheld: {
    icon: <XCircle size={11} />,
    bg: 'rgba(239,68,68,0.1)',
    color: '#DC2626',
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
  },
  dismissed: {
    icon: <CheckCircle size={11} />,
    bg: 'rgba(16,185,129,0.1)',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
  },
};

const STAT_CARDS = [
  { key: 'all', labelKey: 'appeals.statTotal', icon: Scale, variant: 'violet', filterable: true },
  { key: 'pending', labelKey: 'appeals.statPending', icon: Clock, variant: 'amber', filterable: true },
  { key: 'upheld', labelKey: 'appeals.statUpheld', icon: XCircle, variant: 'rose', filterable: true },
  { key: 'dismissed', labelKey: 'appeals.statDismissed', icon: CheckCircle, variant: 'emerald', filterable: true },
] as const;

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
}

export function AppealsPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const canReview = user?.role === 'admin' || user?.role === 'police';
  const canSubmit = user?.role === 'driver';

  const [appeals, setAppeals] = useState<ViolationAppeal[]>([]);
  const [violations, setViolations] = useState<TrafficViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [selected, setSelected] = useState<ViolationAppeal | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [form, setForm] = useState({ violation_id: '', reason: '', evidence: null as File | null });
  const [reviewForm, setReviewForm] = useState({ status: 'dismissed' as 'upheld' | 'dismissed', officer_comments: '' });
  const formErrors = useFieldErrors<AppealFormField>();

  const statusLabel = (s: string) => t(`appeals.status.${s}`);

  const load = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const [appealRows, violationRows] = await Promise.all([
        appealsAPI.getAll(),
        canSubmit ? violationsAPI.getAll() : Promise.resolve([]),
      ]);
      setAppeals(appealRows);
      setViolations(violationRows);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, canSubmit]);

  useEffect(() => { void load(); }, [load]);
  useLiveData(() => load(true), 30_000, Boolean(user));

  const filtered = useMemo(() => {
    let rows = [...appeals];
    if (statusFilter !== 'all') rows = rows.filter((a) => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((a) =>
        a.driver_name.toLowerCase().includes(q)
        || (a.driver_license || '').toLowerCase().includes(q)
        || a.reason.toLowerCase().includes(q)
        || (a.violation_type || '').toLowerCase().includes(q)
        || (a.driver_license || '').toLowerCase().includes(q)
        || (a.vehicle_plate || '').toLowerCase().includes(q)
        || (a.violation_location || '').toLowerCase().includes(q)
        || a.driver_name.toLowerCase().includes(q)
        || (a.violation_location || '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [appeals, search, statusFilter]);

  const pagination = usePagination(filtered);
  const isFilteredEmpty = appeals.length > 0 && filtered.length === 0;
  const counts = useMemo(() => ({
    all: appeals.length,
    pending: appeals.filter((a) => a.status === 'pending').length,
    upheld: appeals.filter((a) => a.status === 'upheld').length,
    dismissed: appeals.filter((a) => a.status === 'dismissed').length,
  }), [appeals]);

  const appealableViolations = useMemo(() => {
    const appealed = new Set(appeals.filter((a) => a.status === 'pending').map((a) => a.violation_id));
    return violations.filter((v) => v.status === 'confirmed' && !appealed.has(String(v.id)));
  }, [violations, appeals]);

  const handleSubmit = async () => {
    const ok = formErrors.validateRequired(
      { violation_id: form.violation_id, reason: form.reason },
      {
        violation_id: t('common.fieldRequired'),
        reason: t('common.fieldRequired'),
      },
    );
    if (!ok) {
      toast.error(t('common.formIncomplete'));
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('violation_id', form.violation_id);
      fd.append('reason', form.reason.trim());
      if (form.evidence) fd.append('evidence_image', form.evidence);
      await appealsAPI.create(fd);
      toast.success(t('appeals.toastSubmitted'));
      setSubmitOpen(false);
      setForm({ violation_id: '', reason: '', evidence: null });
      formErrors.clearErrors();
      void load();
    } catch {
      toast.error(t('appeals.toastSubmitFail'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!selected) return;
    setReviewing(true);
    try {
      await appealsAPI.review(selected.id, reviewForm);
      toast.success(t('appeals.toastReviewed'));
      setReviewOpen(false);
      setSelected(null);
      void load();
    } catch {
      toast.error(t('appeals.toastReviewFail'));
    } finally {
      setReviewing(false);
    }
  };

  const openReview = (row: ViolationAppeal) => {
    setSelected(row);
    setReviewForm({ status: 'dismissed', officer_comments: '' });
    setReviewOpen(true);
  };

  return (
    <div className="enforcement-page enforcement-page--appeals dashboard-page--appeals">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Scale size={14} /></span>
              {t('pages.appeals.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.appeals.title')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.appeals.subtitle')}</p>
          </div>
          {canSubmit && (
            <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--teal" onClick={() => { formErrors.clearErrors(); setSubmitOpen(true); }}>
              <Plus size={16} /> {t('appeals.submitAppeal')}
            </button>
          )}
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const active = card.filterable && statusFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(card.key as StatusTab)}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant}${active ? ' enforcement-page__stat-card--active' : ''}`}
            >
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.variant}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{counts[card.key]}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.variant}`}>
                  {t(card.labelKey)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="enforcement-page__toolbar">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="enforcement-page__filters">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab;
              const meta = tab !== 'all' ? STATUS_STYLE[tab] : null;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`enforcement-page__filter-btn${active ? ' enforcement-page__filter-btn--active' : ''}`}
                  style={active ? {
                    background: meta?.gradient ?? 'linear-gradient(135deg, #0F172A, #1E293B)',
                  } : undefined}
                >
                  {statusLabel(tab)}
                  <span className={`enforcement-page__filter-count${active ? ' enforcement-page__filter-count--active' : ''}`}>
                    {counts[tab]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="enforcement-page__search-wrap">
            <Search size={14} className="enforcement-page__search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('appeals.searchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--appeals">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid appeals-table__grid">
            <colgroup>
              <col className="appeals-table__col appeals-table__col--driver" />
              <col className="appeals-table__col appeals-table__col--license-plate" />
              <col className="appeals-table__col appeals-table__col--violation" />
              <col className="appeals-table__col appeals-table__col--reason" />
              <col className="appeals-table__col appeals-table__col--date" />
              <col className="appeals-table__col appeals-table__col--status" />
              <col className="appeals-table__col appeals-table__col--actions" />
            </colgroup>
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                <TableHead className="enforcement-page__th appeals-table__th appeals-table__th--driver text-left">{t('appeals.colDriver')}</TableHead>
                <TableHead className="enforcement-page__th appeals-table__th appeals-table__th--license-plate text-left">{t('users.colLicense')}</TableHead>
                <TableHead className="enforcement-page__th appeals-table__th appeals-table__th--violation text-left">{t('appeals.colViolation')}</TableHead>
                <TableHead className="enforcement-page__th appeals-table__th appeals-table__th--reason text-left">{t('appeals.colReason')}</TableHead>
                <TableHead className="enforcement-page__th appeals-table__th appeals-table__th--date text-left">{t('appeals.colSubmitted')}</TableHead>
                <TableHead className="enforcement-page__th appeals-table__th appeals-table__th--status text-left">{t('appeals.colStatus')}</TableHead>
                <TableHead className="enforcement-page__th appeals-table__th appeals-table__th--actions text-left">{t('appeals.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((__, j) => (
                      <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pagination.pageItems.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  tone="appeals"
                  icon={<Scale size={28} strokeWidth={1.75} />}
                  title={isFilteredEmpty ? t('appeals.emptyFilter') : t('appeals.empty')}
                  subtitle={
                    isFilteredEmpty
                      ? t('appeals.emptyFilterHint')
                      : canSubmit
                        ? t('appeals.emptyHintDriver')
                        : t('appeals.emptyHint')
                  }
                  action={
                    !isFilteredEmpty && canSubmit
                      ? { label: t('appeals.submitAppeal'), onClick: () => setSubmitOpen(true), icon: <Plus size={15} /> }
                      : undefined
                  }
                />
              ) : pagination.pageItems.map((row) => {
                const st = STATUS_STYLE[row.status] ?? STATUS_STYLE.pending;
                const license = formatCambodiaPlate(row.vehicle_plate || row.driver_license || '');
                return (
                  <TableRow key={row.id} className="enforcement-page__table-row appeals-table__row">
                    <TableCell className="appeals-table__td appeals-table__td--driver">
                      <div className="appeals-table__driver">
                        <div className="enforcement-page__avatar enforcement-page__avatar--driver appeals-table__avatar">
                          {initials(row.driver_name)}
                        </div>
                        <div className="appeals-table__driver-copy min-w-0">
                          <p className="appeals-table__driver-name">{row.driver_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="appeals-table__td appeals-table__td--license-plate">
                      {license ? (
                        <span className="enforcement-page__code-pill" title={t('users.colLicense')}>
                          {license}
                        </span>
                      ) : (
                        <span className="enforcement-page__cell-secondary">—</span>
                      )}
                    </TableCell>
                    <TableCell className="appeals-table__td appeals-table__td--violation">
                      <div className="appeals-table__violation">
                        <span className="appeals-table__violation-badge" title={row.violation_type || undefined}>
                          <Scale size={12} aria-hidden />
                          {(row.violation_type || '—').replace(/_/g, ' ')}
                        </span>
                        <p className="appeals-table__violation-location" title={row.violation_location || undefined}>
                          <MapPin size={12} strokeWidth={2.25} aria-hidden />
                          <span>{row.violation_location || '—'}</span>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="appeals-table__td appeals-table__td--reason">
                      <div className="appeals-table__reason-card" title={row.reason}>
                        <span className="appeals-table__reason-label">
                          <FileText size={11} aria-hidden />
                          {t('appeals.colReason')}
                        </span>
                        <p className="appeals-table__reason">{row.reason}</p>
                      </div>
                    </TableCell>
                    <TableCell className="appeals-table__td appeals-table__td--date">
                      <time className="appeals-table__date" dateTime={row.submitted_at}>
                        {formatAppDate(locale, row.submitted_at, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </time>
                    </TableCell>
                    <TableCell className="appeals-table__td appeals-table__td--status">
                      <span className="appeals-table__status enforcement-page__badge" style={{ background: st.bg, color: st.color }}>
                        {st.icon}{statusLabel(row.status)}
                      </span>
                    </TableCell>
                    <TableCell className="appeals-table__td appeals-table__td--actions" onClick={(e) => e.stopPropagation()}>
                      <div className="appeals-table__actions" role="group" aria-label={t('appeals.colActions')}>
                        <CrudRowActions onView={() => setSelected(row)}>
                          {canReview && row.status === 'pending' ? (
                            <button
                              type="button"
                              className="crud-actions__btn crud-actions__btn--edit"
                              onClick={() => openReview(row)}
                              aria-label={t('appeals.review')}
                              title={t('appeals.review')}
                            >
                              <Gavel size={13} />
                            </button>
                          ) : null}
                        </CrudRowActions>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.appeals" />
      </div>

      <Dialog open={submitOpen} onOpenChange={(open) => {
        setSubmitOpen(open);
        if (!open) formErrors.clearErrors();
      }}>
        <DialogContent accent="violet" className="ct-form-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="enforcement-page__dialog-icon enforcement-page__dialog-icon--violet">
                <FileText size={16} />
              </span>
              {t('appeals.submitAppeal')}
            </DialogTitle>
          </DialogHeader>
          <div className="ct-dialog-form">
            <FormErrorBanner message={formErrors.hasErrors ? t('common.formIncomplete') : null} />
            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('appeals.selectViolation')} *</Label>
              <Select
                value={form.violation_id}
                onValueChange={(v) => {
                  formErrors.clearField('violation_id');
                  setForm((f) => ({ ...f, violation_id: v }));
                }}
              >
                <SelectTrigger
                  className={formErrors.errors.violation_id ? 'ct-field--invalid' : undefined}
                  aria-invalid={Boolean(formErrors.errors.violation_id)}
                >
                  <SelectValue placeholder={t('appeals.selectViolation')} />
                </SelectTrigger>
                <SelectContent>
                  {appealableViolations.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.violation_type} — {v.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={formErrors.errors.violation_id} />
            </div>
            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('appeals.reason')} *</Label>
              <Textarea
                className={formErrors.errors.reason ? 'ct-field--invalid' : undefined}
                aria-invalid={Boolean(formErrors.errors.reason)}
                value={form.reason}
                onChange={(e) => {
                  formErrors.clearField('reason');
                  setForm((f) => ({ ...f, reason: e.target.value }));
                }}
                rows={4}
              />
              <FieldError message={formErrors.errors.reason} />
            </div>
            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('appeals.evidenceOptional')}</Label>
              <Input type="file" accept="image/*" onChange={(e) => setForm((f) => ({ ...f, evidence: e.target.files?.[0] ?? null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>{t('profile.cancel')}</Button>
            <Button onClick={() => void handleSubmit()} disabled={submitting}>{t('appeals.submitAppeal')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={(open) => { setReviewOpen(open); if (!open && !selected) return; }}>
        <DialogContent accent="amber" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="enforcement-page__dialog-icon enforcement-page__dialog-icon--amber">
                <Gavel size={16} />
              </span>
              {t('appeals.reviewAppeal')}
            </DialogTitle>
          </DialogHeader>
          <div className="ct-dialog-form">
            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('appeals.decision')}</Label>
              <Select value={reviewForm.status} onValueChange={(v) => setReviewForm((f) => ({ ...f, status: v as 'upheld' | 'dismissed' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dismissed">{t('appeals.status.dismissed')}</SelectItem>
                  <SelectItem value="upheld">{t('appeals.status.upheld')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('appeals.officerComments')}</Label>
              <Textarea value={reviewForm.officer_comments} onChange={(e) => setReviewForm((f) => ({ ...f, officer_comments: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>{t('profile.cancel')}</Button>
            <Button onClick={() => void handleReview()} disabled={reviewing}>{t('appeals.submitReview')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EntityViewDialog
        open={Boolean(selected) && !reviewOpen}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        title={selected ? `${t('appeals.appealDetails')} — ${selected.driver_name}` : t('appeals.appealDetails')}
        accent="violet"
      >
        {selected && (
          <>
            <EntityDetailField label={t('appeals.colDriver')} value={selected.driver_name} />
            <EntityDetailField
              label={t('users.colLicense')}
              value={formatCambodiaPlate(selected.vehicle_plate || selected.driver_license || '') || '—'}
            />
            <EntityDetailField label={t('appeals.colViolation')} value={(selected.violation_type || '—').replace(/_/g, ' ')} />
            <EntityDetailField label={t('appeals.colSubmitted')} value={formatAppDate(locale, selected.submitted_at)} />
            <EntityDetailField label={t('appeals.colStatus')} value={statusLabel(selected.status)} />
            <EntityDetailField label={t('appeals.reason')} value={selected.reason} />
            {selected.violation_location ? (
              <EntityDetailField label={t('violations.locationLabel') !== 'violations.locationLabel' ? t('violations.locationLabel') : 'Location'} value={selected.violation_location} />
            ) : null}
            {selected.officer_comments ? (
              <EntityDetailField label={t('appeals.officerComments')} value={selected.officer_comments} />
            ) : null}
          </>
        )}
      </EntityViewDialog>
    </div>
  );
}
