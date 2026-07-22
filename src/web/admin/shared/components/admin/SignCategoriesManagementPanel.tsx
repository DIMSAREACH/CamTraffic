import { AlertTriangle, BookOpen, Info, LayoutGrid, Shield } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import type { SignCategory, TrafficSign } from '@shared/types';

const CATEGORIES: {
  id: SignCategory;
  tone: 'rose' | 'amber' | 'blue' | 'emerald';
  icon: typeof Shield;
  descKey: string;
  descFallback: string;
}[] = [
  {
    id: 'prohibitory',
    tone: 'rose',
    icon: Shield,
    descKey: 'signCategories.descProhibitory',
    descFallback: 'Restrictions and prohibitions — no entry, no turn, speed limits',
  },
  {
    id: 'warning',
    tone: 'amber',
    icon: AlertTriangle,
    descKey: 'signCategories.descWarning',
    descFallback: 'Hazard and caution ahead — pedestrians, curves, crossings',
  },
  {
    id: 'mandatory',
    tone: 'blue',
    icon: BookOpen,
    descKey: 'signCategories.descMandatory',
    descFallback: 'Required actions — keep right, roundabout, direction of travel',
  },
  {
    id: 'informative',
    tone: 'emerald',
    icon: Info,
    descKey: 'signCategories.descInformative',
    descFallback: 'Guidance and information — parking, hospital, services',
  },
];

export function SignCategoriesManagementPanel({
  signs,
  onSelectCategory,
}: {
  signs: TrafficSign[];
  onSelectCategory?: (category: SignCategory) => void;
}) {
  const { t } = useLanguage();

  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v !== key ? v : fallback;
  };

  return (
    <section className="enforcement-page__panel signs-categories-panel">
      <header className="signs-categories-panel__head">
        <div className="signs-categories-panel__title-wrap">
          <span className="signs-categories-panel__icon" aria-hidden>
            <LayoutGrid size={16} />
          </span>
          <div>
            <h2 className="signs-categories-panel__title">{t('signCategories.title')}</h2>
            <p className="signs-categories-panel__subtitle">
              {tr(
                'signCategories.subtitle',
                'Reference taxonomy for the Cambodia traffic sign catalog',
              )}
              {' · '}
              {t('pages.signs.shownCount').replace('{count}', String(signs.length))}
            </p>
          </div>
        </div>
      </header>

      <div className="signs-categories-panel__grid">
        {CATEGORIES.map(({ id, tone, icon: Icon, descKey, descFallback }) => {
          const inCategory = signs.filter((s) => s.category === id);
          const samples = inCategory.slice(0, 5);
          return (
            <article
              key={id}
              className={`signs-categories-panel__card signs-categories-panel__card--${tone}`}
            >
              <div className="signs-categories-panel__card-top">
                <div className={`signs-categories-panel__card-icon is-${tone}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="signs-categories-panel__card-value">{inCategory.length}</p>
                  <p className="signs-categories-panel__card-label">{t(`signCategories.${id}`)}</p>
                </div>
              </div>
              <p className="signs-categories-panel__card-desc">
                {tr(descKey, descFallback)}
              </p>
              {samples.length > 0 ? (
                <ul className="signs-categories-panel__samples">
                  {samples.map((s) => (
                    <li key={s.id} className="signs-categories-panel__sample">
                      <span className="enforcement-page__code-pill">{s.sign_code}</span>
                      <span className="signs-categories-panel__sample-name" title={s.sign_name}>
                        {s.sign_name}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="signs-categories-panel__empty">
                  {tr('signCategories.emptyCategory', 'No signs in this category yet')}
                </p>
              )}
              {onSelectCategory ? (
                <button
                  type="button"
                  className="signs-categories-panel__action"
                  onClick={() => onSelectCategory(id)}
                >
                  {tr('signCategories.viewInCatalog', 'View in catalog')}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
