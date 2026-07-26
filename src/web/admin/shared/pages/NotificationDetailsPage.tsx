import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2, Trash2, Bell } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useLanguage } from '@shared/context/LanguageContext';
import { notificationsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Notification } from '@shared/types';

type AdminNotif = Notification & {
  user_email?: string;
  user_name?: string;
  user_role?: string;
};

function roleLabel(role?: string) {
  if (!role) return '—';
  if (role === 'police') return 'Officer';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function NotificationDetailsPage() {
  const { notificationId = '' } = useParams();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const [notif, setNotif] = useState<AdminNotif | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleted, setDeleted] = useState(false);
  const dateLocale = locale === 'km' ? 'km-KH' : 'en-GB';

  const load = useCallback(async () => {
    if (!notificationId) {
      setNotif(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await notificationsAPI.adminGet(notificationId);
      setNotif(row);
    } catch {
      setNotif(null);
    } finally {
      setLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="enforcement-page enforcement-page--notifications notif-center">
        <div className="notif-list__loading">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      </div>
    );
  }

  if (!notif || deleted) {
    return (
      <div className="enforcement-page enforcement-page--notifications notif-center">
        <div className="enforcement-page__panel notif-compose-page__form text-center space-y-4">
          <p>{t('notifCenter.detailsNotFound')}</p>
          <Button type="button" onClick={() => navigate('/admin/notifications/list')}>
            {t('notifCenter.backList')}
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await notificationsAPI.adminDelete(String(notif.id));
      setDeleted(true);
      toast.success(t('notifCenter.toastDeleted'));
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="enforcement-page enforcement-page--notifications notif-center">
      <div className="enforcement-page__hero notif-center__hero--compact">
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
          <Link to="/admin/notifications/list" className="notif-center__back-link">
            <ArrowLeft size={14} />
            {t('notifCenter.backList')}
          </Link>
        </div>
      </div>

      <div className="notif-compose-page__layout">
        <section className="notif-compose-page__form space-y-4">
          <div className="notif-compose-page__section-head">
            <span className="notif-compose-page__section-icon"><Bell size={16} /></span>
            <div>
              <h2 className="notif-compose-page__section-title">{notif.title}</h2>
              <p className="notif-compose-page__section-desc">Live notification record from PostgreSQL</p>
            </div>
          </div>

          <p className="notif-compose-page__toast-body" style={{ whiteSpace: 'pre-wrap', color: '#334155' }}>
            {notif.message}
          </p>

          <dl className="notif-compose-page__meta">
            <div>
              <dt>Type</dt>
              <dd>{notif.type}</dd>
            </div>
            <div>
              <dt>Recipient</dt>
              <dd>{notif.user_name || notif.user_email || '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{notif.user_email || '—'}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{roleLabel(notif.user_role)}</dd>
            </div>
            <div>
              <dt>Channel</dt>
              <dd>
                <span className="notif-list__pill notif-list__pill--channel">in-app</span>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`notif-list__pill notif-list__pill--status ${notif.is_read ? 'is-read' : 'is-unread'}`}>
                  {notif.is_read ? 'Read' : 'Unread'}
                </span>
              </dd>
            </div>
            <div>
              <dt>Sent</dt>
              <dd>
                {notif.created_at
                  ? new Date(notif.created_at).toLocaleString(dateLocale)
                  : '—'}
              </dd>
            </div>
          </dl>

          <div className="notif-compose-page__actions">
            <Button type="button" variant="destructive" onClick={() => void handleDelete()}>
              <Trash2 size={14} />
              {t('notifCenter.actionDelete') !== 'notifCenter.actionDelete' ? t('notifCenter.actionDelete') : 'Delete'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
