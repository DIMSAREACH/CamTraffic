import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import {
  Search, Plus, Eye, CheckCircle, XCircle, Clock, Scale, MapPin, FileText,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Textarea } from '@shared/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { appealsAPI, violationsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { TrafficViolation, ViolationAppeal } from '@shared/types';

const STATUS_TABS = ['all', 'pending', 'upheld', 'dismissed'] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_STYLE: Record<string, { icon: React.ReactNode; bg: string; color: string; gradient: string }> = {
  pending: {
    icon: <Clock size={11} />,
    bg: 'rgba(245,158,11,0.1)',
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
  },
  upheld: {
    icon: <XCircle size={11} />,
    bg: 'rgba(239,68,68,0.1)',
    color: '#DC2626',
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
  },
  dismissed: {
    icon: <CheckCircle size={11} />,
    bg: 'rgba(16,185,129,0.1)',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
  },
};

export function AppealsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const canReview = user?.role === 'admin' || user?.role === 'police';
  const canSubmit = user?.role === 'driver';

  const [appeals, setAppeals] = useState<ViolationAppeal[]>([]);
  const [violations, setViolations] = useState<TrafficViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [selected, setSelected] = useState<ViolationAppeal | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [form, setForm] = useState({ violation_id: '', reason: '', evidence: null as File | null });
  const [reviewForm, setReviewForm] = useState({ status: 'dismissed' as 'upheld' | 'dismissed', officer_comments: '' });

  const statusLabel = (s: string) => t(`appeals.status.${s}`);

  const load = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const [appealRows, violationRows] = await Promise.all([
        appealsAPI.getAll(),
        canSubmit ? violationsAPI.getAll() : Promise.resolve([]),
      ]);
      setAppeals(appealRows);
      setViolations(violationRows);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, canSubmit]);

  useEffect(() => { load(); }, [load]);
  useLiveData(() => load(true), 30_000, Boolean(user));

  const filtered = useMemo(() => {
    let rows = [...appeals];
    if (statusFilter !== 'all') rows = rows.filter((a) => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((a) =>
        a.driver_name.toLowerCase().includes(q)
        || a.reason.toLowerCase().includes(q)
        || (a.violation_type || '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [appeals, search, statusFilter]);

  const pagination = usePagination(filtered);
  const isFilteredEmpty = appeals.length > 0 && filtered.length === 0;
  const counts = useMemo(() => ({
    all: appeals.length,
    pending: appeals.filter((a) => a.status === 'pending').length,
    upheld: appeals.filter((a) => a.status === 'upheld').length,
    dismissed: appeals.filter((a) => a.status === 'dismissed').length,
  }), [appeals]);

  const appealableViolations = useMemo(() => {
    const appealed = new Set(appeals.filter((a) => a.status === 'pending').map((a) => a.violation_id));
    return violations.filter((v) => v.status === 'confirmed' && !appealed.has(String(v.id)));
  }, [violations, appeals]);

  const handleSubmit = async () => {
    if (!form.violation_id || !form.reason.trim()) {
      toast.error(t('appeals.toastFillRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('violation_id', form.violation_id);
      fd.append('reason', form.reason.trim());
      if (form.evidence) fd.append('evidence_image', form.evidence);
      await appealsAPI.create(fd);
      toast.success(t('appeals.toastSubmitted'));
      setSubmitOpen(false);
      setForm({ violation_id: '', reason: '', evidence: null });
      load();
    } catch {
      toast.error(t('appeals.toastSubmitFail'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!selected) return;
    setReviewing(true);
    try {
      await appealsAPI.review(selected.id, reviewForm);
      toast.success(t('appeals.toastReviewed'));
      setReviewOpen(false);
      setSelected(null);
      load();
    } catch {
      toast.error(t('appeals.toastReviewFail'));
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="enforcement-page enforcement-page--appeals dashboard-page--appeals">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Scale size={14} /></span>
              {t('pages.appeals.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.appeals.title')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.appeals.subtitle')}</p>
          </div>
          {canSubmit && (
            <button type="button" className="enforcement-page__hero-btn" onClick={() => setSubmitOpen(true)}>
              <Plus size={16} /> {t('appeals.submitAppeal')}
            </button>
          )}
        </div>
      </div>

      <div className="enforcement-page__toolbar">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="enforcement-page__filters">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab;
              const meta = tab !== 'all' ? STATUS_STYLE[tab] : null;
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
                {statusLabel(tab)}
                <span className={`enforcement-page__filter-count${active ? ' enforcement-page__filter-count--active' : ''}`}>
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
              placeholder={t('appeals.searchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {[t('appeals.colDriver'), t('appeals.colViolation'), t('appeals.colReason'), t('appeals.colSubmitted'), t('appeals.colStatus'), t('appeals.colActions')].map((h) => (
                  <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((__, j) => (
                      <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pagination.pageItems.length === 0 ? (
                <TableEmptyState
                  colSpan={6}
                  tone="appeals"
                  icon={<Scale size={28} strokeWidth={1.75} />}
                  title={isFilteredEmpty ? t('appeals.emptyFilter') : t('appeals.empty')}
                  subtitle={
                    isFilteredEmpty
                      ? t('appeals.emptyFilterHint')
                      : canSubmit
                        ? t('appeals.emptyHintDriver')
                        : t('appeals.emptyHint')
                  }
                  action={
                    !isFilteredEmpty && canSubmit
                      ? { label: t('appeals.submitAppeal'), onClick: () => setSubmitOpen(true), icon: <Plus size={15} /> }
                      : undefined
                  }
                />
              ) : pagination.pageItems.map((row) => {
                const st = STATUS_STYLE[row.status] ?? STATUS_STYLE.pending;
                return (
                  <TableRow key={row.id} className="enforcement-page__table-row">
                    <TableCell>
                      <p className="enforcement-page__cell-primary">{row.driver_name}</p>
                      <p className="enforcement-page__cell-mono">{row.driver_license}</p>
                    </TableCell>
                    <TableCell>
                      <p className="enforcement-page__cell-primary">{row.violation_type || '—'}</p>
                      <p className="enforcement-page__location-meta"><MapPin size={9} /> {row.violation_location || '—'}</p>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={row.reason}>{row.reason}</TableCell>
                    <TableCell>{new Date(row.submitted_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className="enforcement-page__badge" style={{ background: st.bg, color: st.color }}>
                        {st.icon}{statusLabel(row.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="enforcement-page__table-actions">
                        <button type="button" className="enforcement-page__action-btn" onClick={() => setSelected(row)}>
                          <Eye size={12} /> {t('appeals.view')}
                        </button>
                        {canReview && row.status === 'pending' && (
                          <button
                            type="button"
                            className="enforcement-page__action-btn enforcement-page__action-btn--success"
                            onClick={() => { setSelected(row); setReviewOpen(true); }}
                          >
                            {t('appeals.review')}
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.appeals" />
      </div>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent accent="violet" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('appeals.submitAppeal')}</DialogTitle>
          </DialogHeader>
          <div className="ct-dialog-form">
            <div className="ct-dialog-field">
              <Label>{t('appeals.selectViolation')}</Label>
              <Select value={form.violation_id} onValueChange={(v) => setForm((f) => ({ ...f, violation_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t('appeals.selectViolation')} /></SelectTrigger>
                <SelectContent>
                  {appealableViolations.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.violation_type} — {v.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ct-dialog-field">
              <Label>{t('appeals.reason')}</Label>
              <Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={4} />
            </div>
            <div className="ct-dialog-field">
              <Label>{t('appeals.evidenceOptional')}</Label>
              <Input type="file" accept="image/*" onChange={(e) => setForm((f) => ({ ...f, evidence: e.target.files?.[0] ?? null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>{t('profile.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{t('appeals.submitAppeal')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent accent="amber" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('appeals.reviewAppeal')}</DialogTitle>
          </DialogHeader>
          <div className="ct-dialog-form">
            <div className="ct-dialog-field">
              <Label>{t('appeals.decision')}</Label>
              <Select value={reviewForm.status} onValueChange={(v) => setReviewForm((f) => ({ ...f, status: v as 'upheld' | 'dismissed' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dismissed">{t('appeals.status.dismissed')}</SelectItem>
                  <SelectItem value="upheld">{t('appeals.status.upheld')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ct-dialog-field">
              <Label>{t('appeals.officerComments')}</Label>
              <Textarea value={reviewForm.officer_comments} onChange={(e) => setReviewForm((f) => ({ ...f, officer_comments: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>{t('profile.cancel')}</Button>
            <Button onClick={handleReview} disabled={reviewing}>{t('appeals.submitReview')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected && !reviewOpen} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent accent="teal" className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText size={16} /> {t('appeals.appealDetails')}
                </DialogTitle>
              </DialogHeader>
              <div className="ct-dialog-body space-y-2 text-sm">
                <p><strong>{t('appeals.colDriver')}:</strong> {selected.driver_name}</p>
                <p><strong>{t('appeals.colViolation')}:</strong> {selected.violation_type}</p>
                <p><strong>{t('appeals.reason')}:</strong> {selected.reason}</p>
                {selected.officer_comments && <p><strong>{t('appeals.officerComments')}:</strong> {selected.officer_comments}</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
