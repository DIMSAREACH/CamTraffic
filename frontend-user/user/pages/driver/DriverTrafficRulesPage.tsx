import { BookOpen, Scale, Phone, Mail, MessageCircle } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';

const RULE_SECTIONS = [
  {
    titleKey: 'trafficRules.sectionSpeed',
    items: ['trafficRules.speed1', 'trafficRules.speed2', 'trafficRules.speed3'],
  },
  {
    titleKey: 'trafficRules.sectionSafety',
    items: ['trafficRules.safety1', 'trafficRules.safety2', 'trafficRules.safety3'],
  },
  {
    titleKey: 'trafficRules.sectionPenalties',
    items: ['trafficRules.penalty1', 'trafficRules.penalty2', 'trafficRules.penalty3'],
  },
] as const;

export function DriverTrafficRulesPage() {
  const { t } = useLanguage();

  return (
    <div className="enforcement-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <p className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon" aria-hidden>
                <Scale size={14} />
              </span>
              {t('sidebar.modules.trafficRules')}
            </p>
            <h1 className="enforcement-page__title">{t('sidebar.pageTitles.trafficRules')}</h1>
            <p className="enforcement-page__subtitle">{t('trafficRules.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel space-y-4">
        {RULE_SECTIONS.map((section) => (
          <section key={section.titleKey} className="rounded-2xl border bg-card p-5">
            <h2 className="text-base font-semibold mb-3">{t(section.titleKey)}</h2>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {section.items.map((itemKey) => (
                <li key={itemKey}>{t(itemKey)}</li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-sm text-muted-foreground flex items-start gap-2">
          <BookOpen size={16} className="mt-0.5 shrink-0" />
          {t('trafficRules.referenceHint')}
        </p>
      </div>
    </div>
  );
}
