import { useEffect, useMemo, useState, useCallback } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import {
  Search, Plus, Eye, CheckCircle, XCircle, Clock, AlertTriangle,
  MapPin, FileText, User, Hash, Car, BadgeCheck, CreditCard, Pencil, Trash2,
} from 'lucide-react';
import { RielIcon } from '@shared/components/RielIcon';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppCurrency, khrToUsd, usdToKhr } from '@shared/i18n/localeFormat';
import { useLiveData } from '@shared/hooks/useLiveData';
import { finesAPI } from '@shared/services/api';
import { FinesTabs } from '@shared/components/fines/FinesTabs';
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
  disputed: {
    icon: <AlertTriangle size={11} />,
    bg: 'rgba(139,92,246,0.1)',
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
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
  { key: 'revenue', labelKey: 'fines.statRevenue', icon: RielIcon, variant: 'violet', filterable: false },
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
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentModes, setPaymentModes] = useState<string[]>(['manual']);
  const [khqrSession, setKhqrSession] = useState<{
    bill_reference: string;
    instructions_en: string;
    amount_usd: string;
    merchant_name: string;
    merchant_account_usd?: string;
    merchant_account_khr?: string;
    qr_image_url: string;
  } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'aba',
    payment_reference: '',
    screenshot: null as File | null,
  });
  const [issuing, setIssuing] = useState(false);
  const [fineForm, setFineForm] = useState({
    driver_license: '', vehicle_plate: '', reason: '', amount: '', location: '',
  });
  const [searchResult, setSearchResult] = useState<{ driver: { id: string; full_name: string } | null }>({ driver: null });
  const [editFine, setEditFine] = useState<Fine | null>(null);
  const [deleteFine, setDeleteFine] = useState<Fine | null>(null);
  const [editForm, setEditForm] = useState({ reason: '', amount: '', location: '', vehicle_plate: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const canIssue = user?.role === 'admin' || user?.role === 'police';
  const canManage = canIssue;
  const isDriver = user?.role === 'driver';
  const isAdmin = user?.role === 'admin';

  const canEditFine = (row: Fine) => canManage && ['pending', 'overdue', 'disputed'].includes(row.status);
  const canDeleteFine = (row: Fine) => isAdmin && row.status !== 'paid';

  const loadFines = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      let data: Fine[];
      if (user.role === 'admin') data = await finesAPI.getAll();
      else if (user.role === 'police') data = await finesAPI.getByPolice(user.id);
      else data = await finesAPI.getByDriver(user.id);
      setFines(data.map((f) => {
        const n = typeof f.amount === 'number' ? f.amount : Number(f.amount);
        return { ...f, amount: Number.isFinite(n) ? n : 0 };
      }));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadFines(); }, [loadFines]);
  useLiveData(() => loadFines(true), 30_000, Boolean(user));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') {
      toast.success(t('fines.toastPaid') !== 'fines.toastPaid' ? t('fines.toastPaid') : 'Payment completed');
      params.delete('paid');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', next);
      void loadFines(true);
    } else if (params.get('cancel') === '1') {
      toast.message(t('fines.toastPaymentCancel') !== 'fines.toastPaymentCancel' ? t('fines.toastPaymentCancel') : 'Payment cancelled');
      params.delete('cancel');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, [loadFines, t]);

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

  const pagination = usePagination(filtered);

  const counts = useMemo(() => ({
    all: fines.length,
    pending: fines.filter((f) => f.status === 'pending').length,
    paid: fines.filter((f) => f.status === 'paid').length,
    overdue: fines.filter((f) => f.status === 'overdue').length,
    dismissed: fines.filter((f) => f.status === 'dismissed').length,
  }), [fines]);

  const totalRevenue = useMemo(
    () => fines
      .filter((f) => f.status === 'paid')
      .reduce((sum, f) => {
        const n = typeof f.amount === 'number' ? f.amount : Number(f.amount);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [fines],
  );

  const handleStatusUpdate = async (id: string, status: Fine['status']) => {
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

  useEffect(() => {
    if (!paymentOpen || user?.role !== 'driver') return;
    finesAPI.getPaymentConfig().then((cfg) => setPaymentModes(cfg.modes ?? ['manual'])).catch(() => setPaymentModes(['manual']));
    setKhqrSession(null);
  }, [paymentOpen, user?.role]);

  const loadKhqrSession = useCallback(async () => {
    if (!selected) return;
    setPaying(true);
    try {
      const session = await finesAPI.createKhqrSession(selected.id);
      setKhqrSession(session);
      setPaymentForm((f) => ({
        ...f,
        payment_reference: session.bill_reference,
        payment_method: 'aba',
      }));
    } catch {
      toast.error(t('fines.toastPayFail'));
    } finally {
      setPaying(false);
    }
  }, [selected, t]);

  useEffect(() => {
    if (!paymentOpen || !selected || !paymentModes.includes('khqr')) return;
    void loadKhqrSession();
  }, [paymentOpen, selected?.id, paymentModes, loadKhqrSession]);

  const handleStripeCheckout = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      const { checkout_url } = await finesAPI.createStripeCheckout(selected.id);
      window.location.href = checkout_url;
    } catch {
      toast.error(t('fines.toastPayFail'));
      setPaying(false);
    }
  };

  const handleKhqrSession = async () => {
    await loadKhqrSession();
  };

  const handlePayment = async () => {
    if (!selected || !paymentForm.payment_reference.trim()) {
      toast.error(t('fines.toastFillRequired'));
      return;
    }
    setPaying(true);
    try {
      const fd = new FormData();
      fd.append('payment_method', paymentForm.payment_method);
      fd.append('payment_reference', paymentForm.payment_reference.trim());
      if (paymentForm.screenshot) fd.append('payment_screenshot', paymentForm.screenshot);
      const updated = await finesAPI.submitPayment(selected.id, fd);
      setFines((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setSelected(updated);
      toast.success(t('fines.toastPaid'));
      setPaymentOpen(false);
      setPaymentForm({ payment_method: 'aba', payment_reference: '', screenshot: null });
    } catch {
      toast.error(t('fines.toastPayFail'));
    } finally {
      setPaying(false);
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
        amount: khrToUsd(parseFloat(fineForm.amount)),
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

  const openEditFine = (row: Fine) => {
    setEditFine(row);
    setEditForm({
      reason: row.reason,
      amount: String(usdToKhr(row.amount)),
      location: row.location,
      vehicle_plate: row.vehicle_plate,
    });
  };

  const handleEditFine = async () => {
    if (!editFine || !editForm.reason.trim() || !editForm.amount || !editForm.location.trim()) {
      toast.error(t('fines.toastFillRequired'));
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await finesAPI.update(editFine.id, {
        reason: editForm.reason.trim(),
        amount: khrToUsd(parseFloat(editForm.amount)),
        location: editForm.location.trim(),
        vehicle_plate: editForm.vehicle_plate.trim(),
      });
      setFines((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      if (selected?.id === updated.id) setSelected(updated);
      setEditFine(null);
      toast.success(t('fines.toastUpdated'));
    } catch {
      toast.error(t('fines.toastUpdateFail'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteFine = async () => {
    if (!deleteFine) return;
    try {
      await finesAPI.delete(deleteFine.id);
      setFines((prev) => prev.filter((f) => f.id !== deleteFine.id));
      if (selected?.id === deleteFine.id) setSelected(null);
      setDeleteFine(null);
      toast.success(t('fines.toastDeleted'));
    } catch {
      toast.error(t('fines.toastDeleteFail'));
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
            <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--teal" onClick={() => setIssueFineOpen(true)}>
              <Plus size={16} /> {t('fines.issueFine')}
            </button>
          )}
        </div>
      </div>

      {isDriver && <FinesTabs active="manage" />}

      {/* Stats */}
      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = card.key === 'revenue'
            ? formatAppCurrency(locale, totalRevenue)
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
          <Table className="enforcement-page__table mgmt-table__grid fines-table__grid">
            <colgroup>
              <col className="fines-table__col fines-table__col--driver" />
              <col className="fines-table__col fines-table__col--vehicle" />
              <col className="fines-table__col fines-table__col--violation" />
              <col className="fines-table__col fines-table__col--amount" />
              <col className="fines-table__col fines-table__col--date" />
              <col className="fines-table__col fines-table__col--status" />
              <col className="fines-table__col fines-table__col--actions" />
            </colgroup>
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                <TableHead className="enforcement-page__th fines-table__th fines-table__th--driver text-left">{t('fines.colDriver')}</TableHead>
                <TableHead className="enforcement-page__th fines-table__th fines-table__th--vehicle text-left">{t('fines.colVehicle')}</TableHead>
                <TableHead className="enforcement-page__th fines-table__th fines-table__th--violation text-left">{t('fines.colViolation')}</TableHead>
                <TableHead className="enforcement-page__th fines-table__th fines-table__th--amount text-left">{t('fines.colAmount')}</TableHead>
                <TableHead className="enforcement-page__th fines-table__th fines-table__th--date text-left">{t('fines.colDate')}</TableHead>
                <TableHead className="enforcement-page__th fines-table__th fines-table__th--status text-left">{t('fines.colStatus')}</TableHead>
                <TableHead className="enforcement-page__th fines-table__th fines-table__th--actions text-left">{t('fines.colActions')}</TableHead>
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
                <TableEmptyState
                  colSpan={7}
                  tone="blue"
                  icon={<FileText size={28} />}
                  title={t('fines.empty')}
                  subtitle={t('fines.emptyHint')}
                  action={
                    canIssue
                      ? { label: t('fines.issueFine'), onClick: () => setIssueFineOpen(true), icon: <Plus size={15} /> }
                      : undefined
                  }
                />
              ) : pagination.pageItems.map((row) => {
                const st = getStatusMeta(row.status);
                return (
                  <TableRow key={row.id} className="enforcement-page__table-row fines-table__row">
                    <TableCell className="fines-table__td fines-table__td--driver">
                      <div className="fines-table__driver">
                        <div className="enforcement-page__avatar enforcement-page__avatar--driver fines-table__avatar">
                          {initials(row.driver_name)}
                        </div>
                        <div className="fines-table__driver-copy min-w-0">
                          <p className="fines-table__driver-name">{row.driver_name}</p>
                          <p className="fines-table__driver-license">{row.driver_license}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="fines-table__td fines-table__td--vehicle">
                      <span className="fines-table__plate">{row.vehicle_plate || '—'}</span>
                    </TableCell>
                    <TableCell className="fines-table__td fines-table__td--violation">
                      <div className="fines-table__violation">
                        <p className="fines-table__violation-title" title={formatFineReason(row.reason)}>
                          {formatFineReason(row.reason)}
                        </p>
                        <p className="fines-table__violation-location" title={row.location}>
                          <MapPin size={11} strokeWidth={2.25} aria-hidden />
                          <span>{row.location}</span>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="fines-table__td fines-table__td--amount">
                      <span className="fines-table__amount">{formatAppCurrency(locale, row.amount)}</span>
                    </TableCell>
                    <TableCell className="fines-table__td fines-table__td--date">
                      <time className="fines-table__date" dateTime={row.created_at}>
                        {new Date(row.created_at).toLocaleDateString(dateLocale)}
                      </time>
                    </TableCell>
                    <TableCell className="fines-table__td fines-table__td--status">
                      <span className="fines-table__status enforcement-page__badge" style={{ background: st.bg, color: st.color }}>
                        {st.icon}{st.label}
                      </span>
                    </TableCell>
                    <TableCell className="fines-table__td fines-table__td--actions">
                      <div className="fines-table__actions" role="group" aria-label={t('fines.colActions')}>
                        <button
                          type="button"
                          className="fines-table__icon-btn fines-table__icon-btn--view"
                          onClick={() => setSelected(row)}
                          title={t('fines.view')}
                          aria-label={t('fines.view')}
                        >
                          <Eye size={16} strokeWidth={2.35} aria-hidden />
                        </button>
                        {canEditFine(row) ? (
                          <button
                            type="button"
                            className="fines-table__icon-btn fines-table__icon-btn--edit"
                            onClick={() => openEditFine(row)}
                            title={t('fines.editFine')}
                            aria-label={t('common.edit')}
                          >
                            <Pencil size={16} strokeWidth={2.35} aria-hidden />
                          </button>
                        ) : null}
                        {canDeleteFine(row) ? (
                          <button
                            type="button"
                            className="fines-table__icon-btn fines-table__icon-btn--delete"
                            onClick={() => setDeleteFine(row)}
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                          >
                            <Trash2 size={16} strokeWidth={2.35} aria-hidden />
                          </button>
                        ) : null}
                        {canManage && row.status === 'pending' ? (
                          <button
                            type="button"
                            className="fines-table__icon-btn fines-table__icon-btn--paid"
                            onClick={() => void handleStatusUpdate(row.id, 'paid')}
                            title={t('fines.markPaid')}
                            aria-label={t('fines.markPaid')}
                          >
                            <BadgeCheck size={16} strokeWidth={2.35} aria-hidden />
                          </button>
                        ) : null}
                        {isDriver && (row.status === 'pending' || row.status === 'overdue') ? (
                          <button
                            type="button"
                            className="fines-table__icon-btn fines-table__icon-btn--pay"
                            onClick={() => { setSelected(row); setPaymentOpen(true); }}
                            title={t('fines.payNow')}
                            aria-label={t('fines.payNow')}
                          >
                            <CreditCard size={16} strokeWidth={2.35} aria-hidden />
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

        <TablePagination pagination={pagination} labelKey="pagination.label.fines" />
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected && !paymentOpen} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent accent="blue" className="fines-view-dialog max-w-[56rem] sm:max-w-[56rem] p-0 gap-0 overflow-hidden">
          {selected && (() => {
            const st = getStatusMeta(selected.status);
            const detailCards = [
              { key: 'license', label: t('fines.licenseNo'), value: selected.driver_license, icon: Hash, tone: 'blue' as const },
              { key: 'plate', label: t('fines.vehiclePlate'), value: selected.vehicle_plate, icon: Car, tone: 'teal' as const },
              { key: 'issuer', label: t('fines.issuedBy'), value: selected.police_name, icon: User, tone: 'amber' as const },
              { key: 'violation', label: t('fines.colViolation'), value: formatFineReason(selected.reason), icon: AlertTriangle, tone: 'violet' as const },
              { key: 'issued', label: t('fines.dateIssued'), value: new Date(selected.created_at).toLocaleString(dateLocale), icon: Clock, tone: 'indigo' as const },
              ...(selected.paid_at
                ? [{ key: 'paid', label: t('fines.datePaid'), value: new Date(selected.paid_at).toLocaleString(dateLocale), icon: CheckCircle, tone: 'green' as const }]
                : []),
            ];

            return (
              <div className="fines-view-dialog__shell">
                <div className="fines-view-dialog__header">
                  <div className="fines-view-dialog__header-icon">
                    <FileText size={18} />
                  </div>
                  <div className="fines-view-dialog__header-copy">
                    <h2 className="fines-view-dialog__header-title">
                      {t('fines.fineDetails')} — #{selected.id}
                    </h2>
                    <p className="fines-view-dialog__header-meta">
                      {new Date(selected.created_at).toLocaleString(dateLocale)}
                      <span aria-hidden> · </span>
                      {selected.location}
                    </p>
                  </div>
                </div>

                <div className="fines-view-dialog__summary">
                  <div className="fines-view-dialog__summary-top">
                    <span className="fines-view-dialog__driver">{selected.driver_name || '—'}</span>
                    <span
                      className="fines-view-dialog__status-badge"
                      style={{ background: st.bg, color: st.color, borderColor: `${st.color}35` }}
                    >
                      {st.icon}
                      {st.label}
                    </span>
                    <span className="fines-view-dialog__amount-chip">
                      <RielIcon size={14} />
                      {formatAppCurrency(locale, selected.amount)}
                    </span>
                  </div>
                  <div className="fines-view-dialog__summary-meta">
                    <span className="fines-view-dialog__violation-chip">
                      <AlertTriangle size={13} />
                      {formatFineReason(selected.reason)}
                    </span>
                    <span className="fines-view-dialog__location-chip">
                      <MapPin size={13} />
                      {selected.location}
                    </span>
                  </div>
                </div>

                <div className="fines-view-dialog__body">
                  <div className="fines-view-dialog__cards">
                    {detailCards.map((card) => {
                      const CardIcon = card.icon;
                      return (
                        <div
                          key={card.key}
                          className={`fines-view-dialog__card fines-view-dialog__card--${card.tone}`}
                        >
                          <div className={`fines-view-dialog__card-icon fines-view-dialog__card-icon--${card.tone}`}>
                            <CardIcon size={15} />
                          </div>
                          <div className="fines-view-dialog__card-copy">
                            <span className="fines-view-dialog__card-label">{card.label}</span>
                            <span className={`fines-view-dialog__card-value${card.key === 'license' || card.key === 'plate' ? ' fines-view-dialog__card-value--mono' : ''}`}>
                              {card.value || '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div className="fines-view-dialog__card fines-view-dialog__card--location fines-view-dialog__card--wide">
                      <div className="fines-view-dialog__card-icon fines-view-dialog__card-icon--teal">
                        <MapPin size={15} />
                      </div>
                      <div className="fines-view-dialog__card-copy">
                        <span className="fines-view-dialog__card-label">{t('fines.location')}</span>
                        <span className="fines-view-dialog__card-value">{selected.location || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="fines-view-dialog__footer">
                  <div className="fines-view-dialog__footer-actions">
                    {isDriver && (selected.status === 'pending' || selected.status === 'overdue') ? (
                      <Button
                        className="fines-view-dialog__btn fines-view-dialog__btn--pay"
                        onClick={() => setPaymentOpen(true)}
                      >
                        {t('fines.payFine')}
                      </Button>
                    ) : null}
                    {canManage && selected.status !== 'paid' && selected.status !== 'dismissed' ? (
                      <>
                        <Button
                          size="sm"
                          className="fines-view-dialog__btn fines-view-dialog__btn--paid"
                          onClick={() => handleStatusUpdate(selected.id, 'paid')}
                        >
                          <CheckCircle size={14} /> {t('fines.markPaidDialog')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="fines-view-dialog__btn fines-view-dialog__btn--dismiss"
                          onClick={() => handleStatusUpdate(selected.id, 'dismissed')}
                        >
                          <XCircle size={14} /> {t('fines.dismiss')}
                        </Button>
                      </>
                    ) : null}
                    {canEditFine(selected) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="fines-view-dialog__btn"
                        onClick={() => { openEditFine(selected); setSelected(null); }}
                      >
                        <Pencil size={14} /> {t('fines.editFine')}
                      </Button>
                    ) : null}
                    {canDeleteFine(selected) ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="fines-view-dialog__btn"
                        onClick={() => setDeleteFine(selected)}
                      >
                        <Trash2 size={14} /> {t('common.delete')}
                      </Button>
                    ) : null}
                  </div>
                  <Button variant="outline" className="fines-view-dialog__close-btn" onClick={() => setSelected(null)}>
                    {t('vehicles.close')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent accent="success" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('fines.payFine')}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="ct-dialog-form">
              <p className="text-sm text-[color:var(--dialog-subtitle-fg)]">{formatFineReason(selected.reason)} — {formatAppCurrency(locale, selected.amount)}</p>
              {paymentModes.includes('stripe') && (
                <Button type="button" variant="default" className="w-full" disabled={paying} onClick={handleStripeCheckout}>
                  Pay with card (Stripe)
                </Button>
              )}
              {paymentModes.includes('khqr') && (
                <div className="rounded-lg border border-[color:var(--dialog-border)] p-3 space-y-2">
                  <p className="text-sm font-medium">ABA KHQR — {khqrSession?.merchant_name ?? 'Merchant'}</p>
                  {khqrSession?.qr_image_url && (
                    <img
                      src={khqrSession.qr_image_url}
                      alt="ABA KHQR"
                      className="mx-auto max-h-48 w-auto rounded-md border"
                    />
                  )}
                  {khqrSession && (
                    <>
                      <p className="text-sm">
                        <strong>Amount to enter in ABA:</strong> {khqrSession.amount_usd} USD
                      </p>
                      {khqrSession.merchant_account_usd && (
                        <p className="text-xs text-[color:var(--dialog-subtitle-fg)]">
                          USD account: {khqrSession.merchant_account_usd}
                        </p>
                      )}
                      {khqrSession.merchant_account_khr && (
                        <p className="text-xs text-[color:var(--dialog-subtitle-fg)]">
                          KHR account: {khqrSession.merchant_account_khr}
                        </p>
                      )}
                      <p className="text-xs text-[color:var(--dialog-subtitle-fg)]">
                        Reference: <strong>{khqrSession.bill_reference}</strong>
                      </p>
                      <p className="text-xs text-[color:var(--dialog-subtitle-fg)]">{khqrSession.instructions_en}</p>
                    </>
                  )}
                  {!khqrSession && (
                    <Button type="button" variant="outline" className="w-full" disabled={paying} onClick={handleKhqrSession}>
                      Load ABA KHQR
                    </Button>
                  )}
                </div>
              )}
              {paymentModes.includes('manual') && (
              <>
              <div className="ct-dialog-field">
                <Label>{t('fines.paymentMethod')}</Label>
                <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm((f) => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['aba', 'wing', 'acleda', 'bank_transfer'] as const).map((m) => (
                      <SelectItem key={m} value={m}>{t(`fines.methods.${m}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="ct-dialog-field">
                <Label>{t('fines.paymentReference')}</Label>
                <Input value={paymentForm.payment_reference} onChange={(e) => setPaymentForm((f) => ({ ...f, payment_reference: e.target.value }))} />
              </div>
              <div className="ct-dialog-field">
                <Label>{t('fines.paymentScreenshot')}</Label>
                <Input type="file" accept="image/*" onChange={(e) => setPaymentForm((f) => ({ ...f, screenshot: e.target.files?.[0] ?? null }))} />
              </div>
              </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>{t('fines.cancel')}</Button>
            <Button onClick={handlePayment} disabled={paying}>{t('fines.payNow')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue fine dialog */}
      <Dialog open={issueFineOpen} onOpenChange={setIssueFineOpen}>
        <DialogContent accent="blue" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--brand">
                <Plus size={15} />
              </div>
              <span className="enforcement-page__dialog-title">{t('fines.issueNewFine')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="ct-dialog-form">
            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">
                {t('fines.driverLicense')} *{' '}
                <span className="enforcement-page__form-hint">{t('fines.lookupRequired')}</span>
              </Label>
              <div className="flex gap-2">
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
            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('fines.vehiclePlateLabel')}</Label>
              <Input
                placeholder={t('fines.platePlaceholder')}
                value={fineForm.vehicle_plate}
                onChange={(e) => setFineForm((f) => ({ ...f, vehicle_plate: e.target.value }))}
              />
            </div>
            <div className="ct-dialog-field">
              <Label className="enforcement-page__form-label">{t('fines.violationLabel')} *</Label>
              <Select onValueChange={(v) => setFineForm((f) => ({ ...f, reason: v }))}>
                <SelectTrigger><SelectValue placeholder={t('fines.selectViolation')} /></SelectTrigger>
                <SelectContent>
                  {VIOLATION_REASONS.map((reason) => (
                    <SelectItem key={reason.key} value={reason.value}>
                      {t(`fines.reasons.${reason.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ct-dialog-field-grid">
              <div className="ct-dialog-field">
                <Label className="enforcement-page__form-label">{t('fines.amountLabel')} *</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder={t('fines.amountPlaceholder')}
                  value={fineForm.amount}
                  onChange={(e) => setFineForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="ct-dialog-field">
                <Label className="enforcement-page__form-label">{t('fines.locationLabel')} *</Label>
                <Input
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

      <Dialog open={!!editFine} onOpenChange={(open) => !open && setEditFine(null)}>
        <DialogContent accent="blue" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('fines.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="ct-dialog-form">
            <div className="ct-dialog-field">
              <Label>{t('fines.vehiclePlateLabel')}</Label>
              <Input
                value={editForm.vehicle_plate}
                onChange={(e) => setEditForm((f) => ({ ...f, vehicle_plate: e.target.value }))}
              />
            </div>
            <div className="ct-dialog-field">
              <Label>{t('fines.violationLabel')} *</Label>
              <Input
                value={editForm.reason}
                onChange={(e) => setEditForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="ct-dialog-field-grid">
              <div className="ct-dialog-field">
                <Label>{t('fines.amountLabel')} *</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="ct-dialog-field">
                <Label>{t('fines.locationLabel')} *</Label>
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFine(null)}>{t('fines.cancel')}</Button>
            <Button onClick={() => void handleEditFine()} disabled={savingEdit}>
              {savingEdit ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteFine} onOpenChange={(open) => !open && setDeleteFine(null)}>
        <DialogContent accent="danger" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('fines.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="ct-dialog-message">{t('fines.deleteConfirm', { id: String(deleteFine?.id ?? '') })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFine(null)}>{t('fines.cancel')}</Button>
            <Button variant="destructive" onClick={() => void handleDeleteFine()}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
