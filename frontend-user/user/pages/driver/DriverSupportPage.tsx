import { MessageCircle, Phone, Mail, Clock } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';

export function DriverSupportPage() {
  const { t } = useLanguage();

  const channels = [
    { icon: Phone, labelKey: 'support.hotline', valueKey: 'support.hotlineValue' },
    { icon: Mail, labelKey: 'support.email', valueKey: 'support.emailValue' },
    { icon: Clock, labelKey: 'support.hours', valueKey: 'support.hoursValue' },
  ] as const;

  return (
    <div className="enforcement-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <p className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon" aria-hidden>
                <MessageCircle size={14} />
              </span>
              {t('sidebar.modules.support')}
            </p>
            <h1 className="enforcement-page__title">{t('sidebar.pageTitles.support')}</h1>
            <p className="enforcement-page__subtitle">{t('support.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel grid gap-4 md:grid-cols-3">
        {channels.map(({ icon: Icon, labelKey, valueKey }) => (
          <div key={labelKey} className="rounded-2xl border bg-card p-5">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center mb-3">
              <Icon size={18} />
            </div>
            <p className="text-sm font-medium">{t(labelKey)}</p>
            <p className="text-sm text-muted-foreground mt-1">{t(valueKey)}</p>
          </div>
        ))}
      </div>

      <div className="enforcement-page__panel mt-4 rounded-2xl border bg-card p-5">
        <h2 className="text-base font-semibold mb-2">{t('support.faqTitle')}</h2>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>{t('support.faq1')}</li>
          <li>{t('support.faq2')}</li>
          <li>{t('support.faq3')}</li>
        </ul>
      </div>
    </div>
  );
}
