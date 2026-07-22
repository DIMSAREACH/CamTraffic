import { Brain } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import type { AIModelVersion } from '@shared/types';

export function AiTrainingHistoryPanel({ models }: { models: AIModelVersion[] }) {
  const { t } = useLanguage();

  return (
    <section className="enforcement-page__panel p-5 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain size={18} className="text-violet-600" />
        <h2 className="font-semibold text-lg">{t('aiModels.trainingHistory')}</h2>
      </div>
      {models.length === 0 ? (
        <p className="text-sm text-slate-500">{t('aiModels.noTrainingHistory')}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {models.map((m) => (
            <li key={m.id} className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-2">
              <span>{m.version} · {m.model_file}</span>
              <span className="text-slate-500">
                {m.accuracy != null ? `${m.accuracy}%` : '—'} · {m.is_active ? t('aiModels.active') : t('aiModels.inactive')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
