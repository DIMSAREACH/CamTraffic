import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import {
  MapPin, Plus, Search, Pencil, Trash2, Route, Cctv, CheckCircle, XCircle, Wrench,
  GitBranch, Trees, Building2, Gauge,
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
import { roadsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Road, RoadStatus, RoadType } from '@shared/types';

const ROAD_TYPES: RoadType[] = ['highway', 'urban', 'rural', 'intersection'];
const ROAD_STATUSES: RoadStatus[] = ['active', 'inactive', 'maintenance'];

const TYPE_META: Record<RoadType, { bg: string; color: string; icon: typeof Route }> = {
  highway: { bg: 'rgba(37,99,235,0.12)', color: '#2563EB', icon: Route },
  urban: { bg: 'rgba(100,116,139,0.14)', color: '#475569', icon: Building2 },
  rural: { bg: 'rgba(16,185,129,0.12)', color: '#059669', icon: Trees },
  intersection: { bg: 'rgba(245,158,11,0.14)', color: '#D97706', icon: GitBranch },
};

const STATUS_META: Record<RoadStatus, { bg: string; color: string; icon: ReactNode }> = {
  active: { bg: 'rgba(16,185,129,0.1)', color: '#059669', icon: <CheckCircle size={11} /> },
  inactive: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', icon: <XCircle size={11} /> },
  maintenance: { bg: 'rgba(245,158,11,0.12)', color: '#D97706', icon: <Wrench size={11} /> },
};

const emptyForm = {
  name: '',
  road_type: 'urban' as RoadType,
  speed_limit: '60',
  region: '',
  city: '',
  length_km: '',
  status: 'active' as RoadStatus,
};

function roadToForm(road: Road) {
  return {
    name: road.name,
    road_type: road.road_type,
    speed_limit: String(road.speed_limit),
    region: road.region || '',
    city: road.city || '',
    length_km: road.length_km != null ? String(road.length_km) : '',
    status: road.status,
  };
}

export function RoadsPage() {
  const { t } = useLanguage();
  const [roads, setRoads] = useState<Road[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Road | null>(null);
  const [deleteRoad, setDeleteRoad] = useState<Road | null>(null);
  const [viewRoad, setViewRoad] = useState<Road | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRoads(await roadsAPI.getAll());
    } catch {
      toast.error(t('roads.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const typeLabel = (type: RoadType) => {
    const key = `roads.types.${type}` as const;
    const translated = t(key);
    return translated !== key ? translated : type;
  };

  const statusLabel = (status: RoadStatus) => {
    const key = `roads.status.${status}` as const;
    const translated = t(key);
    return translated !== key ? translated : status;
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return roads;
    const q = search.toLowerCase();
    return roads.filter((r) =>
      r.name.toLowerCase().includes(q)
      || r.city.toLowerCase().includes(q)
      || (r.region || '').toLowerCase().includes(q)
      || r.road_type.toLowerCase().includes(q),
    );
  }, [roads, search]);

  const pagination = usePagination(filtered);

  const counts = useMemo(() => ({
    total: roads.length,
    active: roads.filter((r) => r.status === 'active').length,
    cameras: roads.reduce((sum, r) => sum + (r.camera_count ?? 0), 0),
    highways: roads.filter((r) => r.road_type === 'highway').length,
  }), [roads]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (road: Road) => {
    setEditing(road);
    setForm(roadToForm(road));
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.city.trim()) {
      toast.error(t('roads.toastFillRequired'));
      return;
    }
    const payload = {
      name: form.name.trim(),
      road_type: form.road_type,
      speed_limit: Number(form.speed_limit) || 60,
      region: form.region.trim() || '—',
      city: form.city.trim(),
      length_km: form.length_km ? Number(form.length_km) : null,
      status: form.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await roadsAPI.update(editing.id, payload);
        toast.success(t('roads.updated'));
      } else {
        await roadsAPI.create(payload);
        toast.success(t('roads.created'));
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch {
      toast.error(editing ? t('roads.updateFailed') : t('roads.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRoad) return;
    try {
      await roadsAPI.delete(deleteRoad.id);
      toast.success(t('roads.deleted'));
      setDeleteRoad(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('roads.deleteFailed'));
    }
  };

  const columns = [
    t('roads.name'),
    t('roads.type'),
    t('stations.city'),
    t('roads.speedLimit'),
    t('roads.cameras'),
    t('users.colStatus'),
    t('roads.colActions'),
  ];

  return (
    <div className="enforcement-page enforcement-page--roads dashboard-page--roads">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Route size={14} /></span>
              {t('roads.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('roads.title')}</h1>
            <p className="enforcement-page__subtitle">{t('roads.subtitle')}</p>
          </div>
          <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--slate" onClick={openCreate}>
            <Plus size={16} /> {t('roads.add')}
          </button>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        <div className="enforcement-page__stat-card enforcement-page__stat-card--slate">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--slate">
            <Route size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.total}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--slate">{t('roads.statTotal')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald">
            <CheckCircle size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.active}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">{t('roads.statActive')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--blue">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue">
            <Cctv size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.cameras}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">{t('roads.statCameras')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--amber">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--amber">
            <Gauge size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.highways}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--amber">{t('roads.statHighways')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__toolbar">
        <div className="enforcement-page__search-wrap roads-page__search-wrap">
          <Search size={14} className="enforcement-page__search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('roads.searchPlaceholder')}
            className="enforcement-page__search"
          />
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--roads">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid roads-page__table">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {columns.map((h) => (
                  <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(columns.length)].map((__, j) => (
                      <TableCell key={j}><div className="enforcement-page__skeleton roads-page__skeleton" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableEmptyState
                  colSpan={columns.length}
                  tone="slate"
                  icon={<MapPin size={28} />}
                  title={t('roads.empty')}
                  subtitle={t('roads.emptyHint')}
                  action={{ label: t('roads.add'), onClick: openCreate, icon: <Plus size={15} /> }}
                />
              ) : pagination.pageItems.map((r) => {
                const typeMeta = TYPE_META[r.road_type] ?? TYPE_META.urban;
                const TypeIcon = typeMeta.icon;
                const st = STATUS_META[r.status] ?? STATUS_META.active;
                return (
                  <TableRow key={r.id} className="enforcement-page__table-row">
                    <TableCell className="roads-page__col roads-page__col--name">
                      <div className="roads-page__name-cell">
                        <div className="roads-page__road-icon">
                          <Route size={15} strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <p className="enforcement-page__cell-primary roads-page__truncate" title={r.name}>{r.name}</p>
                          {r.region ? (
                            <p className="enforcement-page__cell-secondary roads-page__region">{r.region}</p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="roads-page__col roads-page__col--type">
                      <span
                        className="roads-page__type-pill"
                        style={{ background: typeMeta.bg, color: typeMeta.color, borderColor: `${typeMeta.color}30` }}
                      >
                        <TypeIcon size={12} aria-hidden />
                        {typeLabel(r.road_type)}
                      </span>
                    </TableCell>
                    <TableCell className="roads-page__col roads-page__col--city">
                      <span className="roads-page__city">
                        <MapPin size={12} className="roads-page__city-icon" aria-hidden />
                        {r.city}
                      </span>
                    </TableCell>
                    <TableCell className="roads-page__col roads-page__col--speed">
                      <span className="enforcement-page__code-pill roads-page__speed-pill">{r.speed_limit} km/h</span>
                    </TableCell>
                    <TableCell className="roads-page__col roads-page__col--cameras">
                      <span className="roads-page__camera-count">
                        <Cctv size={12} aria-hidden />
                        {r.camera_count ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="roads-page__col roads-page__col--status">
                      <span className="enforcement-page__badge" style={{ background: st.bg, color: st.color }}>
                        {st.icon}
                        {statusLabel(r.status)}
                      </span>
                    </TableCell>
                    <TableCell className="roads-page__col roads-page__col--actions">
                      <CrudRowActions
                        onView={() => setViewRoad(r)}
                        onEdit={() => openEdit(r)}
                        onDelete={() => setDeleteRoad(r)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.roads" />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent accent="blue" className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--slate">
                {editing ? <Pencil size={15} /> : <Plus size={15} />}
              </div>
              <span className="enforcement-page__dialog-title">{editing ? t('roads.edit') : t('roads.add')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="enforcement-page__form-label">{t('roads.name')} *</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="enforcement-page__form-label">{t('roads.type')}</Label>
                <Select value={form.road_type} onValueChange={(v) => setForm((f) => ({ ...f, road_type: v as RoadType }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROAD_TYPES.map((rt) => <SelectItem key={rt} value={rt}>{typeLabel(rt)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('roads.speedLimit')}</Label>
                <Input className="mt-1" type="number" value={form.speed_limit} onChange={(e) => setForm((f) => ({ ...f, speed_limit: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="enforcement-page__form-label">{t('stations.city')} *</Label>
                <Input className="mt-1" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('stations.region')}</Label>
                <Input className="mt-1" value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="enforcement-page__form-label">{t('roads.lengthKm')}</Label>
                <Input className="mt-1" type="number" step="0.1" value={form.length_km} onChange={(e) => setForm((f) => ({ ...f, length_km: e.target.value }))} />
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('users.colStatus')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as RoadStatus }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('users.cancel')}</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRoad} onOpenChange={() => setDeleteRoad(null)}>
        <DialogContent accent="rose" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('roads.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="enforcement-page__dialog-text">{t('roads.deleteConfirm', { name: deleteRoad?.name ?? '' })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRoad(null)}>{t('users.cancel')}</Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EntityViewDialog
        open={!!viewRoad}
        onOpenChange={(open) => !open && setViewRoad(null)}
        title={t('roads.viewTitle')}
        accent="blue"
        onEdit={viewRoad ? () => openEdit(viewRoad) : undefined}
      >
        {viewRoad ? (
          <>
            <EntityDetailField label={t('roads.name')} value={viewRoad.name} />
            <EntityDetailField label={t('roads.type')} value={typeLabel(viewRoad.road_type)} />
            <EntityDetailField label={t('stations.city')} value={viewRoad.city} />
            <EntityDetailField label={t('stations.region')} value={viewRoad.region || '—'} />
            <EntityDetailField label={t('roads.speedLimit')} value={`${viewRoad.speed_limit} km/h`} />
            <EntityDetailField label={t('roads.lengthKm')} value={viewRoad.length_km != null ? `${viewRoad.length_km} km` : '—'} />
            <EntityDetailField label={t('roads.cameras')} value={viewRoad.camera_count ?? 0} />
            <EntityDetailField label={t('users.colStatus')} value={statusLabel(viewRoad.status)} />
          </>
        ) : null}
      </EntityViewDialog>
    </div>
  );
}
