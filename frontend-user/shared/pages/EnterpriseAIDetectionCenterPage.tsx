import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Brain, ArrowLeft, Activity, Target, Camera as CameraIcon, Zap,
  Loader2, CheckCircle, Signpost, Car, Hash, Shield, BarChart3,
} from 'lucide-react';
import { LiveWebcamPanel } from '@shared/components/ai/LiveWebcamPanel';
import { ImageUploadPanel } from '@shared/components/ai/center/ImageUploadPanel';
import { VideoUploadPanel } from '@shared/components/ai/center/VideoUploadPanel';
import { LiveCameraDetectionPanel } from '@shared/components/ai/center/LiveCameraDetectionPanel';
import {
  EnterpriseDetectionInputWorkspace,
  type EnterpriseInputMode,
} from '@shared/components/ai/center/EnterpriseDetectionInputWorkspace';
import { EnterpriseDetectionResultsView } from '@shared/components/ai/center/EnterpriseDetectionResultsView';
import { RecentDetectionsTable } from '@shared/components/ai/center/RecentDetectionsTable';
import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';
import type { DetectPipelineOptions } from '@shared/constants/observedActions';
import { isManualScanResult, type WebcamDetectionResult } from '@shared/hooks/useWebcamDetection';
import { useLanguage } from '@shared/context/LanguageContext';
import { aiAPI, camerasAPI } from '@shared/services/api';
import {
  DEFAULT_PAGE_STATS,
  mergePageStatsWithDefaults,
} from '@shared/constants/defaultPageStats';
import {
  getStoredUserDetectionInputMode,
  setStoredUserDetectionInputMode,
} from '@shared/constants/detectionInputMode';
import { USER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';
import type { AIDetectionLog, AIDetectionPageStats } from '@shared/types';
import { cn } from '@shared/components/ui/utils';

const PROCESSING_STEPS = [
  { icon: Signpost, labelKey: 'aiCenter.processSigns' },
  { icon: Car, labelKey: 'aiCenter.processVehicles' },
  { icon: Hash, labelKey: 'aiCenter.processPlates' },
  { icon: Shield, labelKey: 'aiCenter.processViolations' },
] as const;

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

function EnterpriseProcessingPanel() {
  const { t } = useLanguage();
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const started = performance.now();
    const durationMs = 14000;
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - started;
      // Ease toward 96% while waiting for the API; never claim 100% until results arrive.
      const tNorm = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - tNorm) ** 2.2;
      const next = Math.min(96, Math.round(8 + eased * 88));
      setProgress(next);
      if (next < 96) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const stepDoneAt = [22, 48, 72, 90];

  return (
    <div className="enterprise-ai-processing">
      <div className="enterprise-ai-processing__head">
        <Loader2 size={32} className="enterprise-ai-processing__spinner" />
        <h3>{t('aiCenter.processingTitle')}</h3>
        <p>{t('aiCenter.analyzingImage')}</p>
      </div>
      <div
        className="enterprise-ai-processing__bar"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('aiCenter.analyzingImage')}
      >
        <div className="enterprise-ai-processing__bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="enterprise-ai-processing__pct" aria-live="polite">
        <span className="enterprise-ai-processing__pct-value">{progress}</span>
        <span className="enterprise-ai-processing__pct-unit">%</span>
      </p>
      <ul className="enterprise-ai-processing__steps">
        {PROCESSING_STEPS.map(({ labelKey }, index) => {
          const done = progress >= stepDoneAt[index];
          return (
            <li
              key={labelKey}
              className={cn(
                'enterprise-ai-processing__step',
                done && 'enterprise-ai-processing__step--done',
              )}
            >
              <CheckCircle size={18} />
              {t(labelKey)}
            </li>
          );
        })}
      </ul>
      <p className="enterprise-ai-processing__wait">{t('aiCenter.pleaseWait')}</p>
    </div>
  );
}

function parseInitialMode(searchParams: URLSearchParams): EnterpriseInputMode {
  const q = searchParams.get('mode');
  if (q === 'camera' || q === 'video' || q === 'webcam' || q === 'image') return q;
  return getStoredUserDetectionInputMode();
}

export function EnterpriseAIDetectionCenterPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inputMode, setInputMode] = useState<EnterpriseInputMode>(() => parseInitialMode(searchParams));
  const [demoAction, setDemoAction] = useState('');
  const [result, setResult] = useState<CenterDetectionResult | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [pageStats, setPageStats] = useState<AIDetectionPageStats>(DEFAULT_PAGE_STATS);
  const [recentLogs, setRecentLogs] = useState<AIDetectionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [liveCameraCount, setLiveCameraCount] = useState(0);

  const refreshStats = useCallback(async () => {
    try {
      const data = await aiAPI.getPageStats();
      setPageStats(mergePageStatsWithDefaults(data));
    } catch { /* keep defaults */ }
  }, []);

  const refreshLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const logs = await aiAPI.getLogs();
      setRecentLogs(logs);
    } catch {
      setRecentLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const refreshCameras = useCallback(async () => {
    try {
      const cameras = await camerasAPI.getAll();
      const active = cameras.filter((c) => c.status === 'active');
      setLiveCameraCount(active.length || cameras.length);
    } catch {
      setLiveCameraCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshStats();
    void refreshLogs();
    void refreshCameras();
  }, [refreshStats, refreshLogs, refreshCameras]);

  useEffect(() => {
    setInputMode(parseInitialMode(searchParams));
  }, [searchParams]);

  const todayDetections = useMemo(
    () => recentLogs.filter((log) => isToday(log.created_at)).length,
    [recentLogs],
  );

  const selectInputMode = (mode: EnterpriseInputMode) => {
    setStoredUserDetectionInputMode(mode);
    setInputMode(mode);
  };

  const pipelineOptions: DetectPipelineOptions = {
    observedAction: demoAction || undefined,
    demoViolation: !!demoAction,
    autoCreateViolation: true,
  };

  const handleResult = (res: CenterDetectionResult, preview: string) => {
    setResult(res);
    setPreviewSrc(preview || res.uploaded_image || null);
    void refreshLogs();
    void refreshStats();
  };

  const handleWebcamResult = (res: WebcamDetectionResult) => {
    if (!isManualScanResult(res)) return;
    handleResult(res as CenterDetectionResult, res.uploaded_image || '');
  };

  const sourceLabel = t(`aiCenter.source.${inputMode}`);
  const showResults = Boolean(result) && !detecting;

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

  const resetDetection = () => {
    setResult(null);
    setPreviewSrc(null);
    setDetecting(false);
  };

  const beforeKpi = [
    { tone: 'emerald', icon: Activity, value: pageStats.stats.total_scans.toLocaleString(), label: t('aiCenter.kpiTotalDetect') },
    { tone: 'blue', icon: Zap, value: String(todayDetections), label: t('aiCenter.kpiTodayDetect') },
    { tone: 'violet', icon: Target, value: `${pageStats.stats.accuracy_avg.toFixed(1)}%`, label: t('aiCenter.kpiAccuracy') },
    { tone: 'cyan', icon: CameraIcon, value: String(liveCameraCount), label: t('aiCenter.kpiLiveCameras') },
  ];

  const panelProps = {
    demoObservedAction: demoAction,
    onDemoObservedActionChange: setDemoAction,
    onResult: handleResult,
    onDetectingChange: setDetecting,
    disabled: detecting,
  };

  const renderPreview = () => {
    switch (inputMode) {
      case 'image':
        return <ImageUploadPanel {...panelProps} layout="enterprise" />;
      case 'video':
        return <VideoUploadPanel {...panelProps} />;
      case 'camera':
        return <LiveCameraDetectionPanel {...panelProps} />;
      case 'webcam':
        return (
          <div className="ai-center-webcam-wrap">
            <LiveWebcamPanel
              onResult={handleWebcamResult}
              disabled={detecting}
              pipelineOptions={pipelineOptions}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="enforcement-page enforcement-page--ai-center dashboard-home dashboard-page--ai-center enterprise-ai-page">
      <div className="enforcement-page__hero enterprise-ai-page__hero enterprise-ai-page__hero--compact">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner enterprise-ai-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Brain size={14} /></span>
              {t('aiCenter.newDetectionTitle')}
            </div>
            <h1 className="enforcement-page__title">{t('aiCenter.heroTitle')}</h1>
            <p className="enforcement-page__subtitle">{t('aiCenter.newDetectionSubtitle')}</p>
          </div>
          <div className="enterprise-ai-page__hero-actions">
            <button
              type="button"
              className="enterprise-ai-page__action-btn"
              onClick={() => navigate(USER_PORTAL_ROUTES.aiDetection)}
            >
              <ArrowLeft size={15} />
              {t('aiCenter.backToDashboard')}
            </button>
            <button
              type="button"
              className="enterprise-ai-page__action-btn"
              onClick={() => navigate(USER_PORTAL_ROUTES.aiLogs)}
            >
              <BarChart3 size={15} />
              {t('aiCenter.actionAnalytics')}
            </button>
          </div>
        </div>
      </div>

      {!showResults && (
        <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four enterprise-ai-kpi-grid">
          {beforeKpi.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={cn('enforcement-page__stat-card', `enforcement-page__stat-card--${card.tone}`)}>
                <div className={cn('enforcement-page__stat-icon', `enforcement-page__stat-icon--${card.tone}`)}>
                  <Icon size={18} />
                </div>
                <div className="enforcement-page__stat-copy">
                  <p className="enforcement-page__stat-value">{card.value}</p>
                  <p className={cn('enforcement-page__stat-label', `enforcement-page__stat-label--${card.tone}`)}>
                    {card.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showResults && result ? (
        <EnterpriseDetectionResultsView
          result={result}
          previewSrc={previewSrc}
          sourceLabel={sourceLabel}
          accuracyAvg={pageStats.stats.accuracy_avg}
          onExport={exportResult}
          onNewDetection={resetDetection}
        />
      ) : (
        <>
          <EnterpriseDetectionInputWorkspace
            inputMode={inputMode}
            onInputModeChange={selectInputMode}
            detecting={detecting}
            sourceControls={null}
            previewContent={renderPreview()}
            processingOverlay={<EnterpriseProcessingPanel />}
          />
          <RecentDetectionsTable
            logs={recentLogs}
            loading={loadingLogs}
            onViewAll={() => navigate(`${USER_PORTAL_ROUTES.aiDetection}?tab=history`)}
            onViewLog={() => navigate(`${USER_PORTAL_ROUTES.aiDetection}?tab=history`)}
            pageSize={10}
          />
        </>
      )}
    </div>
  );
}
