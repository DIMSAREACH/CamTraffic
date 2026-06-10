import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Search, Eye, CheckCircle, XCircle, Clock, AlertTriangle,
  FileText, Shield, Trash2, ImageIcon, MapPin,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { violationsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { TrafficViolation } from '@shared/types';

const STATUS_TABS = ['all', 'pending_review', 'confirmed', 'rejected', 'draft'] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_STYLE: Record<string, {
  icon: React.ReactNode;
  bg: string;
  color: string;
  gradient: string;
}> = {
  draft: {
    icon: <Clock size={11} />,
    bg: 'rgba(100,116,139,0.1)',
    color: '#475569',
    gradient: 'linear-gradient(135deg, #64748B, #475569)',
  },
  pending_review: {
    icon: <Clock size={11} />,
    bg: 'rgba(245,158,11,0.12)',
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
  },
  confirmed: {
    icon: <AlertTriangle size={11} />,
    bg: 'rgba(239,68,68,0.1)',
    color: '#DC2626',
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
  },
  rejected: {
    icon: <CheckCircle size={11} />,
    bg: 'rgba(16,185,129,0.1)',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
  },
};

const STAT_CARDS = [
  { key: 'all', labelKey: 'violations.statTotal', icon: FileText, variant: 'blue' },
  { key: 'pending_review', labelKey: 'violations.statPending', icon: Clock, variant: 'amber' },
  { key: 'confirmed', labelKey: 'violations.statConfirmed', icon: AlertTriangle, variant: 'rose' },
  { key: 'rejected', labelKey: 'violations.statRejected', icon: CheckCircle, variant: 'emerald' },
] as const;

function formatViolationTypeFallback(value: string) {
  return (value || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
}

export function ViolationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const formatViolationType = (value: string) => {
    if (!value) return t('violations.unknownType');
    const key = `violations.types.${value}`;
    const translated = t(key);
    return translated !== key ? translated : formatViolationTypeFallback(value);
  };

  const formatObservedAction = (value: string) => {
    if (!value) return '—';
    const key = `violations.actions.${value}`;
    const translated = t(key);
    return translated !== key ? translated : value.replace(/_/g, ' ');
  };

  const [violations, setViolations] = useState<TrafficViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [selected, setSelected] = useState<TrafficViolation | null>(null);

  const canManage = user?.role === 'admin' || user?.role === 'police';

  const loadViolations = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const data = await violationsAPI.getAll();
      setViolations(data);
    } catch {
      if (!silent) toast.error(t('violations.toastLoadFail'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  useLiveData(() => loadViolations(true), 30_000, Boolean(user));

  const filtered = useMemo(() => {
    let rows = [...violations];
    if (statusFilter !== 'all') rows = rows.filter((v) => v.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((v) =>
        v.driver_name.toLowerCase().includes(q)
        || v.driver_license.toLowerCase().includes(q)
        || v.location.toLowerCase().includes(q)
        || v.violation_type.toLowerCase().includes(q)
        || v.detected_sign_code.toLowerCase().includes(q)
        || v.detected_class_key.toLowerCase().includes(q)
        || v.observed_action.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [violations, search, statusFilter]);

  const counts = useMemo(() => ({
    all: violations.length,
    pending_review: violations.filter((v) => v.status === 'pending_review').length,
    confirmed: violations.filter((v) => v.status === 'confirmed').length,
    rejected: violations.filter((v) => v.status === 'rejected').length,
    draft: violations.filter((v) => v.status === 'draft').length,
  }), [violations]);

  const statusLabel = (status: string) => t(`violations.status.${status}`);
  const getStatusMeta = (status: string) => STATUS_STYLE[status] ?? STATUS_STYLE.draft;

  const handleStatusUpdate = async (id: number, status: TrafficViolation['status']) => {
    try {
      const updated = await violationsAPI.update(id, { status });
      setViolations((prev) => prev.map((v) => (v.id === id ? updated : v)));
      if (selected?.id === id) setSelected(updated);
      toast.success(t('violations.toastStatusUpdated', { status: statusLabel(status) }));
    } catch {
      toast.error(t('violations.toastStatusFail'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('violations.confirmDelete'))) return;
    try {
      await violationsAPI.delete(id);
      setViolations((prev) => prev.filter((v) => v.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success(t('violations.toastDeleted'));
    } catch {
      toast.error(t('violations.toastDeleteFail'));
    }
  };

  return (
    <div className="enforcement-page enforcement-page--violations dashboard-page--violations">
      {/* Hero */}
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Shield size={14} />
              </span>
              {t('pages.violations.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.violations.title')}</h1>
            <p className="enforcement-page__subtitle">
              {canManage ? t('pages.violations.subtitleAdmin') : t('pages.violations.subtitleDriver')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const active = statusFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(card.key as StatusTab)}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant}${active ? ' enforcement-page__stat-card--active' : ''}`}
            >
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.variant}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{counts[card.key]}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.variant}`}>
                  {t(card.labelKey)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="enforcement-page__toolbar">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="enforcement-page__filters">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab;
              const meta = tab !== 'all' ? getStatusMeta(tab) : null;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`enforcement-page__filter-btn${active ? ' enforcement-page__filter-btn--active' : ''}`}
                  style={active ? {
                    background: meta?.gradient ?? 'linear-gradient(135deg, #0F172A, #1E293B)',
                  } : undefined}
                >
                  {tab === 'all' ? t('violations.status.all') : statusLabel(tab)}
                  <span
                    className={`enforcement-page__filter-count${active ? ' enforcement-page__filter-count--active' : ''}`}
                  >
                    {counts[tab]}
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
              placeholder={t('violations.searchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="enforcement-page__panel enforcement-page__panel--violations">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {[
                  t('violations.colDriver'),
                  t('violations.colType'),
                  t('violations.colSign'),
                  t('violations.colAction'),
                  t('violations.colLocation'),
                  t('violations.colDate'),
                  t('violations.colStatus'),
                  t('violations.colActions'),
                ].map((h) => (
                  <TableHead key={h} className="enforcement-page__th text-center">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((__, j) => (
                      <TableCell key={j}>
                        <div className="enforcement-page__skeleton" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="enforcement-page__empty-icon enforcement-page__empty-icon--amber">
                        <AlertTriangle size={28} />
                      </div>
                      <div>
                        <p className="enforcement-page__empty-title">{t('violations.empty')}</p>
                        <p className="enforcement-page__empty-subtitle">{t('violations.emptyHint')}</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((row) => {
                const meta = getStatusMeta(row.status);
                return (
                  <TableRow key={row.id} className="enforcement-page__table-row">
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="enforcement-page__avatar">{initials(row.driver_name)}</div>
                        <div>
                          <p className="enforcement-page__cell-primary">{row.driver_name}</p>
                          <p className="enforcement-page__cell-mono">{row.driver_license}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="enforcement-page__cell-primary">{formatViolationType(row.violation_type)}</p>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__code-pill">
                        {row.detected_sign_code || row.detected_class_key || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__code-pill enforcement-page__code-pill--action">
                        {formatObservedAction(row.observed_action)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin size={12} className="enforcement-page__location-icon" />
                        <span className="enforcement-page__cell-body truncate">{row.location || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__cell-secondary">
                        {new Date(row.violation_date).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__badge" style={{ background: meta.bg, color: meta.color }}>
                        {meta.icon}
                        {statusLabel(row.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="enforcement-page__table-actions">
                        <button type="button" className="enforcement-page__action-btn" onClick={() => setSelected(row)}>
                          <Eye size={12} /> {t('violations.view')}
                        </button>
                      </div>
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
              {t('violations.showing', { shown: filtered.length, total: violations.length })}
            </p>
            <p className="enforcement-page__footer-text enforcement-page__footer-text--emphasis">
              {t('violations.confirmedCount', { count: counts.confirmed })}
            </p>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected && (() => {
            const meta = getStatusMeta(selected.status);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2.5">
                    <div className="enforcement-page__dialog-icon">
                      <AlertTriangle size={15} />
                    </div>
                    <span className="enforcement-page__dialog-title">
                      {formatViolationType(selected.violation_type)} — #{selected.id}
                    </span>
                  </DialogTitle>
                </DialogHeader>

                <div className="enforcement-page__status-banner" style={{ background: meta.bg }}>
                  <span className="enforcement-page__detail-label">{t('violations.colStatus')}</span>
                  <span className="enforcement-page__badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
                    {meta.icon}
                    {statusLabel(selected.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div>
                    <div className="enforcement-page__detail-grid">
                      {[
                        { label: t('violations.colDriver'), value: selected.driver_name },
                        { label: t('violations.licenseNo'), value: selected.driver_license },
                        { label: t('violations.colSign'), value: selected.detected_sign_code || selected.detected_class_key },
                        { label: t('violations.colAction'), value: formatObservedAction(selected.observed_action) },
                        { label: t('violations.colLocation'), value: selected.location },
                        { label: t('violations.officer'), value: selected.officer_name || '—' },
                        { label: t('violations.colDate'), value: new Date(selected.violation_date).toLocaleString() },
                      ].map((item) => (
                        <div key={item.label} className="enforcement-page__detail-row">
                          <span className="enforcement-page__detail-label">{item.label}</span>
                          <span className="enforcement-page__detail-value">{item.value || '—'}</span>
                        </div>
                      ))}
                    </div>
                    {selected.description && (
                      <div className="enforcement-page__description-box">
                        <p className="enforcement-page__detail-label">{t('violations.description')}</p>
                        <p className="enforcement-page__cell-body mt-1.5 leading-relaxed">{selected.description}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="enforcement-page__evidence-title">
                      <ImageIcon size={12} className="inline mr-1.5" />
                      {t('violations.evidence')}
                    </p>
                    {selected.evidence_image || selected.plate_evidence_image || selected.vehicle_evidence_image ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selected.evidence_image && (
                          <a href={selected.evidence_image} target="_blank" rel="noreferrer" className="block">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">{t('violations.evidence')}</p>
                            <img src={selected.evidence_image} alt={t('violations.evidence')} className="enforcement-page__evidence-image" />
                          </a>
                        )}
                        {selected.plate_evidence_image && (
                          <a href={selected.plate_evidence_image} target="_blank" rel="noreferrer" className="block">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">{t('violations.plateEvidence')}</p>
                            <img src={selected.plate_evidence_image} alt={t('violations.plateEvidence')} className="enforcement-page__evidence-image" />
                          </a>
                        )}
                        {selected.vehicle_evidence_image && (
                          <a href={selected.vehicle_evidence_image} target="_blank" rel="noreferrer" className="block">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">{t('violations.vehicleEvidence')}</p>
                            <img src={selected.vehicle_evidence_image} alt={t('violations.vehicleEvidence')} className="enforcement-page__evidence-image" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="enforcement-page__evidence-box">{t('violations.noEvidence')}</div>
                    )}
                  </div>
                </div>

                {canManage && (
                  <DialogFooter className="flex flex-wrap gap-2 sm:justify-between mt-2">
                    <div className="flex flex-wrap gap-2">
                      {selected.status !== 'confirmed' && (
                        <Button
                          size="sm"
                          className="text-[13px] font-semibold"
                          style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
                          onClick={() => handleStatusUpdate(selected.id, 'confirmed')}
                        >
                          <CheckCircle size={14} /> {t('violations.confirm')}
                        </Button>
                      )}
                      {selected.status !== 'rejected' && (
                        <Button size="sm" variant="outline" className="text-[13px] font-semibold" onClick={() => handleStatusUpdate(selected.id, 'rejected')}>
                          <XCircle size={14} /> {t('violations.reject')}
                        </Button>
                      )}
                    </div>
                    {user?.role === 'admin' && (
                      <Button size="sm" variant="destructive" className="text-[13px] font-semibold" onClick={() => handleDelete(selected.id)}>
                        <Trash2 size={14} /> {t('violations.delete')}
                      </Button>
                    )}
                  </DialogFooter>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
