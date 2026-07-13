import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, FileText, Hash } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppCurrency } from '@shared/i18n/localeFormat';
import { useLiveData } from '@shared/hooks/useLiveData';
import { finesAPI } from '@shared/services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import type { Fine } from '@shared/types';

export function DriverPaymentHistoryPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const dateLocale = locale === 'km' ? 'km-KH' : 'en-US';
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!user || user.role !== 'driver') return;
    if (!silent) setLoading(true);
    try {
      const data = await finesAPI.getByDriver(user.id);
      setFines(data.filter((f) => f.status === 'paid'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  useLiveData(() => load(true), 30_000, Boolean(user?.role === 'driver'));

  const totalPaid = useMemo(
    () => fines.reduce((sum, f) => sum + f.amount, 0),
    [fines],
  );

  const methodLabel = (method?: string) => {
    if (!method) return '—';
    const key = `fines.methods.${method}` as const;
    const translated = t(key);
    return translated !== key ? translated : method;
  };

  return (
    <div className="enforcement-page enforcement-page--fines dashboard-page--fines">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
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

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--two mb-4">
        <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald">
            <FileText size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{fines.length}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">{t('paymentHistory.paidCount')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--violet">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--violet">
            <CreditCard size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{formatAppCurrency(locale, totalPaid)}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--violet">{t('paymentHistory.totalPaid')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel overflow-hidden">
        <Table className="enforcement-page__table mgmt-table__grid">
          <TableHeader>
            <TableRow className="enforcement-page__table-head">
              <TableHead className="enforcement-page__th">{t('paymentHistory.colDate')}</TableHead>
              <TableHead className="enforcement-page__th">{t('paymentHistory.colReason')}</TableHead>
              <TableHead className="enforcement-page__th">{t('paymentHistory.colAmount')}</TableHead>
              <TableHead className="enforcement-page__th">{t('paymentHistory.colMethod')}</TableHead>
              <TableHead className="enforcement-page__th">{t('paymentHistory.colReference')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((__, j) => (
                    <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : fines.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                tone="blue"
                icon={<CreditCard size={28} />}
                title={t('paymentHistory.empty')}
              />
            ) : fines.map((fine) => (
              <TableRow key={fine.id} className="enforcement-page__table-row">
                <TableCell>
                  {fine.paid_at
                    ? new Date(fine.paid_at).toLocaleString(dateLocale)
                    : new Date(fine.created_at).toLocaleString(dateLocale)}
                </TableCell>
                <TableCell>{fine.reason}</TableCell>
                <TableCell>{formatAppCurrency(locale, fine.amount)}</TableCell>
                <TableCell>{methodLabel(fine.payment_method)}</TableCell>
                <TableCell className="font-mono text-xs">
                  {fine.payment_reference ? (
                    <span className="inline-flex items-center gap-1">
                      <Hash size={12} />
                      {fine.payment_reference}
                    </span>
                  ) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
