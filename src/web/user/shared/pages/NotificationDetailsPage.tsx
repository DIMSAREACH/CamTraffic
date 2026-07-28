import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useLanguage } from '@shared/context/LanguageContext';
import { useAuth } from '@shared/context/AuthContext';
import { getPortalRoutesForRole } from '@shared/constants/userPortalPaths';
import { notificationsAPI } from '@shared/services/api';
import type { Notification } from '@shared/types';
import { toast } from 'sonner';

export function NotificationDetailsPage() {
  const { notificationId = '' } = useParams();
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notif, setNotif] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const routes = getPortalRoutesForRole(user?.role === 'police' ? 'police' : 'driver');
  const dateLocale = locale === 'km' ? 'km-KH' : 'en-US';

  const load = useCallback(async () => {
    if (!user?.id || !notificationId) {
      setNotif(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await notificationsAPI.getByUser(user.id);
      const found = rows.find((n) => String(n.id) === String(notificationId)) || null;
      setNotif(found);
      if (found && !found.is_read) {
        try {
          await notificationsAPI.markRead(found.id);
          setNotif({ ...found, is_read: true });
        } catch {
          /* list still usable if mark-read fails */
        }
      }
    } catch {
      setNotif(null);
      toast.error(t('notifCenter.detailsNotFound'));
    } finally {
      setLoading(false);
    }
  }, [notificationId, t, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkRead = async () => {
    if (!notif || notif.is_read) return;
    setMarking(true);
    try {
      await notificationsAPI.markRead(notif.id);
      setNotif({ ...notif, is_read: true });
      toast.success(t('pages.notifications.markRead') !== 'pages.notifications.markRead'
        ? t('pages.notifications.markRead')
        : 'Marked as read');
    } catch {
      toast.error(t('pages.notifications.loadFailed') !== 'pages.notifications.loadFailed'
        ? t('pages.notifications.loadFailed')
        : 'Could not update notification');
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="enforcement-page enforcement-page--notifications notif-center">
        <div className="enforcement-page__panel notif-center__panel p-8 text-center space-y-3">
          <Loader2 className="mx-auto animate-spin text-muted-foreground" size={22} />
          <p>{t('pages.notifications.loading') !== 'pages.notifications.loading'
            ? t('pages.notifications.loading')
            : 'Loading notification…'}</p>
        </div>
      </div>
    );
  }

  if (!notif) {
    return (
      <div className="enforcement-page enforcement-page--notifications notif-center">
        <div className="enforcement-page__panel notif-center__panel p-8 text-center space-y-4">
          <p>{t('notifCenter.detailsNotFound')}</p>
          <Button type="button" onClick={() => navigate(routes.notifications)}>
            {t('notifCenter.backList')}
          </Button>
        </div>
      </div>
    );
  }

  const createdLabel = new Date(notif.created_at).toLocaleString(dateLocale);

  return (
    <div className="enforcement-page enforcement-page--notifications notif-center">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner notif-center__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Bell size={14} /></span>
              {t('pages.notifications.detailsEyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.notifications.detailsTitle')}</h1>
            <p className="enforcement-page__subtitle">{notif.title}</p>
          </div>
          <Link to={routes.notifications} className="notif-center__back-link">
            <ArrowLeft size={14} />
            {t('notifCenter.backList')}
          </Link>
        </div>
      </div>

      <section className="enforcement-page__panel notif-center__panel notif-center__details">
        <dl className="notif-center__details-dl">
          <div>
            <dt>{t('notifCenter.detailsTitleField')}</dt>
            <dd>{notif.title}</dd>
          </div>
          <div>
            <dt>{t('notifCenter.colStatus')}</dt>
            <dd>
              <span className={`notif-center__status notif-center__status--${notif.is_read ? 'read' : 'unread'}`}>
                {notif.is_read
                  ? (t('pages.notifications.read') !== 'pages.notifications.read' ? t('pages.notifications.read') : 'Read')
                  : (t('pages.notifications.unread') !== 'pages.notifications.unread' ? t('pages.notifications.unread') : 'Unread')}
              </span>
            </dd>
          </div>
          <div>
            <dt>{t('notifCenter.colChannel')}</dt>
            <dd>{notif.type || 'system'}</dd>
          </div>
          <div>
            <dt>{t('notifCenter.detailsDeliveryTime')}</dt>
            <dd>{createdLabel}</dd>
          </div>
        </dl>

        <div className="notif-center__message-box">
          <p className="notif-center__message-label">{t('notifCenter.fieldMessage')}</p>
          <p className="notif-center__message-body">{notif.message}</p>
        </div>

        <div className="notif-center__details-actions">
          {!notif.is_read ? (
            <Button type="button" onClick={() => void handleMarkRead()} disabled={marking}>
              {marking ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {t('pages.notifications.markRead') !== 'pages.notifications.markRead'
                ? t('pages.notifications.markRead')
                : 'Mark as read'}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => navigate(routes.notifications)}>
            <ArrowLeft size={15} />
            {t('notifCenter.backList')}
          </Button>
        </div>
      </section>
    </div>
  );
}
