import { useEffect, useMemo, useState, useCallback } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import {
  Search, Eye, CheckCircle, XCircle, Clock, AlertTriangle,
  FileText, Shield, Trash2, ImageIcon, MapPin, Plus, DollarSign,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { khrToUsd, usdToKhr } from '@shared/i18n/localeFormat';
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

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
}

export function ViolationsPage() {
  const { t } = useLanguage();
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
    driver_profile_id: null as number | null,
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

  const canManage = user?.role === 'admin' || user?.role === 'police';

  const loadViolations = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const data = await violationsAPI.getAll();
      setViolations(data);
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
    all: violations.length,
    pending_review: violations.filter((v) => v.status === 'pending_review').length,
    confirmed: violations.filter((v) => v.status === 'confirmed').length,
    rejected: violations.filter((v) => v.status === 'rejected').length,
    draft: violations.filter((v) => v.status === 'draft').length,
  }), [violations]);

  const statusLabel = (status: string) => t(`violations.status.${status}`);
  const getStatusMeta = (status: string) => STATUS_STYLE[status] ?? STATUS_STYLE.draft;

  const handleStatusUpdate = async (id: number, status: TrafficViolation['status']) => {
    try {
      const updated = await violationsAPI.update(id, { status });
      setViolations((prev) => prev.map((v) => (v.id === id ? updated : v)));
      if (selected?.id === id) setSelected(updated);
      toast.success(t('violations.toastStatusUpdated', { status: statusLabel(status) }));
    } catch {
      toast.error(t('violations.toastStatusFail'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('violations.confirmDelete'))) return;
    try {
      await violationsAPI.delete(id);
      setViolations((prev) => prev.filter((v) => v.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success(t('violations.toastDeleted'));
    } catch {
      toast.error(t('violations.toastDeleteFail'));
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
          <Table className="enforcement-page__table">
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
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="enforcement-page__empty-icon enforcement-page__empty-icon--amber">
                        <AlertTriangle size={28} />
                      </div>
                      <div>
                        <p className="enforcement-page__empty-title">{t('violations.empty')}</p>
                        <p className="enforcement-page__empty-subtitle">{t('violations.emptyHint')}</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
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
                      <div className="enforcement-page__table-actions">
                        <button type="button" className="enforcement-page__action-btn" onClick={() => setSelected(row)}>
                          <Eye size={12} /> {t('violations.view')}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <TablePagination pagination={pagination} label="violations" />
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected && (() => {
            const meta = getStatusMeta(selected.status);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2.5">
                    <div className="enforcement-page__dialog-icon">
                      <AlertTriangle size={15} />
                    </div>
                    <span className="enforcement-page__dialog-title">
                      {formatViolationType(selected.violation_type)} — #{selected.id}
                    </span>
                  </DialogTitle>
                </DialogHeader>

                <div className="enforcement-page__status-banner" style={{ background: meta.bg }}>
                  <span className="enforcement-page__detail-label">{t('violations.colStatus')}</span>
                  <span className="enforcement-page__badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
                    {meta.icon}
                    {statusLabel(selected.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div>
                    <div className="enforcement-page__detail-grid">
                      {[
                        { label: t('violations.colDriver'), value: selected.driver_name },
                        { label: t('violations.licenseNo'), value: selected.driver_license },
                        { label: t('violations.colSign'), value: selected.detected_sign_code || selected.detected_class_key },
                        { label: t('violations.colAction'), value: formatObservedAction(selected.observed_action) },
                        { label: t('violations.colLocation'), value: selected.location },
                        { label: t('violations.officer'), value: selected.officer_name || '—' },
                        { label: t('violations.colDate'), value: new Date(selected.violation_date).toLocaleString() },
                      ].map((item) => (
                        <div key={item.label} className="enforcement-page__detail-row">
                          <span className="enforcement-page__detail-label">{item.label}</span>
                          <span className="enforcement-page__detail-value">{item.value || '—'}</span>
                        </div>
                      ))}
                    </div>
                    {selected.description && (
                      <div className="enforcement-page__description-box">
                        <p className="enforcement-page__detail-label">{t('violations.description')}</p>
                        <p className="enforcement-page__cell-body mt-1.5 leading-relaxed">{selected.description}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="enforcement-page__evidence-title">
                      <ImageIcon size={12} className="inline mr-1.5" />
                      {t('violations.evidence')}
                    </p>
                    {selected.evidence_image || selected.plate_evidence_image || selected.vehicle_evidence_image ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selected.evidence_image && (
                          <a href={selected.evidence_image} target="_blank" rel="noreferrer" className="block">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">{t('violations.evidence')}</p>
                            <img src={selected.evidence_image} alt={t('violations.evidence')} className="enforcement-page__evidence-image" />
                          </a>
                        )}
                        {selected.plate_evidence_image && (
                          <a href={selected.plate_evidence_image} target="_blank" rel="noreferrer" className="block">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">{t('violations.plateEvidence')}</p>
                            <img src={selected.plate_evidence_image} alt={t('violations.plateEvidence')} className="enforcement-page__evidence-image" />
                          </a>
                        )}
                        {selected.vehicle_evidence_image && (
                          <a href={selected.vehicle_evidence_image} target="_blank" rel="noreferrer" className="block">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">{t('violations.vehicleEvidence')}</p>
                            <img src={selected.vehicle_evidence_image} alt={t('violations.vehicleEvidence')} className="enforcement-page__evidence-image" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="enforcement-page__evidence-box">{t('violations.noEvidence')}</div>
                    )}
                  </div>
                </div>

                {canManage && (
                  <DialogFooter className="flex flex-wrap gap-2 sm:justify-between mt-2">
                    <div className="flex flex-wrap gap-2">
                      {selected.status === 'confirmed' && !selected.fine_id && (
                        <Button
                          size="sm"
                          className="text-[13px] font-semibold"
                          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
                          onClick={() => openIssueFine(selected)}
                        >
                          <DollarSign size={14} /> {t('violations.issueFine')}
                        </Button>
                      )}
                      {selected.status !== 'confirmed' && (
                        <Button
                          size="sm"
                          className="text-[13px] font-semibold"
                          style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
                          onClick={() => handleStatusUpdate(selected.id, 'confirmed')}
                        >
                          <CheckCircle size={14} /> {t('violations.confirm')}
                        </Button>
                      )}
                      {selected.status !== 'rejected' && (
                        <Button size="sm" variant="outline" className="text-[13px] font-semibold" onClick={() => handleStatusUpdate(selected.id, 'rejected')}>
                          <XCircle size={14} /> {t('violations.reject')}
                        </Button>
                      )}
                    </div>
                    {user?.role === 'admin' && (
                      <Button size="sm" variant="destructive" className="text-[13px] font-semibold" onClick={() => handleDelete(selected.id)}>
                        <Trash2 size={14} /> {t('violations.delete')}
                      </Button>
                    )}
                  </DialogFooter>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Create violation dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetCreateForm(); setCreateOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('violations.createTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="enforcement-page__form-label">{t('violations.driverLicense')} *</Label>
              <div className="flex gap-2 mt-1">
                <input
                  value={createForm.driver_license}
                  onChange={(e) => setCreateForm((p) => ({ ...p, driver_license: e.target.value }))}
                  className="enforcement-page__search flex-1"
                  placeholder="LIC-00001"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => void handleDriverLookup()}>
                  {t('violations.lookupDriver')}
                </Button>
              </div>
              {createForm.driver_name && (
                <p className="text-[12px] text-emerald-600 mt-1">{createForm.driver_name}</p>
              )}
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('violations.ruleLabel')} *</Label>
              <select
                value={createForm.rule_id}
                onChange={(e) => setCreateForm((p) => ({ ...p, rule_id: e.target.value, observed_action: '' }))}
                className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px]"
              >
                <option value="">{t('violations.selectRule')}</option>
                {rules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.sign_class_key} + {formatObservedAction(rule.prohibited_action)} — {rule.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('violations.overrideAction')}</Label>
              <select
                value={createForm.observed_action}
                onChange={(e) => setCreateForm((p) => ({ ...p, observed_action: e.target.value }))}
                className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px]"
              >
                <option value="">{t('violations.useRuleDefault')}</option>
                {OBSERVED_ACTION_VALUES.map((action) => (
                  <option key={action} value={action}>{formatObservedAction(action)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('violations.colSign')}</Label>
              <input
                value={createForm.sign_code}
                onChange={(e) => setCreateForm((p) => ({ ...p, sign_code: e.target.value }))}
                className="enforcement-page__search w-full mt-1"
                placeholder="PW03-R1-01"
              />
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('violations.locationLabel')} *</Label>
              <input
                value={createForm.location}
                onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))}
                className="enforcement-page__search w-full mt-1"
                placeholder={t('violations.locationPlaceholder')}
              />
            </div>
            {evalPreview && (
              <p className={`text-[12px] ${evalPreview.is_violation ? 'text-red-600' : 'text-muted-foreground'}`}>
                {evalPreview.is_violation
                  ? t('violations.previewMatch', { type: formatViolationType(evalPreview.violation_type || '') })
                  : t('violations.previewNoMatch')}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button
              disabled={creating}
              onClick={() => void handleCreateViolation()}
              style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
            >
              {creating ? t('common.saving') : t('violations.createViolation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue fine dialog */}
      <Dialog open={issueFineOpen} onOpenChange={setIssueFineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('violations.issueFineTitle')}</DialogTitle>
          </DialogHeader>
          {fineTarget && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">
                {formatViolationType(fineTarget.violation_type)} — {fineTarget.driver_name}
              </p>
              <div>
                <Label className="enforcement-page__form-label">{t('violations.fineAmount')} *</Label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder={t('fines.amountPlaceholder')}
                  value={fineForm.amount}
                  onChange={(e) => setFineForm((p) => ({ ...p, amount: e.target.value }))}
                  className="enforcement-page__search w-full mt-1"
                />
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('violations.fineReason')} *</Label>
                <textarea
                  value={fineForm.reason}
                  onChange={(e) => setFineForm((p) => ({ ...p, reason: e.target.value }))}
                  className="enforcement-page__search w-full mt-1 min-h-[72px]"
                />
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('violations.locationLabel')}</Label>
                <input
                  value={fineForm.location}
                  onChange={(e) => setFineForm((p) => ({ ...p, location: e.target.value }))}
                  className="enforcement-page__search w-full mt-1"
                />
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('violations.vehiclePlate')}</Label>
                <input
                  value={fineForm.vehicle_plate}
                  onChange={(e) => setFineForm((p) => ({ ...p, vehicle_plate: e.target.value }))}
                  className="enforcement-page__search w-full mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIssueFineOpen(false)}>{t('common.cancel')}</Button>
            <Button
              disabled={issuingFine}
              onClick={() => void handleIssueFine()}
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
            >
              {issuingFine ? t('common.saving') : t('violations.issueFine')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
