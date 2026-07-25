import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@shared/components/ui/button';
import { useLanguage } from '@shared/context/LanguageContext';

/** Templates were localStorage/catalog demos — removed for production. */
export function NotificationTemplatesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="enforcement-page enforcement-page--notifications notif-center">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">Production</div>
            <h1 className="enforcement-page__title">{t('pages.notifications.templatesTitle') !== 'pages.notifications.templatesTitle'
              ? t('pages.notifications.templatesTitle')
              : 'Notification templates'}</h1>
            <p className="enforcement-page__subtitle">
              Demo template catalog removed. Compose and send live messages from Send Notification.
            </p>
          </div>
        </div>
      </div>
      <div className="enforcement-page__panel p-8 text-center space-y-4">
        <FileText size={36} className="mx-auto opacity-50" />
        <p>0 templates in database (no sample data).</p>
        <Button type="button" onClick={() => navigate('/admin/notifications/send')}>
          Compose live notification
        </Button>
      </div>
    </div>
  );
}
