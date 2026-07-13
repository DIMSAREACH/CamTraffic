import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@shared/context/AuthContext';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { EntityDetailField, EntityViewDialog } from '@shared/components/admin/EntityViewDialog';
import { Search, UserSearch, IdCard, Phone, Mail } from 'lucide-react';
import { Input } from '@shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useLanguage } from '@shared/context/LanguageContext';
import { driversAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { DriverProfile } from '@shared/types';

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

  return (
    <div className="enforcement-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <p className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon" aria-hidden>
                <UserSearch size={14} />
              </span>
              {t('sidebar.modules.driverSearch')}
            </p>
            <h1 className="enforcement-page__title">{t('sidebar.pageTitles.drivers')}</h1>
            <p className="enforcement-page__subtitle">{t('driverSearch.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel">
        <div className="enforcement-page__toolbar">
          <div className="enforcement-page__search relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('driverSearch.searchPlaceholder')}
              className="pl-9"
            />
          </div>
        </div>

        <div className="enforcement-page__table-shell">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('drivers.colDriver')}</TableHead>
                <TableHead>{t('users.email')}</TableHead>
                <TableHead>{t('drivers.colLicense')}</TableHead>
                <TableHead>{t('users.colPhone')}</TableHead>
                <TableHead>{t('drivers.colStatus')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableEmptyState colSpan={5} message={t('common.loading')} />
              ) : pagination.pageItems.length === 0 ? (
                <TableEmptyState colSpan={5} message={t('driverSearch.empty')} />
              ) : (
                pagination.pageItems.map((driver) => (
                  <TableRow
                    key={driver.id}
                    className="cursor-pointer"
                    onClick={() => setViewDriver(driver)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="enforcement-page__avatar enforcement-page__avatar--sm"
                          style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}
                        >
                          {initials(driver.full_name)}
                        </div>
                        <span className="font-medium">{driver.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{driver.email}</TableCell>
                    <TableCell className="font-mono text-sm">{driver.license_no || '—'}</TableCell>
                    <TableCell>{driver.phone || '—'}</TableCell>
                    <TableCell>{driver.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination pagination={pagination} />
        </div>
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
            <EntityDetailField label={t('drivers.colStatus')} value={viewDriver.status} />
          </>
        )}
      </EntityViewDialog>
    </div>
  );
}
