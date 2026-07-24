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

export function NotificationDetailsPage() {
  const { notificationId = '' } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notif, setNotif] = useState<AdminNotif | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleted, setDeleted] = useState(false);

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
      <div className="enforcement-page enforcement-page--notifications notif-center p-8 flex items-center gap-2">
        <Loader2 className="animate-spin" size={18} /> Loading…
      </div>
    );
  }

  if (!notif || deleted) {
    return (
      <div className="enforcement-page enforcement-page--notifications notif-center">
        <div className="enforcement-page__panel notif-center__panel p-8 text-center space-y-4">
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
          <Link to="/admin/notifications/list" className="notif-center__back-link">
            <ArrowLeft size={14} />
            {t('notifCenter.backList')}
          </Link>
        </div>
      </div>

      <div className="enforcement-page__panel p-6 space-y-3">
        <p><strong>Message:</strong> {notif.message}</p>
        <p><strong>Type:</strong> {notif.type}</p>
        <p><strong>Recipient:</strong> {notif.user_name || '—'} ({notif.user_email}) · {notif.user_role}</p>
        <p><strong>Status:</strong> {notif.is_read ? 'read' : 'unread'}</p>
        <p><strong>Created:</strong> {notif.created_at ? new Date(notif.created_at).toLocaleString() : '—'}</p>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="destructive" onClick={() => void handleDelete()}>
            <Trash2 size={14} />
            {t('notifCenter.actionDelete') !== 'notifCenter.actionDelete' ? t('notifCenter.actionDelete') : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
