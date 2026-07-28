import { useEffect, useMemo, useState, useCallback } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { useFieldErrors } from '@shared/hooks/useFieldErrors';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { Car, Plus, Trash2, Search, Truck, Bike, Eye, Hash, Palette, Calendar, User, Bus, Pencil, Upload, X, ChevronDown, MapPin } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { FieldError, FormErrorBanner } from '@shared/components/ui/FieldError';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { EmptyStatePanel, TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { driversAPI, vehiclesAPI } from '@shared/services/api';
import { CambodiaPlateField, formatCambodiaPlate, getCambodiaProvince, inferProvinceCodeFromPlate, isValidCambodiaPlate } from '@shared/components/admin/CambodiaPlateField';
import { PLATE_FORMAT_EXAMPLE } from '@shared/utils/cambodiaIdentity';
import {
  getVehicleImageUrl,
  getVehiclePlaceholderImage,
  getVehicleStockImage,
} from '@shared/utils/vehicleImage';
import { toast } from 'sonner';
import type { DriverProfile, Vehicle } from '@shared/types';

type VehicleFormField = 'owner_id' | 'plate_number' | 'vehicle_type' | 'model' | 'color';

const EMPTY_FORM = {
  owner_id: '',
  plate_number: '',
  vehicle_type: '',
  model: '',
  color: '',
  year: new Date().getFullYear().toString(),
};

function driverLabel(driver: DriverProfile) {
  const detail = driver.license_no || driver.email;
  return detail ? `${driver.full_name} (${detail})` : driver.full_name;
}

function buildVehiclePayload(
  fields: {
    owner_id?: string;
    plate_number: string;
    vehicle_type: string;
    model: string;
    color: string;
    year: string;
  },
  photo?: File | null,
): FormData | Partial<Vehicle> {
  if (photo) {
    const form = new FormData();
    if (fields.owner_id) form.append('owner_id', fields.owner_id);
    form.append('plate_number', fields.plate_number.trim());
    form.append('vehicle_type', fields.vehicle_type);
    form.append('model', fields.model.trim());
    form.append('color', fields.color.trim());
    form.append('year', fields.year);
    form.append('registration_photo', photo, photo.name);
    return form;
  }
  return {
    ...(fields.owner_id ? { owner_id: fields.owner_id } : {}),
    plate_number: fields.plate_number.trim(),
    vehicle_type: fields.vehicle_type as Vehicle['vehicle_type'],
    model: fields.model.trim(),
    color: fields.color.trim(),
    year: parseInt(fields.year, 10),
  };
}

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

function vehicleTypeIcon(type: string) {
  if (type === 'motorcycle') return Bike;
  if (type === 'truck') return Truck;
  if (type === 'bus') return Bus;
  return Car;
}

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

function VehiclePhoto({ vehicle, className }: { vehicle: Vehicle; className?: string }) {
  const stock = getVehicleStockImage(vehicle.vehicle_type, vehicle.id, vehicle.model);
  const placeholder = getVehiclePlaceholderImage();
  const [src, setSrc] = useState(() => getVehicleImageUrl(vehicle));

  useEffect(() => {
    setSrc(getVehicleImageUrl(vehicle));
  }, [vehicle.id, vehicle.registration_photo, vehicle.vehicle_type, vehicle.model]);

  return (
    <img
      src={src}
      alt={vehicle.model}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        setSrc((current) => {
          if (current !== stock && current !== placeholder) return stock;
          if (current !== placeholder) return placeholder;
          return current;
        });
      }}
    />
  );
}

export function VehiclesPage() {
  const { t, locale } = useLanguage();
  const dateLocale = locale === 'km' ? 'km-KH' : 'en-US';
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeTab>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [editing, setEditing] = useState(false);
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [plateProvince, setPlateProvince] = useState('12');
  const formErrors = useFieldErrors<VehicleFormField>();

  const isDriver = user?.role === 'driver';
  const typeLabel = (type: string) => t(`vehicles.types.${type === 'tuk-tuk' ? 'tukTuk' : type}`);
  const renderTypeLabel = (type: string, iconSize = 12) => {
    const TypeIcon = vehicleTypeIcon(type);
    return (
      <span className="inline-flex items-center gap-1">
        <TypeIcon size={iconSize} aria-hidden />
        {typeLabel(type)}
      </span>
    );
  };

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

  const loadDrivers = useCallback(async () => {
    if (isDriver || !addOpen) return;
    setDriversLoading(true);
    try {
      const rows = await driversAPI.getAll();
      setDrivers(rows.filter((driver) => driver.status === 'active'));
    } catch {
      toast.error(t('vehicles.toastDriversLoadFail'));
    } finally {
      setDriversLoading(false);
    }
  }, [addOpen, isDriver, t]);

  useEffect(() => { void loadDrivers(); }, [loadDrivers]);

  useEffect(() => () => {
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const filteredDrivers = useMemo(() => {
    const q = ownerQuery.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((driver) =>
      driver.full_name.toLowerCase().includes(q)
      || driver.email.toLowerCase().includes(q)
      || (driver.license_no || '').toLowerCase().includes(q)
      || (driver.phone || '').toLowerCase().includes(q),
    );
  }, [drivers, ownerQuery]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, year: new Date().getFullYear().toString() });
    setOwnerQuery('');
    setOwnerMenuOpen(false);
    setPlateProvince('12');
    formErrors.clearErrors();
    setPhotoFile(null);
    setPhotoPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handlePlateChange = (plate_number: string) => {
    formErrors.clearField('plate_number');
    setForm((f) => ({ ...f, plate_number }));
    const inferred = inferProvinceCodeFromPlate(plate_number);
    if (inferred) setPlateProvince(inferred);
  };

  const handlePhotoChange = (file: File | null) => {
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error(t('vehicles.toastPhotoInvalid'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t('vehicles.toastPhotoTooLarge'));
      return;
    }
    setPhotoFile(file);
    setPhotoPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const selectOwner = (driver: DriverProfile) => {
    formErrors.clearField('owner_id');
    setForm((current) => ({ ...current, owner_id: driver.user_id }));
    setOwnerQuery(driverLabel(driver));
    setOwnerMenuOpen(false);
  };

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

  const pagination = usePagination(filtered);

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
    const plate = formatCambodiaPlate(form.plate_number);
    const messages: Partial<Record<VehicleFormField, string>> = {
      plate_number: t('common.fieldRequired'),
      vehicle_type: t('common.fieldRequired'),
      model: t('common.fieldRequired'),
      color: t('common.fieldRequired'),
    };
    if (!isDriver) messages.owner_id = t('common.fieldRequired');
    const ok = formErrors.validateRequired(
      {
        owner_id: isDriver ? 'self' : form.owner_id,
        plate_number: plate,
        vehicle_type: form.vehicle_type,
        model: form.model,
        color: form.color,
      },
      messages,
    );
    if (!user || !ok) {
      toast.error(t('common.formIncomplete'));
      return;
    }
    if (!isValidCambodiaPlate(plate)) {
      formErrors.setFieldError('plate_number', `Plate must match ${PLATE_FORMAT_EXAMPLE}`);
      toast.error(`Plate must match ${PLATE_FORMAT_EXAMPLE}`);
      return;
    }
    setAdding(true);
    try {
      await vehiclesAPI.create(buildVehiclePayload({
        owner_id: isDriver ? user.id : form.owner_id,
        plate_number: plate,
        vehicle_type: form.vehicle_type,
        model: form.model,
        color: form.color,
        year: form.year,
      }, photoFile));
      toast.success(t('vehicles.toastRegistered'));
      setAddOpen(false);
      resetForm();
      loadVehicles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('vehicles.toastRegisterFail'));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await vehiclesAPI.delete(id);
      toast.success(t('vehicles.toastRemoved'));
      setDeleteId(null);
      loadVehicles();
    } catch {
      toast.error(t('vehicles.toastRemoveFail'));
    }
  };

  const openEdit = (vehicle: Vehicle) => {
    setEditVehicle(vehicle);
    formErrors.clearErrors();
    setForm({
      owner_id: vehicle.owner_id,
      plate_number: vehicle.plate_number,
      vehicle_type: vehicle.vehicle_type,
      model: vehicle.model,
      color: vehicle.color,
      year: String(vehicle.year),
    });
    setPlateProvince(inferProvinceCodeFromPlate(vehicle.plate_number) || '12');
    setOwnerQuery(vehicle.owner_name || '');
    setPhotoFile(null);
    setPhotoPreview(vehicle.registration_photo || null);
  };

  const handleEdit = async () => {
    const plate = formatCambodiaPlate(form.plate_number);
    const ok = formErrors.validateRequired(
      {
        plate_number: plate,
        vehicle_type: form.vehicle_type,
        model: form.model,
        color: form.color,
      },
      {
        plate_number: t('common.fieldRequired'),
        vehicle_type: t('common.fieldRequired'),
        model: t('common.fieldRequired'),
        color: t('common.fieldRequired'),
      },
    );
    if (!editVehicle || !ok) {
      toast.error(t('common.formIncomplete'));
      return;
    }
    if (!isValidCambodiaPlate(plate)) {
      formErrors.setFieldError('plate_number', `Plate must match ${PLATE_FORMAT_EXAMPLE}`);
      toast.error(`Plate must match ${PLATE_FORMAT_EXAMPLE}`);
      return;
    }
    setEditing(true);
    try {
      await vehiclesAPI.update(editVehicle.id, buildVehiclePayload({
        plate_number: plate,
        vehicle_type: form.vehicle_type,
        model: form.model,
        color: form.color,
        year: form.year,
      }, photoFile));
      toast.success(t('vehicles.toastUpdated'));
      setEditVehicle(null);
      resetForm();
      loadVehicles();
    } catch {
      toast.error(t('vehicles.toastUpdateFail'));
    } finally {
      setEditing(false);
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
              <div key={i} className="enforcement-page__vehicle-card enforcement-page__skeleton" style={{ height: '14.5rem' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyStatePanel
            className="enforcement-page__panel enforcement-page__panel--vehicles"
            tone="teal"
            icon={<Car size={28} />}
            title={search ? t('vehicles.empty') : t('vehicles.emptyDriver')}
            subtitle={t('vehicles.emptyHint')}
            action={
              !search
                ? { label: t('vehicles.addFirst'), onClick: () => setAddOpen(true), icon: <Plus size={14} /> }
                : undefined
            }
          />
        ) : (
          <div className="enforcement-page__vehicle-grid">
            {filtered.map((v) => {
              const meta = getTypeMeta(v.vehicle_type);
              return (
                <div key={v.id} className="enforcement-page__vehicle-card">
                  <div className="enforcement-page__vehicle-media">
                    <VehiclePhoto vehicle={v} className="enforcement-page__vehicle-photo" />
                    <div className="enforcement-page__vehicle-media-overlay" aria-hidden />
                    <span
                      className="enforcement-page__vehicle-type-badge"
                      style={{ background: meta.bg, color: meta.color, borderColor: `${meta.color}30` }}
                    >
                      {typeLabel(v.vehicle_type)}
                    </span>
                    <div className="enforcement-page__vehicle-media-actions">
                      <button
                        type="button"
                        className="vehicles-page__action-btn vehicles-page__action-btn--view"
                        onClick={() => setViewVehicle(v)}
                        aria-label={t('vehicles.view')}
                      >
                        <Eye size={15} />
                      </button>
                      {(isDriver || user?.role === 'admin' || user?.role === 'police') && (
                        <button
                          type="button"
                          className="vehicles-page__action-btn vehicles-page__action-btn--edit"
                          onClick={() => openEdit(v)}
                          aria-label={t('common.edit')}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="vehicles-page__action-btn vehicles-page__action-btn--delete"
                        onClick={() => setDeleteId(v.id)}
                        aria-label={t('vehicles.remove')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="enforcement-page__vehicle-card-body">
                    <span className="enforcement-page__code-pill">{formatCambodiaPlate(v.plate_number)}</span>
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
            <Table className="enforcement-page__table mgmt-table__grid">
              <TableHeader>
                <TableRow className="enforcement-page__table-head">
                  {tableHeaders.map((h) => (
                    <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
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
                  <TableEmptyState
                    colSpan={tableHeaders.length}
                    tone="teal"
                    icon={<Car size={28} />}
                    title={t('vehicles.empty')}
                    subtitle={t('vehicles.emptyHint')}
                  />
                ) : pagination.pageItems.map((row) => {
                  const meta = getTypeMeta(row.vehicle_type);
                  return (
                    <TableRow key={row.id} className="enforcement-page__table-row">
                      <TableCell className="py-3.5">
                        <span className="enforcement-page__code-pill">{formatCambodiaPlate(row.plate_number)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="enforcement-page__badge" style={{ background: meta.bg, color: meta.color }}>
                          {renderTypeLabel(row.vehicle_type)}
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
                        <div className="enforcement-page__table-actions vehicles-page__actions">
                          <button
                            type="button"
                            className="vehicles-page__action-btn vehicles-page__action-btn--view"
                            onClick={() => setViewVehicle(row)}
                            aria-label={t('vehicles.view')}
                          >
                            <Eye size={13} />
                          </button>
                          {(isDriver || user?.role === 'admin' || user?.role === 'police') && (
                            <button
                              type="button"
                              className="vehicles-page__action-btn vehicles-page__action-btn--edit"
                              onClick={() => openEdit(row)}
                              aria-label={t('common.edit')}
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="vehicles-page__action-btn vehicles-page__action-btn--delete"
                            onClick={() => setDeleteId(row.id)}
                            aria-label={t('vehicles.remove')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <TablePagination pagination={pagination} labelKey="pagination.label.vehicles" />
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(open) => {
        setAddOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="vehicles-form-dialog max-w-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--teal">
                <Plus size={15} />
              </div>
              <span className="enforcement-page__dialog-title">{t('vehicles.registerTitle')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="vehicles-form-dialog__body">
            <FormErrorBanner message={formErrors.hasErrors ? t('common.formIncomplete') : null} />
            {!isDriver ? (
              <div>
                <Label className="enforcement-page__form-label">
                  {t('vehicles.ownerDriverLabel')} *
                </Label>
                <div className="relative mt-1">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className={`pl-9 pr-9${formErrors.errors.owner_id ? ' ct-field--invalid' : ''}`}
                    placeholder={
                      driversLoading
                        ? t('common.loading')
                        : t('vehicles.selectOwnerDriver')
                    }
                    value={ownerQuery}
                    disabled={driversLoading}
                    aria-invalid={Boolean(formErrors.errors.owner_id)}
                    onFocus={() => setOwnerMenuOpen(true)}
                    onChange={(e) => {
                      const value = e.target.value;
                      formErrors.clearField('owner_id');
                      setOwnerQuery(value);
                      setOwnerMenuOpen(true);
                      setForm((current) => ({ ...current, owner_id: '' }));
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setOwnerMenuOpen(false), 120);
                    }}
                    autoComplete="off"
                  />
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  {ownerMenuOpen ? (
                    <div className="vehicles-owner-combobox" role="listbox">
                      {filteredDrivers.length === 0 ? (
                        <div className="vehicles-owner-combobox__empty">
                          {t('vehicles.noDriverMatch')}
                        </div>
                      ) : (
                        filteredDrivers.slice(0, 8).map((driver) => (
                          <button
                            key={driver.id}
                            type="button"
                            role="option"
                            className="vehicles-owner-combobox__option"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectOwner(driver)}
                          >
                            <User size={14} aria-hidden />
                            <span className="vehicles-owner-combobox__name">{driver.full_name}</span>
                            <span className="vehicles-owner-combobox__meta">
                              {driver.license_no || driver.email}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
                <FieldError message={formErrors.errors.owner_id} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('vehicles.ownerDriverHint')}
                </p>
                {!driversLoading && drivers.length === 0 ? (
                  <p className="mt-1 text-xs text-red-600">{t('vehicles.noActiveDrivers')}</p>
                ) : null}
              </div>
            ) : null}

            <div className="vehicles-form-dialog__grid">
              <div className="vehicles-form-dialog__panel">
                <p className="vehicles-form-dialog__panel-title">{t('vehicles.plateSection')}</p>
                <Label className="enforcement-page__form-label">{t('vehicles.plateLabel')} *</Label>
                <div className="mt-1">
                  <CambodiaPlateField
                    value={form.plate_number}
                    onChange={handlePlateChange}
                    provinceCode={plateProvince}
                    onProvinceChange={setPlateProvince}
                    provinceLabel={t('vehicles.provinceLabel')}
                    variant="full"
                  />
                </div>
                <FieldError message={formErrors.errors.plate_number} />
              </div>

              <div className="vehicles-form-dialog__panel">
                <p className="vehicles-form-dialog__panel-title">{t('vehicles.detailsSection')}</p>
                <div>
                  <Label className="enforcement-page__form-label">{t('vehicles.typeLabel')} *</Label>
                  <Select
                    value={form.vehicle_type}
                    onValueChange={(v) => {
                      formErrors.clearField('vehicle_type');
                      setForm((f) => ({ ...f, vehicle_type: v }));
                    }}
                  >
                    <SelectTrigger
                      className={`mt-1${formErrors.errors.vehicle_type ? ' ct-field--invalid' : ''}`}
                      aria-invalid={Boolean(formErrors.errors.vehicle_type)}
                    >
                      <SelectValue placeholder={t('vehicles.selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {renderTypeLabel(type, 14)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={formErrors.errors.vehicle_type} />
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('vehicles.modelLabel')} *</Label>
                  <Input
                    className={`mt-1${formErrors.errors.model ? ' ct-field--invalid' : ''}`}
                    placeholder={t('vehicles.modelPlaceholder')}
                    value={form.model}
                    aria-invalid={Boolean(formErrors.errors.model)}
                    onChange={(e) => {
                      formErrors.clearField('model');
                      setForm((f) => ({ ...f, model: e.target.value }));
                    }}
                  />
                  <FieldError message={formErrors.errors.model} />
                </div>
                <div className="vehicles-form-dialog__row-2">
                  <div>
                    <Label className="enforcement-page__form-label">{t('vehicles.colorLabel')} *</Label>
                    <Input
                      className={`mt-1${formErrors.errors.color ? ' ct-field--invalid' : ''}`}
                      placeholder={t('vehicles.colorPlaceholder')}
                      value={form.color}
                      aria-invalid={Boolean(formErrors.errors.color)}
                      onChange={(e) => {
                        formErrors.clearField('color');
                        setForm((f) => ({ ...f, color: e.target.value }));
                      }}
                    />
                    <FieldError message={formErrors.errors.color} />
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
                <div>
                  <Label className="enforcement-page__form-label">{t('vehicles.photoLabel')}</Label>
                  <label className="vehicles-photo-upload mt-1">
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="vehicles-photo-upload__preview" />
                    ) : (
                      <span className="vehicles-photo-upload__placeholder">
                        <Upload size={18} />
                        <span>{t('vehicles.photoHint')}</span>
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                    />
                  </label>
                  {photoPreview ? (
                    <button
                      type="button"
                      className="vehicles-photo-upload__clear"
                      onClick={() => handlePhotoChange(null)}
                    >
                      <X size={12} /> {t('vehicles.photoClear')}
                    </button>
                  ) : null}
                </div>
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

      <Dialog open={editVehicle !== null} onOpenChange={(open) => {
        if (!open) {
          setEditVehicle(null);
          resetForm();
        }
      }}>
        <DialogContent className="vehicles-form-dialog max-w-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="enforcement-page__dialog-title">{t('vehicles.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="vehicles-form-dialog__body">
            <FormErrorBanner message={formErrors.hasErrors ? t('common.formIncomplete') : null} />
            <div className="vehicles-form-dialog__grid">
              <div className="vehicles-form-dialog__panel">
                <p className="vehicles-form-dialog__panel-title">{t('vehicles.plateSection')}</p>
                <Label className="enforcement-page__form-label">{t('vehicles.plateLabel')} *</Label>
                <div className="mt-1">
                  <CambodiaPlateField
                    value={form.plate_number}
                    onChange={handlePlateChange}
                    provinceCode={plateProvince}
                    onProvinceChange={setPlateProvince}
                    provinceLabel={t('vehicles.provinceLabel')}
                    variant="full"
                  />
                </div>
                <FieldError message={formErrors.errors.plate_number} />
              </div>
              <div className="vehicles-form-dialog__panel">
                <p className="vehicles-form-dialog__panel-title">{t('vehicles.detailsSection')}</p>
                <div>
                  <Label className="enforcement-page__form-label">{t('vehicles.typeLabel')} *</Label>
                  <Select
                    value={form.vehicle_type}
                    onValueChange={(v) => {
                      formErrors.clearField('vehicle_type');
                      setForm((f) => ({ ...f, vehicle_type: v }));
                    }}
                  >
                    <SelectTrigger
                      className={`mt-1${formErrors.errors.vehicle_type ? ' ct-field--invalid' : ''}`}
                      aria-invalid={Boolean(formErrors.errors.vehicle_type)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{renderTypeLabel(type, 14)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={formErrors.errors.vehicle_type} />
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('vehicles.modelLabel')} *</Label>
                  <Input
                    className={`mt-1${formErrors.errors.model ? ' ct-field--invalid' : ''}`}
                    value={form.model}
                    aria-invalid={Boolean(formErrors.errors.model)}
                    onChange={(e) => {
                      formErrors.clearField('model');
                      setForm((f) => ({ ...f, model: e.target.value }));
                    }}
                  />
                  <FieldError message={formErrors.errors.model} />
                </div>
                <div className="vehicles-form-dialog__row-2">
                  <div>
                    <Label className="enforcement-page__form-label">{t('vehicles.colorLabel')} *</Label>
                    <Input
                      className={`mt-1${formErrors.errors.color ? ' ct-field--invalid' : ''}`}
                      value={form.color}
                      aria-invalid={Boolean(formErrors.errors.color)}
                      onChange={(e) => {
                        formErrors.clearField('color');
                        setForm((f) => ({ ...f, color: e.target.value }));
                      }}
                    />
                    <FieldError message={formErrors.errors.color} />
                  </div>
                  <div>
                    <Label className="enforcement-page__form-label">{t('vehicles.yearLabel')}</Label>
                    <Input className="mt-1" type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="enforcement-page__form-label">{t('vehicles.photoLabel')}</Label>
                  <label className="vehicles-photo-upload mt-1">
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="vehicles-photo-upload__preview" />
                    ) : (
                      <span className="vehicles-photo-upload__placeholder">
                        <Upload size={18} />
                        <span>{t('vehicles.photoHint')}</span>
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                    />
                  </label>
                  {photoFile ? (
                    <button
                      type="button"
                      className="vehicles-photo-upload__clear"
                      onClick={() => handlePhotoChange(null)}
                    >
                      <X size={12} /> {t('vehicles.photoClear')}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVehicle(null)}>{t('vehicles.cancel')}</Button>
            <Button onClick={() => void handleEdit()} disabled={editing}>{editing ? t('common.saving') : t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewVehicle !== null} onOpenChange={(open) => !open && setViewVehicle(null)}>
        <DialogContent accent="teal" className="vehicles-view-dialog max-w-5xl sm:max-w-5xl p-0 gap-0 overflow-hidden">
          {viewVehicle ? (() => {
            const meta = getTypeMeta(viewVehicle.vehicle_type);
            const TypeIcon = vehicleTypeIcon(viewVehicle.vehicle_type);
            const province = getCambodiaProvince(inferProvinceCodeFromPlate(viewVehicle.plate_number));
            const modelName = [viewVehicle.make, viewVehicle.model].filter(Boolean).join(' ') || viewVehicle.model;
            return (
              <div className="vehicles-view-dialog__shell">
                <div className="vehicles-view-dialog__topbar">
                  <div className="vehicles-view-dialog__topbar-left">
                    <div className="vehicles-view-dialog__header-icon">
                      <Car size={18} />
                    </div>
                    <div className="vehicles-view-dialog__header-copy">
                      <h2 className="vehicles-view-dialog__header-title">{t('vehicles.viewTitle')}</h2>
                      <p className="vehicles-view-dialog__header-meta">
                        {t('vehicles.colRegistered')}
                        <span aria-hidden> · </span>
                        {new Date(viewVehicle.created_at).toLocaleDateString(dateLocale)}
                      </p>
                    </div>
                  </div>
                  <span
                    className="vehicles-view-dialog__type-badge"
                    style={{ background: meta.bg, color: meta.color, borderColor: `${meta.color}40` }}
                  >
                    <TypeIcon size={14} />
                    {typeLabel(viewVehicle.vehicle_type)}
                  </span>
                </div>

                <div className="vehicles-view-dialog__layout">
                  <aside className="vehicles-view-dialog__media">
                    <div className="vehicles-view-dialog__hero">
                      <VehiclePhoto vehicle={viewVehicle} className="vehicles-view-dialog__hero-photo" />
                      <div className="vehicles-view-dialog__hero-overlay" aria-hidden />
                    </div>
                    <div className="vehicles-view-dialog__plate-wrap">
                      <CambodiaPlateField
                        value={viewVehicle.plate_number}
                        onChange={() => undefined}
                        provinceCode={province.code}
                        readOnly
                        variant="full"
                      />
                    </div>
                  </aside>

                  <section className="vehicles-view-dialog__info">
                    <div className="vehicles-view-dialog__identity">
                      <h3 className="vehicles-view-dialog__model">{modelName}</h3>
                      <p className="vehicles-view-dialog__year">{viewVehicle.year}</p>
                      <p className="vehicles-view-dialog__province">
                        <MapPin size={14} aria-hidden />
                        <span>{province.en}</span>
                        <span aria-hidden>·</span>
                        <span>{province.km}</span>
                      </p>
                    </div>

                    <div className="vehicles-view-dialog__cards">
                      <div className="vehicles-view-dialog__card vehicles-view-dialog__card--color">
                        <div className="vehicles-view-dialog__card-icon vehicles-view-dialog__card-icon--color">
                          <Palette size={15} />
                        </div>
                        <div className="vehicles-view-dialog__card-copy">
                          <span className="vehicles-view-dialog__card-label">{t('vehicles.colColor')}</span>
                          <div className="vehicles-view-dialog__color-row">
                            <span
                              className="vehicles-view-dialog__color-swatch"
                              style={{ backgroundColor: getColorDot(viewVehicle.color) }}
                            />
                            <span className="vehicles-view-dialog__card-value">{viewVehicle.color}</span>
                          </div>
                        </div>
                      </div>

                      <div className="vehicles-view-dialog__card vehicles-view-dialog__card--year">
                        <div className="vehicles-view-dialog__card-icon vehicles-view-dialog__card-icon--year">
                          <Calendar size={15} />
                        </div>
                        <div className="vehicles-view-dialog__card-copy">
                          <span className="vehicles-view-dialog__card-label">{t('vehicles.colYear')}</span>
                          <span className="vehicles-view-dialog__card-value">{viewVehicle.year}</span>
                        </div>
                      </div>

                      <div className="vehicles-view-dialog__card vehicles-view-dialog__card--plate">
                        <div className="vehicles-view-dialog__card-icon vehicles-view-dialog__card-icon--plate">
                          <Hash size={15} />
                        </div>
                        <div className="vehicles-view-dialog__card-copy">
                          <span className="vehicles-view-dialog__card-label">{t('vehicles.colPlate')}</span>
                          <span className="vehicles-view-dialog__card-value vehicles-view-dialog__card-value--mono">
                            {formatCambodiaPlate(viewVehicle.plate_number)}
                          </span>
                        </div>
                      </div>

                      <div className="vehicles-view-dialog__card vehicles-view-dialog__card--province">
                        <div className="vehicles-view-dialog__card-icon vehicles-view-dialog__card-icon--province">
                          <MapPin size={15} />
                        </div>
                        <div className="vehicles-view-dialog__card-copy">
                          <span className="vehicles-view-dialog__card-label">{t('vehicles.provinceLabel')}</span>
                          <span className="vehicles-view-dialog__card-value">{province.en}</span>
                        </div>
                      </div>

                      {!isDriver ? (
                        <div className="vehicles-view-dialog__card vehicles-view-dialog__card--owner vehicles-view-dialog__card--wide">
                          <div className="vehicles-view-dialog__card-icon vehicles-view-dialog__card-icon--owner">
                            <User size={15} />
                          </div>
                          <div className="vehicles-view-dialog__card-copy">
                            <span className="vehicles-view-dialog__card-label">{t('vehicles.colOwner')}</span>
                            <div className="vehicles-view-dialog__owner-row">
                              <div className="vehicles-view-dialog__owner-avatar">{initials(viewVehicle.owner_name)}</div>
                              <span className="vehicles-view-dialog__card-value">{viewVehicle.owner_name}</span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </section>
                </div>

                <div className="vehicles-view-dialog__footer">
                  <Button variant="outline" className="vehicles-view-dialog__close-btn" onClick={() => setViewVehicle(null)}>
                    {t('common.close')}
                  </Button>
                </div>
              </div>
            );
          })() : null}
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
