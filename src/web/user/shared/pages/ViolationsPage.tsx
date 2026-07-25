import { useEffect, useMemo, useState, useCallback } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import {
  Search, Eye, CheckCircle, XCircle, Clock, AlertTriangle,
  FileText, Shield, Trash2, ImageIcon, MapPin, Plus, DollarSign, User, Hash, Pencil,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Textarea } from '@shared/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate, khrToUsd, localeTag, usdToKhr } from '@shared/i18n/localeFormat';
import { useLiveData } from '@shared/hooks/useLiveData';
import { OBSERVED_ACTION_VALUES } from '@shared/constants/observedActions';
import { finesAPI, violationsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { TrafficViolation, ViolationRule } from '@shared/types';

const STATUS_TABS = ['all', 'pending_review', 'confirmed', 'rejected', 'draft'] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_STYLE: Record<string, {
  icon: React.ReactNode;
  bg: string;
  color: string;
  gradient: string;
}> = {
  draft: {
    icon: <Clock size={11} />,
    bg: 'rgba(100,116,139,0.1)',
    color: '#475569',
    gradient: 'linear-gradient(135deg, #64748B, #475569)',
  },
  pending_review: {
    icon: <Clock size={11} />,
    bg: 'rgba(245,158,11,0.12)',
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
  },
  confirmed: {
    icon: <AlertTriangle size={11} />,
    bg: 'rgba(239,68,68,0.1)',
    color: '#DC2626',
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
  },
  rejected: {
    icon: <XCircle size={11} />,
    bg: 'rgba(100,116,139,0.12)',
    color: '#475569',
    gradient: 'linear-gradient(135deg, #64748B, #475569)',
  },
};

const STAT_CARDS = [
  { key: 'all', labelKey: 'violations.statTotal', icon: FileText, variant: 'blue' },
  { key: 'pending_review', labelKey: 'violations.statPending', icon: Clock, variant: 'amber' },
  { key: 'confirmed', labelKey: 'violations.statConfirmed', icon: AlertTriangle, variant: 'rose' },
  { key: 'rejected', labelKey: 'violations.statRejected', icon: XCircle, variant: 'slate' },
] as const;

function formatViolationTypeFallback(value: string) {
  return (value || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(name: string) {
  return (name || '').split(' ').map((n) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || 'DR';
}

export function ViolationsPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();

  const formatViolationType = (value: string) => {
    if (!value) return t('violations.unknownType');
    const key = `violations.types.${value}`;
    const translated = t(key);
    return translated !== key ? translated : formatViolationTypeFallback(value);
  };

  const formatObservedAction = (value: string) => {
    if (!value) return '—';
    const key = `violations.actions.${value}`;
    const translated = t(key);
    return translated !== key ? translated : value.replace(/_/g, ' ');
  };

  const [violations, setViolations] = useState<TrafficViolation[]>([]);
  const [apiCounts, setApiCounts] = useState<{
    all: number;
    pending_review: number;
    confirmed: number;
    rejected: number;
    draft: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [selected, setSelected] = useState<TrafficViolation | null>(null);
  const [rules, setRules] = useState<ViolationRule[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [issueFineOpen, setIssueFineOpen] = useState(false);
  const [issuingFine, setIssuingFine] = useState(false);
  const [fineTarget, setFineTarget] = useState<TrafficViolation | null>(null);
  const [createForm, setCreateForm] = useState({
    driver_license: '',
    driver_profile_id: null as string | null,
    driver_name: '',
    rule_id: '',
    observed_action: '',
    location: '',
    sign_code: '',
  });
  const [fineForm, setFineForm] = useState({
    amount: '',
    reason: '',
    location: '',
    vehicle_plate: '',
  });
  const [evalPreview, setEvalPreview] = useState<{ is_violation?: boolean; violation_type?: string } | null>(null);
  const [editViolation, setEditViolation] = useState<TrafficViolation | null>(null);
  const [deleteViolation, setDeleteViolation] = useState<TrafficViolation | null>(null);
  const [editForm, setEditForm] = useState({ location: '', description: '', status: 'pending_review' as TrafficViolation['status'] });
  const [savingEdit, setSavingEdit] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'police';

  const loadViolations = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const [data, stats] = await Promise.all([
        violationsAPI.getAll(),
        violationsAPI.getStats().catch(() => null),
      ]);
      setViolations(data);
      if (stats && typeof stats === 'object') {
        const s = stats as {
          total_violations?: number;
          pending_review?: number;
          confirmed?: number;
          rejected?: number;
        };
        setApiCounts({
          all: s.total_violations ?? data.length,
          pending_review: s.pending_review ?? 0,
          confirmed: s.confirmed ?? 0,
          rejected: s.rejected ?? 0,
          draft: data.filter((v) => v.status === 'draft').length,
        });
      } else {
        setApiCounts(null);
      }
    } catch {
      if (!silent) toast.error(t('violations.toastLoadFail'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  useEffect(() => {
    if (!canManage) return;
    violationsAPI.getRules()
      .then(setRules)
      .catch(() => { /* rules optional for view */ });
  }, [canManage]);

  useLiveData(() => loadViolations(true), 30_000, Boolean(user));

  const filtered = useMemo(() => {
    let rows = [...violations];
    if (statusFilter !== 'all') rows = rows.filter((v) => v.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((v) =>
        (v.driver_name || '').toLowerCase().includes(q)
        || (v.driver_license || '').toLowerCase().includes(q)
        || (v.location || '').toLowerCase().includes(q)
        || (v.violation_type || '').toLowerCase().includes(q)
        || (v.detected_sign_code || '').toLowerCase().includes(q)
        || (v.detected_class_key || '').toLowerCase().includes(q)
        || (v.observed_action || '').toLowerCase().includes(q)
        || (v.vehicle_plate || '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [violations, search, statusFilter]);

  const pagination = usePagination(filtered);
  const { setPage } = pagination;
  const isFilteredEmpty = violations.length > 0 && filtered.length === 0;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, setPage]);

  const counts = useMemo(() => ({
    all: apiCounts?.all ?? violations.length,
    pending_review: apiCounts?.pending_review ?? violations.filter((v) => v.status === 'pending_review').length,
    confirmed: apiCounts?.confirmed ?? violations.filter((v) => v.status === 'confirmed').length,
    rejected: apiCounts?.rejected ?? violations.filter((v) => v.status === 'rejected').length,
    draft: apiCounts?.draft ?? violations.filter((v) => v.status === 'draft').length,
  }), [apiCounts, violations]);

  const statusLabel = (status: string) => t(`violations.status.${status}`);
  const getStatusMeta = (status: string) => STATUS_STYLE[status] ?? STATUS_STYLE.draft;
  const formatViolationDateTime = (value: string) =>
    new Date(value).toLocaleString(localeTag(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleStatusUpdate = async (id: string, status: TrafficViolation['status']) => {
    try {
      const updated = await violationsAPI.update(id, { status });
      setViolations((prev) => prev.map((v) => (v.id === id ? updated : v)));
      if (selected?.id === id) setSelected(updated);
      toast.success(t('violations.toastStatusUpdated', { status: statusLabel(status) }));
    } catch {
      toast.error(t('violations.toastStatusFail'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await violationsAPI.delete(id);
      setViolations((prev) => prev.filter((v) => v.id !== id));
      if (selected?.id === id) setSelected(null);
      setDeleteViolation(null);
      toast.success(t('violations.toastDeleted'));
    } catch {
      toast.error(t('violations.toastDeleteFail'));
    }
  };

  const openEdit = (row: TrafficViolation) => {
    setEditViolation(row);
    setEditForm({
      location: row.location || '',
      description: row.description || '',
      status: row.status,
    });
  };

  const handleEditSave = async () => {
    if (!editViolation) return;
    if (!editForm.location.trim()) {
      toast.error(t('violations.toastFillRequired'));
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await violationsAPI.update(editViolation.id, {
        location: editForm.location.trim(),
        description: editForm.description.trim(),
        status: editForm.status,
      });
      setViolations((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      if (selected?.id === updated.id) setSelected(updated);
      setEditViolation(null);
      toast.success(t('violations.toastUpdated'));
    } catch {
      toast.error(t('violations.toastUpdateFail'));
    } finally {
      setSavingEdit(false);
    }
  };

  const selectedRule = useMemo(
    () => rules.find((r) => String(r.id) === createForm.rule_id) ?? null,
    [rules, createForm.rule_id],
  );

  const effectiveAction = createForm.observed_action || selectedRule?.prohibited_action || '';

  const resetCreateForm = () => {
    setCreateForm({
      driver_license: '',
      driver_profile_id: null,
      driver_name: '',
      rule_id: '',
      observed_action: '',
      location: '',
      sign_code: '',
    });
    setEvalPreview(null);
  };

  const handleDriverLookup = async () => {
    if (!createForm.driver_license.trim()) return;
    try {
      const r = await finesAPI.searchByLicense(createForm.driver_license.trim());
      if (r.driver && r.driver_profile_id) {
        setCreateForm((prev) => ({
          ...prev,
          driver_profile_id: r.driver_profile_id,
          driver_name: r.driver.full_name,
        }));
        toast.success(t('violations.driverFound', { name: r.driver.full_name }));
      } else {
        setCreateForm((prev) => ({ ...prev, driver_profile_id: null, driver_name: '' }));
        toast.error(t('violations.driverNotFound'));
      }
    } catch {
      toast.error(t('violations.driverNotFound'));
    }
  };

  const refreshEvalPreview = useCallback(async (classKey: string, action: string, signCode: string) => {
    if (!classKey || !action) {
      setEvalPreview(null);
      return;
    }
    try {
      const preview = await violationsAPI.evaluate({
        class_key: classKey,
        observed_action: action,
        sign_code: signCode,
      });
      setEvalPreview(preview as { is_violation?: boolean; violation_type?: string });
    } catch {
      setEvalPreview(null);
    }
  }, []);

  useEffect(() => {
    if (!createOpen || !selectedRule) {
      setEvalPreview(null);
      return;
    }
    void refreshEvalPreview(
      selectedRule.sign_class_key,
      effectiveAction,
      createForm.sign_code,
    );
  }, [createOpen, selectedRule, effectiveAction, createForm.sign_code, refreshEvalPreview]);

  const handleCreateViolation = async () => {
    if (!createForm.driver_profile_id || !selectedRule || !createForm.location.trim()) {
      toast.error(t('violations.toastFillRequired'));
      return;
    }
    setCreating(true);
    try {
      const created = await violationsAPI.create({
        driver_id: createForm.driver_profile_id,
        class_key: selectedRule.sign_class_key,
        observed_action: effectiveAction,
        sign_code: createForm.sign_code || undefined,
        location: createForm.location.trim(),
      });
      setViolations((prev) => [created, ...prev]);
      setCreateOpen(false);
      resetCreateForm();
      toast.success(t('violations.toastCreated', { id: String(created.id) }));
    } catch {
      toast.error(t('violations.toastCreateFail'));
    } finally {
      setCreating(false);
    }
  };

  const openIssueFine = (violation: TrafficViolation) => {
    const rule = rules.find(
      (r) => r.sign_class_key === violation.detected_class_key
        && r.prohibited_action === violation.observed_action,
    );
    setFineTarget(violation);
    setFineForm({
      amount: rule ? String(usdToKhr(Number(rule.default_fine_amount))) : String(usdToKhr(25)),
      reason: violation.description || formatViolationType(violation.violation_type),
      location: violation.location || '',
      vehicle_plate: violation.vehicle_plate || '',
    });
    setIssueFineOpen(true);
  };

  const handleIssueFine = async () => {
    if (!fineTarget) return;
    setIssuingFine(true);
    try {
      const fine = await finesAPI.create({
        violation_id: fineTarget.id,
        amount: khrToUsd(parseFloat(fineForm.amount)),
        reason: fineForm.reason.trim(),
        location: fineForm.location.trim(),
        vehicle_plate: fineForm.vehicle_plate.trim(),
      });
      const updated = { ...fineTarget, fine_id: fine.id };
      setViolations((prev) => prev.map((v) => (v.id === fineTarget.id ? updated : v)));
      if (selected?.id === fineTarget.id) setSelected(updated);
      setIssueFineOpen(false);
      setFineTarget(null);
      toast.success(t('violations.toastFineIssued', { id: String(fine.id) }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg.includes('already') ? t('violations.toastFineExists') : t('violations.toastFineFail'));
    } finally {
      setIssuingFine(false);
    }
  };

  return (
    <div className="enforcement-page enforcement-page--violations dashboard-page--violations">
      {/* Hero */}
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Shield size={14} />
              </span>
              {t('pages.violations.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.violations.title')}</h1>
            <p className="enforcement-page__subtitle">
              {canManage ? t('pages.violations.subtitleAdmin') : t('pages.violations.subtitleDriver')}
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              className="enforcement-page__hero-btn"
              onClick={() => { resetCreateForm(); setCreateOpen(true); }}
            >
              <Plus size={16} /> {t('violations.createViolation')}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const active = statusFilter === card.key;
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

      {/* Filters */}
      <div className="enforcement-page__toolbar">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="enforcement-page__filters">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab;
              const meta = tab !== 'all' ? getStatusMeta(tab) : null;
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
                  {tab === 'all' ? t('violations.status.all') : statusLabel(tab)}
                  <span
                    className={`enforcement-page__filter-count${active ? ' enforcement-page__filter-count--active' : ''}`}
                  >
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
              placeholder={t('violations.searchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="enforcement-page__panel enforcement-page__panel--violations">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid violations-table__grid">
            <colgroup>
              <col className="violations-table__col violations-table__col--driver" />
              <col className="violations-table__col violations-table__col--violation" />
              <col className="violations-table__col violations-table__col--sign" />
              <col className="violations-table__col violations-table__col--action" />
              <col className="violations-table__col violations-table__col--date" />
              <col className="violations-table__col violations-table__col--status" />
              <col className="violations-table__col violations-table__col--actions" />
            </colgroup>
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                <TableHead className="enforcement-page__th violations-table__th violations-table__th--driver text-left">{t('violations.colDriver')}</TableHead>
                <TableHead className="enforcement-page__th violations-table__th violations-table__th--violation text-left">{t('violations.colType')}</TableHead>
                <TableHead className="enforcement-page__th violations-table__th violations-table__th--sign text-left">{t('violations.colSign')}</TableHead>
                <TableHead className="enforcement-page__th violations-table__th violations-table__th--action text-left">{t('violations.colAction')}</TableHead>
                <TableHead className="enforcement-page__th violations-table__th violations-table__th--date text-left">{t('violations.colDate')}</TableHead>
                <TableHead className="enforcement-page__th violations-table__th violations-table__th--status text-left">{t('violations.colStatus')}</TableHead>
                <TableHead className="enforcement-page__th violations-table__th violations-table__th--actions text-left">{t('violations.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((__, j) => (
                      <TableCell key={j}>
                        <div className="enforcement-page__skeleton" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pagination.pageItems.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  tone="amber"
                  icon={<AlertTriangle size={28} />}
                  title={isFilteredEmpty ? t('violations.emptyFilter') : t('violations.empty')}
                  subtitle={isFilteredEmpty ? t('violations.emptyFilterHint') : t('violations.emptyHint')}
                  action={
                    !isFilteredEmpty && canManage
                      ? { label: t('violations.createViolation'), onClick: () => { resetCreateForm(); setCreateOpen(true); }, icon: <Plus size={15} /> }
                      : undefined
                  }
                />
              ) : pagination.pageItems.map((row) => {
                const meta = getStatusMeta(row.status);
                const typeLabel = formatViolationType(row.violation_type);
                return (
                  <TableRow key={row.id} className="enforcement-page__table-row violations-table__row">
                    <TableCell className="violations-table__td violations-table__td--driver">
                      <div className="violations-table__driver">
                        <div className="enforcement-page__avatar enforcement-page__avatar--driver violations-table__avatar">
                          {initials(row.driver_name)}
                        </div>
                        <div className="violations-table__driver-copy min-w-0">
                          <p className="violations-table__driver-name">{row.driver_name || '—'}</p>
                          <p className="violations-table__driver-license">{row.driver_license || '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="violations-table__td violations-table__td--violation">
                      <div className="violations-table__violation">
                        <p className="violations-table__violation-title" title={typeLabel}>{typeLabel}</p>
                        <p className="violations-table__violation-location" title={row.location || undefined}>
                          <MapPin size={11} strokeWidth={2.25} aria-hidden />
                          <span>{row.location || '—'}</span>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="violations-table__td violations-table__td--sign">
                      <span className="violations-table__sign">
                        {row.detected_sign_code || row.detected_class_key || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="violations-table__td violations-table__td--action">
                      <span className="violations-table__action" title={formatObservedAction(row.observed_action)}>
                        {formatObservedAction(row.observed_action)}
                      </span>
                    </TableCell>
                    <TableCell className="violations-table__td violations-table__td--date">
                      <time className="violations-table__date" dateTime={row.violation_date}>
                        {formatAppDate(locale, row.violation_date, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </time>
                    </TableCell>
                    <TableCell className="violations-table__td violations-table__td--status">
                      <span className="violations-table__status enforcement-page__badge" style={{ background: meta.bg, color: meta.color }}>
                        {meta.icon}
                        {statusLabel(row.status)}
                      </span>
                    </TableCell>
                    <TableCell className="violations-table__td violations-table__td--actions" onClick={(e) => e.stopPropagation()}>
                      <div className="violations-table__actions" role="group" aria-label={t('violations.colActions')}>
                        <button
                          type="button"
                          className="violations-table__icon-btn violations-table__icon-btn--view"
                          onClick={() => setSelected(row)}
                          title={t('violations.view')}
                          aria-label={t('violations.view')}
                        >
                          <Eye size={16} strokeWidth={2.35} aria-hidden />
                        </button>
                        {canManage ? (
                          <button
                            type="button"
                            className="violations-table__icon-btn violations-table__icon-btn--edit"
                            onClick={() => openEdit(row)}
                            title={t('common.edit')}
                            aria-label={t('common.edit')}
                          >
                            <Pencil size={16} strokeWidth={2.35} aria-hidden />
                          </button>
                        ) : null}
                        {user?.role === 'admin' ? (
                          <button
                            type="button"
                            className="violations-table__icon-btn violations-table__icon-btn--delete"
                            onClick={() => setDeleteViolation(row)}
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                          >
                            <Trash2 size={16} strokeWidth={2.35} aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <TablePagination pagination={pagination} labelKey="pagination.label.violations" />
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent accent="rose" className="violations-view-dialog max-w-[56rem] sm:max-w-[56rem] p-0 gap-0 overflow-hidden">
          {selected && (() => {
            const meta = getStatusMeta(selected.status);
            const signCode = selected.detected_sign_code || selected.detected_class_key || '—';
            const evidenceItems = [
              selected.evidence_image && { url: selected.evidence_image, label: t('violations.evidence') },
              selected.plate_evidence_image && { url: selected.plate_evidence_image, label: t('violations.plateEvidence') },
              selected.vehicle_evidence_image && { url: selected.vehicle_evidence_image, label: t('violations.vehicleEvidence') },
            ].filter(Boolean) as { url: string; label: string }[];

            const detailCards = [
              { key: 'license', label: t('violations.licenseNo'), value: selected.driver_license, icon: Hash, tone: 'blue' as const },
              { key: 'action', label: t('violations.colAction'), value: formatObservedAction(selected.observed_action), icon: Shield, tone: 'violet' as const },
              { key: 'officer', label: t('violations.officer'), value: selected.officer_name || '—', icon: User, tone: 'amber' as const },
              { key: 'date', label: t('violations.colDate'), value: formatViolationDateTime(selected.violation_date), icon: Clock, tone: 'teal' as const },
            ];

            return (
              <div className="violations-view-dialog__shell">
                <div className="violations-view-dialog__header">
                  <div className="violations-view-dialog__header-icon">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="violations-view-dialog__header-copy">
                    <h2 className="violations-view-dialog__header-title">
                      {formatViolationType(selected.violation_type)} — #{selected.id}
                    </h2>
                    <p className="violations-view-dialog__header-meta">
                      {formatViolationDateTime(selected.violation_date)}
                      <span aria-hidden> · </span>
                      {selected.location}
                    </p>
                  </div>
                </div>

                <div className="violations-view-dialog__summary">
                  <div className="violations-view-dialog__summary-top">
                    <span className="violations-view-dialog__driver">{selected.driver_name || '—'}</span>
                    <span
                      className="violations-view-dialog__status-badge"
                      style={{ background: meta.bg, color: meta.color, borderColor: `${meta.color}35` }}
                    >
                      {meta.icon}
                      {statusLabel(selected.status)}
                    </span>
                  </div>
                  <div className="violations-view-dialog__summary-meta">
                    <span className="violations-view-dialog__sign-chip">
                      <Shield size={13} />
                      {signCode}
                    </span>
                    <span className="violations-view-dialog__location-chip">
                      <MapPin size={13} />
                      {selected.location}
                    </span>
                  </div>
                </div>

                <div className="violations-view-dialog__body">
                  <div className="violations-view-dialog__main">
                    <div className="violations-view-dialog__cards">
                      {detailCards.map((card) => {
                        const CardIcon = card.icon;
                        return (
                          <div
                            key={card.key}
                            className={`violations-view-dialog__card violations-view-dialog__card--${card.tone}`}
                          >
                            <div className={`violations-view-dialog__card-icon violations-view-dialog__card-icon--${card.tone}`}>
                              <CardIcon size={15} />
                            </div>
                            <div className="violations-view-dialog__card-copy">
                              <span className="violations-view-dialog__card-label">{card.label}</span>
                              <span className={`violations-view-dialog__card-value${card.key === 'license' ? ' violations-view-dialog__card-value--mono' : ''}`}>
                                {card.value || '—'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selected.description ? (
                      <div className="violations-view-dialog__description">
                        <div className="violations-view-dialog__description-head">
                          <FileText size={14} />
                          <span>{t('violations.description')}</span>
                        </div>
                        <p className="violations-view-dialog__description-text">{selected.description}</p>
                      </div>
                    ) : null}
                  </div>

                  <aside className="violations-view-dialog__evidence">
                    <div className="violations-view-dialog__evidence-head">
                      <ImageIcon size={14} />
                      <span>{t('violations.evidence')}</span>
                    </div>
                    {evidenceItems.length > 0 ? (
                      <div className="violations-view-dialog__evidence-list">
                        {evidenceItems.map((item) => (
                          <a
                            key={item.url}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="violations-view-dialog__evidence-link"
                          >
                            <img src={item.url} alt={item.label} className="violations-view-dialog__evidence-image" />
                            <span className="violations-view-dialog__evidence-overlay">
                              <Eye size={15} />
                              {t('evidenceArchive.viewFullImage')}
                            </span>
                            <span className="violations-view-dialog__evidence-caption">{item.label}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="violations-view-dialog__evidence-empty">{t('violations.noEvidence')}</div>
                    )}
                  </aside>
                </div>

                {canManage ? (
                  <div className="violations-view-dialog__footer">
                    <div className="violations-view-dialog__footer-actions">
                      {selected.status === 'confirmed' && !selected.fine_id ? (
                        <Button
                          size="sm"
                          className="violations-view-dialog__btn violations-view-dialog__btn--fine"
                          onClick={() => openIssueFine(selected)}
                        >
                          <DollarSign size={14} /> {t('violations.issueFine')}
                        </Button>
                      ) : null}
                      {selected.status !== 'confirmed' ? (
                        <Button
                          size="sm"
                          className="violations-view-dialog__btn violations-view-dialog__btn--confirm"
                          onClick={() => handleStatusUpdate(selected.id, 'confirmed')}
                        >
                          <CheckCircle size={14} /> {t('violations.confirm')}
                        </Button>
                      ) : null}
                      {selected.status !== 'rejected' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="violations-view-dialog__btn violations-view-dialog__btn--reject"
                          onClick={() => handleStatusUpdate(selected.id, 'rejected')}
                        >
                          <XCircle size={14} /> {t('violations.reject')}
                        </Button>
                      ) : null}
                    </div>
                    {user?.role === 'admin' ? (
                      <Button
                        size="sm"
                        className="violations-view-dialog__btn violations-view-dialog__btn--delete"
                        onClick={() => setDeleteViolation(selected)}
                      >
                        <Trash2 size={14} /> {t('violations.delete')}
                      </Button>
                    ) : null}
                    {canManage ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="violations-view-dialog__btn"
                        onClick={() => { openEdit(selected); setSelected(null); }}
                      >
                        <Pencil size={14} /> {t('violations.editViolation')}
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="violations-view-dialog__footer violations-view-dialog__footer--single">
                    <Button variant="outline" className="violations-view-dialog__close-btn" onClick={() => setSelected(null)}>
                      {t('vehicles.close')}
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editViolation} onOpenChange={(open) => !open && setEditViolation(null)}>
        <DialogContent accent="rose" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('violations.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('violations.locationLabel')}</Label>
              <Input
                value={editForm.location}
                onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                placeholder={t('violations.locationPlaceholder')}
              />
            </div>
            <div>
              <Label>{t('violations.description')}</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('violations.colStatus')}</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as TrafficViolation['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['draft', 'pending_review', 'confirmed', 'rejected'] as const).map((s) => (
                    <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditViolation(null)}>{t('common.cancel')}</Button>
            <Button onClick={() => void handleEditSave()} disabled={savingEdit}>
              {savingEdit ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteViolation} onOpenChange={(open) => !open && setDeleteViolation(null)}>
        <DialogContent accent="danger" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('violations.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="ct-dialog-message">{t('violations.deleteConfirm', { id: String(deleteViolation?.id ?? '') })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteViolation(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteViolation && void handleDelete(deleteViolation.id)}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create violation dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetCreateForm(); setCreateOpen(open); }}>
        <DialogContent accent="rose" className="violations-create-dialog max-w-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--rose">
                <Plus size={15} />
              </div>
              <span className="enforcement-page__dialog-title">{t('violations.createTitle')}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="ct-dialog-form violations-create-dialog__form">
            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('violations.driverLicense')} *</Label>
              <div className="violations-create-dialog__lookup-row">
                <Input
                  value={createForm.driver_license}
                  onChange={(e) => setCreateForm((p) => ({ ...p, driver_license: e.target.value }))}
                  placeholder="LIC-00001"
                />
                <Button type="button" variant="outline" className="violations-create-dialog__lookup-btn" onClick={() => void handleDriverLookup()}>
                  {t('violations.lookupDriver')}
                </Button>
              </div>
              {createForm.driver_name ? (
                <p className="violations-create-dialog__driver-found">
                  <CheckCircle size={14} />
                  {createForm.driver_name}
                </p>
              ) : null}
            </div>

            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('violations.ruleLabel')} *</Label>
              <Select
                value={createForm.rule_id || undefined}
                onValueChange={(v) => setCreateForm((p) => ({ ...p, rule_id: v, observed_action: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('violations.selectRule')} />
                </SelectTrigger>
                <SelectContent>
                  {rules.map((rule) => (
                    <SelectItem key={rule.id} value={String(rule.id)}>
                      {rule.sign_class_key} + {formatObservedAction(rule.prohibited_action)} — {rule.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('violations.overrideAction')}</Label>
              <Select
                value={createForm.observed_action || '__default__'}
                onValueChange={(v) => setCreateForm((p) => ({ ...p, observed_action: v === '__default__' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('violations.useRuleDefault')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">{t('violations.useRuleDefault')}</SelectItem>
                  {OBSERVED_ACTION_VALUES.map((action) => (
                    <SelectItem key={action} value={action}>{formatObservedAction(action)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ct-dialog-field-grid">
              <div className="ct-dialog-field">
                <Label className="enforcement-page__form-label">{t('violations.colSign')}</Label>
                <Input
                  value={createForm.sign_code}
                  onChange={(e) => setCreateForm((p) => ({ ...p, sign_code: e.target.value }))}
                  placeholder="PW03-R1-01"
                />
              </div>
              <div className="ct-dialog-field">
                <Label className="enforcement-page__form-label">{t('violations.locationLabel')} *</Label>
                <Input
                  value={createForm.location}
                  onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder={t('violations.locationPlaceholder')}
                />
              </div>
            </div>

            {evalPreview ? (
              <div className={`violations-create-dialog__preview${evalPreview.is_violation ? ' violations-create-dialog__preview--match' : ' violations-create-dialog__preview--neutral'}`}>
                {evalPreview.is_violation ? <AlertTriangle size={15} /> : <Shield size={15} />}
                <span>
                  {evalPreview.is_violation
                    ? t('violations.previewMatch', { type: formatViolationType(evalPreview.violation_type || '') })
                    : t('violations.previewNoMatch')}
                </span>
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button
              disabled={creating}
              className="violations-create-dialog__submit"
              onClick={() => void handleCreateViolation()}
            >
              {creating ? t('common.saving') : t('violations.createViolation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue fine dialog */}
      <Dialog open={issueFineOpen} onOpenChange={setIssueFineOpen}>
        <DialogContent accent="rose" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--rose">
                <DollarSign size={15} />
              </div>
              <span className="enforcement-page__dialog-title">{t('violations.issueFineTitle')}</span>
            </DialogTitle>
          </DialogHeader>
          {fineTarget && (
            <div className="ct-dialog-form space-y-3">
              <p className="text-[13px] text-muted-foreground">
                {formatViolationType(fineTarget.violation_type)} — {fineTarget.driver_name}
              </p>
              <div className="ct-dialog-field">
                <Label className="enforcement-page__form-label">{t('violations.fineAmount')} *</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder={t('fines.amountPlaceholder')}
                  value={fineForm.amount}
                  onChange={(e) => setFineForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="ct-dialog-field">
                <Label className="enforcement-page__form-label">{t('violations.fineReason')} *</Label>
                <Textarea
                  value={fineForm.reason}
                  onChange={(e) => setFineForm((p) => ({ ...p, reason: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="ct-dialog-field">
                <Label className="enforcement-page__form-label">{t('violations.locationLabel')}</Label>
                <Input
                  value={fineForm.location}
                  onChange={(e) => setFineForm((p) => ({ ...p, location: e.target.value }))}
                />
              </div>
              <div className="ct-dialog-field">
                <Label className="enforcement-page__form-label">{t('violations.vehiclePlate')}</Label>
                <Input
                  value={fineForm.vehicle_plate}
                  onChange={(e) => setFineForm((p) => ({ ...p, vehicle_plate: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIssueFineOpen(false)}>{t('common.cancel')}</Button>
            <Button
              disabled={issuingFine}
              className="violations-create-dialog__submit"
              onClick={() => void handleIssueFine()}
            >
              {issuingFine ? t('common.saving') : t('violations.issueFine')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
