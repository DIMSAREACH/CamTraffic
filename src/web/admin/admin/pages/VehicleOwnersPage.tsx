import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import {
  Car, CheckCircle, Search, Users, XCircle, Mail, Phone,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { EntityDetailField, EntityViewDialog } from '@shared/components/admin/EntityViewDialog';
import { useLanguage } from '@shared/context/LanguageContext';
import { vehicleOwnersAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Vehicle } from '@shared/types';

type VehicleOwnerRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  vehicle_count: number;
  status: string;
};

type OwnerDetail = {
  owner: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: string;
  };
  vehicles: Vehicle[];
};

const STATUS_META: Record<string, { bg: string; color: string; icon: ReactNode }> = {
  active: { bg: 'rgba(16,185,129,0.1)', color: '#059669', icon: <CheckCircle size={11} /> },
  inactive: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', icon: <XCircle size={11} /> },
};

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'VO';
}

export function VehicleOwnersPage() {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v !== key ? v : fallback;
  };

  const [owners, setOwners] = useState<VehicleOwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewOwner, setViewOwner] = useState<VehicleOwnerRow | null>(null);
  const [detail, setDetail] = useState<OwnerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOwners(await vehicleOwnersAPI.getAll());
    } catch {
      toast.error(tr('vehicleOwners.loadFailed', 'Failed to load vehicle owners'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const statusLabel = (status: string) => {
    const key = `vehicleOwners.status.${status}`;
    return tr(key, status);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return owners;
    const q = search.toLowerCase();
    return owners.filter((o) =>
      o.full_name.toLowerCase().includes(q)
      || o.email.toLowerCase().includes(q)
      || (o.phone || '').toLowerCase().includes(q),
    );
  }, [owners, search]);

  const pagination = usePagination(filtered);

  const counts = useMemo(() => ({
    total: owners.length,
    vehicles: owners.reduce((sum, o) => sum + o.vehicle_count, 0),
    active: owners.filter((o) => o.status === 'active').length,
    inactive: owners.filter((o) => o.status === 'inactive').length,
  }), [owners]);

  const openView = async (owner: VehicleOwnerRow) => {
    setViewOwner(owner);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await vehicleOwnersAPI.getById(owner.id);
      setDetail({
        owner: data.owner as OwnerDetail['owner'],
        vehicles: (data.vehicles ?? []) as Vehicle[],
      });
    } catch {
      toast.error(tr('vehicleOwners.detailFailed', 'Failed to load owner details'));
      setViewOwner(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    tr('vehicleOwners.colName', 'Owner'),
    tr('users.email', 'Email'),
    tr('vehicleOwners.colVehicles', 'Vehicles'),
    tr('users.colStatus', 'Status'),
    tr('vehicleOwners.colActions', 'Actions'),
  ];

  return (
    <div className="enforcement-page enforcement-page--vehicle-owners dashboard-page--vehicle-owners">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Users size={14} /></span>
              {tr('vehicleOwners.eyebrow', 'Fleet registry')}
            </div>
            <h1 className="enforcement-page__title">{tr('vehicleOwners.title', 'Vehicle owners')}</h1>
            <p className="enforcement-page__subtitle">{tr('vehicleOwners.subtitle', 'Registered owners and their linked vehicles')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        <div className="enforcement-page__stat-card enforcement-page__stat-card--blue">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue"><Users size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.total}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">{tr('vehicleOwners.statTotal', 'Total owners')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--teal">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--teal"><Car size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.vehicles}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--teal">{tr('vehicleOwners.statVehicles', 'Linked vehicles')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald"><CheckCircle size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.active}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">{tr('vehicleOwners.statActive', 'Active')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--amber">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--amber"><XCircle size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.inactive}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--amber">{tr('vehicleOwners.statInactive', 'Inactive')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__toolbar">
        <div className="enforcement-page__search-wrap">
          <Search size={14} className="enforcement-page__search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr('vehicleOwners.searchPlaceholder', 'Search by name or email…')}
            className="enforcement-page__search"
          />
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--vehicle-owners">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid">
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
                      <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableEmptyState
                  colSpan={columns.length}
                  tone="blue"
                  icon={<Users size={28} />}
                  title={tr('vehicleOwners.empty', 'No vehicle owners found')}
                  subtitle={tr('vehicleOwners.emptyHint', 'Owners appear when users register vehicles')}
                />
              ) : pagination.pageItems.map((o) => {
                const st = STATUS_META[o.status] ?? STATUS_META.active;
                return (
                  <TableRow key={o.id} className="enforcement-page__table-row">
                    <TableCell>
                      <div className="drivers-page__user-cell">
                        <div className="drivers-page__avatar">{initials(o.full_name)}</div>
                        <div className="min-w-0">
                          <p className="enforcement-page__cell-primary drivers-page__truncate" title={o.full_name}>{o.full_name}</p>
                          {o.phone ? (
                            <p className="enforcement-page__cell-secondary drivers-page__phone">{o.phone}</p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__cell-body drivers-page__truncate" title={o.email}>{o.email}</span>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__code-pill">{o.vehicle_count}</span>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__badge" style={{ background: st.bg, color: st.color }}>
                        {st.icon}{statusLabel(o.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <CrudRowActions onView={() => void openView(o)} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.vehicleOwners" />
      </div>

      <EntityViewDialog
        open={!!viewOwner}
        onOpenChange={(open) => {
          if (!open) {
            setViewOwner(null);
            setDetail(null);
          }
        }}
        title={tr('vehicleOwners.viewTitle', 'Owner details')}
        accent="blue"
      >
        {detailLoading ? (
          <p className="text-sm text-muted-foreground">{tr('common.loading', 'Loading…')}</p>
        ) : detail ? (
          <>
            <EntityDetailField label={tr('vehicleOwners.colName', 'Owner')} value={detail.owner.full_name} />
            <EntityDetailField label={tr('users.email', 'Email')} value={
              <span className="inline-flex items-center gap-1.5"><Mail size={13} />{detail.owner.email}</span>
            } />
            <EntityDetailField label={tr('officers.phone', 'Phone')} value={
              detail.owner.phone
                ? <span className="inline-flex items-center gap-1.5"><Phone size={13} />{detail.owner.phone}</span>
                : '—'
            } />
            <EntityDetailField label={tr('users.colRole', 'Role')} value={detail.owner.role} />
            <EntityDetailField
              label={tr('vehicleOwners.vehicles', 'Vehicles')}
              value={detail.vehicles.length}
              wide
            />
            {detail.vehicles.length > 0 ? (
              <div className="entity-detail-field entity-detail-field--wide">
                <span className="entity-detail-field__label">{tr('vehicleOwners.vehicleList', 'Registered plates')}</span>
                <ul className="space-y-2 mt-1">
                  {detail.vehicles.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-2 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="enforcement-page__code-pill">{v.plate_number}</span>
                      <span className="text-muted-foreground">{v.model} · {v.vehicle_type}</span>
                      <Link to="/admin/vehicles" className="text-blue-600 text-xs hover:underline">
                        {tr('vehicleOwners.viewVehicle', 'View')}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : viewOwner ? (
          <>
            <EntityDetailField label={tr('vehicleOwners.colName', 'Owner')} value={viewOwner.full_name} />
            <EntityDetailField label={tr('users.email', 'Email')} value={viewOwner.email} />
          </>
        ) : null}
      </EntityViewDialog>
    </div>
  );
}
