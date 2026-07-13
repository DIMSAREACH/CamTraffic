import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import {
  BadgeCheck, Building2, CheckCircle, MapPin, Plus, Search, Shield, UserPlus, XCircle, Pencil,
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
import { officersAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { OfficerProfile, PoliceStation } from '@shared/types';

type Tab = 'officers' | 'stations';

const OFFICER_STATUS_META: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  active: { bg: 'rgba(16,185,129,0.1)', color: '#059669', icon: <CheckCircle size={11} /> },
  inactive: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', icon: <XCircle size={11} /> },
  suspended: { bg: 'rgba(245,158,11,0.12)', color: '#D97706', icon: <XCircle size={11} /> },
};

const STATION_STATUS_META: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  active: { bg: 'rgba(16,185,129,0.1)', color: '#059669', icon: <CheckCircle size={11} /> },
  inactive: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', icon: <XCircle size={11} /> },
};

const emptyOfficerForm = {
  full_name: '',
  email: '',
  password: 'Admin@12345',
  badge_no: '',
  phone: '',
  department: '',
  rank: '',
  station: '',
};

const emptyStationForm = { name: '', code: '', city: '', region: '', status: 'active' as PoliceStation['status'] };

const emptyOfficerEditForm = {
  badge_no: '',
  phone: '',
  department: '',
  rank: '',
  station: '',
  status: 'active' as OfficerProfile['status'],
};

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'OF';
}

export function OfficersPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('officers');
  const [officers, setOfficers] = useState<OfficerProfile[]>([]);
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [officerForm, setOfficerForm] = useState(emptyOfficerForm);
  const [stationForm, setStationForm] = useState(emptyStationForm);
  const [editOfficer, setEditOfficer] = useState<OfficerProfile | null>(null);
  const [editStation, setEditStation] = useState<PoliceStation | null>(null);
  const [officerEditForm, setOfficerEditForm] = useState(emptyOfficerEditForm);
  const [deleteOfficer, setDeleteOfficer] = useState<OfficerProfile | null>(null);
  const [deleteStation, setDeleteStation] = useState<PoliceStation | null>(null);
  const [viewOfficer, setViewOfficer] = useState<OfficerProfile | null>(null);
  const [viewStation, setViewStation] = useState<PoliceStation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, s] = await Promise.all([officersAPI.getAll(), officersAPI.getStations()]);
      setOfficers(o);
      setStations(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const statusLabel = (status: string) => {
    const key = `officers.status.${status}` as const;
    const translated = t(key);
    return translated !== key ? translated : status;
  };

  const filteredOfficers = useMemo(() => {
    if (!search.trim()) return officers;
    const q = search.toLowerCase();
    return officers.filter((o) =>
      o.full_name.toLowerCase().includes(q)
      || o.email.toLowerCase().includes(q)
      || o.badge_no.toLowerCase().includes(q)
      || (o.department || '').toLowerCase().includes(q)
      || (o.station_name || '').toLowerCase().includes(q),
    );
  }, [officers, search]);

  const filteredStations = useMemo(() => {
    if (!search.trim()) return stations;
    const q = search.toLowerCase();
    return stations.filter((s) =>
      s.name.toLowerCase().includes(q)
      || s.code.toLowerCase().includes(q)
      || (s.city || '').toLowerCase().includes(q)
      || (s.region || '').toLowerCase().includes(q),
    );
  }, [stations, search]);

  const activeRows = tab === 'officers' ? filteredOfficers : filteredStations;
  const pagination = usePagination(activeRows);

  const counts = useMemo(() => ({
    officers: officers.length,
    stations: stations.length,
    activeOfficers: officers.filter((o) => o.status === 'active').length,
    activeStations: stations.filter((s) => s.status === 'active').length,
  }), [officers, stations]);

  const createOfficer = async () => {
    if (!officerForm.full_name.trim() || !officerForm.email.trim() || !officerForm.badge_no.trim()) {
      toast.error(t('officers.toastFillRequired'));
      return;
    }
    setSaving(true);
    try {
      await officersAPI.create({
        full_name: officerForm.full_name.trim(),
        email: officerForm.email.trim(),
        password: officerForm.password,
        badge_no: officerForm.badge_no.trim(),
        phone: officerForm.phone.trim() || undefined,
        department: officerForm.department.trim() || undefined,
        rank: officerForm.rank.trim() || undefined,
        station: officerForm.station || undefined,
      });
      toast.success(t('officers.created'));
      setOpen(false);
      setOfficerForm(emptyOfficerForm);
      load();
    } catch {
      toast.error(t('officers.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const saveOfficerEdit = async () => {
    if (!editOfficer || !officerEditForm.badge_no.trim()) {
      toast.error(t('officers.toastFillRequired'));
      return;
    }
    setSaving(true);
    try {
      await officersAPI.update(editOfficer.id, {
        badge_no: officerEditForm.badge_no.trim(),
        department: officerEditForm.department.trim() || undefined,
        rank: officerEditForm.rank.trim() || undefined,
        status: officerEditForm.status,
        station: officerEditForm.station || null,
      });
      toast.success(t('officers.updated'));
      setOpen(false);
      setEditOfficer(null);
      load();
    } catch {
      toast.error(t('officers.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const createStation = async () => {
    if (!stationForm.name.trim() || !stationForm.code.trim()) {
      toast.error(t('stations.toastFillRequired'));
      return;
    }
    setSaving(true);
    try {
      await officersAPI.createStation({
        name: stationForm.name.trim(),
        code: stationForm.code.trim(),
        city: stationForm.city.trim() || undefined,
        region: stationForm.region.trim() || undefined,
        status: 'active',
      });
      toast.success(t('stations.created'));
      setOpen(false);
      setStationForm(emptyStationForm);
      load();
    } catch {
      toast.error(t('stations.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const saveStationEdit = async () => {
    if (!editStation || !stationForm.name.trim() || !stationForm.code.trim()) {
      toast.error(t('stations.toastFillRequired'));
      return;
    }
    setSaving(true);
    try {
      await officersAPI.updateStation(editStation.id, {
        name: stationForm.name.trim(),
        code: stationForm.code.trim(),
        city: stationForm.city.trim() || undefined,
        region: stationForm.region.trim() || undefined,
        status: stationForm.status,
      });
      toast.success(t('stations.updated'));
      setOpen(false);
      setEditStation(null);
      load();
    } catch {
      toast.error(t('stations.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOfficer = async () => {
    if (!deleteOfficer) return;
    try {
      await officersAPI.delete(deleteOfficer.id);
      toast.success(t('officers.deleted'));
      setDeleteOfficer(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('officers.deleteFailed'));
    }
  };

  const handleDeleteStation = async () => {
    if (!deleteStation) return;
    try {
      await officersAPI.deleteStation(deleteStation.id);
      toast.success(t('stations.deleted'));
      setDeleteStation(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('stations.deleteFailed'));
    }
  };

  const openCreate = () => {
    setEditOfficer(null);
    setEditStation(null);
    if (tab === 'officers') setOfficerForm(emptyOfficerForm);
    else setStationForm({ ...emptyStationForm });
    setOpen(true);
  };

  const openEditOfficer = (officer: OfficerProfile) => {
    setEditOfficer(officer);
    setEditStation(null);
    setOfficerEditForm({
      badge_no: officer.badge_no,
      phone: officer.phone || '',
      department: officer.department || '',
      rank: officer.rank || '',
      station: officer.station || '',
      status: officer.status,
    });
    setOpen(true);
  };

  const openEditStation = (station: PoliceStation) => {
    setEditStation(station);
    setEditOfficer(null);
    setStationForm({
      name: station.name,
      code: station.code,
      city: station.city || '',
      region: station.region || '',
      status: station.status,
    });
    setOpen(true);
  };

  const officerColumns = [
    t('officers.colOfficer'),
    t('officers.badge'),
    t('users.email'),
    t('officers.department'),
    t('officers.colStation'),
    t('users.colStatus'),
    t('officers.colActions'),
  ];

  const stationColumns = [
    t('stations.name'),
    t('stations.code'),
    t('stations.city'),
    t('stations.colOfficers'),
    t('users.colStatus'),
    t('officers.colActions'),
  ];

  return (
    <div className="enforcement-page enforcement-page--officers dashboard-page--officers">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <BadgeCheck size={14} />
              </span>
              {t('officers.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('officers.title')}</h1>
            <p className="enforcement-page__subtitle">{t('officers.subtitle')}</p>
          </div>
          <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--blue" onClick={openCreate}>
            <Plus size={16} /> {tab === 'officers' ? t('officers.add') : t('stations.add')}
          </button>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        <button
          type="button"
          onClick={() => setTab('officers')}
          className={`enforcement-page__stat-card enforcement-page__stat-card--blue${tab === 'officers' ? ' enforcement-page__stat-card--active' : ''}`}
        >
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue">
            <Shield size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.officers}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">{t('officers.statOfficers')}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setTab('stations')}
          className={`enforcement-page__stat-card enforcement-page__stat-card--amber${tab === 'stations' ? ' enforcement-page__stat-card--active' : ''}`}
        >
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--amber">
            <Building2 size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.stations}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--amber">{t('officers.statStations')}</p>
          </div>
        </button>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald">
            <CheckCircle size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.activeOfficers}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">{t('officers.statActiveOfficers')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--teal">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--teal">
            <MapPin size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.activeStations}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--teal">{t('officers.statActiveStations')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__toolbar">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="enforcement-page__filters">
            <button
              type="button"
              onClick={() => setTab('officers')}
              className={`enforcement-page__filter-btn${tab === 'officers' ? ' enforcement-page__filter-btn--active' : ''}`}
              style={tab === 'officers' ? { background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' } : undefined}
            >
              <Shield size={13} className="inline mr-1.5 -mt-px" />
              {t('officers.tab')}
              <span className={`enforcement-page__filter-count${tab === 'officers' ? ' enforcement-page__filter-count--active' : ''}`}>
                {counts.officers}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('stations')}
              className={`enforcement-page__filter-btn${tab === 'stations' ? ' enforcement-page__filter-btn--active' : ''}`}
              style={tab === 'stations' ? { background: 'linear-gradient(135deg, #D97706, #F59E0B)' } : undefined}
            >
              <Building2 size={13} className="inline mr-1.5 -mt-px" />
              {t('stations.tab')}
              <span className={`enforcement-page__filter-count${tab === 'stations' ? ' enforcement-page__filter-count--active' : ''}`}>
                {counts.stations}
              </span>
            </button>
          </div>
          <div className="enforcement-page__search-wrap">
            <Search size={14} className="enforcement-page__search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'officers' ? t('officers.searchPlaceholder') : t('stations.searchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--officers">
        <div className="overflow-x-auto">
          {tab === 'officers' ? (
            <Table className="enforcement-page__table mgmt-table__grid officers-page__table">
              <TableHeader>
                <TableRow className="enforcement-page__table-head">
                  {officerColumns.map((h) => (
                    <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(officerColumns.length)].map((__, j) => (
                        <TableCell key={j}><div className="enforcement-page__skeleton officers-page__skeleton" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredOfficers.length === 0 ? (
                  <TableEmptyState
                    colSpan={officerColumns.length}
                    tone="blue"
                    icon={<Shield size={28} />}
                    title={t('officers.empty')}
                    subtitle={t('officers.emptyHint')}
                    action={{ label: t('officers.add'), onClick: openCreate, icon: <Plus size={15} /> }}
                  />
                ) : pagination.pageItems.map((o) => {
                  const st = OFFICER_STATUS_META[o.status] ?? OFFICER_STATUS_META.active;
                  return (
                    <TableRow key={o.id} className="enforcement-page__table-row">
                      <TableCell className="py-3.5">
                        <div className="officers-page__user-cell">
                          <div
                            className="enforcement-page__avatar officers-page__avatar"
                            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
                          >
                            {initials(o.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="enforcement-page__cell-primary officers-page__truncate" title={o.full_name}>
                              {o.full_name}
                            </p>
                            {o.rank ? (
                              <p className="enforcement-page__cell-secondary text-[11px]">{o.rank}</p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__code-pill">{o.badge_no}</span>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__cell-body officers-page__truncate" title={o.email}>{o.email}</span>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__cell-body">{o.department || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__cell-secondary">{o.station_name || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__badge" style={{ background: st.bg, color: st.color }}>
                          {st.icon}
                          {statusLabel(o.status)}
                        </span>
                      </TableCell>
                      <TableCell className="officers-page__col--actions">
                        <CrudRowActions
                          onView={() => setViewOfficer(o)}
                          onEdit={() => openEditOfficer(o)}
                          onDelete={() => setDeleteOfficer(o)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Table className="enforcement-page__table mgmt-table__grid officers-page__table">
              <TableHeader>
                <TableRow className="enforcement-page__table-head">
                  {stationColumns.map((h) => (
                    <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(stationColumns.length)].map((__, j) => (
                        <TableCell key={j}><div className="enforcement-page__skeleton officers-page__skeleton" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredStations.length === 0 ? (
                  <TableEmptyState
                    colSpan={stationColumns.length}
                    tone="amber"
                    icon={<Building2 size={28} />}
                    title={t('stations.empty')}
                    subtitle={t('stations.emptyHint')}
                    action={{ label: t('stations.add'), onClick: openCreate, icon: <Plus size={15} /> }}
                  />
                ) : pagination.pageItems.map((s) => {
                  const st = STATION_STATUS_META[s.status] ?? STATION_STATUS_META.active;
                  return (
                    <TableRow key={s.id} className="enforcement-page__table-row">
                      <TableCell className="py-3.5">
                        <div className="officers-page__user-cell">
                          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--amber officers-page__station-icon">
                            <Building2 size={16} />
                          </div>
                          <span className="enforcement-page__cell-primary officers-page__truncate" title={s.name}>
                            {s.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__code-pill">{s.code}</span>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__cell-body">{s.city || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__cell-secondary">{s.officer_count ?? 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__badge" style={{ background: st.bg, color: st.color }}>
                          {st.icon}
                          {statusLabel(s.status)}
                        </span>
                      </TableCell>
                      <TableCell className="officers-page__col--actions">
                        <CrudRowActions
                          onView={() => setViewStation(s)}
                          onEdit={() => openEditStation(s)}
                          onDelete={() => setDeleteStation(s)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <TablePagination
          pagination={pagination}
          labelKey={tab === 'officers' ? 'pagination.label.officers' : 'pagination.label.stations'}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          accent={tab === 'officers' ? 'blue' : 'amber'}
          className="max-w-md sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className={`enforcement-page__dialog-icon enforcement-page__dialog-icon--${tab === 'officers' ? 'brand' : 'teal'}`}>
                {tab === 'officers' ? <UserPlus size={15} /> : <Building2 size={15} />}
              </div>
              <span className="enforcement-page__dialog-title">
                {editOfficer
                  ? t('officers.edit')
                  : editStation
                    ? t('stations.edit')
                    : tab === 'officers'
                      ? t('officers.add')
                      : t('stations.add')}
              </span>
            </DialogTitle>
          </DialogHeader>

          {editOfficer ? (
            <div className="space-y-3 py-1">
              <p className="text-sm text-muted-foreground">{editOfficer.full_name} · {editOfficer.email}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="enforcement-page__form-label">{t('officers.badge')} *</Label>
                  <Input className="mt-1" value={officerEditForm.badge_no} onChange={(e) => setOfficerEditForm((f) => ({ ...f, badge_no: e.target.value }))} />
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('users.colStatus')}</Label>
                  <Select value={officerEditForm.status} onValueChange={(v) => setOfficerEditForm((f) => ({ ...f, status: v as OfficerProfile['status'] }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['active', 'inactive', 'suspended'] as const).map((s) => (
                        <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="enforcement-page__form-label">{t('officers.department')}</Label>
                  <Input className="mt-1" value={officerEditForm.department} onChange={(e) => setOfficerEditForm((f) => ({ ...f, department: e.target.value }))} />
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('officers.rank')}</Label>
                  <Input className="mt-1" value={officerEditForm.rank} onChange={(e) => setOfficerEditForm((f) => ({ ...f, rank: e.target.value }))} />
                </div>
              </div>
              {stations.length > 0 && (
                <div>
                  <Label className="enforcement-page__form-label">{t('officers.colStation')}</Label>
                  <Select value={officerEditForm.station || '__none'} onValueChange={(v) => setOfficerEditForm((f) => ({ ...f, station: v === '__none' ? '' : v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={t('officers.selectStation')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">—</SelectItem>
                      {stations.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : editStation ? (
            <div className="space-y-3 py-1">
              <div>
                <Label className="enforcement-page__form-label">{t('stations.name')} *</Label>
                <Input className="mt-1" value={stationForm.name} onChange={(e) => setStationForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="enforcement-page__form-label">{t('stations.code')} *</Label>
                  <Input className="mt-1" value={stationForm.code} onChange={(e) => setStationForm((f) => ({ ...f, code: e.target.value }))} />
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('stations.city')}</Label>
                  <Input className="mt-1" value={stationForm.city} onChange={(e) => setStationForm((f) => ({ ...f, city: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="enforcement-page__form-label">{t('stations.region')}</Label>
                  <Input className="mt-1" value={stationForm.region} onChange={(e) => setStationForm((f) => ({ ...f, region: e.target.value }))} />
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('users.colStatus')}</Label>
                  <Select value={stationForm.status} onValueChange={(v) => setStationForm((f) => ({ ...f, status: v as PoliceStation['status'] }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{statusLabel('active')}</SelectItem>
                      <SelectItem value="inactive">{statusLabel('inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : tab === 'officers' ? (
            <div className="space-y-3 py-1">
              <div>
                <Label className="enforcement-page__form-label">{t('officers.name')} *</Label>
                <Input className="mt-1" value={officerForm.full_name} onChange={(e) => setOfficerForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('users.email')} *</Label>
                <Input className="mt-1" type="email" value={officerForm.email} onChange={(e) => setOfficerForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="enforcement-page__form-label">{t('officers.badge')} *</Label>
                  <Input className="mt-1" value={officerForm.badge_no} onChange={(e) => setOfficerForm((f) => ({ ...f, badge_no: e.target.value }))} />
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('officers.phone')}</Label>
                  <Input className="mt-1" value={officerForm.phone} onChange={(e) => setOfficerForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="enforcement-page__form-label">{t('officers.department')}</Label>
                  <Input className="mt-1" value={officerForm.department} onChange={(e) => setOfficerForm((f) => ({ ...f, department: e.target.value }))} />
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('officers.rank')}</Label>
                  <Input className="mt-1" value={officerForm.rank} onChange={(e) => setOfficerForm((f) => ({ ...f, rank: e.target.value }))} />
                </div>
              </div>
              {stations.length > 0 && (
                <div>
                  <Label className="enforcement-page__form-label">{t('officers.colStation')}</Label>
                  <Select value={officerForm.station || '__none'} onValueChange={(v) => setOfficerForm((f) => ({ ...f, station: v === '__none' ? '' : v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={t('officers.selectStation')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">—</SelectItem>
                      {stations.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="enforcement-page__form-label">{t('officers.password')} *</Label>
                <Input className="mt-1" type="password" value={officerForm.password} onChange={(e) => setOfficerForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-1">
              <div>
                <Label className="enforcement-page__form-label">{t('stations.name')} *</Label>
                <Input className="mt-1" value={stationForm.name} onChange={(e) => setStationForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="enforcement-page__form-label">{t('stations.code')} *</Label>
                  <Input className="mt-1" value={stationForm.code} onChange={(e) => setStationForm((f) => ({ ...f, code: e.target.value }))} />
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('stations.city')}</Label>
                  <Input className="mt-1" value={stationForm.city} onChange={(e) => setStationForm((f) => ({ ...f, city: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('stations.region')}</Label>
                <Input className="mt-1" value={stationForm.region} onChange={(e) => setStationForm((f) => ({ ...f, region: e.target.value }))} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('users.cancel')}</Button>
            <Button
              onClick={
                editOfficer
                  ? saveOfficerEdit
                  : editStation
                    ? saveStationEdit
                    : tab === 'officers'
                      ? createOfficer
                      : createStation
              }
              disabled={saving}
            >
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteOfficer} onOpenChange={() => setDeleteOfficer(null)}>
        <DialogContent accent="rose" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('officers.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="enforcement-page__dialog-text">{t('officers.deleteConfirm', { name: deleteOfficer?.full_name ?? '' })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOfficer(null)}>{t('users.cancel')}</Button>
            <Button variant="destructive" onClick={() => void handleDeleteOfficer()}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteStation} onOpenChange={() => setDeleteStation(null)}>
        <DialogContent accent="rose" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('stations.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="enforcement-page__dialog-text">{t('stations.deleteConfirm', { name: deleteStation?.name ?? '' })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteStation(null)}>{t('users.cancel')}</Button>
            <Button variant="destructive" onClick={() => void handleDeleteStation()}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EntityViewDialog
        open={!!viewOfficer}
        onOpenChange={(open) => !open && setViewOfficer(null)}
        title={t('officers.viewTitle')}
        accent="blue"
        onEdit={viewOfficer ? () => openEditOfficer(viewOfficer) : undefined}
      >
        {viewOfficer ? (
          <>
            <EntityDetailField label={t('officers.name')} value={viewOfficer.full_name} />
            <EntityDetailField label={t('users.email')} value={viewOfficer.email} />
            <EntityDetailField label={t('officers.badge')} value={<span className="enforcement-page__code-pill">{viewOfficer.badge_no}</span>} />
            <EntityDetailField label={t('officers.phone')} value={viewOfficer.phone || '—'} />
            <EntityDetailField label={t('officers.rank')} value={viewOfficer.rank || '—'} />
            <EntityDetailField label={t('officers.department')} value={viewOfficer.department || '—'} />
            <EntityDetailField label={t('officers.colStation')} value={viewOfficer.station_name || '—'} />
            <EntityDetailField label={t('users.colStatus')} value={statusLabel(viewOfficer.status)} />
          </>
        ) : null}
      </EntityViewDialog>

      <EntityViewDialog
        open={!!viewStation}
        onOpenChange={(open) => !open && setViewStation(null)}
        title={t('stations.viewTitle')}
        accent="amber"
        onEdit={viewStation ? () => openEditStation(viewStation) : undefined}
      >
        {viewStation ? (
          <>
            <EntityDetailField label={t('stations.name')} value={viewStation.name} />
            <EntityDetailField label={t('stations.code')} value={<span className="enforcement-page__code-pill">{viewStation.code}</span>} />
            <EntityDetailField label={t('stations.city')} value={viewStation.city || '—'} />
            <EntityDetailField label={t('stations.region')} value={viewStation.region || '—'} />
            <EntityDetailField label={t('stations.colOfficers')} value={viewStation.officer_count ?? 0} />
            <EntityDetailField label={t('users.colStatus')} value={statusLabel(viewStation.status)} />
          </>
        ) : null}
      </EntityViewDialog>
    </div>
  );
}
