import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Brain, CheckCircle, Eye, History, Sparkles, Target, Zap,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { aiModelsAPI } from '@shared/services/api';
import { AIMlopsHero } from '@shared/components/admin/AIMlopsHero';
import type { AIModelVersion } from '@shared/types';
import {
  enrichAIModels,
  formatPct,
  MODEL_STATUS_META,
  modelStatusLabel,
  type EnrichedAIModel,
} from '@shared/utils/aiModelUi';

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
  const navigate = useNavigate();
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
      setModels(enrichAIModels(live));
    } catch {
      setModels([]);
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

      <section>
        <header className="ai-mlops-panel__head !px-0 !pt-0">
          <div>
            <h2 className="ai-mlops-panel__title">{tr('aiTraining.historyTitle', 'Model versions')}</h2>
            <p className="ai-mlops-panel__sub">
              {tr('aiTraining.historySub', 'Registered YOLO weights and deployment status')}
            </p>
          </div>
          <span className="enforcement-page__badge" style={{ background: MODEL_STATUS_META.draft.bg, color: MODEL_STATUS_META.draft.color }}>
            {models.length} {tr('aiTraining.versions', 'Versions')}
          </span>
        </header>
        <div className="enforcement-page__panel">
          <div className="overflow-x-auto">
            <Table className="enforcement-page__table mgmt-table__grid ai-models-table">
              <TableHeader>
                <TableRow className="enforcement-page__table-head">
                  <TableHead className="enforcement-page__th text-left ai-models-table__col--model">{tr('aiMlops.colModel', 'Model')}</TableHead>
                  <TableHead className="enforcement-page__th text-left ai-models-table__col--version">{tr('aiMlops.colVersion', 'Version')}</TableHead>
                  <TableHead className="enforcement-page__th text-left ai-models-table__col--dataset">{tr('aiMlops.colDataset', 'Dataset')}</TableHead>
                  <TableHead className="enforcement-page__th text-left ai-models-table__col--accuracy">{tr('aiMlops.colAccuracy', 'Accuracy')}</TableHead>
                  <TableHead className="enforcement-page__th text-left ai-models-table__col--epoch">{tr('aiMlops.colEpoch', 'Epoch')}</TableHead>
                  <TableHead className="enforcement-page__th text-left ai-models-table__col--status">{tr('aiMlops.colStatus', 'Status')}</TableHead>
                  <TableHead className="enforcement-page__th text-left ai-models-table__col--date">{tr('aiMlops.colDate', 'Date')}</TableHead>
                  <TableHead className="enforcement-page__th text-left ai-models-table__col--action">{tr('aiMlops.colAction', 'Action')}</TableHead>
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
                ) : models.map((m) => {
                  const st = MODEL_STATUS_META[m.status];
                  return (
                    <TableRow key={m.id} className={`enforcement-page__table-row${m.is_active ? ' ai-models-page__row--active' : ''}`}>
                      <TableCell className="ai-models-table__col--model">
                        <div className="mgmt-table__stack">
                          <p className="mgmt-table__stack-title" title={m.description || m.name}>{m.name}</p>
                          <p className="mgmt-table__stack-meta" title={m.model_file}>{m.model_file}</p>
                        </div>
                      </TableCell>
                      <TableCell className="ai-models-table__col--version"><span className="enforcement-page__code-pill" title={m.version}>{m.version}</span></TableCell>
                      <TableCell className="ai-models-table__col--dataset"><span className="enforcement-page__cell-body">{m.dataset}</span></TableCell>
                      <TableCell className="ai-models-table__col--accuracy"><span className="mgmt-table__amount">{formatPct(m.accuracy)}</span></TableCell>
                      <TableCell className="ai-models-table__col--epoch"><span className="enforcement-page__cell-secondary">{m.epochs ?? '—'}</span></TableCell>
                      <TableCell className="ai-models-table__col--status">
                        <span className="enforcement-page__badge" style={{ background: st.bg, color: st.color }}>
                          {m.is_active ? <CheckCircle size={11} /> : null}
                          {modelStatusLabel(m.status, tr)}
                        </span>
                      </TableCell>
                      <TableCell className="ai-models-table__col--date"><span className="mgmt-table__date">{new Date(m.uploaded_at).toLocaleDateString()}</span></TableCell>
                      <TableCell className="ai-models-table__col--action">
                        <div className="enforcement-page__table-actions mgmt-table__actions">
                          <CrudRowActions onView={() => navigate(`/admin/ai-models/${m.id}`)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
    </div>
  );
}
