import { useNavigate } from 'react-router';
import {
  Car,
  ChevronRight,
  Clock,
  FileText,
  Headphones,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  Scale,
} from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { CITIZEN_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';

const CONTACT_CHANNELS = [
  {
    id: 'hotline',
    icon: Phone,
    tone: 'violet',
    labelKey: 'support.hotline',
    valueKey: 'support.hotlineValue',
    actionKey: 'support.callAction',
    href: 'tel:1280',
  },
  {
    id: 'email',
    icon: Mail,
    tone: 'blue',
    labelKey: 'support.email',
    valueKey: 'support.emailValue',
    actionKey: 'support.emailAction',
    href: 'mailto:support@camtraffic.gov.kh',
  },
  {
    id: 'hours',
    icon: Clock,
    tone: 'emerald',
    labelKey: 'support.hours',
    valueKey: 'support.hoursValue',
    actionKey: null,
    href: null,
  },
] as const;

const FAQ_ITEMS = [
  { qKey: 'support.faqQ1', aKey: 'support.faq1' },
  { qKey: 'support.faqQ2', aKey: 'support.faq2' },
  { qKey: 'support.faqQ3', aKey: 'support.faq3' },
] as const;

export function CitizenSupportPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const statCards = [
    { tone: 'violet', icon: Phone, value: '1280', label: t('support.hotline') },
    { tone: 'blue', icon: Mail, value: t('support.statEmailShort'), label: t('support.email') },
    { tone: 'emerald', icon: Clock, value: t('support.statHoursShort'), label: t('support.hours') },
  ];

  const resourceLinks = [
    {
      tone: 'blue',
      icon: FileText,
      titleKey: 'support.finesLink',
      descKey: 'support.finesLinkDesc',
      onClick: () => navigate(CITIZEN_PORTAL_ROUTES.fines),
    },
    {
      tone: 'amber',
      icon: Scale,
      titleKey: 'support.appealsLink',
      descKey: 'support.appealsLinkDesc',
      onClick: () => navigate(CITIZEN_PORTAL_ROUTES.appeals),
    },
    {
      tone: 'teal',
      icon: Car,
      titleKey: 'support.vehiclesLink',
      descKey: 'support.vehiclesLinkDesc',
      onClick: () => navigate(CITIZEN_PORTAL_ROUTES.vehicles),
    },
  ];

  return (
    <div className="enforcement-page enforcement-page--support support-page dashboard-page--support support-page--enterprise admin-dashboard-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner support-page__hero-inner">
          <div>
            <p className="support-page__service-badge">{t('support.serviceBadge')}</p>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <MessageCircle size={14} />
              </span>
              {t('support.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('sidebar.pageTitles.support')}</h1>
            <p className="enforcement-page__subtitle">{t('support.subtitle')}</p>
          </div>
          <div className="support-page__hero-actions">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
              onClick={() => navigate(CITIZEN_PORTAL_ROUTES.fines)}
            >
              <FileText size={15} aria-hidden />
              {t('support.heroFinesBtn')}
            </button>
            <button
              type="button"
              className="enforcement-page__hero-btn support-page__hero-btn--primary"
              onClick={() => navigate(CITIZEN_PORTAL_ROUTES.appeals)}
            >
              <Scale size={15} aria-hidden />
              {t('support.heroAppealsBtn')}
            </button>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--three mb-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`enforcement-page__stat-card enforcement-page__stat-card--${card.tone}`}>
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.tone}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value support-page__stat-value">{card.value}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.tone}`}>
                  {card.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="support-page__notice" role="note">
        <div className="support-page__notice-icon" aria-hidden>
          <Headphones size={16} />
        </div>
        <div className="support-page__notice-copy">
          <p className="support-page__notice-title">{t('support.noticeTitle')}</p>
          <p className="support-page__notice-text">{t('support.noticeText')}</p>
        </div>
      </div>

      <div className="enforcement-page__panel support-page__contact-panel">
        <div className="support-page__panel-head">
          <div>
            <h2 className="support-page__panel-title">{t('support.contactTitle')}</h2>
            <p className="support-page__panel-hint">{t('support.contactHint')}</p>
          </div>
        </div>
        <div className="support-page__channel-grid">
          {CONTACT_CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const inner = (
              <>
                <div className={`support-page__channel-icon support-page__channel-icon--${channel.tone}`}>
                  <Icon size={18} />
                </div>
                <div className="support-page__channel-copy">
                  <p className="support-page__channel-label">{t(channel.labelKey)}</p>
                  <p className="support-page__channel-value">{t(channel.valueKey)}</p>
                </div>
                {channel.actionKey ? (
                  <span className={`support-page__channel-action support-page__channel-action--${channel.tone}`}>
                    {t(channel.actionKey)}
                    <ChevronRight size={14} aria-hidden />
                  </span>
                ) : null}
              </>
            );

            if (channel.href) {
              return (
                <a
                  key={channel.id}
                  href={channel.href}
                  className={`support-page__channel-card support-page__channel-card--${channel.tone}`}
                >
                  {inner}
                </a>
              );
            }

            return (
              <div
                key={channel.id}
                className={`support-page__channel-card support-page__channel-card--${channel.tone}`}
              >
                {inner}
              </div>
            );
          })}
        </div>
      </div>

      <div className="enforcement-page__panel support-page__faq-panel">
        <div className="support-page__panel-head">
          <div>
            <h2 className="support-page__panel-title">{t('support.faqTitle')}</h2>
            <p className="support-page__panel-hint">{t('support.faqHint')}</p>
          </div>
          <span className="support-page__faq-badge">
            {t('support.faqCount', { count: FAQ_ITEMS.length })}
          </span>
        </div>
        <div className="support-page__faq-list">
          {FAQ_ITEMS.map((item, index) => (
            <article key={item.qKey} className="support-page__faq-item">
              <div className="support-page__faq-q">
                <span className="support-page__faq-index">{index + 1}</span>
                <HelpCircle size={15} aria-hidden />
                <h3 className="support-page__faq-question">{t(item.qKey)}</h3>
              </div>
              <p className="support-page__faq-answer">{t(item.aKey)}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="support-page__resources">
        <h2 className="support-page__resources-title">{t('support.resourcesTitle')}</h2>
        <div className="support-page__resource-grid">
          {resourceLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.titleKey}
                type="button"
                className={`support-page__resource-card support-page__resource-card--${link.tone}`}
                onClick={link.onClick}
              >
                <div className={`support-page__resource-icon support-page__resource-icon--${link.tone}`}>
                  <Icon size={18} />
                </div>
                <div className="support-page__resource-copy">
                  <p className="support-page__resource-title">{t(link.titleKey)}</p>
                  <p className="support-page__resource-desc">{t(link.descKey)}</p>
                </div>
                <ChevronRight size={16} className="support-page__resource-arrow" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Prefer CitizenSupportPage */
export const DriverSupportPage = CitizenSupportPage;
