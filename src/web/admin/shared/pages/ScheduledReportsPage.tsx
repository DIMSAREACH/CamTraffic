import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useLanguage } from '@shared/context/LanguageContext';
import { notificationsAPI } from '@shared/services/api';
import { toast } from 'sonner';

type ReportRow = {
  id: string;
  name: string;
  report_type?: string;
  frequency?: string;
  recipient_emails?: string[];
  run_at?: string | null;
  last_status?: string;
  enabled?: boolean;
};

export function ScheduledReportsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('Daily enforcement email');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await notificationsAPI.listReportSchedules()) as ReportRow[]);
    } catch {
      toast.error('Failed to load report schedules');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!email.trim()) {
      toast.error('Recipient email is required');
      return;
    }
    setBusy(true);
    try {
      await notificationsAPI.createReportSchedule({
        name,
        report_type: 'enforcement_summary',
        export_format: 'pdf',
        frequency: 'daily',
        recipient_emails: [email],
        run_at: new Date(Date.now() + 60_000).toISOString(),
        enabled: true,
      });
      toast.success('Report schedule created');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="enforcement-page enforcement-page--reports">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <CalendarClock size={14} /> Live schedules
            </div>
            <h1 className="enforcement-page__title">
              {t('pages.reports.scheduledTitle') !== 'pages.reports.scheduledTitle'
                ? t('pages.reports.scheduledTitle')
                : 'Scheduled reports'}
            </h1>
            <p className="enforcement-page__subtitle">
              Emails summary when SMTP/Resend is configured. Instant PDF/Excel still on Report Center.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="enforcement-page__panel p-6 space-y-3 mb-4">
        <input className="w-full border rounded-md px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full border rounded-md px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Recipient email" />
        <Button type="button" onClick={() => void create()} disabled={busy}>
          <Plus size={15} /> Create daily schedule
        </Button>
      </div>

      <div className="enforcement-page__panel p-4">
        {loading ? (
          <p className="text-sm opacity-70">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm opacity-70">0 scheduled report jobs</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 border-b py-2 text-sm">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="opacity-70">{r.report_type} · {r.frequency} · {(r.recipient_emails || []).join(', ')}</p>
                  <p className="text-xs opacity-60">{r.run_at} · {r.last_status || 'never'}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await notificationsAPI.deleteReportSchedule(r.id);
                    void load();
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
