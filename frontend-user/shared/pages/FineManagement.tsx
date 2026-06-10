import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Search, Plus, Eye, CheckCircle, XCircle, Clock, AlertTriangle,
  MapPin, FileText, DollarSign, TrendingUp,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { finesAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Fine } from '@shared/types';

const STATUS_STYLE: Record<string, {
  icon: React.ReactNode;
  bg: string;
  color: string;
  gradient: string;
}> = {
  pending: {
    icon: <Clock size={11} />,
    bg: 'rgba(245,158,11,0.1)',
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
  },
  paid: {
    icon: <CheckCircle size={11} />,
    bg: 'rgba(16,185,129,0.1)',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
  },
  overdue: {
    icon: <AlertTriangle size={11} />,
    bg: 'rgba(239,68,68,0.1)',
    color: '#DC2626',
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
  },
  dismissed: {
    icon: <XCircle size={11} />,
    bg: 'rgba(100,116,139,0.1)',
    color: '#475569',
    gradient: 'linear-gradient(135deg, #64748B, #475569)',
  },
};

const VIOLATION_REASONS = [
  { key: 'runningRedLight', value: 'Running Red Light' },
  { key: 'speeding', value: 'Speeding (above limit)' },
  { key: 'noHelmet', value: 'No Helmet (Motorcycle)' },
  { key: 'noSeatbelt', value: 'No Seatbelt' },
  { key: 'illegalParking', value: 'Illegal Parking' },
  { key: 'wrongWay', value: 'Wrong Way on One-Way Street' },
  { key: 'mobilePhone', value: 'Using Mobile Phone While Driving' },
  { key: 'failureToStop', value: 'Failure to Stop at Stop Sign' },
  { key: 'noValidLicense', value: 'No Valid License' },
  { key: 'recklessDriving', value: 'Reckless Driving' },
  { key: 'speedingSchoolZone', value: 'Speeding in School Zone' },
  { key: 'noRegistration', value: 'No Vehicle Registration' },
] as const;

const REASON_VALUE_TO_KEY = Object.fromEntries(
  VIOLATION_REASONS.map((reason) => [reason.value, reason.key]),
) as Record<string, typeof VIOLATION_REASONS[number]['key']>;

const STATUS_TABS = ['all', 'pending', 'paid', 'overdue', 'dismissed'] as const;
type StatusTab = typeof STATUS_TABS[number];

const STAT_CARDS = [
  { key: 'all', labelKey: 'fines.statTotal', icon: FileText, variant: 'blue', filterable: true },
  { key: 'pending', labelKey: 'fines.statPending', icon: Clock, variant: 'amber', filterable: true },
  { key: 'paid', labelKey: 'fines.statPaid', icon: CheckCircle, variant: 'emerald', filterable: true },
  { key: 'revenue', labelKey: 'fines.statRevenue', icon: DollarSign, variant: 'violet', filterable: false },
] as const;

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
}

export function FineManagement() {
  const { t, locale } = useLanguage();
  const dateLocale = locale === 'km' ? 'km-KH' : 'en-US';
  const statusLabel = (s: string) => t(`fines.status.${s}`);

  const formatFineReason = (reason: string) => {
    if (!reason) return '—';
    const reasonKey = REASON_VALUE_TO_KEY[reason];
    if (reasonKey) {
      const translated = t(`fines.reasons.${reasonKey}`);
      if (translated !== `fines.reasons.${reasonKey}`) return translated;
    }
    return reason;
  };
  const getStatusMeta = (status: string) => {
    const base = STATUS_STYLE[status] ?? STATUS_STYLE.dismissed;
    return { ...base, label: statusLabel(status) };
  };
  const { user } = useAuth();
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [selected, setSelected] = useState<Fine | null>(null);
  const [issueFineOpen, setIssueFineOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [fineForm, setFineForm] = useState({
    driver_license: '', vehicle_plate: '', reason: '', amount: '', location: '',
  });
  const [searchResult, setSearchResult] = useState<{ driver: { id: number; full_name: string } | null }>({ driver: null });

  const canIssue = user?.role === 'admin' || user?.role === 'police';
  const canManage = canIssue;

  const loadFines = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      let data: Fine[];
      if (user.role === 'admin') data = await finesAPI.getAll();
      else if (user.role === 'police') data = await finesAPI.getByPolice(user.id);
      else data = await finesAPI.getByDriver(user.id);
      setFines(data);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadFines(); }, [loadFines]);
  useLiveData(() => loadFines(true), 30_000, Boolean(user));

  const filtered = useMemo(() => {
    let rows = [...fines];
    if (statusFilter !== 'all') rows = rows.filter((f) => f.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((f) =>
        f.driver_name.toLowerCase().includes(q)
        || f.driver_license.toLowerCase().includes(q)
        || f.vehicle_plate.toLowerCase().includes(q)
        || f.reason.toLowerCase().includes(q)
        || f.location.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [fines, search, statusFilter]);

  const counts = useMemo(() => ({
    all: fines.length,
    pending: fines.filter((f) => f.status === 'pending').length,
    paid: fines.filter((f) => f.status === 'paid').length,
    overdue: fines.filter((f) => f.status === 'overdue').length,
    dismissed: fines.filter((f) => f.status === 'dismissed').length,
  }), [fines]);

  const totalRevenue = useMemo(
    () => fines.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0),
    [fines],
  );

  const handleStatusUpdate = async (id: number, status: Fine['status']) => {
    try {
      const updated = await finesAPI.updateStatus(id, status);
      setFines((prev) => prev.map((f) => (f.id === id ? updated : f)));
      if (selected?.id === id) setSelected(updated);
      toast.success(t('fines.toastStatusUpdated', { status: statusLabel(status) }));
    } catch {
      toast.error(t('fines.toastStatusFail'));
    }
  };

  const handleLookup = async () => {
    const r = await finesAPI.searchByLicense(fineForm.driver_license);
    if (r.driver) {
      setSearchResult({ driver: { id: r.driver.id, full_name: r.driver.full_name } });
      toast.success(t('fines.foundDriver', { name: r.driver.full_name }));
    } else {
      setSearchResult({ driver: null });
      toast.error(t('fines.toastDriverNotFound'));
    }
  };

  const handleIssueFine = async () => {
    if (!user || !searchResult.driver || !fineForm.reason || !fineForm.amount || !fineForm.location) {
      toast.error(t('fines.toastFillRequired'));
      return;
    }
    setIssuing(true);
    try {
      await finesAPI.create({
        driver_id: searchResult.driver.id,
        police_id: user.id,
        vehicle_plate: fineForm.vehicle_plate,
        reason: fineForm.reason,
        amount: parseFloat(fineForm.amount),
        location: fineForm.location,
      });
      toast.success(t('fines.toastIssued'));
      setIssueFineOpen(false);
      setFineForm({ driver_license: '', vehicle_plate: '', reason: '', amount: '', location: '' });
      setSearchResult({ driver: null });
      loadFines();
    } catch {
      toast.error(t('fines.toastIssueFail'));
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="enforcement-page enforcement-page--fines dashboard-page--fines">
      {/* Hero */}
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <FileText size={14} />
              </span>
              {t('pages.fines.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.fines.title')}</h1>
            <p className="enforcement-page__subtitle">
              {user?.role === 'driver' ? t('pages.fines.subtitleDriver') : t('pages.fines.subtitleAdmin')}
            </p>
          </div>
          {canIssue && (
            <button type="button" className="enforcement-page__hero-btn" onClick={() => setIssueFineOpen(true)}>
              <Plus size={16} /> {t('fines.issueFine')}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = card.key === 'revenue'
            ? `$${totalRevenue.toLocaleString()}`
            : counts[card.key as keyof typeof counts];
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
              onClick={() => setStatusFilter(card.key as StatusTab)}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant}${active ? ' enforcement-page__stat-card--active' : ''}`}
            >
              {inner}
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
              placeholder={t('fines.searchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="enforcement-page__panel enforcement-page__panel--fines">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {[
                  t('fines.colDriver'),
                  t('fines.colVehicle'),
                  t('fines.colViolation'),
                  t('fines.colAmount'),
                  t('fines.colDate'),
                  t('fines.colStatus'),
                  t('fines.colActions'),
                ].map((h) => (
                  <TableHead key={h} className="enforcement-page__th text-center">{h}</TableHead>
                ))}
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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="enforcement-page__empty-icon enforcement-page__empty-icon--blue">
                        <FileText size={28} />
                      </div>
                      <div>
                        <p className="enforcement-page__empty-title">{t('fines.empty')}</p>
                        <p className="enforcement-page__empty-subtitle">{t('fines.emptyHint')}</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((row) => {
                const st = getStatusMeta(row.status);
                return (
                  <TableRow key={row.id} className="enforcement-page__table-row">
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="enforcement-page__avatar enforcement-page__avatar--driver">
                          {initials(row.driver_name)}
                        </div>
                        <div>
                          <p className="enforcement-page__cell-primary">{row.driver_name}</p>
                          <p className="enforcement-page__cell-mono">{row.driver_license}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__code-pill">{row.vehicle_plate}</span>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <p className="enforcement-page__cell-primary truncate" title={formatFineReason(row.reason)}>{formatFineReason(row.reason)}</p>
                      <p className="enforcement-page__location-meta">
                        <MapPin size={9} /> {row.location}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__amount">${row.amount.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__cell-secondary">
                        {new Date(row.created_at).toLocaleDateString(dateLocale)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__badge" style={{ background: st.bg, color: st.color }}>
                        {st.icon}{st.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="enforcement-page__table-actions">
                        <button type="button" className="enforcement-page__action-btn" onClick={() => setSelected(row)}>
                          <Eye size={12} /> {t('fines.view')}
                        </button>
                        {canManage && row.status === 'pending' && (
                          <button
                            type="button"
                            className="enforcement-page__action-btn enforcement-page__action-btn--success"
                            onClick={() => handleStatusUpdate(row.id, 'paid')}
                          >
                            {t('fines.markPaid')}
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && (
          <div className="enforcement-page__footer">
            <p className="enforcement-page__footer-text">
              {t('fines.showing', { shown: filtered.length, total: fines.length })}
            </p>
            <p className="enforcement-page__revenue">
              <TrendingUp size={13} className="enforcement-page__revenue-icon" />
              {t('fines.revenueCollected', { amount: `$${totalRevenue.toLocaleString()}` })}
            </p>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (() => {
            const st = getStatusMeta(selected.status);
            const detailRows = [
              { label: t('fines.colDriver'), value: selected.driver_name },
              { label: t('fines.licenseNo'), value: selected.driver_license },
              { label: t('fines.vehiclePlate'), value: selected.vehicle_plate },
              { label: t('fines.issuedBy'), value: selected.police_name },
              { label: t('fines.colViolation'), value: formatFineReason(selected.reason) },
              { label: t('fines.colAmount'), value: `$${selected.amount} USD` },
              { label: t('fines.location'), value: selected.location },
              { label: t('fines.dateIssued'), value: new Date(selected.created_at).toLocaleString(dateLocale) },
              ...(selected.paid_at
                ? [{ label: t('fines.datePaid'), value: new Date(selected.paid_at).toLocaleString(dateLocale) }]
                : []),
            ];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2.5">
                    <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--primary">
                      <FileText size={15} />
                    </div>
                    <span className="enforcement-page__dialog-title">
                      {t('fines.fineDetails')} — #{selected.id}
                    </span>
                  </DialogTitle>
                </DialogHeader>

                <div className="enforcement-page__status-banner" style={{ background: st.bg }}>
                  <span className="enforcement-page__detail-label">{t('fines.currentStatus')}</span>
                  <span
                    className="enforcement-page__badge"
                    style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}30` }}
                  >
                    {st.icon}{st.label}
                  </span>
                </div>

                <div className="enforcement-page__detail-grid">
                  {detailRows.map((item) => (
                    <div key={item.label} className="enforcement-page__detail-row">
                      <span className="enforcement-page__detail-label">{item.label}</span>
                      <span className="enforcement-page__detail-value">{item.value}</span>
                    </div>
                  ))}
                </div>

                {canManage && selected.status !== 'paid' && selected.status !== 'dismissed' && (
                  <div className="enforcement-page__dialog-actions">
                    <button type="button" className="enforcement-page__btn-success" onClick={() => handleStatusUpdate(selected.id, 'paid')}>
                      <CheckCircle size={14} /> {t('fines.markPaidDialog')}
                    </button>
                    <button type="button" className="enforcement-page__btn-outline" onClick={() => handleStatusUpdate(selected.id, 'dismissed')}>
                      <XCircle size={14} /> {t('fines.dismiss')}
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Issue fine dialog */}
      <Dialog open={issueFineOpen} onOpenChange={setIssueFineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--brand">
                <Plus size={15} />
              </div>
              <span className="enforcement-page__dialog-title">{t('fines.issueNewFine')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="enforcement-page__form-label">
                {t('fines.driverLicense')} *{' '}
                <span className="enforcement-page__form-hint">{t('fines.lookupRequired')}</span>
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder={t('fines.licensePlaceholder')}
                  value={fineForm.driver_license}
                  onChange={(e) => setFineForm((f) => ({ ...f, driver_license: e.target.value }))}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={handleLookup}>{t('fines.lookup')}</Button>
              </div>
              {searchResult.driver && (
                <p className="enforcement-page__form-success">✓ {searchResult.driver.full_name}</p>
              )}
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('fines.vehiclePlateLabel')}</Label>
              <Input
                className="mt-1"
                placeholder={t('fines.platePlaceholder')}
                value={fineForm.vehicle_plate}
                onChange={(e) => setFineForm((f) => ({ ...f, vehicle_plate: e.target.value }))}
              />
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('fines.violationLabel')} *</Label>
              <Select onValueChange={(v) => setFineForm((f) => ({ ...f, reason: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t('fines.selectViolation')} /></SelectTrigger>
                <SelectContent>
                  {VIOLATION_REASONS.map((reason) => (
                    <SelectItem key={reason.key} value={reason.value}>
                      {t(`fines.reasons.${reason.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="enforcement-page__form-label">{t('fines.amountLabel')} *</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="5"
                  placeholder={t('fines.amountPlaceholder')}
                  value={fineForm.amount}
                  onChange={(e) => setFineForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('fines.locationLabel')} *</Label>
                <Input
                  className="mt-1"
                  placeholder={t('fines.locationPlaceholder')}
                  value={fineForm.location}
                  onChange={(e) => setFineForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueFineOpen(false)}>{t('fines.cancel')}</Button>
            <button type="button" className="enforcement-page__btn-primary" onClick={handleIssueFine} disabled={issuing}>
              {issuing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t('fines.issuing')}
                </>
              ) : (
                <>
                  <Plus size={14} /> {t('fines.issueFine')}
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
