import { BookOpen } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import type { SignCategory, TrafficSign } from '@shared/types';

const CATEGORIES: SignCategory[] = ['prohibitory', 'warning', 'mandatory', 'informative'];

export function SignCategoriesManagementPanel({ signs }: { signs: TrafficSign[] }) {
  const { t } = useLanguage();

  return (
    <section className="enforcement-page__panel p-5 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={18} className="text-orange-600" />
        <h2 className="font-semibold text-lg">{t('signCategories.title')}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CATEGORIES.map((cat) => {
          const count = signs.filter((s) => s.category === cat).length;
          return (
            <div key={cat} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-sm font-medium capitalize">{cat.replace('_', ' ')}</p>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
