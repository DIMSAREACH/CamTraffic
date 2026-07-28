import { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useLanguage } from '@shared/context/LanguageContext';
import { notificationsAPI } from '@shared/services/api';
import { toast } from 'sonner';

type TemplateRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  channels?: string[];
  is_active?: boolean;
};

export function NotificationTemplatesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Fine reminder');
  const [body, setBody] = useState('You have an unpaid fine. Please pay in the CamTraffic citizen portal.');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await notificationsAPI.listTemplates()) as TemplateRow[]);
    } catch {
      toast.error('Failed to load templates');
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
      await notificationsAPI.createTemplate({
        title,
        body,
        channels: ['system'],
        notification_type: 'fine',
        is_active: true,
      });
      toast.success('Template saved');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="enforcement-page enforcement-page--notifications notif-center">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-inner notif-center__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">Live API</div>
            <h1 className="enforcement-page__title">
              {t('pages.notifications.templatesTitle') !== 'pages.notifications.templatesTitle'
                ? t('pages.notifications.templatesTitle')
                : 'Notification templates'}
            </h1>
            <p className="enforcement-page__subtitle">Stored in PostgreSQL for schedules and broadcasts.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="enforcement-page__panel p-6 space-y-3 mb-4">
        <input className="w-full border rounded-md px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full border rounded-md px-3 py-2 min-h-[100px]" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button type="button" onClick={() => void create()} disabled={busy}>
          <Plus size={15} /> Save template
        </Button>
      </div>

      <div className="enforcement-page__panel p-4">
        {loading ? (
          <p className="text-sm opacity-70">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm opacity-70 flex items-center gap-2"><FileText size={16} /> 0 templates</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 border-b py-2 text-sm">
                <div>
                  <p className="font-medium">{r.title} <span className="opacity-50">({r.slug})</span></p>
                  <p className="opacity-70 whitespace-pre-wrap">{r.body}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await notificationsAPI.deleteTemplate(r.id);
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
