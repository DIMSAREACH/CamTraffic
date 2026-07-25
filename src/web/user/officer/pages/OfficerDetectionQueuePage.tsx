/**
 * Officer Detection Review Queue — government human-in-the-loop enforcement.
 * AI detections create pending_review violations; officers approve/reject and issue fines.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@shared/components/ui/button';
import { Textarea } from '@shared/components/ui/textarea';
import { Label } from '@shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppCurrency, formatAppDate } from '@shared/i18n/localeFormat';
import { apiClient, unwrap } from '@shared/services/axiosClient';
import { OFFICER_API } from '@shared/constants/domainApi';
import type { TrafficViolation } from '@shared/types';

type QueuePayload = {
  results: TrafficViolation[];
  count: number;
};

export function OfficerDetectionQueuePage() {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<TrafficViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TrafficViolation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveTarget, setApproveTarget] = useState<TrafficViolation | null>(null);
  const [officerNote, setOfficerNote] = useState('');
  const [issueFine, setIssueFine] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = unwrap<QueuePayload>(await apiClient.get(OFFICER_API.detectionQueue));
      setItems(data.results ?? []);
    } catch {
      toast.error(t('detectionQueue.loadFailed'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = items.length;

  const stats = useMemo(
    () => [
      {
        label: t('detectionQueue.statPending'),
        value: String(pendingCount),
        tone: 'amber',
      },
      {
        label: t('detectionQueue.statWorkflow'),
        value: t('detectionQueue.statWorkflowValue'),
        tone: 'blue',
      },
      {
        label: t('detectionQueue.statAuthority'),
        value: t('detectionQueue.statAuthorityValue'),
        tone: 'emerald',
      },
    ],
    [pendingCount, t],
  );

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActingId(approveTarget.id);
    try {
      await apiClient.post(`${OFFICER_API.violations}${approveTarget.id}/approve/`, {
        issue_fine: issueFine,
        officer_note: officerNote.trim() || undefined,
      });
      toast.success(
        issueFine ? t('detectionQueue.approvedWithFine') : t('detectionQueue.approved'),
      );
      setApproveTarget(null);
      setOfficerNote('');
      setIssueFine(true);
      await load();
    } catch {
      toast.error(t('detectionQueue.approveFailed'));
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      toast.error(t('detectionQueue.rejectReasonRequired'));
      return;
    }
    setActingId(rejectTarget.id);
    try {
      await apiClient.post(`${OFFICER_API.violations}${rejectTarget.id}/reject/`, {
        dismissal_reason: rejectReason.trim(),
      });
      toast.success(t('detectionQueue.rejected'));
      setRejectTarget(null);
      setRejectReason('');
      await load();
    } catch {
      toast.error(t('detectionQueue.rejectFailed'));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="enforcement-page admin-dashboard-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <p className="traffic-rules-page__kingdom-badge">{t('pages.signs.kingdom')}</p>
            <div className="enforcement-page__eyebrow">
              <ClipboardList size={14} />
              <span>{t('detectionQueue.eyebrow')}</span>
            </div>
            <h1 className="enforcement-page__title">{t('detectionQueue.title')}</h1>
            <p className="enforcement-page__subtitle">{t('detectionQueue.subtitle')}</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            <span className="ml-2">{t('common.refresh')}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-6 flex gap-3">
        <ShieldAlert className="shrink-0 text-amber-600" size={20} />
        <div>
          <p className="font-medium text-foreground">{t('detectionQueue.policyTitle')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('detectionQueue.policyBody')}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('detectionQueue.colDate')}</TableHead>
              <TableHead>{t('detectionQueue.colType')}</TableHead>
              <TableHead>{t('detectionQueue.colPlate')}</TableHead>
              <TableHead>{t('detectionQueue.colDriver')}</TableHead>
              <TableHead>{t('detectionQueue.colLocation')}</TableHead>
              <TableHead>{t('detectionQueue.colSign')}</TableHead>
              <TableHead className="text-right">{t('detectionQueue.colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="inline animate-spin mr-2" size={16} />
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableEmptyState
                colSpan={7}
                icon={<ClipboardList size={28} />}
                title={t('detectionQueue.emptyTitle')}
                subtitle={t('detectionQueue.emptyDesc')}
                tone="amber"
              />
            ) : (
              items.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatAppDate(locale, v.violation_date, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {(v.violation_type || '—').replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {v.vehicle_plate || '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{v.driver_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{v.driver_license}</div>
                  </TableCell>
                  <TableCell className="text-sm max-w-[160px] truncate" title={v.location}>
                    {v.location || '—'}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {v.detected_class_key || v.detected_sign_code || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        size="sm"
                        disabled={actingId === v.id}
                        onClick={() => {
                          setApproveTarget(v);
                          setOfficerNote('');
                          setIssueFine(true);
                        }}
                      >
                        <CheckCircle2 size={14} className="mr-1" />
                        {t('detectionQueue.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actingId === v.id}
                        onClick={() => {
                          setRejectTarget(v);
                          setRejectReason('');
                        }}
                      >
                        <XCircle size={14} className="mr-1" />
                        {t('detectionQueue.reject')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detectionQueue.approveTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {approveTarget
                ? `${(approveTarget.violation_type || '').replace(/_/g, ' ')} · ${
                    approveTarget.vehicle_plate || approveTarget.driver_name || approveTarget.id
                  }`
                : ''}
            </p>
            <div className="space-y-2">
              <Label htmlFor="officer-note">{t('detectionQueue.officerNote')}</Label>
              <Textarea
                id="officer-note"
                value={officerNote}
                onChange={(e) => setOfficerNote(e.target.value)}
                rows={3}
                placeholder={t('detectionQueue.officerNotePlaceholder')}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={issueFine}
                onChange={(e) => setIssueFine(e.target.checked)}
                className="rounded border-border"
              />
              {t('detectionQueue.issueFineWithApprove')}
            </label>
            {issueFine && (
              <p className="text-xs text-muted-foreground">
                {t('detectionQueue.fineHint')} ({formatAppCurrency(locale, 10)}–{formatAppCurrency(locale, 50)})
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleApprove()} disabled={!!actingId}>
              {actingId ? <Loader2 className="animate-spin" size={16} /> : null}
              {t('detectionQueue.confirmApprove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detectionQueue.rejectTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">{t('detectionQueue.rejectReason')}</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder={t('detectionQueue.rejectReasonPlaceholder')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void handleReject()} disabled={!!actingId}>
              {actingId ? <Loader2 className="animate-spin" size={16} /> : null}
              {t('detectionQueue.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
