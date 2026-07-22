import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import {
  Car, CheckCircle, Plus, Search, UserPlus, XCircle, Pencil, Clock, Shield, IdCard,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { EntityDetailField, EntityViewDialog } from '@shared/components/admin/EntityViewDialog';
import { useLanguage } from '@shared/context/LanguageContext';
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

const emptyCreateForm = {
  full_name: '',
  email: '',
  password: 'Admin@12345',
  phone: '',
  license_no: '',
};

const emptyEditForm = {
  license_no: '',
  national_id: '',
  license_expiry: '',
  date_of_birth: '',
  kyc_status: 'unverified' as DriverProfile['kyc_status'],
  status: 'active' as DriverProfile['status'],
};

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
}

export function DriversPage() {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editDriver, setEditDriver] = useState<DriverProfile | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [deleteDriver, setDeleteDriver] = useState<DriverProfile | null>(null);
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
    if (!search.trim()) return drivers;
    const q = search.toLowerCase();
    return drivers.filter((d) =>
      d.full_name.toLowerCase().includes(q)
      || d.email.toLowerCase().includes(q)
      || d.license_no.toLowerCase().includes(q)
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

  const openCreate = () => {
    setEditDriver(null);
    setCreateForm(emptyCreateForm);
    setOpen(true);
  };

  const openEdit = (driver: DriverProfile) => {
    setEditDriver(driver);
    setEditForm({
      license_no: driver.license_no,
      national_id: driver.national_id || '',
      license_expiry: driver.license_expiry?.slice(0, 10) || '',
      date_of_birth: driver.date_of_birth?.slice(0, 10) || '',
      kyc_status: driver.kyc_status,
      status: driver.status,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (editDriver) {
      if (!editForm.license_no.trim()) {
        toast.error(t('drivers.toastFillRequired'));
        return;
      }
      setSaving(true);
      try {
        await driversAPI.update(editDriver.id, {
          license_no: editForm.license_no.trim(),
          national_id: editForm.national_id.trim() || null,
          license_expiry: editForm.license_expiry || null,
          date_of_birth: editForm.date_of_birth || null,
          kyc_status: editForm.kyc_status,
          status: editForm.status,
        });
        toast.success(t('drivers.updated'));
        setOpen(false);
        setEditDriver(null);
        load();
      } catch {
        toast.error(t('drivers.updateFailed'));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!createForm.full_name.trim() || !createForm.email.trim() || !createForm.license_no.trim()) {
      toast.error(t('drivers.toastFillRequired'));
      return;
    }
    setSaving(true);
    try {
      await driversAPI.create({
        full_name: createForm.full_name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        phone: createForm.phone.trim() || undefined,
        license_no: createForm.license_no.trim(),
      });
      toast.success(t('drivers.created'));
      setOpen(false);
      setCreateForm(emptyCreateForm);
      load();
    } catch {
      toast.error(t('drivers.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDriver) return;
    try {
      const result = await driversAPI.delete(deleteDriver.id);
      if (result.driver && (result.driver.status === 'inactive' || result.message?.toLowerCase().includes('deactivated'))) {
        toast.success(result.message || 'Driver was soft-deleted (linked records preserved)');
      } else {
        toast.success(result.message || t('drivers.deleted'));
      }
      setDeleteDriver(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('drivers.deleteFailed'));
    }
  };

  const columns = [
    t('drivers.colDriver'),
    t('drivers.license'),
    t('users.email'),
    t('drivers.kycStatus'),
    t('users.colStatus'),
    t('drivers.colActions'),
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
            <p className="enforcement-page__subtitle">{t('drivers.subtitle')}</p>
          </div>
          <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--teal" onClick={openCreate}>
            <Plus size={16} /> {t('drivers.add')}
          </button>
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
            placeholder={t('drivers.searchPlaceholder')}
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
                  title={t('drivers.empty')}
                  subtitle={t('drivers.emptyHint')}
                  action={{ label: t('drivers.add'), onClick: openCreate, icon: <Plus size={15} /> }}
                />
              ) : pagination.pageItems.map((d) => {
                const st = STATUS_META[d.status] ?? STATUS_META.active;
                const kyc = KYC_META[d.kyc_status] ?? KYC_META.unverified;
                return (
                  <TableRow key={d.id} className="enforcement-page__table-row">
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
                      <span className="enforcement-page__code-pill drivers-page__license-pill">{d.license_no}</span>
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
                    <TableCell className="drivers-page__col drivers-page__col--actions">
                      <CrudRowActions
                        onView={() => setViewDriver(d)}
                        onEdit={() => openEdit(d)}
                        onDelete={() => setDeleteDriver(d)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.drivers" />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent accent="teal" className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--teal">
                {editDriver ? <Pencil size={15} /> : <UserPlus size={15} />}
              </div>
              <span className="enforcement-page__dialog-title">
                {editDriver ? t('drivers.edit') : t('drivers.add')}
              </span>
            </DialogTitle>
          </DialogHeader>

          {editDriver ? (
            <div className="space-y-3 py-1">
              <div className="drivers-page__edit-banner">
                <div className="drivers-page__avatar drivers-page__avatar--sm">{initials(editDriver.full_name)}</div>
                <div className="min-w-0">
                  <p className="enforcement-page__cell-primary drivers-page__truncate">{editDriver.full_name}</p>
                  <p className="enforcement-page__cell-secondary text-sm drivers-page__truncate">{editDriver.email}</p>
                </div>
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('drivers.license')} *</Label>
                <Input className="mt-1" value={editForm.license_no} onChange={(e) => setEditForm((f) => ({ ...f, license_no: e.target.value }))} />
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('drivers.nationalId')}</Label>
                <Input className="mt-1" value={editForm.national_id} onChange={(e) => setEditForm((f) => ({ ...f, national_id: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="enforcement-page__form-label">{t('drivers.licenseExpiry')}</Label>
                  <Input className="mt-1" type="date" value={editForm.license_expiry} onChange={(e) => setEditForm((f) => ({ ...f, license_expiry: e.target.value }))} />
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('drivers.dateOfBirth')}</Label>
                  <Input className="mt-1" type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm((f) => ({ ...f, date_of_birth: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="enforcement-page__form-label">{t('drivers.kycStatus')}</Label>
                  <Select value={editForm.kyc_status} onValueChange={(v) => setEditForm((f) => ({ ...f, kyc_status: v as DriverProfile['kyc_status'] }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['unverified', 'pending', 'approved', 'rejected'] as const).map((s) => (
                        <SelectItem key={s} value={s}>{kycLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('users.colStatus')}</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as DriverProfile['status'] }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['active', 'inactive', 'suspended'] as const).map((s) => (
                        <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-1">
              <div>
                <Label className="enforcement-page__form-label">{t('drivers.name')} *</Label>
                <Input className="mt-1" value={createForm.full_name} onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('users.email')} *</Label>
                <Input className="mt-1" type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="enforcement-page__form-label">{t('drivers.license')} *</Label>
                  <Input className="mt-1" value={createForm.license_no} onChange={(e) => setCreateForm((f) => ({ ...f, license_no: e.target.value }))} />
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('officers.phone')}</Label>
                  <Input className="mt-1" value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('officers.password')} *</Label>
                <Input className="mt-1" type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('users.cancel')}</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDriver} onOpenChange={() => setDeleteDriver(null)}>
        <DialogContent accent="rose" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('drivers.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="enforcement-page__dialog-text">{t('drivers.deleteConfirm', { name: deleteDriver?.full_name ?? '' })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDriver(null)}>{t('users.cancel')}</Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EntityViewDialog
        open={!!viewDriver}
        onOpenChange={(open) => !open && setViewDriver(null)}
        title={t('drivers.viewTitle')}
        accent="teal"
        onEdit={viewDriver ? () => openEdit(viewDriver) : undefined}
      >
        {viewDriver ? (
          <>
            <EntityDetailField label={t('drivers.name')} value={viewDriver.full_name} />
            <EntityDetailField label={t('users.email')} value={viewDriver.email} />
            <EntityDetailField label={t('officers.phone')} value={viewDriver.phone || '—'} />
            <EntityDetailField label={t('drivers.license')} value={<span className="enforcement-page__code-pill">{viewDriver.license_no}</span>} />
            <EntityDetailField label={t('drivers.nationalId')} value={viewDriver.national_id || '—'} />
            <EntityDetailField label={t('drivers.kycStatus')} value={kycLabel(viewDriver.kyc_status)} />
            <EntityDetailField label={t('users.colStatus')} value={statusLabel(viewDriver.status)} />
            <EntityDetailField label={t('drivers.licenseExpiry')} value={viewDriver.license_expiry ? new Date(viewDriver.license_expiry).toLocaleDateString() : '—'} />
            <EntityDetailField label={t('drivers.dateOfBirth')} value={viewDriver.date_of_birth ? new Date(viewDriver.date_of_birth).toLocaleDateString() : '—'} />
          </>
        ) : null}
      </EntityViewDialog>
    </div>
  );
}
