import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  Bell,
  Globe,
  Paintbrush,
  Settings2,
  User,
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { AppearanceSettingsPanel } from '@shared/components/AppearanceSettingsPanel';
import { NotificationPreferencesPanel } from '@shared/components/NotificationPreferencesPanel';
import { getPortalRoutesForRole } from '@shared/constants/userPortalPaths';
import type { Locale } from '@shared/i18n/translations';
import { cn } from '@shared/components/ui/utils';

type SettingsCategory = 'language' | 'appearance' | 'notifications' | 'account';
type CategoryTone = 'blue' | 'indigo' | 'cyan' | 'violet';

type CategoryDef = {
  id: SettingsCategory;
  labelKey: string;
  icon: typeof Settings2;
  tone: CategoryTone;
  group: 'preferences' | 'account';
};

const CATEGORIES: CategoryDef[] = [
  { id: 'language', labelKey: 'userSettings.navLanguage', icon: Globe, tone: 'blue', group: 'preferences' },
  { id: 'appearance', labelKey: 'userSettings.navAppearance', icon: Paintbrush, tone: 'indigo', group: 'preferences' },
  { id: 'notifications', labelKey: 'userSettings.navNotifications', icon: Bell, tone: 'cyan', group: 'preferences' },
  { id: 'account', labelKey: 'userSettings.navAccount', icon: User, tone: 'violet', group: 'account' },
];

const CATEGORY_GROUPS: { id: CategoryDef['group']; labelKey: string }[] = [
  { id: 'preferences', labelKey: 'userSettings.groupPreferences' },
  { id: 'account', labelKey: 'userSettings.groupAccount' },
];

const LOCALE_OPTS: { id: Locale; labelKey: string }[] = [
  { id: 'en', labelKey: 'userSettings.localeEn' },
  { id: 'km', labelKey: 'userSettings.localeKm' },
];

/** Shared settings page for officer (police) and citizen (driver) portals. */
export function UserSettingsPage() {
  const { user } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const navigate = useNavigate();
  const isOfficer = user?.role === 'police';
  const routes = getPortalRoutesForRole(isOfficer ? 'police' : 'driver');
  const [category, setCategory] = useState<SettingsCategory>('language');

  const activeCategory = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];
  const ActiveIcon = activeCategory.icon;

  const groupedCategories = useMemo(
    () => CATEGORY_GROUPS.map((group) => ({
      ...group,
      items: CATEGORIES.filter((c) => c.group === group.id),
    })).filter((g) => g.items.length > 0),
    [],
  );

  const accountLinks = [
    {
      label: t('userSettings.profileLink'),
      desc: t('userSettings.profileLinkDesc'),
      action: t('userSettings.profileLinkAction'),
      icon: User,
      tone: 'violet' as const,
      path: routes.profile,
    },
    {
      label: t('userSettings.notificationsLink'),
      desc: t('userSettings.notificationsLinkDesc'),
      action: t('userSettings.notificationsLinkAction'),
      icon: Bell,
      tone: 'cyan' as const,
      path: `${routes.settings}/notifications`,
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
              {t(isOfficer ? 'officerSettings.eyebrow' : 'driverSettings.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">
              {t(isOfficer ? 'officerSettings.title' : 'driverSettings.title')}
            </h1>
            <p className="enforcement-page__subtitle">
              {t(isOfficer ? 'officerSettings.subtitle' : 'driverSettings.subtitle')}
            </p>
            <div className="settings-shell__hero-chips" aria-hidden>
              <span className="settings-shell__hero-chip settings-shell__hero-chip--blue">
                {CATEGORIES.length} {t('userSettings.categories')}
              </span>
              <span className="settings-shell__hero-chip settings-shell__hero-chip--cyan">
                {t(activeCategory.labelKey)}
              </span>
              <span className="settings-shell__hero-chip settings-shell__hero-chip--emerald">
                {isOfficer ? t('navbar.rolePolice') : t('navbar.roleDriver')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-shell">
        <aside className="settings-shell__card settings-shell__nav" aria-label={t('userSettings.categories')}>
          <div className="settings-shell__card-accent" aria-hidden />
          <div className="settings-shell__nav-inner">
            <div className="settings-shell__nav-brand">
              <span className="settings-shell__nav-brand-icon"><Settings2 size={16} /></span>
              <div>
                <p className="settings-shell__nav-heading">{t('userSettings.categories')}</p>
                <p className="settings-shell__nav-sub">{t('userSettings.navHint')}</p>
              </div>
            </div>
            <nav className="settings-shell__nav-list">
              {groupedCategories.map((group) => (
                <div key={group.id} className="settings-shell__nav-group">
                  <p className="settings-shell__nav-group-label">{t(group.labelKey)}</p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = category === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          'settings-shell__nav-item',
                          `settings-shell__nav-item--${item.tone}`,
                          active && 'settings-shell__nav-item--active',
                        )}
                        onClick={() => setCategory(item.id)}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className={cn('settings-shell__nav-icon', `settings-shell__nav-icon--${item.tone}`)}>
                          <Icon size={14} />
                        </span>
                        <span className="settings-shell__nav-label">{t(item.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <section
          className={cn('settings-shell__card settings-shell__panel', `settings-shell__panel--${activeCategory.tone}`)}
          aria-labelledby="user-settings-panel-title"
        >
          <div className="settings-shell__card-accent" aria-hidden />
          <div className="settings-shell__panel-header">
            <div className={cn('settings-shell__panel-header-icon', `settings-shell__panel-header-icon--${activeCategory.tone}`)}>
              <ActiveIcon size={16} />
            </div>
            <div className="settings-shell__panel-header-copy">
              <p className="settings-shell__breadcrumb">
                {t('userSettings.categories')}
                <span aria-hidden>/</span>
                {t(activeCategory.labelKey)}
              </p>
              <h2 id="user-settings-panel-title" className="settings-shell__panel-heading">
                {t(activeCategory.labelKey)}
              </h2>
              <p className="settings-shell__panel-subheading">
                {category === 'language' && t('userSettings.localeHint')}
                {category === 'appearance' && t('appearance.subtitle')}
                {category === 'notifications' && t('notifSettings.panelHint')}
                {category === 'account' && t('userSettings.accountHint')}
              </p>
            </div>
          </div>

          <div className="settings-shell__panel-body">
            {category === 'language' && (
              <div className="settings-shell__panel-content">
                <div className="settings-page__locale-panel">
                  <div className="settings-page__locale-panel-head">
                    <Globe size={18} />
                    <h3>{t('userSettings.localeTitle')}</h3>
                  </div>
                  <p className="settings-page__locale-panel-hint">{t('userSettings.localeHint')}</p>
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
                </div>
              </div>
            )}

            {category === 'appearance' && (
              <div className="settings-shell__panel-content">
                <AppearanceSettingsPanel />
              </div>
            )}

            {category === 'notifications' && (
              <div className="settings-shell__panel-content">
                <NotificationPreferencesPanel />
              </div>
            )}

            {category === 'account' && (
              <div className="settings-shell__panel-content">
                <div className="settings-page__account-links">
                  <p className="settings-page__account-links-title">{t('userSettings.accountLinksTitle')}</p>
                  <div className="settings-page__account-links-list" role="list">
                    {accountLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <button
                          key={link.path}
                          type="button"
                          role="listitem"
                          onClick={() => {
                            if (link.path.endsWith('/notifications')) {
                              setCategory('notifications');
                              return;
                            }
                            navigate(link.path);
                          }}
                          className={cn(
                            'settings-page__account-link',
                            `settings-page__account-link--${link.tone}`,
                          )}
                        >
                          <span className={cn(
                            'settings-page__account-link-icon',
                            `settings-page__account-link-icon--${link.tone}`,
                          )}
                          >
                            <Icon size={18} />
                          </span>
                          <span className="settings-page__account-link-copy">
                            <span className="settings-page__account-link-label">{link.label}</span>
                            <span className="settings-page__account-link-desc">{link.desc}</span>
                          </span>
                          <span className="settings-page__account-link-action">
                            {link.action}
                            <ArrowRight size={14} aria-hidden />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
