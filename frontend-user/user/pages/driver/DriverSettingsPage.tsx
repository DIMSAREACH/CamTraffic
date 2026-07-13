import { Settings2, Globe } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { AppearanceSettingsPanel } from '@shared/components/AppearanceSettingsPanel';
import type { Locale } from '@shared/i18n/translations';
import { cn } from '@shared/components/ui/utils';

const LOCALE_OPTS: { id: Locale; labelKey: string }[] = [
  { id: 'en', labelKey: 'driverSettings.localeEn' },
  { id: 'km', labelKey: 'driverSettings.localeKm' },
];

export function DriverSettingsPage() {
  const { t, locale, setLocale } = useLanguage();

  return (
    <div className="enforcement-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <Settings2 size={14} />
              {t('driverSettings.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('driverSettings.title')}</h1>
            <p className="enforcement-page__subtitle">{t('driverSettings.subtitle')}</p>
          </div>
        </div>
      </div>

      <section className="enforcement-page__panel p-5 mb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-cyan-600" />
          <h2 className="font-semibold text-lg">{t('driverSettings.localeTitle')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('driverSettings.localeHint')}</p>
        <div className="flex flex-wrap gap-2">
          {LOCALE_OPTS.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setLocale(id)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
                locale === id
                  ? 'bg-cyan-600 text-white border-cyan-600'
                  : 'bg-background border-border hover:bg-muted',
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </section>

      <AppearanceSettingsPanel />
    </div>
  );
}
