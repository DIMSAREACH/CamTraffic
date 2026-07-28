import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useLanguage } from '@shared/context/LanguageContext';
import { notificationsAPI } from '@shared/services/api';
import { toast } from 'sonner';

type ScheduleRow = {
  id: string;
  name: string;
  title?: string;
  message?: string;
  recipient_role?: string;
  frequency?: string;
  run_at?: string | null;
  enabled?: boolean;
  last_status?: string;
};

export function ScheduledNotificationsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('Daily driver reminder');
  const [title, setTitle] = useState('CamTraffic reminder');
  const [message, setMessage] = useState('Please check your fines in the citizen portal.');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsAPI.listSchedules();
      setRows(data as ScheduleRow[]);
    } catch {
      toast.error('Failed to load schedules');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const runAt = new Date(Date.now() + 60_000).toISOString();
      await notificationsAPI.createSchedule({
        name,
        title,
        message,
        recipient_role: 'driver',
        channels: ['system'],
        frequency: 'daily',
        run_at: runAt,
        enabled: true,
      });
      toast.success('Schedule created (runs via Celery beat / Run due)');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const runDue = async () => {
    setBusy(true);
    try {
      const res = await notificationsAPI.runDueSchedules();
      toast.success(`Processed: ${JSON.stringify(res)}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Run failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="enforcement-page enforcement-page--notifications notif-center">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-inner notif-center__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><CalendarClock size={14} /></span>
              Live API · Celery beat
            </div>
            <h1 className="enforcement-page__title">{t('pages.notifications.scheduledTitle')}</h1>
            <p className="enforcement-page__subtitle">
              Real schedules in PostgreSQL. Due jobs run every minute (Celery) or via Run due.
            </p>
          </div>
          <div className="notif-center__hero-actions">
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Refresh
            </Button>
            <Button type="button" variant="outline" onClick={() => void runDue()} disabled={busy}>
              Run due now
            </Button>
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel p-6 space-y-3 mb-4">
        <p className="text-sm font-medium">Create schedule</p>
        <input className="w-full border rounded-md px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input className="w-full border rounded-md px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <textarea className="w-full border rounded-md px-3 py-2 min-h-[80px]" value={message} onChange={(e) => setMessage(e.target.value)} />
        <Button type="button" onClick={() => void create()} disabled={busy}>
          <Plus size={15} /> Create (run in ~1 min)
        </Button>
      </div>

      <div className="enforcement-page__panel p-4">
        {loading ? (
          <p className="text-sm opacity-70">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm opacity-70">0 schedules (create one above — no sample data).</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 border-b py-2 text-sm">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="opacity-70">{r.title} · {r.recipient_role} · {r.frequency}</p>
                  <p className="text-xs opacity-60">Next: {r.run_at || '—'} · {r.last_status || 'never run'} · {r.enabled ? 'on' : 'off'}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await notificationsAPI.deleteSchedule(r.id);
                    toast.success('Deleted');
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
