import { CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@shared/components/ui/button';
import { useLanguage } from '@shared/context/LanguageContext';

/**
 * Scheduled notifications require a job runner (Celery beat) + schedule table.
 * Production Admin Portal does not show catalog/demo schedules.
 */
export function ScheduledNotificationsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="enforcement-page enforcement-page--notifications notif-center">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><CalendarClock size={14} /></span>
              Production
            </div>
            <h1 className="enforcement-page__title">{t('pages.notifications.scheduledTitle')}</h1>
            <p className="enforcement-page__subtitle">
              No demo schedules. Use Send Notification for immediate live broadcasts.
              Cron-based schedules ship when Celery beat + schedule API are enabled in deploy.
            </p>
          </div>
        </div>
      </div>
      <div className="enforcement-page__panel p-8 text-center space-y-4">
        <CalendarClock size={36} className="mx-auto opacity-50" />
        <p>0 scheduled jobs in database (feature not enabled — no sample data).</p>
        <Button type="button" onClick={() => navigate('/admin/notifications/send')}>
          Send live notification
        </Button>
      </div>
    </div>
  );
}
