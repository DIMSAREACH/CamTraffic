import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Download, RefreshCw, Trash2, Bell } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useLanguage } from '@shared/context/LanguageContext';
import { getEnterpriseNotification } from '@shared/constants/notificationCatalog';
import { toast } from 'sonner';

export function NotificationDetailsPage() {
  const { notificationId = '' } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [deleted, setDeleted] = useState(false);
  const notif = useMemo(() => getEnterpriseNotification(notificationId), [notificationId]);

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

  const handleResend = () => toast.success(t('notifCenter.toastResent'));
  const handleDownload = () => toast.message(t('notifCenter.toastDownload'));
  const handleDelete = () => {
    setDeleted(true);
    toast.success(t('notifCenter.toastDeleted'));
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

      <section className="enforcement-page__panel notif-center__panel notif-center__details">
        <dl className="notif-center__details-dl">
          <div>
            <dt>{t('notifCenter.detailsTitleField')}</dt>
            <dd>{notif.title}</dd>
          </div>
          <div>
            <dt>{t('notifCenter.colRecipient')}</dt>
            <dd>
              {t(`notifCenter.role.${notif.recipientRole}`)}
              {notif.recipientName ? ` : ${notif.recipientName}` : ''}
            </dd>
          </div>
          <div>
            <dt>{t('notifCenter.colChannel')}</dt>
            <dd>{notif.channels.map((c) => t(`notifCenter.channel.${c}`)).join(' + ')}</dd>
          </div>
          <div>
            <dt>{t('notifCenter.colStatus')}</dt>
            <dd>
              <span className={`notif-center__status notif-center__status--${notif.status}`}>
                {t(`notifCenter.status.${notif.status}`)}
              </span>
            </dd>
          </div>
          <div>
            <dt>{t('notifCenter.detailsDeliveryTime')}</dt>
            <dd>{notif.sentAt.replace('T', ' ').slice(0, 16)}</dd>
          </div>
          <div>
            <dt>{t('notifCenter.detailsReadTime')}</dt>
            <dd>{notif.readAt ? notif.readAt.replace('T', ' ').slice(0, 16) : '—'}</dd>
          </div>
        </dl>

        <div className="notif-center__message-box">
          <p className="notif-center__message-label">{t('notifCenter.fieldMessage')}</p>
          <p className="notif-center__message-body">“{notif.message}”</p>
        </div>

        <div className="notif-center__details-actions">
          <Button type="button" onClick={handleResend}>
            <RefreshCw size={15} />
            {t('notifCenter.actionResend')}
          </Button>
          <Button type="button" variant="outline" onClick={handleDownload}>
            <Download size={15} />
            {t('notifCenter.actionDownload')}
          </Button>
          <Button type="button" variant="outline" onClick={handleDelete}>
            <Trash2 size={15} />
            {t('notifCenter.actionDelete')}
          </Button>
        </div>
      </section>
    </div>
  );
}
