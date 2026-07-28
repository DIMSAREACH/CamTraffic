import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router';

import {

  Activity,

  ArrowRight,

  Brain,

  Camera,

  CheckCircle2,

  Cpu,

  Database,

  FileBox,

  Layers,

  RefreshCw,

  Sparkles,

  Target,

  TrendingUp,

  Zap,

} from 'lucide-react';

import { useLanguage } from '@shared/context/LanguageContext';

import { dashboardAPI } from '@shared/services/api';

import { toast } from 'sonner';

import { cn } from '@shared/components/ui/utils';



type AIDashboardStats = {

  models?: { total?: number; active?: number; latest?: string | null };

  datasets?: { registered?: number };

  detection?: { total?: number; today?: number; avg_confidence?: number };

  model_runtime?: Record<string, unknown>;

  enforcement?: { total_detections?: number; detection_accuracy?: number; total_violations?: number };

  training?: { last_trained_at?: string | null; training_images?: number };

  generated_at?: string;

};



const QUICK_ACTIONS = [

  { path: '/admin/ai-detection', labelKey: 'sidebar.nav.aiDetectionCenter', fallback: 'Detection center', descKey: 'aiDashboard.navDetection', descFallback: 'Live inference', icon: Camera, tone: 'blue' as const },

  { path: '/admin/ai-logs', labelKey: 'sidebar.nav.detectionLogs', fallback: 'Detection logs', descKey: 'aiDashboard.navLogs', descFallback: 'History & audit', icon: Activity, tone: 'teal' as const },

] as const;



const KPI_TONES = ['violet', 'blue', 'teal', 'emerald'] as const;



const RUNTIME_META: Record<string, { icon: typeof Cpu; tone: string }> = {
  name: { icon: Brain, tone: 'violet' },
  version: { icon: Layers, tone: 'blue' },
  mode: { icon: Cpu, tone: 'teal' },
  detection_mode: { icon: Activity, tone: 'cyan' },
  weights_loaded: { icon: CheckCircle2, tone: 'emerald' },
  gemini_enabled: { icon: Sparkles, tone: 'amber' },
  hybrid_threshold: { icon: Target, tone: 'rose' },
  device: { icon: Cpu, tone: 'violet' },
  model_file: { icon: FileBox, tone: 'blue' },
  classes: { icon: Layers, tone: 'teal' },
};



const DETECTION_PILL_TONES = ['violet', 'blue', 'teal', 'amber'] as const;



function formatRuntimeKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRuntimeValue(value: unknown): { text: string; boolClass?: string } {
  if (value === true) return { text: 'true', boolClass: 'ai-dash-runtime-item__val--bool-true' };
  if (value === false) return { text: 'false', boolClass: 'ai-dash-runtime-item__val--bool-false' };
  return { text: String(value ?? '—') };
}



function AccuracyRing({ value, loading, label }: { value: number | null; loading: boolean; label: string }) {

  const pct = value != null ? Math.min(100, Math.max(0, Math.round(value))) : 0;

  const circumference = 264;

  const dash = `${(pct / 100) * circumference} ${circumference}`;



  return (

    <div className="ai-dash-accuracy">

      <svg className="ai-dash-accuracy__svg" viewBox="0 0 100 100" aria-hidden>

        <defs>

          <linearGradient id="ai-accuracy-grad" x1="0%" y1="0%" x2="100%" y2="100%">

            <stop offset="0%" stopColor="#6366f1" />

            <stop offset="50%" stopColor="#2563eb" />

            <stop offset="100%" stopColor="#06b6d4" />

          </linearGradient>

        </defs>

        <circle className="ai-dash-accuracy__track" cx="50" cy="50" r="42" />

        <circle

          className="ai-dash-accuracy__bar"

          cx="50"

          cy="50"

          r="42"

          strokeDasharray={loading ? `0 ${circumference}` : dash}

        />

      </svg>

      <div className="ai-dash-accuracy__center">

        <span className="ai-dash-accuracy__value">{loading ? '…' : value != null ? `${pct}%` : '—'}</span>

        <span className="ai-dash-accuracy__label">{label}</span>

      </div>

    </div>

  );

}



function KpiSkeleton() {

  return (

    <div className="enforcement-page__stat-card ai-dash-kpi-skeleton" aria-hidden>

      <div className="ai-dash-kpi-skeleton__shimmer" />

    </div>

  );

}



export function AIDashboardPage() {

  const { t } = useLanguage();

  const tr = (key: string, fallback: string) => {

    const v = t(key);

    return v !== key ? v : fallback;

  };



  const [stats, setStats] = useState<AIDashboardStats | null>(null);

  const [loading, setLoading] = useState(true);



  const load = useCallback(async () => {

    setLoading(true);

    try {

      const data = await dashboardAPI.getAIDashboardStats();

      setStats(data as AIDashboardStats);

    } catch {

      toast.error(tr('aiDashboard.loadFailed', 'Failed to load AI dashboard'));

    } finally {

      setLoading(false);

    }

  }, [t]);



  useEffect(() => { void load(); }, [load]);



  const kpis = useMemo(() => {

    const models = stats?.models?.total ?? 0;

    const activeModels = stats?.models?.active ?? 0;

    const datasets = stats?.datasets?.registered ?? 0;

    const detections = stats?.enforcement?.total_detections ?? stats?.detection?.total ?? 0;

    const today = stats?.detection?.today ?? 0;

    const accuracy = stats?.enforcement?.detection_accuracy ?? stats?.detection?.avg_confidence ?? null;

    return { models, activeModels, datasets, detections, today, accuracy };

  }, [stats]);



  const runtime = stats?.model_runtime ?? {};

  const training = stats?.training ?? {};

  const runtimeEntries = Object.entries(runtime);

  const isLive = (stats?.models?.active ?? 0) > 0;



  const kpiItems = [

    {

      tone: KPI_TONES[0],

      icon: Brain,

      title: tr('aiDashboard.statModels', 'Models'),

      value: loading ? null : kpis.models,

      sub: kpis.activeModels > 0

        ? `${kpis.activeModels} ${tr('aiDashboard.activeModels', 'active')}`

        : tr('aiDashboard.noActiveModel', 'No active deployment'),

    },

    {

      tone: KPI_TONES[1],

      icon: Database,

      title: tr('aiDashboard.statDatasets', 'Datasets'),

      value: loading ? null : kpis.datasets,

      sub: tr('aiDashboard.datasetsRegistered', 'Registered collections'),

    },

    {

      tone: KPI_TONES[2],

      icon: Activity,

      title: tr('aiDashboard.statDetections', 'Detections'),

      value: loading ? null : kpis.detections,

      sub: kpis.today > 0

        ? `${kpis.today} ${tr('aiDashboard.today', 'today')}`

        : tr('aiDashboard.allTime', 'All-time total'),

    },

    {

      tone: KPI_TONES[3],

      icon: Target,

      title: tr('aiDashboard.statAccuracy', 'Accuracy'),

      value: loading ? null : kpis.accuracy != null ? `${Math.round(kpis.accuracy)}%` : '—',

      sub: tr('aiDashboard.detectionQuality', 'Detection quality score'),

    },

  ] as const;



  return (

    <div className="enforcement-page enforcement-page--ai-dashboard ai-dashboard">

      <header className="enforcement-page__hero">

        <div className="enforcement-page__hero-glow--primary" aria-hidden />

        <div className="enforcement-page__hero-glow--secondary" aria-hidden />

        <div className="enforcement-page__hero-inner">

          <div className="ai-dash-hero__copy">

            <div className="enforcement-page__eyebrow">

              <span className="enforcement-page__eyebrow-icon"><Brain size={14} /></span>

              {tr('aiDashboard.eyebrow', 'Intelligence overview')}

            </div>

            <h1 className="enforcement-page__title">{tr('aiDashboard.title', 'AI dashboard')}</h1>

            <p className="enforcement-page__subtitle">

              {tr('aiDashboard.subtitle', 'Models, datasets, detections, and training at a glance')}

            </p>

            <div className="ai-dash-hero__badges">

              <span className={cn('ai-dash-badge', isLive && 'ai-dash-badge--live')}>

                <span className="ai-dash-badge__dot" aria-hidden />

                {isLive ? tr('aiDashboard.statusLive', 'Model active') : tr('aiDashboard.statusIdle', 'No active model')}

              </span>

              {stats?.models?.latest ? (

                <span className="ai-dash-badge ai-dash-badge--model">

                  <Sparkles size={13} />

                  {stats.models.latest}

                </span>

              ) : null}

              {stats?.generated_at ? (

                <span className="ai-dash-badge ai-dash-badge--muted">

                  <TrendingUp size={13} />

                  {new Date(stats.generated_at).toLocaleTimeString()}

                </span>

              ) : null}

            </div>

          </div>

          <div className="ai-dash-hero__actions">

            <button

              type="button"

              className="enforcement-page__hero-btn enforcement-page__hero-btn--slate"

              onClick={() => void load()}

              disabled={loading}

            >

              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />

              {tr('aiDashboard.refresh', 'Refresh')}

            </button>

            <Link to="/admin/ai-detection" className="enforcement-page__hero-btn enforcement-page__hero-btn--blue">

              <Activity size={16} />

              {tr('aiDashboard.openDetection', 'Open detection')}

            </Link>

          </div>

        </div>

      </header>



      <nav className="ai-dash-navcards" aria-label={tr('aiDashboard.navCards', 'AI navigation')}>

        <p className="ai-dash-navcards__heading">{tr('aiDashboard.quickNav', 'Quick navigation')}</p>

        <div className="ai-dash-navcards__track">

          {QUICK_ACTIONS.map(({ path, labelKey, fallback, descKey, descFallback, icon: Icon, tone }) => (

            <Link

              key={path}

              to={path}

              className={cn('ai-dash-navcard', `ai-dash-navcard--${tone}`)}

            >

              <span className="ai-dash-navcard__glow" aria-hidden />

              <span className="ai-dash-navcard__icon"><Icon size={20} strokeWidth={2} /></span>

              <span className="ai-dash-navcard__copy">

                <span className="ai-dash-navcard__title">{tr(labelKey, fallback)}</span>

                <span className="ai-dash-navcard__desc">{tr(descKey, descFallback)}</span>

              </span>

              <ArrowRight size={16} className="ai-dash-navcard__arrow" aria-hidden />

            </Link>

          ))}

        </div>

      </nav>



      <section className="enforcement-page__stat-grid enforcement-page__stat-grid--four" aria-label={tr('aiDashboard.metrics', 'Key metrics')}>

        {loading

          ? KPI_TONES.map((tone) => <KpiSkeleton key={tone} />)

          : kpiItems.map(({ tone, icon: Icon, title, value, sub }) => (

            <article

              key={tone}

              className={cn('enforcement-page__stat-card', `enforcement-page__stat-card--${tone}`, 'ai-dash-kpi')}

            >

              <div className={cn('enforcement-page__stat-icon', `enforcement-page__stat-icon--${tone}`)}>

                <Icon size={20} />

              </div>

              <div className="enforcement-page__stat-copy">

                <p className="enforcement-page__stat-value">

                  {typeof value === 'number' ? value.toLocaleString() : value}

                </p>

                <p className={cn('enforcement-page__stat-label', `enforcement-page__stat-label--${tone}`)}>

                  {title}

                </p>

                <p className="ai-dash-kpi__sub">{sub}</p>

              </div>

            </article>

          ))}

      </section>



      <div className="ai-dash-grid">
        <section className="enforcement-page__panel ai-dash-panel ai-dash-panel--runtime">
          <header className="ai-dash-panel__head">
            <span className="ai-dash-panel__head-glow" aria-hidden />
            <div className="ai-dash-panel__icon ai-dash-panel__icon--violet"><Sparkles size={20} /></div>
            <div>
              <h2 className="ai-dash-panel__title">{tr('aiDashboard.runtimeTitle', 'Model runtime')}</h2>
              <p className="ai-dash-panel__desc">{tr('aiDashboard.runtimeDesc', 'Current inference environment')}</p>
            </div>
          </header>

          <div className="ai-dash-panel__body ai-dash-panel__body--scroll">
            {loading ? (
              <div className="ai-dash-skeleton-list" aria-hidden>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="ai-dash-skeleton-row" />
                ))}
              </div>
            ) : runtimeEntries.length === 0 ? (
              <div className="ai-dash-empty">
                <Cpu size={36} strokeWidth={1.5} />
                <p>{tr('aiDashboard.runtimeEmpty', 'No runtime info available')}</p>
              </div>
            ) : (
              <div className="ai-dash-runtime-grid">
                {runtimeEntries.map(([key, value]) => {
                  const meta = RUNTIME_META[key] ?? { icon: Sparkles, tone: 'slate' };
                  const Icon = meta.icon;
                  const formatted = formatRuntimeValue(value);
                  return (
                    <div key={key} className={cn('ai-dash-runtime-item', `ai-dash-runtime-item--${meta.tone}`)}>
                      <div className="ai-dash-runtime-item__icon"><Icon size={16} /></div>
                      <div className="ai-dash-runtime-item__copy">
                        <p className="ai-dash-runtime-item__key">{formatRuntimeKey(key)}</p>
                        <p className={cn('ai-dash-runtime-item__val', formatted.boolClass)}>{formatted.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && stats?.models?.latest ? (
              <footer className="ai-dash-panel__footer ai-dash-panel__footer--success">
                <CheckCircle2 size={15} />
                {tr('aiDashboard.latestModel', 'Latest model')}: <strong>{stats.models.latest}</strong>
              </footer>
            ) : null}
          </div>
        </section>

        <div className="ai-dash-column">
          <section className="enforcement-page__panel ai-dash-panel ai-dash-panel--training">
            <header className="ai-dash-panel__head">
              <span className="ai-dash-panel__head-glow" aria-hidden />
              <div className="ai-dash-panel__icon ai-dash-panel__icon--blue"><Target size={20} /></div>
              <div>
                <h2 className="ai-dash-panel__title">{tr('aiDashboard.trainingTitle', 'Training status')}</h2>
                <p className="ai-dash-panel__desc">{tr('aiDashboard.trainingDesc', 'Model training & detection metrics')}</p>
              </div>
            </header>

            <div className="ai-dash-panel__body ai-dash-panel__body--stack">
              {loading ? (
                <div className="ai-dash-training-skeleton" aria-hidden>
                  <div className="ai-dash-training-skeleton__ring" />
                  <div className="ai-dash-training-skeleton__lines">
                    <div className="ai-dash-skeleton-row" />
                    <div className="ai-dash-skeleton-row" />
                    <div className="ai-dash-skeleton-row" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="ai-dash-training-board">
                    <div className="ai-dash-training-board__ring-wrap">
                      <AccuracyRing
                        value={kpis.accuracy}
                        loading={false}
                        label={tr('aiDashboard.statAccuracy', 'Accuracy')}
                      />
                    </div>
                    <div className="ai-dash-metric-grid">
                      <div className="ai-dash-metric-tile ai-dash-metric-tile--blue">
                        <span className="ai-dash-metric-tile__label">{tr('aiDashboard.lastTrained', 'Last trained')}</span>
                        <span className="ai-dash-metric-tile__value">
                          {training.last_trained_at
                            ? new Date(training.last_trained_at).toLocaleDateString()
                            : '—'}
                        </span>
                      </div>
                      <div className="ai-dash-metric-tile ai-dash-metric-tile--violet">
                        <span className="ai-dash-metric-tile__label">{tr('aiDashboard.trainingImages', 'Training images')}</span>
                        <span className="ai-dash-metric-tile__value">
                          {(training.training_images ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="ai-dash-metric-tile ai-dash-metric-tile--teal">
                        <span className="ai-dash-metric-tile__label">{tr('aiDashboard.statDetections', 'Detections')}</span>
                        <span className="ai-dash-metric-tile__value">{kpis.detections.toLocaleString()}</span>
                      </div>
                      <div className="ai-dash-metric-tile ai-dash-metric-tile--amber">
                        <span className="ai-dash-metric-tile__label">{tr('aiDashboard.violations', 'Violations flagged')}</span>
                        <span className="ai-dash-metric-tile__value">
                          {(stats?.enforcement?.total_violations ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {stats?.detection ? (
                    <div className="ai-dash-pills">
                      <p className="ai-dash-pills__title">{tr('aiDashboard.detectionStats', 'Detection stats')}</p>
                      <div className="ai-dash-pills__row">
                        {Object.entries(stats.detection).map(([k, v], i) => (
                          <span
                            key={k}
                            className={cn('ai-dash-pill', `ai-dash-pill--${DETECTION_PILL_TONES[i % DETECTION_PILL_TONES.length]}`)}
                          >
                            <span className="ai-dash-pill__key">{formatRuntimeKey(k)}</span>
                            <span className="ai-dash-pill__val">{String(v)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>

          <section className="enforcement-page__panel ai-dash-panel ai-dash-panel--pipeline" aria-labelledby="ai-pipeline-title">
            <header className="ai-dash-panel__head">
              <span className="ai-dash-panel__head-glow" aria-hidden />
              <div className="ai-dash-panel__icon ai-dash-panel__icon--emerald"><Zap size={20} /></div>
              <div>
                <h2 id="ai-pipeline-title" className="ai-dash-panel__title">
                  {tr('aiDashboard.pipelineTitle', 'AI pipeline')}
                </h2>
                <p className="ai-dash-panel__desc">
                  {tr('aiDashboard.pipelineSubtitle', 'From data to live enforcement')}
                </p>
              </div>
            </header>

            <div className="ai-dash-panel__body">
              <ol className="ai-dash-pipeline__track">
                {[
                  {
                    icon: Database,
                    label: tr('aiDashboard.pipelineDatasets', 'Datasets'),
                    hint: tr('aiDashboard.pipelineDatasetsHint', 'Curate sign & vehicle images'),
                    tone: 'cyan',
                    step: '01',
                  },
                  {
                    icon: Zap,
                    label: tr('aiDashboard.pipelineTrain', 'Train'),
                    hint: tr('aiDashboard.pipelineTrainHint', 'Fine-tune YOLO models'),
                    tone: 'amber',
                    step: '02',
                  },
                  {
                    icon: Brain,
                    label: tr('aiDashboard.pipelineDeploy', 'Deploy'),
                    hint: tr('aiDashboard.pipelineDeployHint', 'Activate production weights'),
                    tone: 'violet',
                    step: '03',
                  },
                  {
                    icon: Activity,
                    label: tr('aiDashboard.pipelineDetect', 'Detect'),
                    hint: tr('aiDashboard.pipelineDetectHint', 'Live inference & violations'),
                    tone: 'teal',
                    step: '04',
                  },
                ].map((step, index, arr) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.step} className="ai-dash-pipeline__track-item">
                      <div className={cn('ai-dash-pipeline__track-node', `ai-dash-pipeline__track-node--${step.tone}`)}>
                        <Icon size={16} strokeWidth={2.1} />
                      </div>
                      <article
                        className={cn('ai-dash-pipeline__card', `ai-dash-pipeline__card--${step.tone}`)}
                        title={step.hint}
                      >
                        <span className="ai-dash-pipeline__step-num">{step.step}</span>
                        <div className="ai-dash-pipeline__copy">
                          <span className="ai-dash-pipeline__label">{step.label}</span>
                          <span className="ai-dash-pipeline__hint">{step.hint}</span>
                        </div>
                        <ArrowRight size={15} className="ai-dash-pipeline__track-arrow" aria-hidden />
                      </article>
                      {index < arr.length - 1 ? (
                        <span className="ai-dash-pipeline__track-line" aria-hidden />
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        </div>
      </div>

    </div>

  );

}

