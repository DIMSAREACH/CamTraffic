import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import {
  Car, CheckCircle, Clock, Link2, Plus, Search, AlertTriangle, DollarSign,
  Eye, Camera, Sparkles, FileText, Hash, Activity,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Switch } from '@shared/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { FieldError, FormErrorBanner } from '@shared/components/ui/FieldError';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { useFieldErrors } from '@shared/hooks/useFieldErrors';
import { khrToUsd, usdToKhr } from '@shared/i18n/localeFormat';
import {
  driversAPI, finesAPI, unknownVehiclesAPI, vehiclesAPI, violationsAPI,
} from '@shared/services/api';
import { toast } from 'sonner';
import type { DriverProfile, UnknownVehicleRecord, Vehicle } from '@shared/types';

type StatusFilter = 'all' | 'pending' | 'resolved';
type ResolveMode = 'link' | 'register';

const STATUS_STYLE: Record<Exclude<StatusFilter, 'all'>, { gradient: string }> = {
  pending: { gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  resolved: { gradient: 'linear-gradient(135deg, #10B981, #059669)' },
};

const STAT_CARDS = [
  { key: 'all', labelKey: 'unknown.statTotal', icon: Car, variant: 'teal', filterable: true as const },
  { key: 'pending', labelKey: 'unknown.statPending', icon: Clock, variant: 'amber', filterable: true as const },
  { key: 'resolved', labelKey: 'unknown.statResolved', icon: CheckCircle, variant: 'emerald', filterable: true as const },
  { key: 'linked', labelKey: 'unknown.statLinked', icon: Link2, variant: 'blue', filterable: false as const },
] as const;

function formatConfidence(score: number | null | undefined): string {
  if (score == null || Number.isNaN(Number(score))) return '—';
  const n = Number(score);
  const pct = n <= 1 ? Math.round(n * 100) : Math.round(n);
  return `${pct}%`;
}

export function UnknownVehiclesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin' || user?.role === 'police';
  const [rows, setRows] = useState<UnknownVehicleRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [resolveTarget, setResolveTarget] = useState<UnknownVehicleRecord | null>(null);
  const [viewRow, setViewRow] = useState<UnknownVehicleRecord | null>(null);
  const [note, setNote] = useState('');
  const [linkedPlate, setLinkedPlate] = useState('');
  const [resolveMode, setResolveMode] = useState<ResolveMode>('link');
  const [createViolation, setCreateViolation] = useState(true);
  const [ownerUserId, setOwnerUserId] = useState('');
  const [vehicleType, setVehicleType] = useState<Vehicle['vehicle_type']>('motorcycle');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [resolving, setResolving] = useState(false);
  const [fineTarget, setFineTarget] = useState<{ violationId: string; plate: string } | null>(null);
  const [fineAmount, setFineAmount] = useState(String(usdToKhr(15)));
  const [issuingFine, setIssuingFine] = useState(false);
  const resolveErrors = useFieldErrors<'link' | 'owner'>();

  const load = useCallback(async (silent = false) => {
    if (!canManage) return;
    if (!silent) setLoading(true);
    try {
      const [unknownRows, driverRows] = await Promise.all([
        unknownVehiclesAPI.getAll(),
        driversAPI.getAll().catch(() => [] as DriverProfile[]),
      ]);
      setRows(unknownRows);
      setDrivers(driverRows.filter((d) => d.status === 'active'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canManage]);

  useEffect(() => { load(); }, [load]);
  useLiveData(() => load(true), 30_000, canManage);

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r) => !r.is_resolved).length,
    resolved: rows.filter((r) => r.is_resolved).length,
    linked: rows.filter((r) => r.linked_vehicle_plate).length,
  }), [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (statusFilter === 'pending') list = list.filter((r) => !r.is_resolved);
    if (statusFilter === 'resolved') list = list.filter((r) => r.is_resolved);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.plate_detected.toLowerCase().includes(q)
        || (r.camera_name || '').toLowerCase().includes(q)
        || (r.linked_vehicle_plate || '').toLowerCase().includes(q)
        || (r.violation_type || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, search, statusFilter]);

  const pagination = usePagination(filtered);

  const statusFilters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: t('unknown.filterAll'), count: counts.all },
    { id: 'pending', label: t('unknown.pending'), count: counts.pending },
    { id: 'resolved', label: t('unknown.resolved'), count: counts.resolved },
  ];

  const openResolve = (row: UnknownVehicleRecord) => {
    setResolveTarget(row);
    setNote('');
    setLinkedPlate(row.plate_detected || '');
    setResolveMode('link');
    setCreateViolation(true);
    setOwnerUserId('');
    setVehicleType('motorcycle');
    setVehicleModel('');
    setVehicleColor('');
    resolveErrors.clearErrors();
  };

  const handleResolve = async () => {
    if (!resolveTarget) return;
    resolveErrors.clearErrors();

    setResolving(true);
    try {
      let linked_vehicle_id: string | undefined;

      if (resolveMode === 'link') {
        if (!linkedPlate.trim()) {
          resolveErrors.setErrors({ link: t('common.fieldRequired') });
          toast.error(t('common.formIncomplete'));
          return;
        }
        const vehicle = await vehiclesAPI.searchByPlate(linkedPlate.trim());
        if (!vehicle) {
          resolveErrors.setErrors({ link: t('unknown.linkNotFound') });
          toast.error(t('unknown.linkNotFound'));
          return;
        }
        linked_vehicle_id = String(vehicle.id);
      } else {
        if (!ownerUserId) {
          resolveErrors.setErrors({ owner: t('common.lookupRequired') });
          toast.error(t('common.formIncomplete'));
          return;
        }
        const plate = (linkedPlate.trim() || resolveTarget.plate_detected).toUpperCase();
        const created = await vehiclesAPI.create({
          owner_id: ownerUserId,
          plate_number: plate,
          vehicle_type: vehicleType,
          model: vehicleModel.trim() || 'Unknown',
          color: vehicleColor.trim() || 'Unknown',
          year: new Date().getFullYear(),
        });
        linked_vehicle_id = String(created.id);
      }

      const result = await unknownVehiclesAPI.resolve(resolveTarget.id, {
        officer_note: note,
        linked_vehicle_id,
        create_violation: createViolation,
      });

      const violationId = result.created_violation_id || result.linked_violation_id || result.linked_violation;
      toast.success(
        createViolation && violationId
          ? t('unknown.toastResolvedWithViolation')
          : t('unknown.toastResolved'),
      );
      setResolveTarget(null);

      if (createViolation && violationId) {
        setFineTarget({ violationId: String(violationId), plate: resolveTarget.plate_detected });
        try {
          const rules = await violationsAPI.getRules();
          const match = (rules || []).find((r) =>
            String(r.violation_type || '').toUpperCase() === String(resolveTarget.violation_type || 'NO_ENTRY').toUpperCase()
            || String(r.sign_class_key || '').toUpperCase() === String(resolveTarget.detected_class_key || 'NO_ENTRY').toUpperCase(),
          );
          if (match) setFineAmount(String(usdToKhr(Number(match.default_fine_amount) || 15)));
        } catch {
          /* keep default */
        }
      }
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('unknown.toastResolveFail'));
    } finally {
      setResolving(false);
    }
  };

  const handleIssueFine = async () => {
    if (!fineTarget) return;
    const amount = parseFloat(fineAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('common.fieldRequired'));
      return;
    }
    setIssuingFine(true);
    try {
      await finesAPI.create({
        violation_id: fineTarget.violationId,
        amount: khrToUsd(amount),
        reason: `No Entry / wrong-way enforcement · ${fineTarget.plate}`,
        vehicle_plate: fineTarget.plate,
        location: '',
      });
      toast.success(t('unknown.toastFineIssued'));
      setFineTarget(null);
      navigate('/admin/fines');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('unknown.toastFineFail'));
    } finally {
      setIssuingFine(false);
    }
  };

  if (!canManage) {
    return <div className="enforcement-page p-8">{t('unknown.officerOnly')}</div>;
  }

  const tableHeaders = [
    t('unknown.colPlate'),
    t('unknown.colViolation'),
    t('unknown.colCamera'),
    t('unknown.colDetected'),
    t('unknown.colStatus'),
    t('unknown.colActions'),
  ];

  return (
    <div className="enforcement-page enforcement-page--unknown dashboard-page--vehicles">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Car size={14} />
              </span>
              {t('pages.unknown.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.unknown.title')}</h1>
            <p className="enforcement-page__subtitle">
              {t('unknown.flowHint')}
            </p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = counts[card.key as keyof typeof counts];
          const active = card.filterable && statusFilter === card.key;
          const inner = (
            <>
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.variant}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{value}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.variant}`}>
                  {t(card.labelKey)}
                </p>
              </div>
            </>
          );
          if (!card.filterable) {
            return (
              <div key={card.key} className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant}`}>
                {inner}
              </div>
            );
          }
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(card.key as StatusFilter)}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant}${active ? ' enforcement-page__stat-card--active' : ''}`}
            >
              {inner}
            </button>
          );
        })}
      </div>

      <div className="enforcement-page__toolbar">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="enforcement-page__filters">
            {statusFilters.map(({ id, label, count }) => {
              const active = statusFilter === id;
              const meta = id !== 'all' ? STATUS_STYLE[id] : null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={`enforcement-page__filter-btn${active ? ' enforcement-page__filter-btn--active' : ''}`}
                  style={active ? { background: meta?.gradient ?? 'linear-gradient(135deg, #0F172A, #1E293B)' } : undefined}
                >
                  {label}
                  <span className={`enforcement-page__filter-count${active ? ' enforcement-page__filter-count--active' : ''}`}>
                    {count}
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
              placeholder={t('unknown.searchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--vehicles">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {tableHeaders.map((h) => (
                  <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(tableHeaders.length)].map((__, j) => (
                      <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pagination.pageItems.length === 0 ? (
                <TableEmptyState
                  colSpan={tableHeaders.length}
                  tone="teal"
                  icon={<Car size={28} />}
                  title={t('unknown.empty')}
                  subtitle={t('unknown.emptyHint')}
                />
              ) : pagination.pageItems.map((row) => (
                <TableRow key={row.id} className="enforcement-page__table-row">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {row.evidence_photo ? (
                        <img
                          src={row.evidence_photo}
                          alt=""
                          className="h-9 w-9 rounded-md object-cover border border-slate-200"
                        />
                      ) : null}
                      <span className="enforcement-page__code-pill unknown-page__plate">{row.plate_detected}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="enforcement-page__cell-primary">
                      {row.violation_type || '—'}
                    </p>
                    {row.observed_action ? (
                      <p className="enforcement-page__cell-secondary">{row.observed_action}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <p className="enforcement-page__cell-primary">{row.camera_name || '—'}</p>
                  </TableCell>
                  <TableCell className="unknown-page__time">{new Date(row.detected_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {row.is_resolved ? (
                      <span className="enforcement-page__badge unknown-page__badge--resolved">
                        <CheckCircle size={11} />{t('unknown.resolved')}
                      </span>
                    ) : (
                      <span className="enforcement-page__badge unknown-page__badge--pending">
                        <Clock size={11} />{t('unknown.pending')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="vehicles-page__actions">
                      <CrudRowActions onView={() => setViewRow(row)} />
                      {!row.is_resolved && (
                        <button
                          type="button"
                          className="vehicles-page__action-btn vehicles-page__action-btn--edit"
                          onClick={() => openResolve(row)}
                          aria-label={t('unknown.resolve')}
                        >
                          <CheckCircle size={13} />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.unknown" />
      </div>

      <Dialog open={!!viewRow} onOpenChange={(open) => !open && setViewRow(null)}>
        <DialogContent
          accent="teal"
          accessibleTitle={t('unknown.viewTitle')}
          className="unknown-view-dialog max-w-3xl sm:max-w-3xl p-0 gap-0 overflow-hidden"
        >
          {viewRow ? (
            <div className="unknown-view-dialog__shell">
              <div className="unknown-view-dialog__topbar">
                <div className="unknown-view-dialog__topbar-left">
                  <div className="unknown-view-dialog__header-icon">
                    <Eye size={18} aria-hidden />
                  </div>
                  <div className="unknown-view-dialog__header-copy">
                    <h2 className="unknown-view-dialog__header-title">{t('unknown.viewTitle')}</h2>
                    <p className="unknown-view-dialog__header-meta">
                      {new Date(viewRow.detected_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`unknown-view-dialog__status-badge ${
                    viewRow.is_resolved
                      ? 'unknown-view-dialog__status-badge--resolved'
                      : 'unknown-view-dialog__status-badge--pending'
                  }`}
                >
                  {viewRow.is_resolved ? <CheckCircle size={13} aria-hidden /> : <Clock size={13} aria-hidden />}
                  {viewRow.is_resolved ? t('unknown.resolved') : t('unknown.pending')}
                </span>
              </div>

              <div className="unknown-view-dialog__layout">
                <aside className="unknown-view-dialog__media">
                  <div className="unknown-view-dialog__hero">
                    {viewRow.evidence_photo ? (
                      <img
                        src={viewRow.evidence_photo}
                        alt={viewRow.plate_detected}
                        className="unknown-view-dialog__hero-photo"
                      />
                    ) : (
                      <div className="unknown-view-dialog__hero-empty">
                        <Car size={36} aria-hidden />
                        <span>{t('unknown.colPlate')}</span>
                      </div>
                    )}
                  </div>
                  <div className="unknown-view-dialog__plate">
                    <span className="unknown-view-dialog__plate-label">{t('unknown.colPlate')}</span>
                    <span className="unknown-view-dialog__plate-value">{viewRow.plate_detected || '—'}</span>
                  </div>
                </aside>

                <section className="unknown-view-dialog__info">
                  <div className="unknown-view-dialog__cards">
                    <div className="unknown-view-dialog__card unknown-view-dialog__card--violation">
                      <div className="unknown-view-dialog__card-icon unknown-view-dialog__card-icon--violation">
                        <AlertTriangle size={15} aria-hidden />
                      </div>
                      <div className="unknown-view-dialog__card-copy">
                        <span className="unknown-view-dialog__card-label">{t('unknown.colViolation')}</span>
                        <span className="unknown-view-dialog__card-value">
                          {(viewRow.violation_type || '—').replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="unknown-view-dialog__card unknown-view-dialog__card--action">
                      <div className="unknown-view-dialog__card-icon unknown-view-dialog__card-icon--action">
                        <Activity size={15} aria-hidden />
                      </div>
                      <div className="unknown-view-dialog__card-copy">
                        <span className="unknown-view-dialog__card-label">{t('unknown.colAction')}</span>
                        <span className="unknown-view-dialog__card-value">{viewRow.observed_action || '—'}</span>
                      </div>
                    </div>

                    <div className="unknown-view-dialog__card unknown-view-dialog__card--camera">
                      <div className="unknown-view-dialog__card-icon unknown-view-dialog__card-icon--camera">
                        <Camera size={15} aria-hidden />
                      </div>
                      <div className="unknown-view-dialog__card-copy">
                        <span className="unknown-view-dialog__card-label">{t('unknown.colCamera')}</span>
                        <span className="unknown-view-dialog__card-value">{viewRow.camera_name || '—'}</span>
                      </div>
                    </div>

                    <div className="unknown-view-dialog__card unknown-view-dialog__card--detected">
                      <div className="unknown-view-dialog__card-icon unknown-view-dialog__card-icon--detected">
                        <Clock size={15} aria-hidden />
                      </div>
                      <div className="unknown-view-dialog__card-copy">
                        <span className="unknown-view-dialog__card-label">{t('unknown.colDetected')}</span>
                        <span className="unknown-view-dialog__card-value">
                          {new Date(viewRow.detected_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="unknown-view-dialog__card unknown-view-dialog__card--confidence">
                      <div className="unknown-view-dialog__card-icon unknown-view-dialog__card-icon--confidence">
                        <Sparkles size={15} aria-hidden />
                      </div>
                      <div className="unknown-view-dialog__card-copy">
                        <span className="unknown-view-dialog__card-label">{t('unknown.confidence')}</span>
                        <span className="unknown-view-dialog__card-value unknown-view-dialog__card-value--accent">
                          {formatConfidence(viewRow.ai_confidence_score)}
                        </span>
                      </div>
                    </div>

                    {viewRow.linked_vehicle_plate ? (
                      <div className="unknown-view-dialog__card unknown-view-dialog__card--linked">
                        <div className="unknown-view-dialog__card-icon unknown-view-dialog__card-icon--linked">
                          <Link2 size={15} aria-hidden />
                        </div>
                        <div className="unknown-view-dialog__card-copy">
                          <span className="unknown-view-dialog__card-label">{t('unknown.linkedVehicle')}</span>
                          <span className="unknown-view-dialog__card-value unknown-view-dialog__card-value--mono">
                            {viewRow.linked_vehicle_plate}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {viewRow.linked_violation_id || viewRow.linked_violation ? (
                      <div className="unknown-view-dialog__card unknown-view-dialog__card--linked">
                        <div className="unknown-view-dialog__card-icon unknown-view-dialog__card-icon--linked">
                          <Hash size={15} aria-hidden />
                        </div>
                        <div className="unknown-view-dialog__card-copy">
                          <span className="unknown-view-dialog__card-label">{t('unknown.linkedViolation')}</span>
                          <span className="unknown-view-dialog__card-value unknown-view-dialog__card-value--mono">
                            {String(viewRow.linked_violation_id || viewRow.linked_violation)}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {viewRow.officer_note ? (
                      <div className="unknown-view-dialog__card unknown-view-dialog__card--note unknown-view-dialog__card--wide">
                        <div className="unknown-view-dialog__card-icon unknown-view-dialog__card-icon--note">
                          <FileText size={15} aria-hidden />
                        </div>
                        <div className="unknown-view-dialog__card-copy">
                          <span className="unknown-view-dialog__card-label">{t('unknown.officerNote')}</span>
                          <span className="unknown-view-dialog__card-value">{viewRow.officer_note}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>

              <div className="unknown-view-dialog__footer">
                <Button
                  variant="outline"
                  className="unknown-view-dialog__close-btn"
                  onClick={() => setViewRow(null)}
                >
                  {t('common.close')}
                </Button>
                {!viewRow.is_resolved ? (
                  <Button
                    className="unknown-view-dialog__resolve-btn"
                    onClick={() => {
                      const row = viewRow;
                      setViewRow(null);
                      openResolve(row);
                    }}
                  >
                    <CheckCircle size={14} aria-hidden />
                    {t('unknown.resolve')}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <DialogContent accent="teal" className="ct-form-dialog max-w-lg sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="users-page__dialog-header">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--teal">
                <AlertTriangle size={15} aria-hidden />
              </div>
              <span className="enforcement-page__dialog-title">{t('unknown.resolveTitle')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="ct-dialog-form space-y-3">
            <FormErrorBanner message={resolveErrors.hasErrors ? t('common.formIncomplete') : null} />
            <p className="text-sm text-muted-foreground">
              {t('unknown.resolveIntro').replace('{plate}', resolveTarget?.plate_detected || '')}
              {resolveTarget?.violation_type ? ` · ${resolveTarget.violation_type}` : ''}
            </p>
            {resolveTarget?.evidence_photo ? (
              <img
                src={resolveTarget.evidence_photo}
                alt=""
                className="h-28 w-full rounded-md object-cover border border-slate-200"
              />
            ) : null}

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={resolveMode === 'link' ? 'default' : 'outline'}
                onClick={() => setResolveMode('link')}
              >
                <Link2 size={14} /> {t('unknown.modeLink')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={resolveMode === 'register' ? 'default' : 'outline'}
                onClick={() => setResolveMode('register')}
              >
                <Plus size={14} /> {t('unknown.modeRegister')}
              </Button>
            </div>

            {resolveMode === 'link' ? (
              <div className="ct-dialog-field">
                <Label>{t('unknown.linkVehicle')} *</Label>
                <Input
                  className={resolveErrors.errors.link ? 'ct-field--invalid' : undefined}
                  value={linkedPlate}
                  onChange={(e) => {
                    setLinkedPlate(e.target.value);
                    resolveErrors.clearField('link');
                  }}
                  placeholder={resolveTarget?.plate_detected || ''}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('unknown.linkVehicleHint')}</p>
                <FieldError message={resolveErrors.errors.link} />
              </div>
            ) : (
              <>
                <div className="ct-dialog-field">
                  <Label>{t('unknown.registerPlate')}</Label>
                  <Input
                    value={linkedPlate || resolveTarget?.plate_detected || ''}
                    onChange={(e) => setLinkedPlate(e.target.value)}
                  />
                </div>
                <div className="ct-dialog-field">
                  <Label>{t('unknown.selectDriver')} *</Label>
                  <Select value={ownerUserId} onValueChange={(v) => { setOwnerUserId(v); resolveErrors.clearField('owner'); }}>
                    <SelectTrigger className={resolveErrors.errors.owner ? 'ct-field--invalid' : undefined}>
                      <SelectValue placeholder={t('unknown.selectDriverPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.user_id}>
                          {d.full_name} · {d.license_no}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={resolveErrors.errors.owner} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="ct-dialog-field">
                    <Label>{t('vehicles.colType')}</Label>
                    <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as Vehicle['vehicle_type'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="motorcycle">Motorcycle</SelectItem>
                        <SelectItem value="car">Car</SelectItem>
                        <SelectItem value="tuk-tuk">Tuk-tuk</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="bus">Bus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="ct-dialog-field">
                    <Label>{t('vehicles.colColor')}</Label>
                    <Input value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} placeholder="Red" />
                  </div>
                </div>
                <div className="ct-dialog-field">
                  <Label>{t('vehicles.colModel')}</Label>
                  <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Honda Wave" />
                </div>
              </>
            )}

            <div className="ct-dialog-field">
              <Label>{t('unknown.officerNote')}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <label className="rule-popup__toggle flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <div>
                <span className="text-sm font-semibold">{t('unknown.createViolation')}</span>
                <p className="text-xs text-muted-foreground">{t('unknown.createViolationHint')}</p>
              </div>
              <Switch checked={createViolation} onCheckedChange={setCreateViolation} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>{t('profile.cancel')}</Button>
            <Button onClick={() => void handleResolve()} disabled={resolving}>
              {resolving ? t('common.saving') : t('unknown.resolveAndContinue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fineTarget} onOpenChange={(open) => !open && setFineTarget(null)}>
        <DialogContent accent="amber" className="ct-form-dialog max-w-md">
          <DialogHeader>
            <DialogTitle className="users-page__dialog-header">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--amber">
                <DollarSign size={15} aria-hidden />
              </div>
              <span className="enforcement-page__dialog-title">{t('unknown.issueFineTitle')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('unknown.issueFineHint')}</p>
            <div>
              <Label>{t('fines.amountKhr') !== 'fines.amountKhr' ? t('fines.amountKhr') : 'Fine amount (KHR)'}</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                step={100}
                value={fineAmount}
                onChange={(e) => setFineAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFineTarget(null); navigate('/admin/violations'); }}>
              {t('unknown.skipFine')}
            </Button>
            <Button onClick={() => void handleIssueFine()} disabled={issuingFine}>
              <DollarSign size={14} /> {issuingFine ? t('common.saving') : t('violations.issueFine')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
