import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@shared/context/AuthContext';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { EntityDetailField, EntityViewDialog } from '@shared/components/admin/EntityViewDialog';
import {
  Search, Car, CheckCircle, XCircle, Clock, Shield, IdCard, Phone, Mail,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useLanguage } from '@shared/context/LanguageContext';
import { usePagination } from '@shared/hooks/usePagination';
import { driversAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { DriverProfile } from '@shared/types';

const STATUS_META: Record<string, { bg: string; color: string; icon: ReactNode }> = {
  active: { bg: 'rgba(16,185,129,0.1)', color: '#059669', icon: <CheckCircle size={11} /> },
  inactive: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', icon: <XCircle size={11} /> },
  suspended: { bg: 'rgba(245,158,11,0.12)', color: '#D97706', icon: <XCircle size={11} /> },
};

const KYC_META: Record<string, { bg: string; color: string; icon: ReactNode }> = {
  approved: { bg: 'rgba(16,185,129,0.1)', color: '#059669', icon: <CheckCircle size={11} /> },
  pending: { bg: 'rgba(245,158,11,0.12)', color: '#D97706', icon: <Clock size={11} /> },
  rejected: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', icon: <XCircle size={11} /> },
  unverified: { bg: 'rgba(100,116,139,0.12)', color: '#64748B', icon: <Shield size={11} /> },
};

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
}

export function DriverSearchPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewDriver, setViewDriver] = useState<DriverProfile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDrivers(await driversAPI.getAll());
    } catch {
      toast.error(t('drivers.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user && user.role !== 'police') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => { void load(); }, [load]);

  const statusLabel = (status: string) => {
    const key = `drivers.status.${status}` as const;
    const translated = t(key);
    return translated !== key ? translated : status;
  };

  const kycLabel = (status: string) => {
    const key = `drivers.kyc.${status}` as const;
    const translated = t(key);
    return translated !== key ? translated : status;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) =>
      d.full_name.toLowerCase().includes(q)
      || d.email.toLowerCase().includes(q)
      || (d.phone || '').toLowerCase().includes(q)
      || (d.license_no || '').toLowerCase().includes(q)
      || (d.national_id || '').toLowerCase().includes(q),
    );
  }, [drivers, search]);

  const pagination = usePagination(filtered);

  const counts = useMemo(() => ({
    total: drivers.length,
    active: drivers.filter((d) => d.status === 'active').length,
    verified: drivers.filter((d) => d.kyc_status === 'approved').length,
    pending: drivers.filter((d) => d.kyc_status === 'pending').length,
  }), [drivers]);

  const columns = [
    t('drivers.colDriver'),
    t('drivers.license'),
    t('users.email'),
    t('drivers.kycStatus'),
    t('users.colStatus'),
  ];

  return (
    <div className="enforcement-page enforcement-page--drivers dashboard-page--drivers">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Car size={14} /></span>
              {t('drivers.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('drivers.title')}</h1>
            <p className="enforcement-page__subtitle">{t('driverSearch.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        <div className="enforcement-page__stat-card enforcement-page__stat-card--teal">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--teal"><Car size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.total}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--teal">{t('drivers.statTotal')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald"><CheckCircle size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.active}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">{t('drivers.statActive')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--blue">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue"><IdCard size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.verified}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">{t('drivers.statVerified')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--amber">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--amber"><Clock size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.pending}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--amber">{t('drivers.statPending')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__toolbar">
        <div className="enforcement-page__search-wrap drivers-page__search-wrap">
          <Search size={14} className="enforcement-page__search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('driverSearch.searchPlaceholder')}
            className="enforcement-page__search"
          />
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--drivers">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid drivers-page__table">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {columns.map((h) => (
                  <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(columns.length)].map((__, j) => (
                      <TableCell key={j}><div className="enforcement-page__skeleton drivers-page__skeleton" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableEmptyState
                  colSpan={columns.length}
                  tone="teal"
                  icon={<Car size={28} />}
                  title={t('driverSearch.empty')}
                  subtitle={t('drivers.emptyHint')}
                />
              ) : pagination.pageItems.map((d) => {
                const st = STATUS_META[d.status] ?? STATUS_META.active;
                const kyc = KYC_META[d.kyc_status] ?? KYC_META.unverified;
                return (
                  <TableRow
                    key={d.id}
                    className="enforcement-page__table-row cursor-pointer"
                    onClick={() => setViewDriver(d)}
                  >
                    <TableCell className="drivers-page__col drivers-page__col--driver">
                      <div className="drivers-page__user-cell">
                        <div className="drivers-page__avatar">{initials(d.full_name)}</div>
                        <div className="min-w-0">
                          <p className="enforcement-page__cell-primary drivers-page__truncate" title={d.full_name}>{d.full_name}</p>
                          {d.phone ? <p className="enforcement-page__cell-secondary drivers-page__phone">{d.phone}</p> : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="drivers-page__col drivers-page__col--license">
                      <span className="enforcement-page__code-pill drivers-page__license-pill">{d.license_no || '—'}</span>
                    </TableCell>
                    <TableCell className="drivers-page__col drivers-page__col--email">
                      <span className="enforcement-page__cell-body drivers-page__truncate" title={d.email}>{d.email}</span>
                    </TableCell>
                    <TableCell className="drivers-page__col drivers-page__col--kyc">
                      <span className="enforcement-page__badge drivers-page__kyc-badge" style={{ background: kyc.bg, color: kyc.color }}>
                        {kyc.icon}{kycLabel(d.kyc_status)}
                      </span>
                    </TableCell>
                    <TableCell className="drivers-page__col drivers-page__col--status">
                      <span className="enforcement-page__badge" style={{ background: st.bg, color: st.color }}>
                        {st.icon}{statusLabel(d.status)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.drivers" />
      </div>

      <EntityViewDialog
        open={Boolean(viewDriver)}
        onClose={() => setViewDriver(null)}
        title={viewDriver?.full_name ?? ''}
        subtitle={t('driverSearch.details')}
      >
        {viewDriver && (
          <>
            <EntityDetailField icon={<Mail size={14} />} label={t('users.email')} value={viewDriver.email} />
            <EntityDetailField icon={<Phone size={14} />} label={t('users.colPhone')} value={viewDriver.phone || '—'} />
            <EntityDetailField icon={<IdCard size={14} />} label={t('drivers.colLicense')} value={viewDriver.license_no || '—'} />
            <EntityDetailField label={t('drivers.colNationalId')} value={viewDriver.national_id || '—'} />
            <EntityDetailField label={t('drivers.kycStatus')} value={kycLabel(viewDriver.kyc_status)} />
            <EntityDetailField label={t('drivers.colStatus')} value={statusLabel(viewDriver.status)} />
          </>
        )}
      </EntityViewDialog>
    </div>
  );
}
