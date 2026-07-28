import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import {
  Search, Eye, CheckCircle, XCircle, Clock, AlertTriangle,
  FileText, Shield, Trash2, ImageIcon, MapPin, Plus, DollarSign, Pencil, Loader2, Scale,
  ArrowLeft, Car, CreditCard, Download,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppCurrency, formatAppDate, khrToUsd, usdToKhr } from '@shared/i18n/localeFormat';
import { useLiveData } from '@shared/hooks/useLiveData';
import { useFieldErrors } from '@shared/hooks/useFieldErrors';
import { FieldError, FormErrorBanner } from '@shared/components/ui/FieldError';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import { OBSERVED_ACTION_VALUES } from '@shared/constants/observedActions';
import { CITIZEN_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';
import { finesAPI, violationsAPI } from '@shared/services/api';
import { getProfileImageUrl } from '@shared/utils/profileImage';
import { toast } from 'sonner';
import type { Fine, TrafficViolation, ViolationRule } from '@shared/types';

type CreateViolationField = 'driver_profile_id' | 'rule_id' | 'location';
type EditViolationField = 'location';
type IssueFineField = 'amount' | 'reason';

const STATUS_TABS = ['all', 'pending_review', 'confirmed', 'rejected', 'draft'] as const;
type StatusTab = typeof STATUS_TABS[number];

/** Rows fetched for first paint before the full history streams in behind it. */
const RECENT_WINDOW = 200;

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
    icon: <CheckCircle size={11} />,
    bg: 'rgba(16,185,129,0.1)',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
  },
};

const STAT_CARDS = [
  { key: 'all', labelKey: 'violations.statTotal', icon: FileText, variant: 'blue' },
  { key: 'pending_review', labelKey: 'violations.statPending', icon: Clock, variant: 'amber' },
  { key: 'confirmed', labelKey: 'violations.statConfirmed', icon: AlertTriangle, variant: 'rose' },
  { key: 'rejected', labelKey: 'violations.statRejected', icon: CheckCircle, variant: 'emerald' },
] as const;

function formatViolationTypeFallback(value: string) {
  return (value || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Prefer OCR / unknown-queue plate over a wrongly linked registration plate. */
function resolveFinePlate(violation: {
  plate_detected?: string | null;
  vehicle_plate?: string | null;
  location?: string | null;
}): string {
  const detected = String(violation.plate_detected || '').trim().toUpperCase();
  if (detected && !['UNKNOWN', 'N/A', 'NONE', 'NULL', '-', '—'].includes(detected)) {
    return detected;
  }
  const loc = String(violation.location || '');
  const fromLoc = loc.match(/Unknown plate sighting\s*[·•.\-–—]\s*([A-Z0-9][A-Z0-9\-]{2,})/i);
  if (fromLoc?.[1]) return fromLoc[1].toUpperCase();
  return String(violation.vehicle_plate || '').trim().toUpperCase();
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
}

export function ViolationsPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

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
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [selected, setSelected] = useState<TrafficViolation | null>(null);
  const [linkedFine, setLinkedFine] = useState<Fine | null>(null);
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
  const createErrors = useFieldErrors<CreateViolationField>();
  const editErrors = useFieldErrors<EditViolationField>();
  const issueErrors = useFieldErrors<IssueFineField>();

  const canManage = user?.role === 'admin' || user?.role === 'police';
  /** Thesis RBAC: only officers (police) may issue fines — admins configure the system. */
  const canIssueFine = user?.role === 'police';

  useEffect(() => {
    if (!selected?.fine_id || canManage) {
      setLinkedFine(null);
      return;
    }
    let cancelled = false;
    finesAPI.getById(String(selected.fine_id))
      .then((fine) => { if (!cancelled) setLinkedFine(fine); })
      .catch(() => { if (!cancelled) setLinkedFine(null); });
    return () => { cancelled = true; };
  }, [selected?.fine_id, canManage, selected]);

  const applyStats = useCallback((stats: unknown, fallbackTotal: number) => {
    if (stats && typeof stats === 'object') {
      const s = stats as {
        total_violations?: number;
        pending_review?: number;
        confirmed?: number;
        rejected?: number;
      };
      setApiCounts({
        all: s.total_violations ?? fallbackTotal,
        pending_review: s.pending_review ?? 0,
        confirmed: s.confirmed ?? 0,
        rejected: s.rejected ?? 0,
      });
    } else {
      setApiCounts(null);
    }
  }, []);

  /**
   * Two-phase load: paint the newest slice immediately, then pull the remaining
   * history in the background so client-side search still covers every record.
   */
  const loadViolations = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const [recent, stats] = await Promise.all([
        violationsAPI.getRecent(RECENT_WINDOW),
        violationsAPI.getStats().catch(() => null),
      ]);
      setViolations(recent.rows);
      applyStats(stats, recent.total);
      if (!silent) setLoading(false);

      if (recent.total > recent.rows.length) {
        setBackfilling(true);
        try {
          setViolations(await violationsAPI.getAll());
        } finally {
          setBackfilling(false);
        }
      }
    } catch {
      if (!silent) toast.error(t('violations.toastLoadFail'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [applyStats, t, user]);

  /** Poll only the newest slice + counters; a full re-download every 30s is wasteful. */
  const refreshRecent = useCallback(async () => {
    if (!user) return;
    try {
      const [recent, stats] = await Promise.all([
        violationsAPI.getRecent(RECENT_WINDOW),
        violationsAPI.getStats().catch(() => null),
      ]);
      setViolations((prev) => {
        if (prev.length <= recent.rows.length) return recent.rows;
        const fresh = new Map(recent.rows.map((r) => [r.id, r]));
        const merged = prev.map((row) => fresh.get(row.id) ?? row);
        const seen = new Set(prev.map((r) => r.id));
        const added = recent.rows.filter((r) => !seen.has(r.id));
        return added.length ? [...added, ...merged] : merged;
      });
      if (stats) applyStats(stats, recent.total);
    } catch { /* background refresh stays silent */ }
  }, [applyStats, user]);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  useEffect(() => {
    if (!canManage) return;
    violationsAPI.getRules()
      .then(setRules)
      .catch(() => { /* rules optional for view */ });
  }, [canManage]);

  useLiveData(refreshRecent, 30_000, Boolean(user));

  const filtered = useMemo(() => {
    let rows = [...violations];
    if (statusFilter !== 'all') rows = rows.filter((v) => v.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((v) =>
        v.driver_name.toLowerCase().includes(q)
        || v.driver_license.toLowerCase().includes(q)
        || v.location.toLowerCase().includes(q)
        || v.violation_type.toLowerCase().includes(q)
        || v.detected_sign_code.toLowerCase().includes(q)
        || v.detected_class_key.toLowerCase().includes(q)
        || v.observed_action.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [violations, search, statusFilter]);

  const pagination = usePagination(filtered);

  const counts = useMemo(() => ({
    all: apiCounts?.all ?? violations.length,
    pending_review: apiCounts?.pending_review ?? violations.filter((v) => v.status === 'pending_review').length,
    confirmed: apiCounts?.confirmed ?? violations.filter((v) => v.status === 'confirmed').length,
    rejected: apiCounts?.rejected ?? violations.filter((v) => v.status === 'rejected').length,
    // No server counter for drafts — always derive from the rows we hold.
    draft: violations.filter((v) => v.status === 'draft').length,
  }), [apiCounts, violations]);

  const statusLabel = (status: string) => t(`violations.status.${status}`);
  const getStatusMeta = (status: string) => STATUS_STYLE[status] ?? STATUS_STYLE.draft;

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
    editErrors.clearErrors();
    setEditForm({
      location: row.location || '',
      description: row.description || '',
      status: row.status,
    });
  };

  const handleEditSave = async () => {
    if (!editViolation) return;
    const ok = editErrors.validateRequired(
      { location: editForm.location },
      { location: t('common.fieldRequired') },
    );
    if (!ok) {
      toast.error(t('common.formIncomplete'));
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
      editErrors.clearErrors();
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
    createErrors.clearErrors();
  };

  const handleDriverLookup = async () => {
    if (!createForm.driver_license.trim()) return;
    try {
      const r = await finesAPI.searchByLicense(createForm.driver_license.trim());
      const profileId = r.driver_profile_id ?? null;
      const driver = r.driver;
      if (driver && profileId) {
        createErrors.clearField('driver_profile_id');
        setCreateForm((prev) => ({
          ...prev,
          driver_profile_id: profileId,
          driver_name: driver.full_name,
        }));
        toast.success(t('violations.driverFound', { name: driver.full_name }));
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
    const ok = createErrors.validateRequired(
      {
        driver_profile_id: createForm.driver_profile_id,
        rule_id: createForm.rule_id,
        location: createForm.location,
      },
      {
        driver_profile_id: t('common.lookupRequired'),
        rule_id: t('common.fieldRequired'),
        location: t('common.fieldRequired'),
      },
    );
    if (!ok || !selectedRule) {
      toast.error(t('common.formIncomplete'));
      return;
    }
    setCreating(true);
    try {
      const created = await violationsAPI.create({
        driver_id: createForm.driver_profile_id!,
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
    const norm = (v: string | null | undefined) => String(v || '').trim().toLowerCase();
    const rule = rules.find(
      (r) => norm(r.sign_class_key) === norm(violation.detected_class_key)
        && norm(r.prohibited_action) === norm(violation.observed_action),
    ) || rules.find(
      (r) => norm(r.violation_type) === norm(violation.violation_type),
    );
    setFineTarget(violation);
    issueErrors.clearErrors();
    setFineForm({
      amount: rule ? String(usdToKhr(Number(rule.default_fine_amount))) : String(usdToKhr(25)),
      reason: violation.description || formatViolationType(violation.violation_type),
      location: violation.location || '',
      vehicle_plate: resolveFinePlate(violation),
    });
    setIssueFineOpen(true);
  };

  const handleIssueFine = async () => {
    if (!fineTarget) return;
    const ok = issueErrors.validateRequired(
      { amount: fineForm.amount, reason: fineForm.reason },
      {
        amount: t('common.fieldRequired'),
        reason: t('common.fieldRequired'),
      },
    );
    if (!ok) {
      toast.error(t('common.formIncomplete'));
      return;
    }
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
      issueErrors.clearErrors();
      toast.success(t('violations.toastFineIssued', { id: String(fine.id) }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/officer|police|403|forbidden/i.test(msg)) {
        toast.error(msg || t('violations.toastFineOfficerOnly'));
      } else {
        toast.error(msg.includes('already') ? t('violations.toastFineExists') : (msg || t('violations.toastFineFail')));
      }
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
            {backfilling ? (
              <span className="enforcement-page__search-hint" title={t('violations.loadingHistory')}>
                <Loader2 size={13} className="animate-spin" aria-hidden />
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="enforcement-page__panel enforcement-page__panel--violations">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {[
                  t('violations.colDriver'),
                  t('violations.colType'),
                  t('violations.colSign'),
                  t('violations.colAction'),
                  t('violations.colLocation'),
                  t('violations.colDate'),
                  t('violations.colStatus'),
                  t('violations.colActions'),
                ].map((h) => (
                  <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((__, j) => (
                      <TableCell key={j}>
                        <div className="enforcement-page__skeleton" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableEmptyState
                  colSpan={8}
                  tone="amber"
                  icon={<AlertTriangle size={28} />}
                  title={t('violations.empty')}
                  subtitle={t('violations.emptyHint')}
                />
              ) : pagination.pageItems.map((row) => {
                const meta = getStatusMeta(row.status);
                return (
                  <TableRow key={row.id} className="enforcement-page__table-row">
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="enforcement-page__avatar">{initials(row.driver_name)}</div>
                        <div>
                          <p className="enforcement-page__cell-primary">{row.driver_name}</p>
                          <p className="enforcement-page__cell-mono">{row.driver_license}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="enforcement-page__cell-primary">{formatViolationType(row.violation_type)}</p>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__code-pill">
                        {row.detected_sign_code || row.detected_class_key || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__code-pill enforcement-page__code-pill--action">
                        {formatObservedAction(row.observed_action)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin size={12} className="enforcement-page__location-icon" />
                        <span className="enforcement-page__cell-body truncate">{row.location || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__cell-secondary">
                        {new Date(row.violation_date).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__badge" style={{ background: meta.bg, color: meta.color }}>
                        {meta.icon}
                        {statusLabel(row.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="enforcement-page__table-actions violations-page__actions">
                        <button
                          type="button"
                          className="violations-page__action-btn violations-page__action-btn--view"
                          onClick={() => setSelected(row)}
                          aria-label={t('violations.view')}
                        >
                          <Eye size={13} />
                        </button>
                        {canManage ? (
                          <button
                            type="button"
                            className="violations-page__action-btn violations-page__action-btn--edit"
                            onClick={() => openEdit(row)}
                            aria-label={t('common.edit')}
                          >
                            <Pencil size={13} />
                          </button>
                        ) : null}
                        {user?.role === 'admin' ? (
                          <button
                            type="button"
                            className="violations-page__action-btn violations-page__action-btn--delete"
                            onClick={() => setDeleteViolation(row)}
                            aria-label={t('common.delete')}
                          >
                            <Trash2 size={13} />
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
        <DialogContent
          accent={canManage ? 'rose' : 'blue'}
          accessibleTitle={selected ? formatViolationType(selected.violation_type) : t('violations.view')}
          className={`violations-view-dialog p-0 gap-0 overflow-hidden ${canManage ? 'max-w-[58rem] sm:max-w-[58rem]' : 'violations-view-dialog--clean max-w-[36rem] sm:max-w-[36rem]'}`}
        >
          {selected && canManage && (() => {
            const meta = getStatusMeta(selected.status);
            const shortId = String(selected.id).slice(0, 8);
            const signCode = selected.detected_sign_code || selected.detected_class_key || '—';
            const evidenceItems = [
              selected.evidence_image && {
                url: getProfileImageUrl(selected.evidence_image) || selected.evidence_image,
                label: t('violations.evidence'),
              },
              selected.plate_evidence_image && {
                url: getProfileImageUrl(selected.plate_evidence_image) || selected.plate_evidence_image,
                label: t('violations.plateEvidence'),
              },
              selected.vehicle_evidence_image && {
                url: getProfileImageUrl(selected.vehicle_evidence_image) || selected.vehicle_evidence_image,
                label: t('violations.vehicleEvidence'),
              },
            ].filter((item): item is { url: string; label: string } => Boolean(item && item.url));

            const detailRows = [
              { key: 'plate', label: t('violations.vehiclePlate'), value: resolveFinePlate(selected) || '—', mono: true },
              { key: 'license', label: t('violations.licenseNo'), value: selected.driver_license || '—', mono: true },
              { key: 'action', label: t('violations.colAction'), value: formatObservedAction(selected.observed_action) || '—' },
              { key: 'sign', label: t('violations.colSign'), value: signCode, mono: true },
              { key: 'type', label: t('violations.colType'), value: formatViolationType(selected.violation_type) },
              { key: 'officer', label: t('violations.officer'), value: selected.officer_name || '—' },
              { key: 'date', label: t('violations.colDate'), value: new Date(selected.violation_date).toLocaleString() },
              { key: 'location', label: t('violations.colLocation'), value: selected.location || '—' },
            ];

            return (
              <div className="violations-view-dialog__shell">
                <div className="violations-view-dialog__topbar">
                  <div className="violations-view-dialog__topbar-left">
                    <div className="violations-view-dialog__header-copy">
                      <div className="violations-view-dialog__title-row">
                        <h2 className="violations-view-dialog__header-title">{formatViolationType(selected.violation_type)}</h2>
                        <span className="violations-view-dialog__id-chip" title={String(selected.id)}>#{shortId}</span>
                        <span className="violations-view-dialog__status-pill" style={{ background: meta.bg, color: meta.color, borderColor: `${meta.color}40` }}>
                          {meta.icon}
                          {statusLabel(selected.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="violations-view-dialog__identity">
                  <div className="violations-view-dialog__driver-block">
                    <span className="violations-view-dialog__driver-avatar" aria-hidden>
                      {(selected.driver_name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <div className="violations-view-dialog__driver-copy">
                      <span className="violations-view-dialog__driver-label">{t('violations.colDriver')}</span>
                      <span className="violations-view-dialog__driver-name">{selected.driver_name || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="violations-view-dialog__identity-meta">
                    <span className="violations-view-dialog__meta-chip"><MapPin size={13} />{selected.location || '—'}</span>
                    {signCode !== '—' ? (
                      <span className="violations-view-dialog__meta-chip violations-view-dialog__meta-chip--sign"><Shield size={13} />{signCode}</span>
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
                          <span className={`violations-view-dialog__row-value${row.mono ? ' is-mono' : ''}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                    {selected.description ? (
                      <div className="violations-view-dialog__description">
                        <div className="violations-view-dialog__description-head"><FileText size={14} /><span>{t('violations.description')}</span></div>
                        <p className="violations-view-dialog__description-text">{selected.description}</p>
                      </div>
                    ) : null}
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
                          <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="violations-view-dialog__evidence-link">
                            <img src={item.url} alt={item.label} className="violations-view-dialog__evidence-image" onError={(e) => {
                              const el = e.currentTarget; el.style.display = 'none';
                              const wrap = el.closest('.violations-view-dialog__evidence-link');
                              if (wrap) { wrap.classList.add('is-broken'); const overlay = wrap.querySelector('.violations-view-dialog__evidence-overlay'); if (overlay) overlay.textContent = t('violations.evidenceUnavailable'); }
                            }} />
                            <span className="violations-view-dialog__evidence-overlay"><Eye size={15} />{t('evidenceArchive.viewFullImage')}</span>
                            <span className="violations-view-dialog__evidence-caption">{item.label}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="violations-view-dialog__evidence-empty">{t('violations.noEvidence')}</div>
                    )}
                  </aside>
                </div>

                <div className="violations-view-dialog__footer">
                  <div className="violations-view-dialog__footer-primary">
                    {canIssueFine && selected.status === 'confirmed' && !selected.fine_id ? (
                      <Button size="sm" className="violations-view-dialog__btn violations-view-dialog__btn--fine" onClick={() => openIssueFine(selected)}>
                        <DollarSign size={14} /> {t('violations.issueFine')}
                      </Button>
                    ) : null}
                    {selected.status !== 'confirmed' ? (
                      <Button size="sm" className="violations-view-dialog__btn violations-view-dialog__btn--confirm" onClick={() => handleStatusUpdate(selected.id, 'confirmed')}>
                        <CheckCircle size={14} /> {t('violations.confirm')}
                      </Button>
                    ) : null}
                    {selected.status !== 'rejected' ? (
                      <Button size="sm" variant="outline" className="violations-view-dialog__btn violations-view-dialog__btn--reject" onClick={() => handleStatusUpdate(selected.id, 'rejected')}>
                        <XCircle size={14} /> {t('violations.reject')}
                      </Button>
                    ) : null}
                  </div>
                  <div className="violations-view-dialog__footer-secondary">
                    <Button size="sm" variant="outline" className="violations-view-dialog__btn" onClick={() => { openEdit(selected); setSelected(null); }}>
                      <Pencil size={14} /> {t('violations.editViolation')}
                    </Button>
                    {user?.role === 'admin' ? (
                      <Button size="sm" variant="outline" className="violations-view-dialog__btn violations-view-dialog__btn--delete" onClick={() => setDeleteViolation(selected)}>
                        <Trash2 size={14} /> {t('violations.delete')}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })()}

          {selected && !canManage && (() => {
            const typeLabel = formatViolationType(selected.violation_type);
            const plate = resolveFinePlate(selected) || '—';
            const evidenceUrl = getProfileImageUrl(selected.evidence_image)
              || getProfileImageUrl(selected.vehicle_evidence_image)
              || selected.evidence_image
              || selected.vehicle_evidence_image
              || null;
            const unpaidFine = linkedFine
              && (linkedFine.status === 'pending' || linkedFine.status === 'overdue' || linkedFine.status === 'awaiting_verification');
            const statusText = linkedFine
              ? (t(`fines.status.${linkedFine.status}`) !== `fines.status.${linkedFine.status}`
                ? t(`fines.status.${linkedFine.status}`)
                : linkedFine.status.replace(/_/g, ' '))
              : statusLabel(selected.status);
            const statusClass = linkedFine?.status === 'overdue'
              ? 'is-overdue'
              : linkedFine?.status === 'paid'
                ? 'is-paid'
                : selected.status === 'rejected'
                  ? 'is-muted'
                  : selected.status === 'confirmed'
                    ? 'is-pending'
                    : 'is-amber';

            return (
              <div className="vv-clean">
                <div className="vv-clean__nav">
                  <button type="button" className="vv-clean__back" onClick={() => setSelected(null)}>
                    <ArrowLeft size={18} />
                    {t('common.back')}
                  </button>
                  <span className={`vv-clean__status ${statusClass}`}>{statusText}</span>
                </div>

                <article className="vv-clean__card">
                  <h2 className="vv-clean__title">{t('fines.rulePrefix')}: {typeLabel}</h2>
                  {linkedFine ? (
                    <p className="vv-clean__amount">{formatAppCurrency(locale, Number(linkedFine.amount))}</p>
                  ) : (
                    <p className="vv-clean__amount vv-clean__amount--status">{statusLabel(selected.status)}</p>
                  )}

                  <div className="vv-clean__grid">
                    <div className="vv-clean__fact">
                      <MapPin className="vv-clean__fact-icon" size={18} />
                      <div>
                        <p className="vv-clean__fact-label">{t('violations.colLocation')}</p>
                        <p className="vv-clean__fact-value">{selected.location || '—'}</p>
                      </div>
                    </div>
                    <div className="vv-clean__fact">
                      <Clock className="vv-clean__fact-icon" size={18} />
                      <div>
                        <p className="vv-clean__fact-label">{t('fines.issued')}</p>
                        <p className="vv-clean__fact-value">{formatAppDate(locale, selected.violation_date)}</p>
                      </div>
                    </div>
                    <div className="vv-clean__fact">
                      <Car className="vv-clean__fact-icon" size={18} />
                      <div>
                        <p className="vv-clean__fact-label">{t('violations.vehiclePlate')}</p>
                        <p className="vv-clean__fact-value is-mono">{plate}</p>
                      </div>
                    </div>
                    <div className="vv-clean__fact">
                      <Shield className="vv-clean__fact-icon" size={18} />
                      <div>
                        <p className="vv-clean__fact-label">{t('violations.officer')}</p>
                        <p className="vv-clean__fact-value">{selected.officer_name || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {linkedFine?.status === 'overdue' ? (
                    <div className="vv-clean__alert vv-clean__alert--danger"><AlertTriangle size={18} /><span>{t('fines.overdueAlert')}</span></div>
                  ) : selected.status === 'pending_review' || selected.status === 'draft' ? (
                    <div className="vv-clean__alert vv-clean__alert--info"><Clock size={18} /><span>{t('violations.underReviewHint')}</span></div>
                  ) : selected.status === 'confirmed' && !selected.fine_id ? (
                    <div className="vv-clean__alert vv-clean__alert--info"><AlertTriangle size={18} /><span>{t('violations.awaitingFineHint')}</span></div>
                  ) : selected.status === 'rejected' ? (
                    <div className="vv-clean__alert vv-clean__alert--muted"><XCircle size={18} /><span>{t('violations.rejectedHint')}</span></div>
                  ) : linkedFine?.status === 'paid' ? (
                    <div className="vv-clean__alert vv-clean__alert--success"><CheckCircle size={18} /><span>{t('fines.paymentConfirmed')}</span></div>
                  ) : null}

                  {evidenceUrl ? (
                    <a href={evidenceUrl} target="_blank" rel="noreferrer" className="vv-clean__evidence">
                      <img src={evidenceUrl} alt="" className="vv-clean__evidence-img" />
                    </a>
                  ) : null}
                </article>

                <div className="vv-clean__actions">
                  <div className="vv-clean__actions-secondary">
                    {selected.fine_id ? (
                      <button type="button" className="vv-clean__btn-secondary" onClick={() => {
                        const fineId = String(selected.fine_id); setSelected(null);
                        navigate(`${CITIZEN_PORTAL_ROUTES.fines}/${fineId}`);
                      }}>
                        <Download size={18} />
                        {t('violations.viewFine')}
                      </button>
                    ) : null}
                    {selected.fine_id && selected.status === 'confirmed' ? (
                      <button type="button" className="vv-clean__btn-secondary" onClick={() => {
                        const qs = new URLSearchParams({ violationId: String(selected.id), fineId: String(selected.fine_id) });
                        setSelected(null);
                        navigate(`${CITIZEN_PORTAL_ROUTES.appeals}?${qs.toString()}`);
                      }}>
                        <Scale size={18} />
                        {t('fines.submitAppeal')}
                      </button>
                    ) : null}
                    {!selected.fine_id ? (
                      <button type="button" className="vv-clean__btn-secondary" onClick={() => setSelected(null)}>{t('common.close')}</button>
                    ) : null}
                  </div>

                  {unpaidFine ? (
                    <button type="button" className="vv-clean__btn-primary" onClick={() => {
                      const fineId = String(selected.fine_id); setSelected(null);
                      navigate(`${CITIZEN_PORTAL_ROUTES.fines}/${fineId}/payment`);
                    }}>
                      <CreditCard size={20} />
                      {t('fines.payFine')}
                    </button>
                  ) : selected.fine_id ? (
                    <button type="button" className="vv-clean__btn-primary" onClick={() => {
                      const fineId = String(selected.fine_id); setSelected(null);
                      navigate(`${CITIZEN_PORTAL_ROUTES.fines}/${fineId}`);
                    }}>
                      <DollarSign size={20} />
                      {t('violations.viewFine')}
                    </button>
                  ) : (
                    <button type="button" className="vv-clean__btn-primary vv-clean__btn-primary--ghost" onClick={() => setSelected(null)}>
                      {t('common.close')}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editViolation} onOpenChange={(open) => {
        if (!open) {
          setEditViolation(null);
          editErrors.clearErrors();
        }
      }}>
        <DialogContent accent="rose" className="ct-form-dialog">
          <DialogHeader>
            <DialogTitle>{t('violations.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormErrorBanner message={editErrors.hasErrors ? t('common.formIncomplete') : null} />
            <div>
              <Label>{t('violations.locationLabel')} *</Label>
              <Input
                className={editErrors.errors.location ? 'ct-field--invalid' : undefined}
                aria-invalid={Boolean(editErrors.errors.location)}
                value={editForm.location}
                onChange={(e) => {
                  editErrors.clearField('location');
                  setEditForm((f) => ({ ...f, location: e.target.value }));
                }}
                placeholder={t('violations.locationPlaceholder')}
              />
              <FieldError message={editErrors.errors.location} />
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
            <FormErrorBanner message={createErrors.hasErrors ? t('common.formIncomplete') : null} />
            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('violations.driverLicense')} *</Label>
              <div className="violations-create-dialog__lookup-row">
                <Input
                  className={createErrors.errors.driver_profile_id ? 'ct-field--invalid' : undefined}
                  aria-invalid={Boolean(createErrors.errors.driver_profile_id)}
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
              <FieldError message={createErrors.errors.driver_profile_id} />
            </div>

            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('violations.ruleLabel')} *</Label>
              <FilterSelect
                block
                tone="rose"
                value={createForm.rule_id}
                onValueChange={(v) => {
                  createErrors.clearField('rule_id');
                  setCreateForm((p) => ({ ...p, rule_id: v, observed_action: '' }));
                }}
                ariaLabel={t('violations.ruleLabel')}
                placeholder={t('violations.selectRule')}
                triggerClassName={createErrors.errors.rule_id ? 'ct-field--invalid' : undefined}
                options={[
                  { value: '', label: t('violations.selectRule') },
                  ...rules.map((rule) => ({
                    value: rule.id,
                    label: `${rule.sign_class_key} + ${formatObservedAction(rule.prohibited_action)} — ${rule.title}`,
                  })),
                ]}
              />
              <FieldError message={createErrors.errors.rule_id} />
            </div>

            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('violations.overrideAction')}</Label>
              <FilterSelect
                block
                tone="rose"
                value={createForm.observed_action}
                onValueChange={(v) => setCreateForm((p) => ({ ...p, observed_action: v }))}
                ariaLabel={t('violations.overrideAction')}
                options={[
                  { value: '', label: t('violations.useRuleDefault') },
                  ...OBSERVED_ACTION_VALUES.map((action) => ({
                    value: action,
                    label: formatObservedAction(action),
                  })),
                ]}
              />
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
                  className={createErrors.errors.location ? 'ct-field--invalid' : undefined}
                  aria-invalid={Boolean(createErrors.errors.location)}
                  value={createForm.location}
                  onChange={(e) => {
                    createErrors.clearField('location');
                    setCreateForm((p) => ({ ...p, location: e.target.value }));
                  }}
                  placeholder={t('violations.locationPlaceholder')}
                />
                <FieldError message={createErrors.errors.location} />
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
      <Dialog open={issueFineOpen} onOpenChange={(open) => {
        setIssueFineOpen(open);
        if (!open) issueErrors.clearErrors();
      }}>
        <DialogContent accent="amber" className="ct-form-dialog issue-fine-dialog max-w-lg sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--amber">
                <DollarSign size={15} />
              </div>
              <span className="enforcement-page__dialog-title">{t('violations.issueFineTitle')}</span>
            </DialogTitle>
          </DialogHeader>
          {fineTarget && (
            <div className="ct-dialog-form issue-fine-dialog__body">
              <FormErrorBanner message={issueErrors.hasErrors ? t('common.formIncomplete') : null} />

              <div className="issue-fine-dialog__context" role="group" aria-label={t('violations.issueFineTitle')}>
                <div className="issue-fine-dialog__context-row">
                  <span className="issue-fine-dialog__context-label">{t('violations.colType')}</span>
                  <span className="issue-fine-dialog__context-value">
                    {formatViolationType(fineTarget.violation_type)}
                  </span>
                </div>
                <div className="issue-fine-dialog__context-row">
                  <span className="issue-fine-dialog__context-label">{t('violations.colDriver')}</span>
                  <span className="issue-fine-dialog__context-value">{fineTarget.driver_name || '—'}</span>
                </div>
                <div className="issue-fine-dialog__context-row">
                  <span className="issue-fine-dialog__context-label">{t('violations.vehiclePlate')}</span>
                  <span className="issue-fine-dialog__context-value issue-fine-dialog__context-value--mono">
                    {fineForm.vehicle_plate || '—'}
                  </span>
                </div>
              </div>

              <div className="ct-dialog-field">
                <Label className="enforcement-page__form-label">{t('violations.fineAmount')} *</Label>
                <div className={`issue-fine-dialog__amount${issueErrors.errors.amount ? ' ct-field--invalid' : ''}`}>
                  <span className="issue-fine-dialog__amount-unit">KHR</span>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    placeholder={t('fines.amountPlaceholder')}
                    value={fineForm.amount}
                    onChange={(e) => {
                      issueErrors.clearField('amount');
                      setFineForm((p) => ({ ...p, amount: e.target.value }));
                    }}
                    aria-invalid={Boolean(issueErrors.errors.amount)}
                    className="issue-fine-dialog__amount-input"
                  />
                </div>
                <FieldError message={issueErrors.errors.amount} />
              </div>

              <div className="ct-dialog-field">
                <Label className="enforcement-page__form-label">{t('violations.fineReason')} *</Label>
                <textarea
                  value={fineForm.reason}
                  onChange={(e) => {
                    issueErrors.clearField('reason');
                    setFineForm((p) => ({ ...p, reason: e.target.value }));
                  }}
                  rows={3}
                  placeholder={t('violations.fineReason')}
                  className={`issue-fine-dialog__textarea${issueErrors.errors.reason ? ' ct-field--invalid' : ''}`}
                  aria-invalid={Boolean(issueErrors.errors.reason)}
                />
                <FieldError message={issueErrors.errors.reason} />
              </div>

              <div className="ct-dialog-field-grid">
                <div className="ct-dialog-field">
                  <Label className="enforcement-page__form-label">{t('violations.locationLabel')}</Label>
                  <Input
                    value={fineForm.location}
                    onChange={(e) => setFineForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder={t('violations.locationPlaceholder')}
                  />
                </div>
                <div className="ct-dialog-field">
                  <Label className="enforcement-page__form-label">{t('violations.vehiclePlate')}</Label>
                  <Input
                    value={fineForm.vehicle_plate}
                    onChange={(e) => setFineForm((p) => ({ ...p, vehicle_plate: e.target.value.toUpperCase() }))}
                    placeholder="2AB-1234"
                    className="issue-fine-dialog__plate"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIssueFineOpen(false)}>{t('common.cancel')}</Button>
            <Button
              disabled={issuingFine}
              className="issue-fine-dialog__submit"
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
