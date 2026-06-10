import { useEffect, useMemo, useState, useCallback } from 'react';
import { Car, Plus, Trash2, Search, Truck, Bike } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { vehiclesAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Vehicle } from '@shared/types';

const TYPE_ICON: Record<string, string> = {
  car: '🚗',
  motorcycle: '🏍️',
  truck: '🚚',
  bus: '🚌',
  'tuk-tuk': '🛺',
};

const VEHICLE_TYPES = ['car', 'motorcycle', 'truck', 'bus', 'tuk-tuk'] as const;
type VehicleType = typeof VEHICLE_TYPES[number];
type TypeTab = 'all' | VehicleType;

const TYPE_TABS: TypeTab[] = ['all', ...VEHICLE_TYPES];

const TYPE_STYLE: Record<VehicleType, { bg: string; color: string; gradient: string }> = {
  car: { bg: 'rgba(37,99,235,0.1)', color: '#2563EB', gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)' },
  motorcycle: { bg: 'rgba(245,158,11,0.12)', color: '#D97706', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  truck: { bg: 'rgba(100,116,139,0.12)', color: '#475569', gradient: 'linear-gradient(135deg, #64748B, #475569)' },
  bus: { bg: 'rgba(139,92,246,0.12)', color: '#7C3AED', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
  'tuk-tuk': { bg: 'rgba(16,185,129,0.12)', color: '#059669', gradient: 'linear-gradient(135deg, #10B981, #059669)' },
};

const STAT_CARDS = [
  { key: 'all', labelKey: 'vehicles.statTotal', icon: Car, variant: 'teal', filterable: true },
  { key: 'car', labelKey: 'vehicles.statCars', icon: Car, variant: 'blue', filterable: true },
  { key: 'motorcycle', labelKey: 'vehicles.statMotorcycles', icon: Bike, variant: 'amber', filterable: true },
  { key: 'commercial', labelKey: 'vehicles.statCommercial', icon: Truck, variant: 'slate', filterable: false },
] as const;

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
}

function getColorDot(color: string) {
  const c = color.toLowerCase();
  if (c.includes('white')) return '#fff';
  if (c.includes('black')) return '#000';
  if (c.includes('red')) return '#EF4444';
  if (c.includes('blue')) return '#2563EB';
  if (c.includes('silver') || c.includes('grey') || c.includes('gray')) return '#9CA3AF';
  return '#D1D5DB';
}

export function VehiclesPage() {
  const { t, locale } = useLanguage();
  const dateLocale = locale === 'km' ? 'km-KH' : 'en-US';
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeTab>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    plate_number: '',
    vehicle_type: '',
    model: '',
    color: '',
    year: new Date().getFullYear().toString(),
  });

  const isDriver = user?.role === 'driver';
  const typeLabel = (type: string) => t(`vehicles.types.${type === 'tuk-tuk' ? 'tukTuk' : type}`);

  const loadVehicles = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const data = isDriver ? await vehiclesAPI.getByOwner(user.id) : await vehiclesAPI.getAll();
      setVehicles(data);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isDriver, user]);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);
  useLiveData(() => loadVehicles(true), 30_000, Boolean(user));

  const filtered = useMemo(() => {
    let rows = [...vehicles];
    if (typeFilter !== 'all') rows = rows.filter((v) => v.vehicle_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((v) =>
        v.plate_number.toLowerCase().includes(q)
        || v.model.toLowerCase().includes(q)
        || v.owner_name.toLowerCase().includes(q)
        || v.color.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [vehicles, search, typeFilter]);

  const counts = useMemo(() => ({
    all: vehicles.length,
    car: vehicles.filter((v) => v.vehicle_type === 'car').length,
    motorcycle: vehicles.filter((v) => v.vehicle_type === 'motorcycle').length,
    truck: vehicles.filter((v) => v.vehicle_type === 'truck').length,
    bus: vehicles.filter((v) => v.vehicle_type === 'bus').length,
    'tuk-tuk': vehicles.filter((v) => v.vehicle_type === 'tuk-tuk').length,
    commercial: vehicles.filter((v) => ['truck', 'bus', 'tuk-tuk'].includes(v.vehicle_type)).length,
  }), [vehicles]);

  const getTypeMeta = (type: string) => TYPE_STYLE[type as VehicleType] ?? TYPE_STYLE.car;

  const handleAdd = async () => {
    if (!user || !form.plate_number || !form.vehicle_type || !form.model || !form.color) {
      toast.error(t('vehicles.toastFillRequired'));
      return;
    }
    setAdding(true);
    try {
      await vehiclesAPI.create({
        owner_id: user.id,
        plate_number: form.plate_number,
        vehicle_type: form.vehicle_type as Vehicle['vehicle_type'],
        model: form.model,
        color: form.color,
        year: parseInt(form.year, 10),
      });
      toast.success(t('vehicles.toastRegistered'));
      setAddOpen(false);
      setForm({ plate_number: '', vehicle_type: '', model: '', color: '', year: new Date().getFullYear().toString() });
      loadVehicles();
    } catch {
      toast.error(t('vehicles.toastRegisterFail'));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await vehiclesAPI.delete(id);
      toast.success(t('vehicles.toastRemoved'));
      setDeleteId(null);
      loadVehicles();
    } catch {
      toast.error(t('vehicles.toastRemoveFail'));
    }
  };

  const tableHeaders = [
    t('vehicles.colPlate'),
    t('vehicles.colType'),
    t('vehicles.colModel'),
    t('vehicles.colColor'),
    t('vehicles.colYear'),
    ...(isDriver ? [] : [t('vehicles.colOwner')]),
    t('vehicles.colRegistered'),
    t('vehicles.colActions'),
  ];

  return (
    <div className="enforcement-page enforcement-page--vehicles dashboard-page--vehicles">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Car size={14} />
              </span>
              {t('pages.vehicles.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">
              {isDriver ? t('pages.vehicles.titleDriver') : t('pages.vehicles.titleAdmin')}
            </h1>
            <p className="enforcement-page__subtitle">
              {vehicles.length === 1
                ? t('pages.vehicles.heroSubtitleOne')
                : t('pages.vehicles.heroSubtitleMany', { count: vehicles.length })}
            </p>
          </div>
          <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--teal" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> {t('vehicles.register')}
          </button>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = card.key === 'commercial' ? counts.commercial : counts[card.key as keyof typeof counts];
          const active = card.filterable && typeFilter === card.key;
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
              onClick={() => setTypeFilter(card.key as TypeTab)}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant}${active ? ' enforcement-page__stat-card--active' : ''}`}
            >
              {inner}
            </button>
          );
        })}
      </div>

      <div className="enforcement-page__toolbar">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="enforcement-page__filters">
            {TYPE_TABS.map((tab) => {
              const active = typeFilter === tab;
              const meta = tab !== 'all' ? getTypeMeta(tab) : null;
              const count = counts[tab];
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTypeFilter(tab)}
                  className={`enforcement-page__filter-btn${active ? ' enforcement-page__filter-btn--active' : ''}`}
                  style={active ? { background: meta?.gradient ?? 'linear-gradient(135deg, #0F172A, #1E293B)' } : undefined}
                >
                  {tab === 'all' ? t('vehicles.types.all') : typeLabel(tab)}
                  <span className={`enforcement-page__filter-count${active ? ' enforcement-page__filter-count--active' : ''}`}>
                    {count}
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
              placeholder={t('vehicles.searchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
        </div>
      </div>

      {isDriver ? (
        loading ? (
          <div className="enforcement-page__vehicle-grid">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="enforcement-page__vehicle-card enforcement-page__skeleton" style={{ height: '10rem' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="enforcement-page__panel enforcement-page__panel--vehicles">
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="enforcement-page__empty-icon enforcement-page__empty-icon--teal">
                <Car size={28} />
              </div>
              <div className="text-center">
                <p className="enforcement-page__empty-title">{search ? t('vehicles.empty') : t('vehicles.emptyDriver')}</p>
                <p className="enforcement-page__empty-subtitle">{t('vehicles.emptyHint')}</p>
              </div>
              {!search && (
                <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--teal" onClick={() => setAddOpen(true)}>
                  <Plus size={14} /> {t('vehicles.addFirst')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="enforcement-page__vehicle-grid">
            {filtered.map((v) => {
              const meta = getTypeMeta(v.vehicle_type);
              return (
                <div key={v.id} className="enforcement-page__vehicle-card">
                  <div className="enforcement-page__vehicle-card-top">
                    <span className="enforcement-page__vehicle-icon">{TYPE_ICON[v.vehicle_type] || '🚗'}</span>
                    <button type="button" className="enforcement-page__icon-btn enforcement-page__icon-btn--delete" onClick={() => setDeleteId(v.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="enforcement-page__vehicle-card-body">
                    <div className="flex items-center justify-between gap-2">
                      <span className="enforcement-page__code-pill">{v.plate_number}</span>
                      <span className="enforcement-page__badge" style={{ background: meta.bg, color: meta.color }}>
                        {typeLabel(v.vehicle_type)}
                      </span>
                    </div>
                    <p className="enforcement-page__cell-primary mt-2">{v.model}</p>
                    <div className="enforcement-page__vehicle-meta">
                      <span className="enforcement-page__color-dot" style={{ backgroundColor: getColorDot(v.color) }} />
                      <span>{v.color} · {v.year}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="enforcement-page__panel enforcement-page__panel--vehicles">
          <div className="overflow-x-auto">
            <Table className="enforcement-page__table">
              <TableHeader>
                <TableRow className="enforcement-page__table-head">
                  {tableHeaders.map((h) => (
                    <TableHead key={h} className="enforcement-page__th text-center">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(tableHeaders.length)].map((__, j) => (
                        <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tableHeaders.length} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="enforcement-page__empty-icon enforcement-page__empty-icon--teal">
                          <Car size={28} />
                        </div>
                        <div>
                          <p className="enforcement-page__empty-title">{t('vehicles.empty')}</p>
                          <p className="enforcement-page__empty-subtitle">{t('vehicles.emptyHint')}</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((row) => {
                  const meta = getTypeMeta(row.vehicle_type);
                  return (
                    <TableRow key={row.id} className="enforcement-page__table-row">
                      <TableCell className="py-3.5">
                        <span className="enforcement-page__code-pill">{row.plate_number}</span>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__badge" style={{ background: meta.bg, color: meta.color }}>
                          {TYPE_ICON[row.vehicle_type]} {typeLabel(row.vehicle_type)}
                        </span>
                      </TableCell>
                      <TableCell><span className="enforcement-page__cell-primary">{row.model}</span></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="enforcement-page__color-dot" style={{ backgroundColor: getColorDot(row.color) }} />
                          <span className="enforcement-page__cell-body">{row.color}</span>
                        </div>
                      </TableCell>
                      <TableCell><span className="enforcement-page__cell-secondary">{row.year}</span></TableCell>
                      {!isDriver && (
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="enforcement-page__avatar enforcement-page__avatar--owner">
                              {initials(row.owner_name)}
                            </div>
                            <span className="enforcement-page__cell-primary">{row.owner_name}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="enforcement-page__cell-secondary">
                          {new Date(row.created_at).toLocaleDateString(dateLocale)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <button type="button" className="enforcement-page__icon-btn enforcement-page__icon-btn--delete" onClick={() => setDeleteId(row.id)}>
                          <Trash2 size={14} />
                        </button>
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
                {t('vehicles.showing', { shown: filtered.length, total: vehicles.length })}
              </p>
            </div>
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--teal">
                <Plus size={15} />
              </div>
              <span className="enforcement-page__dialog-title">{t('vehicles.registerTitle')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="enforcement-page__form-label">{t('vehicles.plateLabel')} *</Label>
              <Input
                className="mt-1"
                placeholder={t('vehicles.platePlaceholder')}
                value={form.plate_number}
                onChange={(e) => setForm((f) => ({ ...f, plate_number: e.target.value }))}
              />
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('vehicles.typeLabel')} *</Label>
              <Select onValueChange={(v) => setForm((f) => ({ ...f, vehicle_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t('vehicles.selectType')} /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {TYPE_ICON[type]} {typeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('vehicles.modelLabel')} *</Label>
              <Input
                className="mt-1"
                placeholder={t('vehicles.modelPlaceholder')}
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="enforcement-page__form-label">{t('vehicles.colorLabel')} *</Label>
                <Input
                  className="mt-1"
                  placeholder={t('vehicles.colorPlaceholder')}
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                />
              </div>
              <div>
                <Label className="enforcement-page__form-label">{t('vehicles.yearLabel')}</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="2000"
                  max={new Date().getFullYear() + 1}
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t('vehicles.cancel')}</Button>
            <button type="button" className="enforcement-page__btn-primary enforcement-page__btn-teal" onClick={handleAdd} disabled={adding}>
              {adding ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t('vehicles.registering')}
                </>
              ) : (
                <>
                  <Plus size={14} /> {t('vehicles.register')}
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="enforcement-page__dialog-title">{t('vehicles.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="enforcement-page__dialog-text">{t('vehicles.deleteConfirm')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{t('vehicles.cancel')}</Button>
            <button type="button" className="enforcement-page__btn-danger" onClick={() => deleteId && handleDelete(deleteId)}>
              {t('vehicles.remove')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
