import { ArrowLeft, Bell, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { NotificationPreferencesPanel } from '@shared/components/NotificationPreferencesPanel';
import { getPortalRoutesForRole } from '@shared/constants/userPortalPaths';

export default function NotificationSettingsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOfficer = user?.role === 'police';
  const routes = getPortalRoutesForRole(isOfficer ? 'police' : 'driver');

  return (
    <div className="enforcement-page enforcement-page--settings dashboard-page--settings settings-page--enterprise enforcement-page--user-settings">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Bell size={14} />
              </span>
              {t('notifSettings.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('notifSettings.title')}</h1>
            <p className="enforcement-page__subtitle">{t('notifSettings.subtitle')}</p>
          </div>
          <button
            type="button"
            className="enforcement-page__hero-btn enforcement-page__hero-btn--slate"
            onClick={() => navigate(routes.settings)}
          >
            <ArrowLeft size={16} />
            {t('notifSettings.backToSettings')}
          </button>
        </div>
      </div>

      <div className="settings-shell settings-shell--single">
        <section className="settings-shell__card settings-shell__panel settings-shell__panel--cyan">
          <div className="settings-shell__card-accent" aria-hidden />
          <div className="settings-shell__panel-header">
            <div className="settings-shell__panel-header-icon settings-shell__panel-header-icon--cyan">
              <Settings2 size={16} />
            </div>
            <div className="settings-shell__panel-header-copy">
              <p className="settings-shell__breadcrumb">
                {t('userSettings.categories')}
                <span aria-hidden>/</span>
                {t('notifSettings.title')}
              </p>
              <h2 className="settings-shell__panel-heading">{t('notifSettings.title')}</h2>
              <p className="settings-shell__panel-subheading">{t('notifSettings.panelHint')}</p>
            </div>
          </div>
          <div className="settings-shell__panel-body">
            <div className="settings-shell__panel-content">
              <NotificationPreferencesPanel />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
