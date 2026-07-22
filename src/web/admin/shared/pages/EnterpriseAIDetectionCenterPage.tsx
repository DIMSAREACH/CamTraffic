import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import {
  EnterpriseVideoDetectionResultsView,
  EnterpriseVideoProcessingPanel,
} from '@shared/components/ai/center/EnterpriseVideoDetectionResultsView';
import { RecentDetectionsTable } from '@shared/components/ai/center/RecentDetectionsTable';
import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';
import type { DetectPipelineOptions } from '@shared/constants/observedActions';
import { toDetectPipelineOptions } from '@shared/constants/observedActions';
import { isManualScanResult, type WebcamDetectionResult } from '@shared/hooks/useWebcamDetection';
import { useLanguage } from '@shared/context/LanguageContext';
import { useAuth } from '@shared/context/AuthContext';
import { aiAPI, camerasAPI } from '@shared/services/api';
import {
  DEFAULT_PAGE_STATS,
  mergePageStatsWithDefaults,
} from '@shared/constants/defaultPageStats';
import {
  getStoredAdminDetectionInputMode,
  setStoredAdminDetectionInputMode,
} from '@shared/constants/detectionInputMode';
import type { AIDetectionLog, AIDetectionPageStats } from '@shared/types';
import { cn } from '@shared/components/ui/utils';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import { toast } from 'sonner';

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
    const durationMs = 7000;
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

  const stepDoneAt = [18, 38, 58, 78];

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
  return getStoredAdminDetectionInputMode();
}

export function EnterpriseAIDetectionCenterPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
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
  const [historyDate, setHistoryDate] = useState('');
  const [historyPlate, setHistoryPlate] = useState('');
  const [historyType, setHistoryType] = useState<'all' | 'sign' | 'vehicle' | 'plate' | 'no_sign'>('all');
  const isAdmin = user?.role === 'admin';
  const videoAbortRef = useRef<(() => void) | null>(null);

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

  const filteredHistory = useMemo(() => {
    return recentLogs.filter((log) => {
      if (historyDate) {
        const d = new Date(log.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (key !== historyDate) return false;
      }
      if (historyPlate.trim()) {
        const q = historyPlate.trim().toLowerCase();
        const plate = (log.detected_plate || log.matched_vehicle?.plate_number || '').toLowerCase();
        if (!plate.includes(q)) return false;
      }
      if (historyType !== 'all') {
        const mode = log.detection_mode || 'sign';
        if (mode !== historyType) return false;
      }
      return true;
    });
  }, [recentLogs, historyDate, historyPlate, historyType]);

  const handleDeleteLog = useCallback(async (log: AIDetectionLog) => {
    if (!isAdmin) {
      toast.error(t('aiLogs.deleteDenied'));
      return;
    }
    if (!window.confirm(t('aiLogs.deleteConfirm'))) return;
    try {
      await aiAPI.deleteLog(log.id);
      toast.success(t('aiLogs.deleteSuccess'));
      void refreshLogs();
      void refreshStats();
    } catch {
      toast.error(t('aiLogs.deleteFail'));
    }
  }, [isAdmin, refreshLogs, refreshStats, t]);

  const selectInputMode = (mode: EnterpriseInputMode) => {
    setStoredAdminDetectionInputMode(mode);
    setInputMode(mode);
  };

  const pipelineOptions: DetectPipelineOptions = toDetectPipelineOptions(demoAction);

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
    setPreviewSrc((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setResult(null);
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
        return (
          <VideoUploadPanel
            {...panelProps}
            onPreviewChange={setPreviewSrc}
            onRegisterAbort={(abort) => { videoAbortRef.current = abort; }}
          />
        );
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
              onClick={() => navigate('/admin/ai-detection')}
            >
              <ArrowLeft size={15} />
              {t('aiCenter.backToDashboard')}
            </button>
            <button
              type="button"
              className="enterprise-ai-page__action-btn"
              onClick={() => navigate('/admin/ai-dashboard')}
            >
              <BarChart3 size={15} />
              {t('aiCenter.actionAnalytics')}
            </button>
          </div>
        </div>
      </div>

      {!showResults && !(detecting && inputMode === 'video') && (
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
        result.video_analysis || inputMode === 'video' ? (
          <EnterpriseVideoDetectionResultsView
            result={result}
            previewSrc={previewSrc}
            sourceLabel={sourceLabel}
            onNewDetection={resetDetection}
            violationsBasePath="/admin"
          />
        ) : (
          <EnterpriseDetectionResultsView
            result={result}
            previewSrc={previewSrc}
            sourceLabel={sourceLabel}
            accuracyAvg={pageStats.stats.accuracy_avg}
            onExport={exportResult}
            onNewDetection={resetDetection}
            violationsBasePath="/admin"
          />
        )
      ) : (
        <EnterpriseDetectionInputWorkspace
          inputMode={inputMode}
          onInputModeChange={selectInputMode}
          detecting={detecting}
          sourceControls={null}
          previewContent={renderPreview()}
          processingOverlay={
            inputMode === 'video'
              ? (
                <EnterpriseVideoProcessingPanel
                  previewSrc={previewSrc}
                  onStop={() => {
                    videoAbortRef.current?.();
                    setDetecting(false);
                  }}
                />
              )
              : <EnterpriseProcessingPanel />
          }
        />
      )}

      <div className="enterprise-ai-history-filters" role="search" aria-label={t('aiCenter.recentDetectionTitle')}>
        <label className="enterprise-ai-history-filters__field">
          <span>{t('aiCenter.historyFilterDate')}</span>
          <input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} />
        </label>
        <label className="enterprise-ai-history-filters__field">
          <span>{t('aiCenter.historyFilterPlate')}</span>
          <input
            type="text"
            value={historyPlate}
            onChange={(e) => setHistoryPlate(e.target.value)}
            placeholder={t('aiCenter.historyFilterPlate')}
          />
        </label>
        <label className="enterprise-ai-history-filters__field">
          <span>{t('aiCenter.historyFilterType')}</span>
          <FilterSelect
            tone="purple"
            size="sm"
            className="ct-filter-select--block"
            value={historyType}
            onValueChange={(v) => setHistoryType(v as typeof historyType)}
            ariaLabel={t('aiCenter.historyFilterType')}
            options={[
              { value: 'all', label: t('aiCenter.historyFilterAllTypes') },
              { value: 'sign', label: t('aiCenter.mode.sign') },
              { value: 'vehicle', label: t('aiCenter.mode.vehicle') },
              { value: 'plate', label: t('aiCenter.mode.plate') },
              { value: 'no_sign', label: t('aiCenter.mode.no_sign') },
            ]}
          />
        </label>
        {(historyDate || historyPlate || historyType !== 'all') ? (
          <button
            type="button"
            className="enterprise-ai-page__action-btn"
            onClick={() => {
              setHistoryDate('');
              setHistoryPlate('');
              setHistoryType('all');
            }}
          >
            {t('aiCenter.historyFilterClear')}
          </button>
        ) : null}
      </div>

      <RecentDetectionsTable
        logs={filteredHistory}
        loading={loadingLogs}
        onViewAll={() => navigate('/admin/ai-logs')}
        onViewLog={() => navigate('/admin/ai-logs')}
        onDelete={isAdmin ? handleDeleteLog : undefined}
        pageSize={10}
      />
    </div>
  );
}
