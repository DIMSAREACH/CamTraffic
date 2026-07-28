import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Bell, Loader2, Mail, MessageSquare, Send,
  Smartphone, Users, Shield, UserRound, LayoutGrid,
} from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { notificationsAPI } from '@shared/services/api';
import { toast } from 'sonner';

type NotifChannel = 'system' | 'email' | 'push' | 'sms';
type NotifRecipientRole = 'driver' | 'officer' | 'admin' | 'all';

const CHANNELS: { id: NotifChannel; icon: typeof Bell }[] = [
  { id: 'system', icon: Bell },
  { id: 'email', icon: Mail },
  { id: 'push', icon: Smartphone },
  { id: 'sms', icon: MessageSquare },
];

const ROLES: { id: NotifRecipientRole; icon: typeof Users }[] = [
  { id: 'driver', icon: UserRound },
  { id: 'officer', icon: Shield },
  { id: 'admin', icon: LayoutGrid },
  { id: 'all', icon: Users },
];

export function SendNotificationPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState<NotifRecipientRole>('driver');
  const [channels, setChannels] = useState<NotifChannel[]>(['system']);
  const [channelOk, setChannelOk] = useState<Record<string, boolean>>({ system: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void notificationsAPI.channelStatus()
      .then((s) => setChannelOk({ system: true, ...s }))
      .catch(() => setChannelOk({ system: true }));
  }, []);

  const toggleChannel = (ch: NotifChannel) => {
    if (ch === 'system') return;
    setChannels((prev) => (
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    ));
  };

  const validate = () => {
    if (!title.trim()) {
      toast.error(t('notifCenter.validationTitle'));
      return false;
    }
    if (!message.trim()) {
      toast.error(t('notifCenter.validationMessage'));
      return false;
    }
    return true;
  };

  const handleSend = async () => {
    if (!validate() || busy) return;
    setBusy(true);
    try {
      const res = await notificationsAPI.adminBroadcast({
        title: title.trim(),
        message: message.trim(),
        type: 'system',
        recipient,
        channels: channels.includes('system') ? channels : ['system', ...channels],
      });
      toast.success(`Sent ${res.created} in-app` +
        (res.email_sent ? `, email ${res.email_sent}` : '') +
        (res.push_sent ? `, push ${res.push_sent}` : '') +
        (res.sms_sent ? `, sms ${res.sms_sent}` : ''));
      if (res.note) toast.message(res.note);
      navigate('/admin/notifications/list');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || 'Broadcast failed');
    } finally {
      setBusy(false);
    }
  };

  const previewTitle = title.trim() || t('notifCenter.previewTitleFallback');
  const previewMessage = message.trim() || t('notifCenter.previewMessageFallback');
  const channelLabels = useMemo(
    () => channels.map((ch) => t(`notifCenter.channel.${ch}`)).join(' · '),
    [channels, t],
  );

  return (
    <div className="enforcement-page enforcement-page--notifications notif-center notif-compose-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner notif-center__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Bell size={14} /></span>
              Multi-channel broadcast
            </div>
            <h1 className="enforcement-page__title">Send notification</h1>
            <p className="enforcement-page__subtitle">
              In-app always. Email/push/SMS send when SMTP/FCM/Twilio are configured.
            </p>
          </div>
          <button type="button" className="notif-center__back-link" onClick={() => navigate('/admin/notifications/list')}>
            <ArrowLeft size={14} />
            {t('notifCenter.backList')}
          </button>
        </div>
      </div>

      <div className="notif-compose-page__grid">
        <section className="enforcement-page__panel space-y-4 p-6">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Title</span>
            <input className="w-full border rounded-md px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Message</span>
            <textarea className="w-full border rounded-md px-3 py-2 min-h-[120px]" value={message} onChange={(e) => setMessage(e.target.value)} disabled={busy} />
          </label>

          <div>
            <p className="text-sm font-medium mb-2">Recipients</p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${recipient === id ? 'border-teal-600 bg-teal-50' : ''}`}
                  onClick={() => setRecipient(id)}
                  disabled={busy}
                >
                  <Icon size={14} />
                  {id}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Channels</p>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map(({ id, icon: Icon }) => {
                const ready = channelOk[id] !== false;
                const selected = channels.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${selected ? 'border-teal-600 bg-teal-50' : ''} ${!ready && id !== 'system' ? 'opacity-60' : ''}`}
                    onClick={() => toggleChannel(id)}
                    disabled={busy || id === 'system'}
                    title={!ready && id !== 'system' ? 'Provider not configured — will attempt and report' : undefined}
                  >
                    <Icon size={14} />
                    {id}{!ready && id !== 'system' ? ' (off)' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-teal-700 text-white px-4 py-2 disabled:opacity-60"
            onClick={() => void handleSend()}
            disabled={busy}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {busy ? 'Sending…' : 'Send now'}
          </button>
        </section>

        <aside className="enforcement-page__panel p-6 space-y-2">
          <p className="text-sm font-medium">Preview</p>
          <p className="font-semibold">{previewTitle}</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{previewMessage}</p>
          <p className="text-xs">{channelLabels}</p>
          <p className="text-xs text-muted-foreground">To: {recipient}</p>
        </aside>
      </div>
    </div>
  );
}
