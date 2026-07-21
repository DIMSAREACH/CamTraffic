import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  Gauge,
  Info,
  Scale,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { USER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';

type SectionId = 'speed' | 'safety' | 'penalties';
type SectionFilter = 'all' | SectionId;

const RULE_SECTIONS = [
  {
    id: 'speed' as const,
    titleKey: 'trafficRules.sectionSpeed',
    descKey: 'trafficRules.sectionSpeedDesc',
    items: ['trafficRules.speed1', 'trafficRules.speed2', 'trafficRules.speed3'],
    icon: Gauge,
    tone: 'blue',
  },
  {
    id: 'safety' as const,
    titleKey: 'trafficRules.sectionSafety',
    descKey: 'trafficRules.sectionSafetyDesc',
    items: ['trafficRules.safety1', 'trafficRules.safety2', 'trafficRules.safety3'],
    icon: Shield,
    tone: 'emerald',
  },
  {
    id: 'penalties' as const,
    titleKey: 'trafficRules.sectionPenalties',
    descKey: 'trafficRules.sectionPenaltiesDesc',
    items: ['trafficRules.penalty1', 'trafficRules.penalty2', 'trafficRules.penalty3'],
    icon: Scale,
    tone: 'amber',
  },
];

export function DriverTrafficRulesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<SectionFilter>('all');

  const totalRules = useMemo(
    () => RULE_SECTIONS.reduce((sum, section) => sum + section.items.length, 0),
    [],
  );

  const visibleSections = useMemo(
    () => (activeFilter === 'all'
      ? RULE_SECTIONS
      : RULE_SECTIONS.filter((section) => section.id === activeFilter)),
    [activeFilter],
  );

  const statCards = [
    { tone: 'violet', icon: BookOpen, value: String(RULE_SECTIONS.length), label: t('trafficRules.statSections') },
    { tone: 'blue', icon: ShieldCheck, value: String(totalRules), label: t('trafficRules.statRules') },
    { tone: 'emerald', icon: Scale, value: t('trafficRules.statRegion'), label: t('trafficRules.statRegionLabel') },
  ];

  const navItems: { id: SectionFilter; labelKey: string }[] = [
    { id: 'all', labelKey: 'trafficRules.filterAll' },
    ...RULE_SECTIONS.map((section) => ({ id: section.id, labelKey: section.titleKey })),
  ];

  const resourceLinks = [
    {
      tone: 'teal',
      icon: BookOpen,
      titleKey: 'trafficRules.signsLink',
      descKey: 'trafficRules.signsLinkDesc',
      onClick: () => navigate(USER_PORTAL_ROUTES.signs),
    },
    {
      tone: 'blue',
      icon: FileText,
      titleKey: 'trafficRules.finesLink',
      descKey: 'trafficRules.finesLinkDesc',
      onClick: () => navigate(USER_PORTAL_ROUTES.fines),
    },
  ];

  return (
    <div className="enforcement-page enforcement-page--rules traffic-rules-page dashboard-page--rules traffic-rules-page--enterprise admin-dashboard-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner traffic-rules-page__hero-inner">
          <div>
            <p className="traffic-rules-page__kingdom-badge">{t('pages.signs.kingdom')}</p>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Scale size={14} />
              </span>
              {t('trafficRules.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('sidebar.pageTitles.trafficRules')}</h1>
            <p className="enforcement-page__subtitle">{t('trafficRules.subtitle')}</p>
          </div>
          <div className="traffic-rules-page__hero-actions">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
              onClick={() => navigate(USER_PORTAL_ROUTES.signs)}
            >
              <BookOpen size={15} aria-hidden />
              {t('trafficRules.heroSignsBtn')}
            </button>
            <button
              type="button"
              className="enforcement-page__hero-btn traffic-rules-page__hero-btn--primary"
              onClick={() => navigate(USER_PORTAL_ROUTES.fines)}
            >
              <FileText size={15} aria-hidden />
              {t('trafficRules.heroFinesBtn')}
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
                <p className="enforcement-page__stat-value">{card.value}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.tone}`}>
                  {card.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="traffic-rules-page__notice" role="note">
        <div className="traffic-rules-page__notice-icon" aria-hidden>
          <Info size={16} />
        </div>
        <div className="traffic-rules-page__notice-copy">
          <p className="traffic-rules-page__notice-title">{t('trafficRules.noticeTitle')}</p>
          <p className="traffic-rules-page__notice-text">{t('trafficRules.noticeText')}</p>
        </div>
      </div>

      <div className="enforcement-page__panel traffic-rules-page__handbook">
        <div className="traffic-rules-page__handbook-head">
          <div className="traffic-rules-page__handbook-copy">
            <h2 className="traffic-rules-page__handbook-title">{t('trafficRules.handbookTitle')}</h2>
            <p className="traffic-rules-page__handbook-hint">{t('trafficRules.handbookHint')}</p>
          </div>
          <span className="traffic-rules-page__rules-badge">
            {t('trafficRules.rulesCount', { count: totalRules })}
          </span>
        </div>

        <div className="enforcement-page__filters traffic-rules-page__nav" role="tablist" aria-label={t('trafficRules.navLabel')}>
          {navItems.map((item) => {
            const active = activeFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`enforcement-page__filter-btn traffic-rules-page__nav-btn${active ? ' enforcement-page__filter-btn--active traffic-rules-page__nav-btn--active' : ''}`}
                onClick={() => setActiveFilter(item.id)}
              >
                {t(item.labelKey)}
              </button>
            );
          })}
        </div>

        <div className="traffic-rules-page__body">
          {visibleSections.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.id}
                id={`traffic-rules-${section.id}`}
                className={`traffic-rules-page__section traffic-rules-page__section--${section.tone}`}
              >
                <div className="traffic-rules-page__section-head">
                  <div className={`traffic-rules-page__section-icon traffic-rules-page__section-icon--${section.tone}`}>
                    <Icon size={18} />
                  </div>
                  <div className="traffic-rules-page__section-copy">
                    <div className="traffic-rules-page__section-title-row">
                      <h3 className="traffic-rules-page__section-title">{t(section.titleKey)}</h3>
                      <span className={`traffic-rules-page__section-count traffic-rules-page__section-count--${section.tone}`}>
                        {section.items.length} {t('trafficRules.rulesLabel')}
                      </span>
                    </div>
                    <p className="traffic-rules-page__section-desc">{t(section.descKey)}</p>
                  </div>
                </div>
                <ul className="traffic-rules-page__rule-list">
                  {section.items.map((itemKey) => (
                    <li key={itemKey} className="traffic-rules-page__rule-item">
                      <span className={`traffic-rules-page__rule-check traffic-rules-page__rule-check--${section.tone}`}>
                        <CheckCircle2 size={14} strokeWidth={2.35} />
                      </span>
                      <span className="traffic-rules-page__rule-text">{t(itemKey)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <div className="traffic-rules-page__resources">
        <h2 className="traffic-rules-page__resources-title">{t('trafficRules.resourcesTitle')}</h2>
        <div className="traffic-rules-page__resource-grid">
          {resourceLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.titleKey}
                type="button"
                className={`traffic-rules-page__resource-card traffic-rules-page__resource-card--${link.tone}`}
                onClick={link.onClick}
              >
                <div className={`traffic-rules-page__resource-icon traffic-rules-page__resource-icon--${link.tone}`}>
                  <Icon size={18} />
                </div>
                <div className="traffic-rules-page__resource-copy">
                  <p className="traffic-rules-page__resource-title">{t(link.titleKey)}</p>
                  <p className="traffic-rules-page__resource-desc">{t(link.descKey)}</p>
                </div>
                <ChevronRight size={16} className="traffic-rules-page__resource-arrow" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
