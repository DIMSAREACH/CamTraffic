import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Bell, CalendarClock, Mail, MessageSquare, Save, Send,
  Smartphone, Users, Shield, UserRound, LayoutGrid, AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import type { NotifChannel, NotifPriority, NotifRecipientRole } from '@shared/constants/notificationCatalog';
import { toast } from 'sonner';

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

const PRIORITIES: NotifPriority[] = ['low', 'medium', 'high', 'critical'];

export function SendNotificationPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState<NotifRecipientRole>('driver');
  const [channels, setChannels] = useState<NotifChannel[]>(['system', 'email']);
  const [priority, setPriority] = useState<NotifPriority>('medium');
  const [busy, setBusy] = useState(false);

  const toggleChannel = (ch: NotifChannel) => {
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
    if (channels.length === 0) {
      toast.error(t('notifCenter.validationChannel'));
      return false;
    }
    return true;
  };

  const handleSend = async () => {
    if (!validate() || busy) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    toast.success(t('notifCenter.toastSent'));
    setBusy(false);
    navigate('/admin/notifications/list');
  };

  const handleSchedule = () => {
    if (!validate()) return;
    toast.success(t('notifCenter.toastScheduled'));
    navigate('/admin/notifications/scheduled');
  };

  const handleSaveTemplate = () => {
    if (!validate()) return;
    try {
      const key = 'camtraffic_saved_notification_drafts';
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) as unknown[] : [];
      list.unshift({
        title, message, recipient, channels, priority, savedAt: new Date().toISOString(),
      });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 20)));
      toast.success(t('notifCenter.toastTemplateSaved'));
    } catch {
      toast.error(t('notifCenter.toastTemplateFail'));
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
              <span className="enforcement-page__eyebrow-icon"><Send size={14} /></span>
              {t('pages.notifications.sendEyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.notifications.sendTitle')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.notifications.sendSubtitle')}</p>
          </div>
          <div className="notif-center__hero-actions">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
              onClick={() => navigate('/admin/notifications')}
            >
              <ArrowLeft size={15} aria-hidden />
              {t('notifCenter.backDashboard')}
            </button>
          </div>
        </div>
      </div>

      <div className="notif-compose-page__layout">
        <form
          className="enforcement-page__panel notif-compose-page__form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <header className="notif-compose-page__section-head">
            <span className="notif-compose-page__section-icon" aria-hidden>
              <Bell size={15} />
            </span>
            <div>
              <h2 className="notif-compose-page__section-title">{t('notifCenter.composeFormTitle')}</h2>
              <p className="notif-compose-page__section-desc">{t('notifCenter.composeFormHint')}</p>
            </div>
          </header>

          <label className="notif-compose-page__field">
            <span>{t('notifCenter.fieldTitle')}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('notifCenter.fieldTitlePlaceholder')}
              className="notif-compose-page__input"
            />
          </label>

          <fieldset className="notif-compose-page__fieldset">
            <legend>{t('notifCenter.fieldRecipient')}</legend>
            <div className="notif-compose-page__chip-grid">
              {ROLES.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`notif-compose-page__chip${recipient === id ? ' is-active' : ''}`}
                  onClick={() => setRecipient(id)}
                  aria-pressed={recipient === id}
                >
                  <Icon size={15} aria-hidden />
                  {t(`notifCenter.role.${id}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="notif-compose-page__field">
            <span>{t('notifCenter.fieldMessage')}</span>
            <textarea
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('notifCenter.fieldMessagePlaceholder')}
              className="notif-compose-page__textarea"
            />
            <span className="notif-compose-page__hint">
              {t('notifCenter.messageCharCount', { count: message.length })}
            </span>
          </label>

          <fieldset className="notif-compose-page__fieldset">
            <legend>{t('notifCenter.fieldChannel')}</legend>
            <div className="notif-compose-page__chip-grid notif-compose-page__chip-grid--channels">
              {CHANNELS.map(({ id, icon: Icon }) => {
                const active = channels.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`notif-compose-page__chip notif-compose-page__chip--channel${active ? ' is-active' : ''}`}
                    onClick={() => toggleChannel(id)}
                    aria-pressed={active}
                  >
                    <Icon size={15} aria-hidden />
                    {t(`notifCenter.channel.${id}`)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="notif-compose-page__fieldset">
            <legend>{t('notifCenter.fieldPriority')}</legend>
            <div className="notif-compose-page__priority-row">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`notif-compose-page__priority notif-compose-page__priority--${p}${priority === p ? ' is-active' : ''}`}
                  onClick={() => setPriority(p)}
                  aria-pressed={priority === p}
                >
                  {p === 'critical' ? <AlertTriangle size={13} aria-hidden /> : null}
                  {t(`notifCenter.priority.${p}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="notif-compose-page__actions">
            <button type="submit" className="notif-compose-page__btn notif-compose-page__btn--primary" disabled={busy}>
              <Send size={15} aria-hidden />
              {t('notifCenter.actionSendNow')}
            </button>
            <button type="button" className="notif-compose-page__btn notif-compose-page__btn--secondary" onClick={handleSchedule}>
              <CalendarClock size={15} aria-hidden />
              {t('notifCenter.actionSchedule')}
            </button>
            <button type="button" className="notif-compose-page__btn notif-compose-page__btn--ghost" onClick={handleSaveTemplate}>
              <Save size={15} aria-hidden />
              {t('notifCenter.actionSaveTemplate')}
            </button>
          </div>
        </form>

        <aside className="enforcement-page__panel notif-compose-page__preview" aria-live="polite">
          <header className="notif-compose-page__section-head">
            <span className="notif-compose-page__section-icon notif-compose-page__section-icon--preview" aria-hidden>
              <Smartphone size={15} />
            </span>
            <div>
              <h2 className="notif-compose-page__section-title">{t('notifCenter.previewTitle')}</h2>
              <p className="notif-compose-page__section-desc">{t('notifCenter.previewHint')}</p>
            </div>
          </header>

          <div className="notif-compose-page__phone">
            <div className="notif-compose-page__phone-notch" aria-hidden />
            <article className={`notif-compose-page__toast notif-compose-page__toast--${priority}`}>
              <div className="notif-compose-page__toast-top">
                <span className="notif-compose-page__toast-app">
                  <Bell size={12} aria-hidden />
                  CamTraffic
                </span>
                <span className="notif-compose-page__toast-time">{t('notifCenter.previewNow')}</span>
              </div>
              <h3 className="notif-compose-page__toast-title">{previewTitle}</h3>
              <p className="notif-compose-page__toast-body">{previewMessage}</p>
            </article>
          </div>

          <dl className="notif-compose-page__meta">
            <div>
              <dt>{t('notifCenter.fieldRecipient')}</dt>
              <dd>{t(`notifCenter.role.${recipient}`)}</dd>
            </div>
            <div>
              <dt>{t('notifCenter.fieldChannel')}</dt>
              <dd>{channelLabels || t('notifCenter.previewNoChannel')}</dd>
            </div>
            <div>
              <dt>{t('notifCenter.fieldPriority')}</dt>
              <dd>
                <span className={`notif-compose-page__priority-pill notif-compose-page__priority-pill--${priority}`}>
                  {t(`notifCenter.priority.${priority}`)}
                </span>
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
