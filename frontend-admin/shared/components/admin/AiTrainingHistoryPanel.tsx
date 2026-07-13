import { Brain, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useLanguage } from '@shared/context/LanguageContext';
import { cn } from '@shared/components/ui/utils';
import type { AIModelVersion } from '@shared/types';

export function AiTrainingHistoryPanel({
  models,
  loading = false,
}: {
  models: AIModelVersion[];
  loading?: boolean;
}) {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v !== key ? v : fallback;
  };

  return (
    <section className="ai-train-panel" aria-labelledby="ai-train-history-title">
      <header className="ai-train-panel__head ai-train-panel__head--history">
        <span className="ai-train-panel__glow" aria-hidden />
        <div className="ai-train-panel__icon"><Brain size={18} /></div>
        <div className="ai-train-panel__copy">
          <h2 id="ai-train-history-title" className="ai-train-panel__title">
            {tr('aiTraining.historyTitle', 'Model versions')}
          </h2>
          <p className="ai-train-panel__sub">
            {tr('aiTraining.historySub', 'Registered YOLO weights and deployment status')}
          </p>
        </div>
        <div className="ai-train-panel__badge">
          <span className="ai-train-panel__badge-value">{models.length}</span>
          <span className="ai-train-panel__badge-label">{tr('aiTraining.versions', 'Versions')}</span>
        </div>
      </header>

      <div className="ai-train-history__wrap">
        <Table className="enforcement-page__table ai-train-history__table">
          <TableHeader>
            <TableRow className="enforcement-page__table-head">
              <TableHead className="enforcement-page__th text-left">{tr('aiModels.colVersion', 'Version')}</TableHead>
              <TableHead className="enforcement-page__th text-left">{tr('aiModels.colFile', 'File')}</TableHead>
              <TableHead className="enforcement-page__th text-left">{tr('aiModels.colAccuracy', 'Accuracy')}</TableHead>
              <TableHead className="enforcement-page__th text-left">{tr('users.colStatus', 'Status')}</TableHead>
              <TableHead className="enforcement-page__th text-left">{tr('aiTraining.uploaded', 'Uploaded')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((__, j) => (
                    <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : models.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                tone="violet"
                icon={<Brain size={28} />}
                title={tr('aiModels.noTrainingHistory', 'No model versions registered yet.')}
                subtitle={tr('aiTraining.historyEmptyHint', 'Register a model after training to track versions here.')}
              />
            ) : models.map((m) => (
              <TableRow key={m.id} className="enforcement-page__table-row">
                <TableCell>
                  <p className="enforcement-page__cell-primary">{m.version}</p>
                  {m.description ? (
                    <p className="enforcement-page__cell-secondary text-xs">{m.description}</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <code className="ai-train-file" title={m.model_file}>{m.model_file}</code>
                </TableCell>
                <TableCell>
                  {m.accuracy != null ? (
                    <span className="ai-train-accuracy">{m.accuracy}%</span>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    'ai-train-model-badge',
                    m.is_active ? 'ai-train-model-badge--active' : 'ai-train-model-badge--inactive',
                  )}
                  >
                    {m.is_active ? <CheckCircle size={11} /> : null}
                    {m.is_active ? tr('aiModels.active', 'Active') : tr('aiModels.inactive', 'Inactive')}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{new Date(m.uploaded_at).toLocaleDateString()}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
