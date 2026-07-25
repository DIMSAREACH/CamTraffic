import { CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@shared/components/ui/button';
import { useLanguage } from '@shared/context/LanguageContext';

/**
 * Scheduled reports catalog was demo-only. Live PDF/Excel exports remain on Report Center.
 */
export function ScheduledReportsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="enforcement-page enforcement-page--reports">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">Production</div>
            <h1 className="enforcement-page__title">{t('pages.reports.scheduledTitle') !== 'pages.reports.scheduledTitle'
              ? t('pages.reports.scheduledTitle')
              : 'Scheduled reports'}</h1>
            <p className="enforcement-page__subtitle">
              Demo schedules removed. Download live PDF/Excel from Report Center and Analytics.
            </p>
          </div>
        </div>
      </div>
      <div className="enforcement-page__panel p-8 text-center space-y-4">
        <CalendarClock size={36} className="mx-auto opacity-50" />
        <p>0 scheduled report jobs in database (no sample data).</p>
        <Button type="button" onClick={() => navigate('/admin/reports/center')}>
          Open Report Center
        </Button>
      </div>
    </div>
  );
}
