import { Clock } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { DASHBOARD_PALETTE } from '@shared/constants/chartPalette';
import type { ProfileLoginEvent } from '@shared/types';

function paletteAt(index: number) {
  return DASHBOARD_PALETTE[index % DASHBOARD_PALETTE.length];
}

export function LoginHistoryCard({ events }: { events: ProfileLoginEvent[] }) {
  const { t } = useLanguage();

  return (
    <section className="profile-page__section profile-page__section--glass">
      <div className="profile-page__section-head">
        <div className="profile-page__section-icon profile-page__section-icon--yellow">
          <Clock size={15} />
        </div>
        <div>
          <h2 className="profile-page__section-title">{t('profile.loginHistory')}</h2>
          <p className="profile-page__section-desc">{t('profile.loginHistoryDesc')}</p>
        </div>
      </div>
      {events.length === 0 ? (
        <p className="profile-page__empty-note">{t('profile.noLoginHistory')}</p>
      ) : (
        <div className="profile-page__history profile-page__history--clean">
          {events.map((h, i) => {
            const pal = paletteAt(i);
            return (
              <div key={`${h.time}-${i}`} className="profile-page__history-row profile-page__history-row--clean">
                <div className="profile-page__history-dot" style={{ background: pal.solid }} />
                <div className="profile-page__history-copy">
                  <p className="profile-page__history-device">{h.device}</p>
                  <p className="profile-page__history-ip">{h.ip_masked}</p>
                </div>
                <span className="profile-page__history-time">{h.time_label}</span>
                <span className="profile-page__history-badge" style={{ color: pal.dark, background: pal.soft }}>
                  {h.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
