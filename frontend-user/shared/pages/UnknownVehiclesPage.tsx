import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { EntityDetailField, EntityViewDialog } from '@shared/components/admin/EntityViewDialog';
import { Car, CheckCircle, Clock, Link2, Search } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { unknownVehiclesAPI, vehiclesAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { UnknownVehicleRecord } from '@shared/types';

type StatusFilter = 'all' | 'pending' | 'resolved';

export function UnknownVehiclesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'police';
  const [rows, setRows] = useState<UnknownVehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [resolveTarget, setResolveTarget] = useState<UnknownVehicleRecord | null>(null);
  const [viewRow, setViewRow] = useState<UnknownVehicleRecord | null>(null);
  const [note, setNote] = useState('');
  const [linkedPlate, setLinkedPlate] = useState('');
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!canManage) return;
    if (!silent) setLoading(true);
    try {
      setRows(await unknownVehiclesAPI.getAll());
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canManage]);

  useEffect(() => { load(); }, [load]);
  useLiveData(() => load(true), 30_000, canManage);

  const counts = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => !r.is_resolved).length,
    resolved: rows.filter((r) => r.is_resolved).length,
    linked: rows.filter((r) => r.linked_vehicle_plate).length,
  }), [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (statusFilter === 'pending') list = list.filter((r) => !r.is_resolved);
    if (statusFilter === 'resolved') list = list.filter((r) => r.is_resolved);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.plate_detected.toLowerCase().includes(q) || (r.camera_name || '').toLowerCase().includes(q));
    }
    return list;
  }, [rows, search, statusFilter]);

  const pagination = usePagination(filtered);

  const statusFilters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: t('unknown.filterAll'), count: counts.total },
    { id: 'pending', label: t('unknown.pending'), count: counts.pending },
    { id: 'resolved', label: t('unknown.resolved'), count: counts.resolved },
  ];

  const openResolve = (row: UnknownVehicleRecord) => {
    setResolveTarget(row);
    setNote('');
    setLinkedPlate('');
  };

  const handleResolve = async () => {
    if (!resolveTarget) return;
    setResolving(true);
    try {
      let linked_vehicle_id: string | undefined;
      if (linkedPlate.trim()) {
        const vehicle = await vehiclesAPI.searchByPlate(linkedPlate.trim());
        if (!vehicle) {
          toast.error(t('unknown.linkNotFound'));
          setResolving(false);
          return;
        }
        linked_vehicle_id = String(vehicle.id);
      }
      await unknownVehiclesAPI.resolve(resolveTarget.id, { officer_note: note, linked_vehicle_id });
      toast.success(t('unknown.toastResolved'));
      setResolveTarget(null);
      setNote('');
      setLinkedPlate('');
      load();
    } catch {
      toast.error(t('unknown.toastResolveFail'));
    } finally {
      setResolving(false);
    }
  };

  if (!canManage) {
    return <div className="enforcement-page p-8">{t('unknown.officerOnly')}</div>;
  }

  return (
    <div className="enforcement-page enforcement-page--unknown">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Car size={14} /></span>
              {t('pages.unknown.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.unknown.title')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.unknown.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four mb-6">
        <div className="enforcement-page__stat-card enforcement-page__stat-card--amber">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--amber"><Car size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.total}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--amber">{t('unknown.statTotal')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--rose">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--rose"><Clock size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.pending}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--rose">{t('unknown.statPending')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald"><CheckCircle size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.resolved}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">{t('unknown.statResolved')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--blue">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue"><Link2 size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.linked}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">{t('unknown.statLinked')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__toolbar">
        <div className="enforcement-page__filters">
          {statusFilters.map(({ id, label, count }) => {
            const active = statusFilter === id;
            return (
              <button
                key={id}
                type="button"
                className={`enforcement-page__filter-btn${active ? ' enforcement-page__filter-btn--active' : ''}`}
                onClick={() => setStatusFilter(id)}
              >
                {label}
                <span className={`enforcement-page__filter-count${active ? ' enforcement-page__filter-count--active' : ''}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="enforcement-page__search-wrap">
          <Search size={14} className="enforcement-page__search-icon" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('unknown.searchPlaceholder')} className="enforcement-page__search" />
        </div>
      </div>

      <div className="enforcement-page__panel">
        <div className="overflow-x-auto">
        <Table className="enforcement-page__table mgmt-table__grid">
          <TableHeader>
            <TableRow className="enforcement-page__table-head">
              {[t('unknown.colPlate'), t('unknown.colCamera'), t('unknown.colDetected'), t('unknown.colStatus'), t('unknown.colActions')].map((h) => (
                <TableHead key={h} className="enforcement-page__th">{h}</TableHead>
              ))}
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
            ) : pagination.pageItems.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                tone="amber"
                icon={<Car size={28} />}
                title={t('unknown.empty')}
                subtitle={t('unknown.emptyHint')}
              />
            ) : pagination.pageItems.map((row) => (
              <TableRow key={row.id} className="enforcement-page__table-row">
                <TableCell><span className="enforcement-page__code-pill unknown-page__plate">{row.plate_detected}</span></TableCell>
                <TableCell>{row.camera_name || '—'}</TableCell>
                <TableCell className="unknown-page__time">{new Date(row.detected_at).toLocaleString()}</TableCell>
                <TableCell>
                  {row.is_resolved ? (
                    <span className="enforcement-page__badge unknown-page__badge--resolved">
                      <CheckCircle size={11} />{t('unknown.resolved')}
                    </span>
                  ) : (
                    <span className="enforcement-page__badge unknown-page__badge--pending">
                      <Clock size={11} />{t('unknown.pending')}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="enforcement-page__table-actions">
                    <CrudRowActions onView={() => setViewRow(row)} />
                    {!row.is_resolved && (
                      <button type="button" className="crud-actions__btn crud-actions__btn--resolve" onClick={() => openResolve(row)}>
                        <CheckCircle size={13} />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.unknown" />
      </div>

      <EntityViewDialog
        open={!!viewRow}
        onOpenChange={(open) => !open && setViewRow(null)}
        title={t('unknown.viewTitle')}
        accent="amber"
      >
        {viewRow ? (
          <>
            <EntityDetailField label={t('unknown.colPlate')} value={viewRow.plate_detected} />
            <EntityDetailField label={t('unknown.colCamera')} value={viewRow.camera_name || '—'} />
            <EntityDetailField label={t('unknown.colDetected')} value={new Date(viewRow.detected_at).toLocaleString()} />
            <EntityDetailField
              label={t('unknown.colStatus')}
              value={viewRow.is_resolved ? t('unknown.resolved') : t('unknown.pending')}
            />
            {viewRow.ai_confidence_score != null ? (
              <EntityDetailField
                label={t('unknown.confidence')}
                value={`${Math.round(viewRow.ai_confidence_score * 100)}%`}
              />
            ) : null}
            {viewRow.linked_vehicle_plate ? (
              <EntityDetailField label={t('unknown.linkedVehicle')} value={viewRow.linked_vehicle_plate} />
            ) : null}
            {viewRow.officer_note ? (
              <EntityDetailField label={t('unknown.officerNote')} value={viewRow.officer_note} wide />
            ) : null}
            {viewRow.resolved_by_name ? (
              <EntityDetailField label={t('unknown.resolvedBy')} value={viewRow.resolved_by_name} />
            ) : null}
            {viewRow.resolved_at ? (
              <EntityDetailField label={t('unknown.resolvedAt')} value={new Date(viewRow.resolved_at).toLocaleString()} />
            ) : null}
          </>
        ) : null}
      </EntityViewDialog>

      <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <DialogContent accent="amber" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="users-page__dialog-header">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--amber">
                <CheckCircle size={15} aria-hidden />
              </div>
              <span className="enforcement-page__dialog-title">{t('unknown.resolveTitle')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('unknown.linkVehicle')}</Label>
              <Input value={linkedPlate} onChange={(e) => setLinkedPlate(e.target.value)} placeholder={resolveTarget?.plate_detected || ''} />
              <p className="text-xs text-muted-foreground mt-1">{t('unknown.linkVehicleHint')}</p>
            </div>
            <div>
              <Label>{t('unknown.officerNote')}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>{t('profile.cancel')}</Button>
            <Button onClick={handleResolve} disabled={resolving}>{t('unknown.resolve')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
