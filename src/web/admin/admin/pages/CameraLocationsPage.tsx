import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import {
  Cctv, CheckCircle, MapPin, Pencil, Route, Search, Wrench, XCircle,
  Layers, BarChart3, RefreshCw, Navigation,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { useLanguage } from '@shared/context/LanguageContext';
import { camerasAPI, roadsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Camera, CameraStatus, Road, RoadStatus } from '@shared/types';
import { cn } from '@shared/components/ui/utils';
import { LocationsMap, type LocationsMapPoint } from '../components/LocationsMap';
import { CoordinatePickerMap } from '../components/CoordinatePickerMap';

type TabId = 'cameras' | 'roads';

type MapPoint = LocationsMapPoint;

const STATUS_META: Record<string, { bg: string; color: string; icon: ReactNode }> = {
  active: { bg: 'rgba(16,185,129,0.1)', color: '#059669', icon: <CheckCircle size={11} /> },
  inactive: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', icon: <XCircle size={11} /> },
  maintenance: { bg: 'rgba(245,158,11,0.12)', color: '#D97706', icon: <Wrench size={11} /> },
};

const TAB_FILTER_STYLE: Record<TabId, string> = {
  cameras: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  roads: 'linear-gradient(135deg, #059669, #047857)',
};

/** API / Decimal serializers may return coords as strings. */
function toCoord(v?: number | string | null): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatCoord(v?: number | string | null) {
  const n = toCoord(v);
  if (n == null) return null;
  return n.toFixed(5);
}

function hasCoords(lat?: number | string | null, lng?: number | string | null) {
  return toCoord(lat) != null && toCoord(lng) != null;
}

function CoordCell({ value, emptyLabel }: { value?: number | string | null; emptyLabel: string }) {
  const formatted = formatCoord(value);
  if (!formatted) {
    return <span className="cam-loc__coord cam-loc__coord--missing">{emptyLabel}</span>;
  }
  return <code className="cam-loc__coord">{formatted}</code>;
}

export function CameraLocationsPage() {
  const { t } = useLanguage();

  const [tab, setTab] = useState<TabId>('cameras');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<{ kind: TabId; id: number; name: string } | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [camData, roadData] = await Promise.all([camerasAPI.getAll(), roadsAPI.getAll()]);
      setCameras(camData);
      setRoads(roadData);
    } catch {
      toast.error(t('cameraLocations.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const statusLabel = (status: string) => {
    const key = `cameraLocations.status.${status}` as const;
    const translated = t(key);
    return translated !== key ? translated : status;
  };

  const cameraRows = useMemo(() => {
    if (!search.trim()) return cameras;
    const q = search.toLowerCase();
    return cameras.filter((c) =>
      c.name.toLowerCase().includes(q)
      || c.road_name.toLowerCase().includes(q)
      || c.code.toLowerCase().includes(q),
    );
  }, [cameras, search]);

  const roadRows = useMemo(() => {
    if (!search.trim()) return roads;
    const q = search.toLowerCase();
    return roads.filter((r) =>
      r.name.toLowerCase().includes(q)
      || r.city.toLowerCase().includes(q),
    );
  }, [roads, search]);

  const cameraPagination = usePagination(cameraRows);
  const roadPagination = usePagination(roadRows);

  const cameraMapPoints = useMemo((): MapPoint[] =>
    cameras.flatMap((item) => {
      const lat = toCoord(item.latitude);
      const lng = toCoord(item.longitude);
      if (lat == null || lng == null) return [];
      return [{ id: item.id, name: item.name, lat, lng, kind: 'cameras' as const }];
    }),
  [cameras]);

  const roadMapPoints = useMemo((): MapPoint[] =>
    roads.flatMap((item) => {
      const lat = toCoord(item.latitude);
      const lng = toCoord(item.longitude);
      if (lat == null || lng == null) return [];
      return [{ id: item.id, name: item.name, lat, lng, kind: 'roads' as const }];
    }),
  [roads]);

  const mapPoints = useMemo(
    () => [...cameraMapPoints, ...roadMapPoints],
    [cameraMapPoints, roadMapPoints],
  );

  const counts = useMemo(() => ({
    cameras: cameras.length,
    roads: roads.length,
    mappedCameras: cameras.filter((c) => hasCoords(c.latitude, c.longitude)).length,
    mappedRoads: roads.filter((r) => hasCoords(r.latitude, r.longitude)).length,
    active: cameras.filter((c) => c.status === 'active').length,
  }), [cameras, roads]);

  const coverage = useMemo(() => ({
    camerasPct: counts.cameras ? Math.round((counts.mappedCameras / counts.cameras) * 100) : 0,
    roadsPct: counts.roads ? Math.round((counts.mappedRoads / counts.roads) * 100) : 0,
    overallPct: (counts.cameras + counts.roads)
      ? Math.round(((counts.mappedCameras + counts.mappedRoads) / (counts.cameras + counts.roads)) * 100)
      : 0,
  }), [counts]);

  const openEdit = (kind: TabId, id: string | number, name: string, latitude?: number | string | null, longitude?: number | string | null) => {
    setEditItem({ kind, id, name });
    setLat(latitude != null && latitude !== '' ? String(latitude) : '');
    setLng(longitude != null && longitude !== '' ? String(longitude) : '');
  };

  const handleSave = async () => {
    if (!editItem) return;
    const latitude = lat.trim() ? parseFloat(lat) : null;
    const longitude = lng.trim() ? parseFloat(lng) : null;
    if (lat.trim() && Number.isNaN(latitude)) {
      toast.error(t('cameraLocations.invalidLat'));
      return;
    }
    if (lng.trim() && Number.isNaN(longitude)) {
      toast.error(t('cameraLocations.invalidLng'));
      return;
    }
    if ((latitude == null) !== (longitude == null)) {
      toast.error(t('cameraLocations.coordsPairRequired'));
      return;
    }
    setSaving(true);
    try {
      if (editItem.kind === 'cameras') {
        await camerasAPI.update(editItem.id, { latitude, longitude });
      } else {
        await roadsAPI.update(editItem.id, { latitude, longitude });
      }
      toast.success(t('cameraLocations.updated'));
      setEditItem(null);
      void load();
    } catch {
      toast.error(t('cameraLocations.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const pickCoords = (nextLat: number, nextLng: number) => {
    setLat(nextLat.toFixed(7));
    setLng(nextLng.toFixed(7));
  };

  const pickedLat = toCoord(lat);
  const pickedLng = toCoord(lng);

  const columns = [
    { key: 'name', label: t('cameraLocations.colName'), className: 'cam-loc__col--name' },
    { key: 'lat', label: t('cameraLocations.colLat'), className: 'cam-loc__col--lat' },
    { key: 'lng', label: t('cameraLocations.colLng'), className: 'cam-loc__col--lng' },
    { key: 'road', label: t('cameraLocations.colRoadCity'), className: 'cam-loc__col--road' },
    { key: 'status', label: t('users.colStatus'), className: 'cam-loc__col--status' },
    { key: 'actions', label: t('cameraLocations.colActions'), className: 'cam-loc__col--actions' },
  ];

  const renderStatus = (status: CameraStatus | RoadStatus) => {
    const st = STATUS_META[status] ?? STATUS_META.active;
    return (
      <span className="enforcement-page__badge" style={{ background: st.bg, color: st.color }}>
        {st.icon}{statusLabel(status)}
      </span>
    );
  };

  return (
    <div className="enforcement-page enforcement-page--camera-locations dashboard-page--camera-locations">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><MapPin size={14} /></span>
              {t('cameraLocations.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('cameraLocations.title')}</h1>
            <p className="enforcement-page__subtitle">{t('cameraLocations.subtitle')}</p>
          </div>
          <button
            type="button"
            className="enforcement-page__hero-btn enforcement-page__hero-btn--slate"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {t('cameraLocations.refresh')}
          </button>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        <div className="enforcement-page__stat-card enforcement-page__stat-card--blue">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue"><Cctv size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.cameras}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">{t('cameraLocations.statCameras')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--slate">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--slate"><Route size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.roads}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--slate">{t('cameraLocations.statRoads')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--teal">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--teal"><Navigation size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.mappedCameras + counts.mappedRoads}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--teal">{t('cameraLocations.statMapped')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald"><CheckCircle size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.active}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">{t('cameraLocations.statActiveCameras')}</p>
          </div>
        </div>
      </div>

      <section className="cam-loc__workspace" aria-label={t('cameraLocations.mapTitle')}>
        <article className="cam-loc__map-card">
          <header className="cam-loc__card-hero cam-loc__card-hero--map">
            <span className="cam-loc__chart-dot cam-loc__chart-dot--map" aria-hidden />
            <div className="cam-loc__card-hero-copy">
              <h2 className="cam-loc__card-hero-title">{t('cameraLocations.mapTitle')}</h2>
              <p className="cam-loc__card-hero-sub">{t('cameraLocations.mapSubtitle')}</p>
            </div>
            <div className="cam-loc__card-hero-icon cam-loc__card-hero-icon--map">
              <Layers size={16} />
            </div>
            <div className="cam-loc__card-hero-badge">
              <span className="cam-loc__card-hero-badge-value">{mapPoints.length}</span>
              <span className="cam-loc__card-hero-badge-label">{t('cameraLocations.pointsOnMap')}</span>
            </div>
          </header>
          <div className="cam-loc__map-body">
            <LocationsMap
              points={mapPoints}
              activeKind={tab}
              ariaLabel={t('cameraLocations.mapTitle')}
              regionLabel={t('cameraLocations.mapRegion')}
              emptyTitle={t('cameraLocations.mapEmpty')}
              emptyHint={t('cameraLocations.mapEmptyHint')}
              camerasLabel={t('cameraLocations.legendCameras')}
              roadsLabel={t('cameraLocations.legendRoads')}
              layersLabel={t('cameraLocations.layers')}
              mapTypeLabel={t('cameraLocations.mapType')}
              defaultMapLabel={t('cameraLocations.mapDefault')}
              satelliteLabel={t('cameraLocations.mapSatellite')}
              terrainLabel={t('cameraLocations.mapTerrain')}
              mapDetailsLabel={t('cameraLocations.mapDetails')}
            />
            <footer className="cam-loc__map-foot">
              <p className="cam-loc__map-hint">{t('cameraLocations.mapHint')}</p>
              <div className="cam-loc__map-stats">
                <span className="cam-loc__map-stat cam-loc__map-stat--blue">
                  <Cctv size={13} />
                  {counts.mappedCameras}/{counts.cameras}
                </span>
                <span className="cam-loc__map-stat cam-loc__map-stat--teal">
                  <Route size={13} />
                  {counts.mappedRoads}/{counts.roads}
                </span>
              </div>
            </footer>
          </div>
        </article>

        <article className="cam-loc__coverage-card">
          <header className="cam-loc__card-hero cam-loc__card-hero--coverage">
            <span className="cam-loc__chart-dot cam-loc__chart-dot--coverage" aria-hidden />
            <div className="cam-loc__card-hero-copy">
              <h2 className="cam-loc__card-hero-title">{t('cameraLocations.coverageTitle')}</h2>
              <p className="cam-loc__card-hero-sub">{t('cameraLocations.coverageSubtitle')}</p>
            </div>
            <div className="cam-loc__card-hero-icon cam-loc__card-hero-icon--coverage">
              <BarChart3 size={16} />
            </div>
          </header>
          <div className="cam-loc__coverage-body">
            <div className="cam-loc__coverage-ring-wrap">
              <div
                className="cam-loc__coverage-ring"
                style={{ '--coverage-pct': `${coverage.overallPct}` } as CSSProperties}
              >
                <span className="cam-loc__coverage-ring-value">
                  {coverage.overallPct}%
                </span>
                <span className="cam-loc__coverage-ring-label">{t('cameraLocations.coverageOverall')}</span>
              </div>
            </div>
            <div className="cam-loc__coverage-metrics">
              <article className="cam-loc__coverage-metric cam-loc__coverage-metric--blue">
                <div className="cam-loc__coverage-metric-head">
                  <span className="cam-loc__coverage-metric-icon"><Cctv size={15} /></span>
                  <span>{t('cameraLocations.coverageCameras')}</span>
                  <strong>{coverage.camerasPct}%</strong>
                </div>
                <div className="cam-loc__coverage-track">
                  <div
                    className="cam-loc__coverage-fill cam-loc__coverage-fill--blue"
                    style={{ width: `${coverage.camerasPct}%` }}
                  />
                </div>
                <p className="cam-loc__coverage-metric-meta">
                  {counts.mappedCameras}/{counts.cameras} {t('cameraLocations.mappedLabel')}
                </p>
              </article>
              <article className="cam-loc__coverage-metric cam-loc__coverage-metric--teal">
                <div className="cam-loc__coverage-metric-head">
                  <span className="cam-loc__coverage-metric-icon"><Route size={15} /></span>
                  <span>{t('cameraLocations.coverageRoads')}</span>
                  <strong>{coverage.roadsPct}%</strong>
                </div>
                <div className="cam-loc__coverage-track">
                  <div
                    className="cam-loc__coverage-fill cam-loc__coverage-fill--teal"
                    style={{ width: `${coverage.roadsPct}%` }}
                  />
                </div>
                <p className="cam-loc__coverage-metric-meta">
                  {counts.mappedRoads}/{counts.roads} {t('cameraLocations.mappedLabel')}
                </p>
              </article>
            </div>
          </div>
        </article>
      </section>

      <section className="cam-loc__registry">
        <header className="cam-loc__card-hero cam-loc__card-hero--registry cam-loc__registry-hero">
          <span className="cam-loc__chart-dot cam-loc__chart-dot--registry" aria-hidden />
          <div className="cam-loc__card-hero-copy cam-loc__registry-copy">
            <h2 className="cam-loc__card-hero-title cam-loc__registry-title">{t('cameraLocations.registryTitle')}</h2>
            <p className="cam-loc__card-hero-sub cam-loc__registry-sub">{t('cameraLocations.registrySubtitle')}</p>
          </div>
          <div className="cam-loc__card-hero-icon cam-loc__card-hero-icon--registry cam-loc__registry-icon">
            <MapPin size={16} />
          </div>
        </header>

        <div className="cam-loc__toolbar">
          <div className="cam-loc__toolbar-inner">
            <div className="enforcement-page__filters">
              {(['cameras', 'roads'] as const).map((id) => {
                const active = tab === id;
                const count = id === 'cameras' ? counts.cameras : counts.roads;
                const Icon = id === 'cameras' ? Cctv : Route;
                return (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      'enforcement-page__filter-btn',
                      active && 'enforcement-page__filter-btn--active',
                    )}
                    style={active ? { background: TAB_FILTER_STYLE[id] } : undefined}
                    onClick={() => setTab(id)}
                  >
                    <Icon size={14} className="inline mr-1 -mt-px" />
                    {id === 'cameras' ? t('cameraLocations.tabCameras') : t('cameraLocations.tabRoads')}
                    <span className={cn(
                      'enforcement-page__filter-count',
                      active && 'enforcement-page__filter-count--active',
                    )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="enforcement-page__search-wrap cam-loc__search-wrap">
              <Search size={14} className="enforcement-page__search-icon" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('cameraLocations.searchPlaceholder')}
                className="enforcement-page__search"
              />
            </div>
          </div>
        </div>

        {tab === 'cameras' ? (
          <div className="cam-loc__table-wrap">
            <Table className="enforcement-page__table mgmt-table__grid cam-loc__table">
              <TableHeader>
                <TableRow className="enforcement-page__table-head">
                  {columns.map((col) => (
                    <TableHead key={col.key} className={cn('enforcement-page__th text-left', col.className)}>
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((col) => (
                        <TableCell key={col.key}><div className="enforcement-page__skeleton" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : cameraRows.length === 0 ? (
                  <TableEmptyState
                    colSpan={columns.length}
                    tone="blue"
                    icon={<Cctv size={28} />}
                    title={t('cameraLocations.emptyCameras')}
                  />
                ) : cameraPagination.pageItems.map((c) => (
                  <TableRow
                    key={c.id}
                    className={cn(
                      'enforcement-page__table-row',
                      !hasCoords(c.latitude, c.longitude) && 'cam-loc__row--unmapped',
                    )}
                  >
                    <TableCell><span className="enforcement-page__cell-primary">{c.name}</span></TableCell>
                    <TableCell><CoordCell value={c.latitude} emptyLabel={t('cameraLocations.noCoords')} /></TableCell>
                    <TableCell><CoordCell value={c.longitude} emptyLabel={t('cameraLocations.noCoords')} /></TableCell>
                    <TableCell>{c.road_name}</TableCell>
                    <TableCell>{renderStatus(c.status)}</TableCell>
                    <TableCell>
                      <CrudRowActions onEdit={() => openEdit('cameras', c.id, c.name, c.latitude, c.longitude)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination pagination={cameraPagination} labelKey="pagination.label.cameras" />
          </div>
        ) : (
          <div className="cam-loc__table-wrap">
            <Table className="enforcement-page__table mgmt-table__grid cam-loc__table">
              <TableHeader>
                <TableRow className="enforcement-page__table-head">
                  {columns.map((col) => (
                    <TableHead key={col.key} className={cn('enforcement-page__th text-left', col.className)}>
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((col) => (
                        <TableCell key={col.key}><div className="enforcement-page__skeleton" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : roadRows.length === 0 ? (
                  <TableEmptyState
                    colSpan={columns.length}
                    tone="blue"
                    icon={<Route size={28} />}
                    title={t('cameraLocations.emptyRoads')}
                  />
                ) : roadPagination.pageItems.map((r) => (
                  <TableRow
                    key={r.id}
                    className={cn(
                      'enforcement-page__table-row',
                      !hasCoords(r.latitude, r.longitude) && 'cam-loc__row--unmapped',
                    )}
                  >
                    <TableCell><span className="enforcement-page__cell-primary">{r.name}</span></TableCell>
                    <TableCell><CoordCell value={r.latitude} emptyLabel={t('cameraLocations.noCoords')} /></TableCell>
                    <TableCell><CoordCell value={r.longitude} emptyLabel={t('cameraLocations.noCoords')} /></TableCell>
                    <TableCell>{r.city}</TableCell>
                    <TableCell>{renderStatus(r.status)}</TableCell>
                    <TableCell>
                      <CrudRowActions onEdit={() => openEdit('roads', r.id, r.name, r.latitude, r.longitude)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination pagination={roadPagination} labelKey="pagination.label.roads" />
          </div>
        )}
      </section>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent accent="blue" className="max-w-xl cam-loc__coords-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--primary">
                <Pencil size={15} />
              </div>
              <span className="enforcement-page__dialog-title">
                {t('cameraLocations.editCoords')}
              </span>
            </DialogTitle>
          </DialogHeader>
          {editItem ? (
            <div className="cam-loc__coords-form space-y-3 py-1">
              <p className="text-sm font-semibold text-foreground">{editItem.name}</p>
              <CoordinatePickerMap
                lat={pickedLat}
                lng={pickedLng}
                kind={editItem.kind}
                onPick={pickCoords}
                ariaLabel={t('cameraLocations.mapPickerLabel')}
                hint={t('cameraLocations.mapPickerHint')}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="enforcement-page__form-label">{t('cameraLocations.colLat')}</Label>
                  <Input
                    className="mt-1"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="11.5564"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('cameraLocations.colLng')}</Label>
                  <Input
                    className="mt-1"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="104.9282"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>{t('users.cancel')}</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
