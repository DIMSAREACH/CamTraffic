import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Brain, CheckCircle, Eye, History, Sparkles, Target, Zap,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { aiModelsAPI } from '@shared/services/api';
import { AIMlopsHero } from '@shared/components/admin/AIMlopsHero';
import type { AIModelVersion } from '@shared/types';
import { enrichAIModels, formatPct, type EnrichedAIModel } from '@shared/utils/aiModelUi';

const DEMO_MODELS: AIModelVersion[] = [
  {
    id: 'demo-v1',
    version: 'v1.0',
    model_file: 'runs/camtraffic-v1/weights/best.pt',
    description: 'YOLOv11 Cambodian Traffic',
    accuracy: 98.7,
    is_active: true,
    uploaded_at: new Date().toISOString(),
  },
  {
    id: 'demo-v09',
    version: 'v0.9',
    model_file: 'runs/camtraffic-v09/weights/best.pt',
    description: 'YOLOv11 Cambodian Traffic',
    accuracy: 97.5,
    is_active: false,
    uploaded_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: 'demo-v08',
    version: 'v0.8',
    model_file: 'runs/combined/weights/best.pt',
    description: 'YOLOv11 Combined Detection',
    accuracy: 96.2,
    is_active: false,
    uploaded_at: new Date(Date.now() - 86400000 * 28).toISOString(),
  },
  {
    id: 'demo-d10',
    version: 'dataset10-n',
    model_file: 'best.pt',
    description: 'YOLOv11 Dataset-10 Nano',
    accuracy: 99.1,
    is_active: false,
    uploaded_at: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
];

export function AITrainingHistoryPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [models, setModels] = useState<EnrichedAIModel[]>([]);
  const [loading, setLoading] = useState(true);

  const tr = (key: string, fb: string) => {
    const v = t(key);
    return v !== key ? v : fb;
  };

  const load = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    try {
      const live = await aiModelsAPI.getAll();
      setModels(enrichAIModels(live.length > 0 ? live : DEMO_MODELS));
    } catch {
      setModels(enrichAIModels(DEMO_MODELS));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const kpis = useMemo(() => {
    const withAcc = models.filter((m) => m.accuracy != null);
    const best = withAcc.length ? Math.max(...withAcc.map((m) => m.accuracy ?? 0)) : null;
    return {
      total: models.length,
      active: models.filter((m) => m.is_active).length,
      best: best != null ? formatPct(best) : '—',
      avg: withAcc.length
        ? formatPct(withAcc.reduce((s, m) => s + (m.accuracy ?? 0), 0) / withAcc.length)
        : '—',
    };
  }, [models]);

  if (user?.role !== 'admin') {
    return <div className="enforcement-page p-8">{tr('aiModels.adminOnly', 'AI model registry is for administrators only.')}</div>;
  }

  return (
    <div className="enforcement-page enforcement-page--ai-mlops ai-mlops">
      <AIMlopsHero
        icon={<History size={20} />}
        eyebrow={tr('aiMlops.historyEyebrow', 'Training History')}
        title={tr('aiMlops.historyTitle', 'History & Logs')}
        subtitle={tr('aiMlops.historySubtitle', 'Track every training job and compare registered model versions')}
        status={[
          { label: tr('aiTraining.versions', 'Versions'), value: loading ? '—' : String(kpis.total) },
          { label: tr('aiMlops.activeModel', 'Active Model'), value: loading ? '—' : String(kpis.active) },
          { label: tr('aiMlops.bestAccuracy', 'Best Accuracy'), value: loading ? '—' : kpis.best },
        ]}
        actions={(
          <>
            <Link to="/admin/ai-models/train" className="ai-mlops-hero__btn ai-mlops-hero__btn--teal">
              <Sparkles size={15} /> {tr('aiMlops.trainModel', 'Train Model')}
            </Link>
            <Link to="/admin/ai-models/list" className="ai-mlops-hero__btn ai-mlops-hero__btn--primary">
              <Eye size={15} /> {tr('aiMlops.viewModels', 'View models')}
            </Link>
          </>
        )}
      />

      <section className="ai-mlops-kpis" aria-label={tr('aiMlops.kpiSection', 'KPI')}>
        <div className="ai-mlops-kpi ai-mlops-kpi--violet">
          <div className="ai-mlops-kpi__icon"><Brain size={18} /></div>
          <p className="ai-mlops-kpi__value">{loading ? '—' : kpis.total}</p>
          <p className="ai-mlops-kpi__label">{tr('aiMlops.totalModels', 'Total Models')}</p>
        </div>
        <div className="ai-mlops-kpi ai-mlops-kpi--emerald">
          <div className="ai-mlops-kpi__icon"><Zap size={18} /></div>
          <p className="ai-mlops-kpi__value">{loading ? '—' : kpis.active}</p>
          <p className="ai-mlops-kpi__label">{tr('aiMlops.activeModel', 'Active Model')}</p>
        </div>
        <div className="ai-mlops-kpi ai-mlops-kpi--blue">
          <div className="ai-mlops-kpi__icon"><Target size={18} /></div>
          <p className="ai-mlops-kpi__value">{loading ? '—' : kpis.best}</p>
          <p className="ai-mlops-kpi__label">{tr('aiMlops.bestAccuracy', 'Best Accuracy')}</p>
        </div>
        <div className="ai-mlops-kpi ai-mlops-kpi--amber">
          <div className="ai-mlops-kpi__icon"><Sparkles size={18} /></div>
          <p className="ai-mlops-kpi__value">{loading ? '—' : kpis.avg}</p>
          <p className="ai-mlops-kpi__label">{tr('aiMlops.avgAccuracy', 'Avg accuracy')}</p>
        </div>
      </section>

      <section className="ai-mlops-panel">
        <header className="ai-mlops-panel__head">
          <div>
            <h2 className="ai-mlops-panel__title">{tr('aiTraining.historyTitle', 'Model versions')}</h2>
            <p className="ai-mlops-panel__sub">
              {tr('aiTraining.historySub', 'Registered YOLO weights and deployment status')}
            </p>
          </div>
          <span className="ai-mlops-badge ai-mlops-badge--draft">
            {models.length} {tr('aiTraining.versions', 'Versions')}
          </span>
        </header>
        <div className="ai-mlops-panel__body overflow-x-auto">
          <Table className="enforcement-page__table">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {[
                  tr('aiMlops.colModel', 'Model'),
                  tr('aiMlops.colVersion', 'Version'),
                  tr('aiMlops.colDataset', 'Dataset'),
                  tr('aiMlops.colAccuracy', 'Accuracy'),
                  tr('aiMlops.colEpoch', 'Epoch'),
                  tr('aiMlops.colStatus', 'Status'),
                  tr('aiMlops.colDate', 'Date'),
                  tr('aiMlops.colAction', 'Action'),
                ].map((h) => (
                  <TableHead key={h} className="enforcement-page__th">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((__, j) => (
                      <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : models.length === 0 ? (
                <TableEmptyState
                  colSpan={8}
                  tone="violet"
                  icon={<Brain size={28} />}
                  title={tr('aiModels.noTrainingHistory', 'No model versions registered yet.')}
                  subtitle={tr('aiTraining.historyEmptyHint', 'Register a model after training to track versions here.')}
                  action={{
                    label: tr('aiMlops.trainModel', 'Train Model'),
                    onClick: () => { window.location.href = '/admin/ai-models/train'; },
                    icon: <Sparkles size={15} />,
                  }}
                />
              ) : models.map((m) => (
                <TableRow key={m.id} className={`enforcement-page__table-row${m.is_active ? ' ai-models-page__row--active' : ''}`}>
                  <TableCell>
                    <span className="ai-mlops-name">{m.name}</span>
                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[14rem]" title={m.model_file}>{m.model_file}</p>
                  </TableCell>
                  <TableCell><span className="ai-mlops-version">{m.version}</span></TableCell>
                  <TableCell>{m.dataset}</TableCell>
                  <TableCell><span className="ai-mlops-acc">{formatPct(m.accuracy)}</span></TableCell>
                  <TableCell>{m.epochs ?? '—'}</TableCell>
                  <TableCell>
                    <span className={`ai-mlops-badge ai-mlops-badge--${m.status}`}>
                      {m.is_active ? <CheckCircle size={11} /> : null}
                      {m.is_active
                        ? tr('aiMlops.statusActive', 'Active')
                        : m.status === 'archive'
                          ? tr('aiMlops.statusArchive', 'Archive')
                          : tr('aiMlops.statusDraft', 'Draft')}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(m.uploaded_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Link to={`/admin/ai-models/${m.id}`} className="ai-mlops-action ai-mlops-action--view">
                      <Eye size={12} /> {tr('aiMlops.view', 'View')}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
