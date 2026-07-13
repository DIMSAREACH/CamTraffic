import { useState, useEffect } from 'react';
import {
  Brain, Upload, Film, Cctv, Camera, History, Activity, Target, Cpu, Zap,
  Sparkles, ScanLine,
} from 'lucide-react';
import { LiveWebcamPanel } from '@shared/components/ai/LiveWebcamPanel';
import { ImageUploadPanel } from '@shared/components/ai/center/ImageUploadPanel';
import { VideoUploadPanel } from '@shared/components/ai/center/VideoUploadPanel';
import { LiveCameraDetectionPanel } from '@shared/components/ai/center/LiveCameraDetectionPanel';
import {
  DetectionCenterResultsPanel,
  type CenterDetectionResult,
} from '@shared/components/ai/center/DetectionCenterResultsPanel';
import { DetectionCenterHistoryPanel } from '@shared/components/ai/center/DetectionCenterHistoryPanel';
import type { DetectPipelineOptions } from '@shared/constants/observedActions';
import { isManualScanResult, type WebcamDetectionResult } from '@shared/hooks/useWebcamDetection';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { aiAPI } from '@shared/services/api';
import {
  DEFAULT_PAGE_STATS,
  mergePageStatsWithDefaults,
} from '@shared/constants/defaultPageStats';
import type { AIDetectionPageStats } from '@shared/types';
import { cn } from '@shared/components/ui/utils';

type WorkflowTab = 'detect' | 'history';
type InputMode = 'image' | 'video' | 'camera' | 'webcam';

const INPUT_MODES: { id: InputMode; icon: typeof Upload; tone: string }[] = [
  { id: 'image', icon: Upload, tone: 'violet' },
  { id: 'video', icon: Film, tone: 'rose' },
  { id: 'camera', icon: Cctv, tone: 'cyan' },
  { id: 'webcam', icon: Camera, tone: 'emerald' },
];

const ENGINE_TAGS = [
  { label: 'YOLOv11 Signs', tone: 'violet' },
  { label: 'YOLOv11 Vehicles', tone: 'cyan' },
  { label: 'YOLOv11 Plates', tone: 'amber' },
  { label: 'EasyOCR', tone: 'emerald' },
] as const;

const INPUT_TONE: Record<InputMode, string> = {
  image: 'violet',
  video: 'rose',
  camera: 'cyan',
  webcam: 'emerald',
};

const INPUT_ICONS: Record<InputMode, typeof Upload> = {
  image: Upload,
  video: Film,
  camera: Cctv,
  webcam: Camera,
};

export function EnterpriseAIDetectionCenterPage() {
  const { t } = useLanguage();
  const [workflow, setWorkflow] = useState<WorkflowTab>('detect');
  const [inputMode, setInputMode] = useState<InputMode>('image');
  const [demoAction, setDemoAction] = useState('');
  const [result, setResult] = useState<CenterDetectionResult | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const [pageStats, setPageStats] = useState<AIDetectionPageStats>(DEFAULT_PAGE_STATS);

  useEffect(() => {
    aiAPI.getPageStats()
      .then((data) => setPageStats(mergePageStatsWithDefaults(data)))
      .catch(() => { /* keep defaults */ });
  }, []);

  useLiveData(() => {
    aiAPI.getPageStats()
      .then((data) => setPageStats(mergePageStatsWithDefaults(data)))
      .catch(() => { /* keep defaults */ });
  }, 30_000, true);

  const stats = pageStats;

  const pipelineOptions: DetectPipelineOptions = {
    observed_action: demoAction || undefined,
    demo_violation: !!demoAction,
    auto_create_violation: true,
  };

  const handleResult = (res: CenterDetectionResult, preview: string) => {
    setResult(res);
    setPreviewSrc(preview || res.uploaded_image || null);
  };

  const handleWebcamResult = (res: WebcamDetectionResult) => {
    if (!isManualScanResult(res)) return;
    handleResult(res as CenterDetectionResult, res.uploaded_image || '');
  };

  const sourceLabel = t(`aiCenter.source.${inputMode}`);
  const activeTone = INPUT_TONE[inputMode];
  const ActiveInputIcon = INPUT_ICONS[inputMode];

  const exportResult = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detection-${result.log_id || Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="enforcement-page enforcement-page--ai-center dashboard-home dashboard-page--ai-center">
      {/* Hero */}
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Brain size={14} />
              </span>
              {t('aiCenter.heroEyebrow')}
              <span className="ai-center-live-badge">
                <Sparkles size={11} />
                {t('aiCenter.liveBadge')}
              </span>
            </div>
            <h1 className="enforcement-page__title">{t('aiCenter.heroTitle')}</h1>
            <p className="enforcement-page__subtitle">{t('aiCenter.heroSubtitle')}</p>
          </div>
        </div>
      </div>

      {/* KPI stats */}
      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four ai-center-stat-grid">
        <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald">
            <Target size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{stats.stats.accuracy_avg.toFixed(1)}%</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">
              {t('aiCenter.kpiAccuracy')}
            </p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--blue">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue">
            <Activity size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{stats.stats.total_scans}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">
              {t('aiCenter.kpiScans')}
            </p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--violet">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--violet">
            <Cpu size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value ai-center-stat-value--text">{stats.model.label}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--violet">
              {t('aiCenter.kpiModel')}
            </p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--amber ai-center-stat-card--engines">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--amber">
            <Zap size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-label enforcement-page__stat-label--amber ai-center-engines-label">
              {t('aiCenter.engines')}
            </p>
            <div className="ai-center-engine-tags">
              {ENGINE_TAGS.map(({ label, tone }) => (
                <span key={label} className={cn('ai-center-engine-tag', `ai-center-engine-tag--${tone}`)}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow tabs */}
      <div className="enforcement-page__toolbar ai-center-workflow-toolbar">
        <div className="enforcement-page__filters">
          <button
            type="button"
            className={cn(
              'enforcement-page__filter-btn ai-center-workflow-tab',
              workflow === 'detect' && 'enforcement-page__filter-btn--active',
            )}
            style={workflow === 'detect' ? { background: 'linear-gradient(135deg, #6366f1, #4f46e5)' } : undefined}
            onClick={() => setWorkflow('detect')}
          >
            <Zap size={15} />
            {t('aiCenter.tabDetect')}
          </button>
          <button
            type="button"
            className={cn(
              'enforcement-page__filter-btn ai-center-workflow-tab',
              workflow === 'history' && 'enforcement-page__filter-btn--active',
            )}
            style={workflow === 'history' ? { background: 'linear-gradient(135deg, #0891b2, #0e7490)' } : undefined}
            onClick={() => setWorkflow('history')}
          >
            <History size={15} />
            {t('aiCenter.tabHistory')}
          </button>
        </div>
      </div>

      {workflow === 'history' ? (
        <DetectionCenterHistoryPanel />
      ) : (
        <div className="ai-center-workspace">
          <section
            className={cn(
              'ai-center-panel ai-center-panel--input enforcement-page__panel',
              `ai-center-panel--tone-${activeTone}`,
            )}
          >
            <header className={cn('ai-center-panel__header ai-center-panel__header--input', `ai-center-panel__header--tone-${activeTone}`)}>
              <span className="ai-center-panel__header-glow" aria-hidden />
              <div className={cn('ai-center-panel__header-icon', `ai-center-panel__header-icon--${activeTone}`)}>
                <ActiveInputIcon size={18} />
              </div>
              <div>
                <h2 className="ai-center-panel__title">{t('aiCenter.panelInput')}</h2>
                <p className="ai-center-panel__subtitle">{t('aiCenter.panelInputHint')}</p>
              </div>
            </header>

            <div className="ai-center-input-tabs">
              {INPUT_MODES.map(({ id, icon: Icon, tone }) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    'ai-center-input-tab',
                    `ai-center-input-tab--${tone}`,
                    inputMode === id && 'is-active',
                  )}
                  onClick={() => setInputMode(id)}
                  disabled={detecting}
                  title={t(`aiCenter.input.${id}`)}
                >
                  <Icon size={16} />
                  <span>{t(`aiCenter.input.${id}`)}</span>
                </button>
              ))}
            </div>

            <div className="ai-center-input-body">
              {inputMode === 'image' && (
                <ImageUploadPanel
                  demoObservedAction={demoAction}
                  onDemoObservedActionChange={setDemoAction}
                  onResult={handleResult}
                  onDetectingChange={setDetecting}
                  disabled={detecting}
                />
              )}
              {inputMode === 'video' && (
                <VideoUploadPanel
                  demoObservedAction={demoAction}
                  onDemoObservedActionChange={setDemoAction}
                  onResult={handleResult}
                  onDetectingChange={setDetecting}
                  disabled={detecting}
                />
              )}
              {inputMode === 'camera' && (
                <LiveCameraDetectionPanel
                  demoObservedAction={demoAction}
                  onDemoObservedActionChange={setDemoAction}
                  onResult={handleResult}
                  onDetectingChange={setDetecting}
                  disabled={detecting}
                />
              )}
              {inputMode === 'webcam' && (
                <div className="ai-center-webcam-wrap">
                  <LiveWebcamPanel
                    onResult={handleWebcamResult}
                    disabled={detecting}
                    pipelineOptions={pipelineOptions}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="ai-center-panel ai-center-panel--results enforcement-page__panel">
            <header className="ai-center-panel__header ai-center-panel__header--results">
              <span className="ai-center-panel__header-glow" aria-hidden />
              <div className="ai-center-panel__header-icon ai-center-panel__header-icon--cyan">
                <ScanLine size={18} />
              </div>
              <div>
                <h2 className="ai-center-panel__title">{t('aiCenter.panelResults')}</h2>
                <p className="ai-center-panel__subtitle">{t('aiCenter.panelResultsHint')}</p>
              </div>
            </header>
            <DetectionCenterResultsPanel
              result={result}
              originalSrc={previewSrc}
              detecting={detecting}
              sourceLabel={sourceLabel}
              onExport={result ? exportResult : undefined}
            />
          </section>
        </div>
      )}
    </div>
  );
}
