import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle, CreditCard, FileText, Hash, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppCurrency } from '@shared/i18n/localeFormat';
import { useLiveData } from '@shared/hooks/useLiveData';
import { usePagination } from '@shared/hooks/usePagination';
import { finesAPI } from '@shared/services/api';
import { FinesTabs } from '@shared/components/fines/FinesTabs';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import type { Fine } from '@shared/types';

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

function formatPaidAt(iso: string, dateLocale: string) {
  const date = new Date(iso);
  return {
    dateLabel: date.toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: 'numeric' }),
    timeLabel: date.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }),
    dateTime: iso,
  };
}

export function DriverPaymentHistoryPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const dateLocale = locale === 'km' ? 'km-KH' : 'en-US';
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!user || user.role !== 'driver') return;
    if (!silent) setLoading(true);
    try {
      const data = await finesAPI.getByDriver(user.id);
      setFines(
        data
          .filter((f) => f.status === 'paid')
          .sort((a, b) => {
            const aTime = new Date(a.paid_at || a.created_at).getTime();
            const bTime = new Date(b.paid_at || b.created_at).getTime();
            return bTime - aTime;
          }),
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  useLiveData(() => load(true), 30_000, Boolean(user?.role === 'driver'));

  const translateReason = useCallback((reason: string) => {
    const key = REASON_VALUE_TO_KEY[reason];
    if (key) return t(`fines.reasons.${key}`);
    return reason;
  }, [t]);

  const methodLabel = useCallback((method?: string) => {
    if (!method) return '—';
    const key = `fines.methods.${method}`;
    const translated = t(key);
    return translated !== key ? translated : method;
  }, [t]);

  const totalPaid = useMemo(
    () => fines.reduce((sum, f) => sum + f.amount, 0),
    [fines],
  );

  const avgPayment = useMemo(
    () => (fines.length ? totalPaid / fines.length : 0),
    [fines.length, totalPaid],
  );

  const lastPaymentLabel = useMemo(() => {
    if (!fines.length) return '—';
    const latest = fines[0];
    const date = latest.paid_at || latest.created_at;
    return new Date(date).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [fines, dateLocale]);

  const filteredFines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fines;
    return fines.filter((fine) => {
      const reason = translateReason(fine.reason).toLowerCase();
      const reference = fine.payment_reference?.toLowerCase() ?? '';
      const method = methodLabel(fine.payment_method).toLowerCase();
      const plate = fine.vehicle_plate?.toLowerCase() ?? '';
      return reason.includes(q) || reference.includes(q) || method.includes(q) || plate.includes(q);
    });
  }, [fines, search, translateReason, methodLabel]);

  const pagination = usePagination(filteredFines);

  const statCards = [
    { tone: 'emerald', icon: FileText, value: String(fines.length), label: t('paymentHistory.paidCount') },
    { tone: 'violet', icon: CreditCard, value: formatAppCurrency(locale, totalPaid), label: t('paymentHistory.totalPaid') },
    { tone: 'blue', icon: Calendar, value: lastPaymentLabel, label: t('paymentHistory.lastPayment') },
    { tone: 'amber', icon: TrendingUp, value: fines.length ? formatAppCurrency(locale, avgPayment) : '—', label: t('paymentHistory.avgPayment') },
  ];

  return (
    <div className="enforcement-page enforcement-page--fines dashboard-page--fines admin-dashboard-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><CreditCard size={14} /></span>
              {t('paymentHistory.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('paymentHistory.title')}</h1>
            <p className="enforcement-page__subtitle">{t('paymentHistory.subtitle')}</p>
          </div>
        </div>
      </div>

      <FinesTabs active="payments" />

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four mb-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`enforcement-page__stat-card enforcement-page__stat-card--${card.tone}`}>
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.tone}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{card.value}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.tone}`}>
                  {card.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="enforcement-page__toolbar">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-end">
          <div className="enforcement-page__search-wrap">
            <Search size={14} className="enforcement-page__search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('paymentHistory.searchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
          <button
            type="button"
            className="payments-page__refresh-btn"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {t('paymentHistory.refresh')}
          </button>
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--fines">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid fines-table__grid payments-table__grid">
            <colgroup>
              <col className="payments-table__col payments-table__col--date" />
              <col className="payments-table__col payments-table__col--reason" />
              <col className="payments-table__col payments-table__col--amount" />
              <col className="payments-table__col payments-table__col--method" />
              <col className="payments-table__col payments-table__col--reference" />
            </colgroup>
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                <TableHead className="enforcement-page__th fines-table__th fines-table__th--date text-left">
                  {t('paymentHistory.colDate')}
                </TableHead>
                <TableHead className="enforcement-page__th fines-table__th fines-table__th--violation text-left">
                  {t('paymentHistory.colReason')}
                </TableHead>
                <TableHead className="enforcement-page__th fines-table__th fines-table__th--amount text-left">
                  {t('paymentHistory.colAmount')}
                </TableHead>
                <TableHead className="enforcement-page__th fines-table__th fines-table__th--status text-left">
                  {t('paymentHistory.colMethod')}
                </TableHead>
                <TableHead className="enforcement-page__th fines-table__th fines-table__th--vehicle text-left">
                  {t('paymentHistory.colReference')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(5)].map((__, j) => (
                      <TableCell key={j}>
                        <div className="enforcement-page__skeleton" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pagination.pageItems.length === 0 ? (
                <TableEmptyState
                  colSpan={5}
                  tone="blue"
                  icon={<CreditCard size={28} />}
                  title={search.trim() ? t('paymentHistory.emptySearch') : t('paymentHistory.empty')}
                  subtitle={search.trim() ? t('paymentHistory.emptySearchHint') : t('paymentHistory.emptyHint')}
                />
              ) : pagination.pageItems.map((fine) => {
                const paidIso = fine.paid_at || fine.created_at;
                const paidAt = formatPaidAt(paidIso, dateLocale);
                return (
                  <TableRow key={fine.id} className="enforcement-page__table-row fines-table__row payments-table__row">
                    <TableCell className="fines-table__td fines-table__td--date">
                      <div className="mgmt-table__stack">
                        <time className="mgmt-table__stack-title fines-table__date" dateTime={paidAt.dateTime}>
                          {paidAt.dateLabel}
                        </time>
                        <p className="mgmt-table__stack-meta">{paidAt.timeLabel}</p>
                      </div>
                    </TableCell>
                    <TableCell className="fines-table__td fines-table__td--violation">
                      <div className="fines-table__violation">
                        <p className="fines-table__violation-title" title={translateReason(fine.reason)}>
                          {translateReason(fine.reason)}
                        </p>
                        {fine.vehicle_plate ? (
                          <p className="fines-table__violation-location">
                            <Hash size={11} strokeWidth={2.25} aria-hidden />
                            <span>{fine.vehicle_plate}</span>
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="fines-table__td fines-table__td--amount">
                      <span className="fines-table__amount">{formatAppCurrency(locale, fine.amount)}</span>
                    </TableCell>
                    <TableCell className="fines-table__td fines-table__td--status">
                      <span className="payments-table__method fines-table__status enforcement-page__badge">
                        <CheckCircle size={11} />
                        {methodLabel(fine.payment_method)}
                      </span>
                    </TableCell>
                    <TableCell className="fines-table__td fines-table__td--vehicle">
                      {fine.payment_reference ? (
                        <span className="payments-table__reference fines-table__plate" title={fine.payment_reference}>
                          <Hash size={11} strokeWidth={2.25} aria-hidden />
                          {fine.payment_reference}
                        </span>
                      ) : (
                        <span className="payments-table__reference payments-table__reference--empty">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.payments" />
      </div>
    </div>
  );
}
