import { useNavigate } from 'react-router';
import { Settings2, Globe, User, Bell, ArrowRight } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { AppearanceSettingsPanel } from '@shared/components/AppearanceSettingsPanel';
import { USER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';
import type { Locale } from '@shared/i18n/translations';
import { cn } from '@shared/components/ui/utils';

const LOCALE_OPTS: { id: Locale; labelKey: string }[] = [
  { id: 'en', labelKey: 'driverSettings.localeEn' },
  { id: 'km', labelKey: 'driverSettings.localeKm' },
];

const OFFICER_LOCALE_OPTS: { id: Locale; labelKey: string }[] = [
  { id: 'en', labelKey: 'officerSettings.localeEn' },
  { id: 'km', labelKey: 'officerSettings.localeKm' },
];

/** Shared settings page for officer (police) and driver portals. */
export function UserSettingsPage() {
  const { user } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const navigate = useNavigate();
  const isOfficer = user?.role === 'police';
  const ns = isOfficer ? 'officerSettings' : 'driverSettings';
  const localeOpts = isOfficer ? OFFICER_LOCALE_OPTS : LOCALE_OPTS;

  const quickLinks = [
    {
      label: t(isOfficer ? 'officerSettings.profileLink' : 'pages.profile.title'),
      desc: isOfficer ? t('officerSettings.profileLinkDesc') : t('pages.profile.subtitle'),
      icon: User,
      tone: 'violet' as const,
      path: USER_PORTAL_ROUTES.profile,
    },
    {
      label: t(isOfficer ? 'officerSettings.notificationsLink' : 'sidebar.modules.notifications'),
      desc: isOfficer ? t('officerSettings.notificationsLinkDesc') : t('notifications.subtitle'),
      icon: Bell,
      tone: 'blue' as const,
      path: USER_PORTAL_ROUTES.notifications,
    },
  ];

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
              {t(`${ns}.eyebrow`)}
            </div>
            <h1 className="enforcement-page__title">{t(`${ns}.title`)}</h1>
            <p className="enforcement-page__subtitle">{t(`${ns}.subtitle`)}</p>
          </div>
        </div>
      </div>

      <section className="settings-page__locale-panel mb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-violet-600" />
          <h2 className="font-semibold text-lg">{t(`${ns}.localeTitle`)}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t(`${ns}.localeHint`)}</p>
        <div className="settings-page__locale-row">
          {localeOpts.map(({ id, labelKey }) => (
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

      {isOfficer && (
        <section className="mb-6 space-y-3">
          <div>
            <h2 className="font-semibold text-lg">{t('officerSettings.quickLinksTitle')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('officerSettings.quickLinksHint')}</p>
          </div>
          <div className="settings-page__grid">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className={cn('settings-page__card settings-page__card--link', `settings-page__card--${link.tone}`)}
                >
                  <span className={cn('settings-page__card-icon', `settings-page__card-icon--${link.tone}`)}>
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="settings-page__card-label">{link.label}</p>
                    <p className="settings-page__card-value text-sm font-normal opacity-80">{link.desc}</p>
                  </div>
                  <ArrowRight size={16} className="shrink-0 opacity-50" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      <AppearanceSettingsPanel />
    </div>
  );
}
