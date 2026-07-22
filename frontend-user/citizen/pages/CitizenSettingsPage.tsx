import { Settings2, Globe } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { AppearanceSettingsPanel } from '@shared/components/AppearanceSettingsPanel';
import type { Locale } from '@shared/i18n/translations';
import { cn } from '@shared/components/ui/utils';

const LOCALE_OPTS: { id: Locale; labelKey: string }[] = [
  { id: 'en', labelKey: 'driverSettings.localeEn' },
  { id: 'km', labelKey: 'driverSettings.localeKm' },
];

export function CitizenSettingsPage() {
  const { t, locale, setLocale } = useLanguage();

  return (
    <div className="enforcement-page enforcement-page--settings dashboard-page--settings settings-page--enterprise enforcement-page--user-settings">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Settings2 size={14} />
              </span>
              {t('driverSettings.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('driverSettings.title')}</h1>
            <p className="enforcement-page__subtitle">{t('driverSettings.subtitle')}</p>
          </div>
        </div>
      </div>

      <section className="settings-page__locale-panel mb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-cyan-600" />
          <h2 className="font-semibold text-lg">{t('driverSettings.localeTitle')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('driverSettings.localeHint')}</p>
        <div className="settings-page__locale-row">
          {LOCALE_OPTS.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setLocale(id)}
              className={cn(
                'settings-page__locale-btn',
                locale === id && 'settings-page__locale-btn--active',
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

/** @deprecated Prefer CitizenSettingsPage */
export const DriverSettingsPage = CitizenSettingsPage;
