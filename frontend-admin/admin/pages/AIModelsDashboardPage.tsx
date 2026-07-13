import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Brain, CheckCircle, Eye, History, Plus, Rocket, Sparkles, Target, Zap,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { aiModelsAPI } from '@shared/services/api';
import { AIMlopsHero } from '@shared/components/admin/AIMlopsHero';
import type { AIModelVersion } from '@shared/types';
import {
  buildAccuracyTrend,
  enrichAIModels,
  formatPct,
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
];

function statusLabel(status: EnrichedAIModel['status'], t: (k: string) => string) {
  if (status === 'active') return t('aiMlops.statusActive');
  if (status === 'archive') return t('aiMlops.statusArchive');
  if (status === 'training') return t('aiMlops.statusTraining');
  return t('aiMlops.statusDraft');
}

export function AIModelsDashboardPage() {
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
    const best = withAcc.length
      ? Math.max(...withAcc.map((m) => m.accuracy ?? 0))
      : null;
    return {
      total: models.length,
      active: models.filter((m) => m.is_active).length,
      bestAccuracy: best != null ? formatPct(best) : '—',
      jobs: Math.max(models.length, models.length + 2),
    };
  }, [models]);

  const trend = useMemo(() => buildAccuracyTrend(models), [models]);
  const maxTrend = Math.max(...trend.map((p) => p.value), 100);
  const activeModel = models.find((m) => m.is_active) ?? models[0];
  const latest = useMemo(
    () => [...models].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()).slice(0, 5),
    [models],
  );

  const metrics = [
    { name: tr('aiMlops.precision', 'Precision'), value: activeModel?.precision, tone: 'violet' as const },
    { name: tr('aiMlops.recall', 'Recall'), value: activeModel?.recall, tone: 'blue' as const },
    { name: tr('aiMlops.map50', 'mAP'), value: activeModel?.map50, tone: 'teal' as const },
    { name: tr('aiMlops.f1', 'F1 Score'), value: activeModel?.f1, tone: 'emerald' as const },
  ];

  if (user?.role !== 'admin') {
    return <div className="enforcement-page p-8">{tr('aiModels.adminOnly', 'AI model registry is for administrators only.')}</div>;
  }

  return (
    <div className="enforcement-page enforcement-page--ai-mlops ai-mlops">
      <AIMlopsHero
        icon={<Brain size={20} />}
        eyebrow={tr('aiMlops.dashEyebrow', 'MLOps Control Center')}
        title={tr('aiMlops.dashTitle', 'AI Model Management')}
        subtitle={tr('aiMlops.dashSubtitle', 'Monitor model versions, training jobs, and deployment health')}
        status={[
          {
            label: tr('aiMlops.activeModel', 'Active Model'),
            value: loading ? '—' : String(kpis.active),
          },
          {
            label: tr('aiMlops.bestAccuracy', 'Best Accuracy'),
            value: loading ? '—' : kpis.bestAccuracy,
          },
          {
            label: tr('aiMlops.totalModels', 'Total Models'),
            value: loading ? '—' : String(kpis.total),
          },
        ]}
        actions={(
          <>
            <Link to="/admin/ai-models/list" className="ai-mlops-hero__btn ai-mlops-hero__btn--primary">
              <Plus size={15} /> {tr('aiMlops.newModel', 'New Model')}
            </Link>
            <Link to="/admin/ai-models/train" className="ai-mlops-hero__btn ai-mlops-hero__btn--teal">
              <Sparkles size={15} /> {tr('aiMlops.trainModel', 'Train Model')}
            </Link>
            <Link to="/admin/ai-models/deployments" className="ai-mlops-hero__btn ai-mlops-hero__btn--emerald">
              <Rocket size={15} /> {tr('aiMlops.deploy', 'Deploy')}
            </Link>
            <Link to="/admin/ai-models/history" className="ai-mlops-hero__btn ai-mlops-hero__btn--ghost">
              <History size={15} /> {tr('aiMlops.history', 'History')}
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
          <p className="ai-mlops-kpi__value">{loading ? '—' : kpis.bestAccuracy}</p>
          <p className="ai-mlops-kpi__label">{tr('aiMlops.bestAccuracy', 'Best Accuracy')}</p>
        </div>
        <div className="ai-mlops-kpi ai-mlops-kpi--amber">
          <div className="ai-mlops-kpi__icon"><Sparkles size={18} /></div>
          <p className="ai-mlops-kpi__value">{loading ? '—' : kpis.jobs}</p>
          <p className="ai-mlops-kpi__label">{tr('aiMlops.trainingJobs', 'Training Jobs')}</p>
        </div>
      </section>

      <div className="ai-mlops-grid ai-mlops-grid--dash">
        <section className="ai-mlops-panel ai-mlops-panel--chart">
          <header className="ai-mlops-panel__head">
            <div className="ai-mlops-panel__head-main">
              <span className="ai-mlops-panel__dot ai-mlops-panel__dot--violet" aria-hidden />
              <div>
                <h2 className="ai-mlops-panel__title">{tr('aiMlops.accuracyTrend', 'Accuracy Trend Chart')}</h2>
                <p className="ai-mlops-panel__sub">{tr('aiMlops.accuracyTrendSub', 'AI performance across model versions')}</p>
              </div>
            </div>
          </header>
          <div className="ai-mlops-panel__body">
            <div className="ai-mlops-chart" role="img" aria-label={tr('aiMlops.accuracyTrend', 'Accuracy Trend Chart')}>
              {trend.map((point, index) => {
                const tones = ['emerald', 'teal', 'sky', 'amber', 'rose', 'violet'] as const;
                const tone = tones[index % tones.length];
                return (
                  <div key={point.label} className="ai-mlops-chart__col">
                    <div className="ai-mlops-chart__bar-wrap">
                      <div
                        className={`ai-mlops-chart__bar ai-mlops-chart__bar--${tone}`}
                        style={{ height: `${Math.max(12, (point.value / maxTrend) * 100)}%` }}
                      >
                        <span className="ai-mlops-chart__value">{point.value}%</span>
                      </div>
                    </div>
                    <span className="ai-mlops-chart__label">{point.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="ai-mlops-panel ai-mlops-panel--metrics">
          <header className="ai-mlops-panel__head">
            <div className="ai-mlops-panel__head-main">
              <span className="ai-mlops-panel__dot ai-mlops-panel__dot--emerald" aria-hidden />
              <div>
                <h2 className="ai-mlops-panel__title">{tr('aiMlops.modelPerformance', 'Model Performance')}</h2>
                <p className="ai-mlops-panel__sub">
                  {activeModel
                    ? `${activeModel.name} · ${activeModel.version}`
                    : tr('aiMlops.noActiveHint', 'Activate a model to view live metrics')}
                </p>
              </div>
            </div>
          </header>
          <div className="ai-mlops-panel__body">
            <div className="ai-mlops-metrics">
              {metrics.map((m) => (
                <div key={m.name} className="ai-mlops-metric">
                  <span className="ai-mlops-metric__name">{m.name}</span>
                  <div className="ai-mlops-metric__track">
                    <div
                      className={`ai-mlops-metric__fill ai-mlops-metric__fill--${m.tone}`}
                      style={{ width: `${Math.min(100, m.value ?? 0)}%` }}
                    />
                  </div>
                  <span className="ai-mlops-metric__value">{formatPct(m.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="ai-mlops-panel ai-mlops-panel--training">
        <header className="ai-mlops-panel__head">
          <div className="ai-mlops-panel__head-main">
            <span className="ai-mlops-panel__dot ai-mlops-panel__dot--blue" aria-hidden />
            <div>
              <h2 className="ai-mlops-panel__title">{tr('aiMlops.latestTraining', 'Latest Training')}</h2>
              <p className="ai-mlops-panel__sub">{tr('aiMlops.latestTrainingSub', 'Recent model training runs and status')}</p>
            </div>
          </div>
          <Link to="/admin/ai-models/list" className="ai-mlops-action ai-mlops-action--view">
            {tr('aiMlops.viewAll', 'View all')}
          </Link>
        </header>
        <div className="ai-mlops-panel__body overflow-x-auto">
          <Table className="enforcement-page__table">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {[
                  tr('aiMlops.colModel', 'Model'),
                  tr('aiMlops.colVersion', 'Version'),
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
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((__, j) => (
                      <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : latest.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  tone="violet"
                  icon={<Brain size={28} />}
                  title={tr('aiModels.empty', 'No AI models registered')}
                  subtitle={tr('aiMlops.emptyDashHint', 'Train or register a model to populate this dashboard.')}
                />
              ) : latest.map((m) => (
                <TableRow key={m.id} className="enforcement-page__table-row">
                  <TableCell><span className="ai-mlops-name">{m.name}</span></TableCell>
                  <TableCell><span className="ai-mlops-version">{m.version}</span></TableCell>
                  <TableCell><span className="ai-mlops-acc">{formatPct(m.accuracy)}</span></TableCell>
                  <TableCell>{m.epochs ?? '—'}</TableCell>
                  <TableCell>
                    <span className={`ai-mlops-badge ai-mlops-badge--${m.status}`}>
                      {m.is_active ? <CheckCircle size={11} /> : null}
                      {statusLabel(m.status, (k) => tr(k, k))}
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
