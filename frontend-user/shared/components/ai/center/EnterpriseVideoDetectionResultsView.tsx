import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Film, Hash, Printer, Save, FileSpreadsheet, FileText, Car, Target, Activity,
  Download, Shield, Signpost, Search, Eye, Square, Play, Pause, Plus, Cpu,
} from 'lucide-react';
import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';
import { AnnotatedDetectionImage } from '@shared/components/ai/center/AnnotatedDetectionImage';
import { LiveDetectionOverlay } from '@shared/components/ai/LiveDetectionOverlay';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { useLanguage } from '@shared/context/LanguageContext';
import { useNavigate } from 'react-router';
import { usePagination } from '@shared/hooks/usePagination';
import { aiAPI, violationsAPI } from '@shared/services/api';
import {
  downloadDetectionJson,
  exportDetectionCsv,
  exportDetectionExcelTsv,
  printDetectionReport,
} from '@shared/utils/detectionExport';
import { buildDetectionOverlay } from '@shared/utils/detectionOverlay';
import { resolvePipelineVehicle } from '@shared/utils/pipelineVehicle';
import { getProfileImageUrl } from '@shared/utils/profileImage';
import { cn } from '@shared/components/ui/utils';
import { toast } from 'sonner';

interface EnterpriseVideoDetectionResultsViewProps {
  result: CenterDetectionResult;
  previewSrc?: string | null;
  sourceLabel?: string;
  onNewDetection: () => void;
  violationsBasePath?: string;
}

interface EnterpriseVideoProcessingPanelProps {
  previewSrc?: string | null;
  onStop?: () => void;
}

type TimelineKind = 'vehicle' | 'sign' | 'plate' | 'violation';

function formatTs(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function formatClock(sec: number): string {
  const m = Math.floor(Math.max(0, sec) / 60);
  const r = Math.floor(Math.max(0, sec) % 60);
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function toPct(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, Math.max(0, n <= 1 ? n * 100 : n));
}

function L(t: (k: string) => string, key: string, fallback: string) {
  const v = t(key);
  return v !== key ? v : fallback;
}

async function captureVideoFrame(video: HTMLVideoElement): Promise<File | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement('canvas');
  const maxW = 960;
  const scale = Math.min(1, maxW / video.videoWidth);
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85);
  });
  if (!blob) return null;
  return new File([blob], `video-preview-frame-${Date.now()}.jpg`, { type: 'image/jpeg' });
}

/** Live processing layout: video player + AI Processing sidebar */
export function EnterpriseVideoProcessingPanel({
  previewSrc,
  onStop,
}: EnterpriseVideoProcessingPanelProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanBusy = useRef(false);
  const [progress, setProgress] = useState(8);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [overlayResult, setOverlayResult] = useState<CenterDetectionResult | null>(null);
  const [objectHits, setObjectHits] = useState(0);
  const started = useRef(performance.now());
  const pausedAt = useRef(0);

  const overlayItems = useMemo(
    () => buildDetectionOverlay(overlayResult, 'en'),
    [overlayResult],
  );

  useEffect(() => {
    if (paused) return undefined;
    started.current = performance.now() - elapsed * 1000;
    let frame = 0;
    const tick = (now: number) => {
      const secs = (now - started.current) / 1000;
      setElapsed(secs);
      const tNorm = Math.min(1, secs / 90);
      const eased = 1 - (1 - tNorm) ** 1.8;
      setProgress(Math.min(94, Math.round(8 + eased * 86)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!previewSrc || paused) return undefined;
    let cancelled = false;

    const scan = async () => {
      if (cancelled || scanBusy.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      scanBusy.current = true;
      try {
        const file = await captureVideoFrame(video);
        if (!file || cancelled) return;
        const raw = await aiAPI.detect(file, {
          live_scan: true,
          full_frame: true,
          save_log: false,
          auto_create_violation: false,
          demo_violation: false,
        }) as CenterDetectionResult;
        if (cancelled) return;
        setOverlayResult(raw);
        const vehicles = raw.vehicles?.length ?? raw.vehicle_count ?? 0;
        const hasSign = Boolean(raw.sign_bbox) || toPct(raw.display_confidence ?? raw.confidence) > 0;
        const plates = raw.detected_plate ? 1 : 0;
        setObjectHits(vehicles + (hasSign ? 1 : 0) + plates);
      } catch {
        /* keep last overlay; full video job continues */
      } finally {
        scanBusy.current = false;
      }
    };

    void scan();
    const id = window.setInterval(() => { void scan(); }, 2800);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [previewSrc, paused]);

  const remaining = Math.max(0, Math.round((90 * (100 - progress)) / Math.max(progress, 1) * 0.35));
  const fps = progress > 10 ? Math.round(18 + (progress / 100) * 8) : 0;
  const framesDone = Math.round((progress / 100) * 120);

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      const el = videoRef.current;
      if (el) {
        if (next) {
          pausedAt.current = el.currentTime;
          el.pause();
        } else {
          void el.play();
        }
      }
      return next;
    });
  };

  return (
    <div className="ai-video-console ai-video-console--processing">
      <header className="ai-video-console__topbar">
        <div className="ai-video-console__crumb">
          <Film size={14} />
          <span>{L(t, 'aiCenter.video.breadcrumb', 'AI Detection › Upload Video')}</span>
        </div>
        <div className="ai-video-console__status is-processing">
          <span className="ai-video-console__status-dot" aria-hidden />
          {L(t, 'aiCenter.video.statusProcessing', 'Processing')} {progress}%
        </div>
      </header>

      <div className="ai-video-console__stage">
        <section className="ai-video-console__player-card">
          <div className="ai-video-console__player">
            {previewSrc ? (
              <div className="ai-video-results__video-wrap">
                <video
                  ref={videoRef}
                  src={previewSrc}
                  className="ai-video-console__video"
                  controls
                  muted
                  autoPlay
                  playsInline
                  loop
                />
                {overlayItems.length > 0 ? (
                  <div className="ai-video-results__live-overlay">
                    <LiveDetectionOverlay
                      items={overlayItems}
                      legendSign={t('aiCenter.legendSign')}
                      legendVehicle={t('aiCenter.legendVehicle')}
                      legendPlate={t('aiCenter.legendPlate')}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="ai-video-console__player-empty">
                <Film size={32} />
                <p>{L(t, 'aiCenter.video.originalTitle', 'Uploaded video')}</p>
              </div>
            )}
            <div className="ai-video-console__overlays ai-video-console__overlays--processing" aria-live="polite">
              {overlayItems.length > 0 ? (
                <span className="is-pulse">
                  {objectHits} {L(t, 'aiCenter.objects', 'objects')} · {L(t, 'aiCenter.video.livePreview', 'Live preview')}
                </span>
              ) : (
                <>
                  <span className="is-pulse">{L(t, 'aiCenter.video.detectingObjects', 'Detecting objects…')}</span>
                  <span>{L(t, 'aiCenter.video.boxesSoon', 'Boxes appear as frames are scanned')}</span>
                </>
              )}
            </div>
          </div>
        </section>

        <aside className="ai-video-console__side">
          <h3>{L(t, 'aiCenter.video.aiProcessing', 'AI Processing')}</h3>
          <div className="ai-video-console__progress-wrap">
            <div className="ai-video-console__progress-label">
              <span>{L(t, 'aiCenter.video.progress', 'Progress')}</span>
              <strong>{progress}%</strong>
            </div>
            <div className="ai-video-console__progress-bar" role="progressbar" aria-valuenow={progress}>
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>
          <dl className="ai-video-console__kv">
            <div><dt>{L(t, 'aiCenter.video.aiModel', 'Model')}</dt><dd>YOLOv11</dd></div>
            <div><dt>OCR</dt><dd className="is-run">{L(t, 'aiCenter.video.running', 'Running')}</dd></div>
            <div><dt>{L(t, 'aiCenter.video.rules', 'Rules')}</dt><dd className="is-run">{L(t, 'aiCenter.video.running', 'Running')}</dd></div>
            <div><dt>{L(t, 'aiCenter.video.fps', 'FPS')}</dt><dd>{fps || '—'}</dd></div>
            <div><dt>{L(t, 'aiCenter.video.frames', 'Frames')}</dt><dd>{framesDone} / 120</dd></div>
            <div><dt>{L(t, 'aiCenter.video.elapsed', 'Elapsed')}</dt><dd>{formatClock(elapsed)}</dd></div>
            <div><dt>{L(t, 'aiCenter.video.remaining', 'Remaining')}</dt><dd>{formatClock(remaining)}</dd></div>
            <div>
              <dt>{L(t, 'aiCenter.objects', 'Objects')}</dt>
              <dd className={objectHits > 0 ? 'is-done' : 'is-run'}>{objectHits || '—'}</dd>
            </div>
          </dl>
          <div className="ai-video-console__side-actions">
            <button type="button" className="ai-video-btn" onClick={togglePause}>
              {paused ? <Play size={14} /> : <Pause size={14} />}
              {paused ? L(t, 'aiCenter.resumeDetect', 'Resume') : L(t, 'aiCenter.pauseDetect', 'Pause')}
            </button>
            <button type="button" className="ai-video-btn ai-video-btn--danger" onClick={onStop}>
              <Square size={14} />
              {L(t, 'aiCenter.video.stop', 'Stop')}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function EnterpriseVideoDetectionResultsView({
  result,
  previewSrc,
  sourceLabel,
  onNewDetection,
  violationsBasePath = '/admin',
}: EnterpriseVideoDetectionResultsViewProps) {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [search, setSearch] = useState('');
  const [savingViolation, setSavingViolation] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);

  const analysis = result.video_analysis;
  const annotatedUrl = getProfileImageUrl(result.annotated_preview_video) || '';
  const originalUrl = previewSrc || '';
  const bestStillRaw = result.annotated_processed_image || result.processed_image || result.uploaded_image || '';
  const bestStill = getProfileImageUrl(bestStillRaw) || bestStillRaw;
  const playUrl = annotatedUrl || '';
  const frames = analysis?.frame_summaries ?? [];
  const framesAnalyzed = (analysis?.frames_analyzed ?? frames.length) || 1;
  const bestTs = analysis?.best_frame_timestamp_sec ?? 0;
  const pipelineVehicle = resolvePipelineVehicle(result, speechLocale);
  const hasViolation = Boolean(result.violation_evaluation?.is_violation);
  const vehicles = result.vehicles ?? [];
  const vehicleCount = result.vehicle_count ?? vehicles.length;
  const plateText = result.detected_plate || '';
  const avgConf = toPct(result.display_confidence ?? result.confidence);
  const processSec = Number(analysis?.processing_time_sec ?? result.processing_time)
    || Math.max(1, framesAnalyzed * 0.8);
  const uiSettings = (result as CenterDetectionResult & {
    video_ui_settings?: { model?: string; confidence?: number; ocr?: boolean; tracking?: boolean; violation?: boolean };
  }).video_ui_settings;
  const modelLabel = analysis?.settings?.model || uiSettings?.model || 'YOLOv11';
  const ocrDone = analysis?.settings?.enable_ocr ?? uiSettings?.ocr ?? true;
  const ocrAcc = toPct(result.plate_confidence) || (plateText ? avgConf : 0);

  const overlayItems = useMemo(
    () => buildDetectionOverlay(result, speechLocale),
    [result, speechLocale],
  );

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    let frameVehicleTotal = 0;
    for (const f of frames) {
      for (const v of f.vehicles || []) {
        const key = (v.vehicle_type || v.label || 'vehicle').toLowerCase();
        byType[key] = (byType[key] || 0) + 1;
        frameVehicleTotal += 1;
      }
    }
    for (const v of vehicles) {
      const key = (v.vehicle_type || v.label || 'vehicle').toLowerCase();
      byType[key] = (byType[key] || 0) + 1;
    }
    const signs = frames.filter((f) => f.sign_name_en).length || (result.sign_name_en || result.detected_sign ? 1 : 0);
    const plates = frames.filter((f) => f.detected_plate).length || (plateText ? 1 : 0);
    const cars = byType.car || byType.sedan || byType.suv || 0;
    const motorcycles = byType.motorcycle || byType.scooter || 0;
    const trucks = byType.truck || byType.pickup || 0;
    const buses = byType.bus || 0;
    const countedVehicles = frameVehicleTotal || vehicleCount;
    return {
      cars: cars || (countedVehicles && !motorcycles && !trucks ? countedVehicles : cars),
      motorcycles,
      trucks,
      buses,
      signs,
      plates,
      vehicleCount: countedVehicles,
      totalObjects: Math.max(countedVehicles + signs + plates, frames.length || 1),
      violations: hasViolation ? 1 : 0,
    };
  }, [vehicles, frames, vehicleCount, plateText, result, hasViolation]);

  const objectCount = Math.max(overlayItems.length, stats.signs + stats.vehicleCount + stats.plates);

  const timeline = useMemo(() => {
    const rows: Array<{
      ts: number;
      object: string;
      plate: string;
      confidence: number;
      camera: string;
      violation: string;
      status: string;
      kind: TimelineKind;
    }> = [];

    for (const f of frames) {
      const objs = f.objects?.length
        ? f.objects
        : [
            ...(f.sign_name_en ? [{ kind: 'sign', label: f.sign_name_en, confidence: f.confidence }] : []),
            ...((f.vehicles || []).map((v) => ({
              kind: 'vehicle',
              label: v.label || v.vehicle_type || 'Vehicle',
              confidence: v.confidence ?? f.confidence,
            }))),
            ...(f.detected_plate
              ? [{ kind: 'plate', label: f.detected_plate, confidence: f.confidence }]
              : []),
          ];

      if (!objs.length) {
        rows.push({
          ts: f.timestamp_sec,
          object: f.sign_name_en || (f.vehicle_count ? 'Vehicle' : 'Detection'),
          plate: f.detected_plate || '—',
          confidence: toPct(f.confidence),
          camera: 'Upload',
          violation: 'None',
          status: 'Detected',
          kind: f.detected_plate ? 'plate' : f.sign_name_en ? 'sign' : 'vehicle',
        });
        continue;
      }

      for (const obj of objs) {
        const kind = (obj.kind === 'plate' || obj.kind === 'sign' || obj.kind === 'vehicle'
          ? obj.kind
          : 'vehicle') as TimelineKind;
        rows.push({
          ts: f.timestamp_sec,
          object: obj.label || 'Detection',
          plate: kind === 'plate' ? (obj.label || f.detected_plate || '—') : (f.detected_plate || '—'),
          confidence: toPct(obj.confidence ?? f.confidence),
          camera: 'Upload',
          violation: 'None',
          status: 'Detected',
          kind,
        });
      }
    }

    if (!rows.length) {
      rows.push({
        ts: bestTs,
        object: result.display_label_en || result.sign_name_en || pipelineVehicle?.label || 'Detection',
        plate: plateText || '—',
        confidence: avgConf,
        camera: 'Upload',
        violation: hasViolation
          ? (result.violation_evaluation?.title || result.violation_evaluation?.violation_type || 'Violation')
          : 'None',
        status: hasViolation ? 'Violation' : 'Detected',
        kind: hasViolation ? 'violation' : (plateText ? 'plate' : 'sign'),
      });
    } else if (hasViolation) {
      rows.push({
        ts: bestTs,
        object: pipelineVehicle?.label || result.sign_name_en || 'Detection',
        plate: plateText || '—',
        confidence: avgConf,
        camera: 'Upload',
        violation: result.violation_evaluation?.title || result.violation_evaluation?.violation_type || 'Violation',
        status: 'Violation',
        kind: 'violation',
      });
    }

    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (!q) return true;
        return [r.object, r.plate, r.violation, r.status].join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => a.ts - b.ts);
  }, [frames, search, bestTs, result, pipelineVehicle, plateText, avgConf, hasViolation]);

  const plateRows = useMemo(() => {
    const fromFrames = frames
      .filter((f) => f.detected_plate)
      .map((f) => ({
        ts: f.timestamp_sec,
        plate: f.detected_plate!,
        vehicle: pipelineVehicle?.label || 'Vehicle',
        confidence: toPct(f.confidence),
        violation: hasViolation
          ? (result.violation_evaluation?.title || result.violation_evaluation?.violation_type || '—')
          : 'None',
      }));
    if (fromFrames.length) return fromFrames;
    if (plateText) {
      return [{
        ts: bestTs,
        plate: plateText,
        vehicle: pipelineVehicle?.label || 'Vehicle',
        confidence: toPct(result.plate_confidence ?? result.confidence),
        violation: hasViolation
          ? (result.violation_evaluation?.title || result.violation_evaluation?.violation_type || '—')
          : 'None',
      }];
    }
    return [];
  }, [frames, plateText, bestTs, pipelineVehicle, result, hasViolation]);

  const timelinePagination = usePagination(timeline, 10);
  const platesPagination = usePagination(plateRows, 10);

  const seekTo = (sec: number) => {
    const el = videoRef.current;
    if (!el) return;
    try {
      el.currentTime = sec;
      void el.play();
    } catch { /* ignore */ }
  };

  const handleSaveJson = () => {
    downloadDetectionJson(result);
    toast.success(t('aiCenter.saveResultDone'));
  };

  const handleExportPdf = () => {
    printDetectionReport(result, speechLocale, previewSrc || bestStill);
    toast.success(t('aiCenter.exportPdfStarted'));
  };

  const handleExportCsv = () => {
    exportDetectionCsv(result, speechLocale);
    toast.success(t('aiCenter.exportCsvSuccess'));
  };

  const handleExportExcel = () => {
    exportDetectionExcelTsv(result, speechLocale);
    toast.success(t('aiCenter.exportExcelSuccess'));
  };

  const handleDownloadVideo = () => {
    const url = annotatedUrl || originalUrl;
    if (!url) {
      toast.error(t('aiCenter.downloadUnavailable'));
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `detection-video-${Date.now()}.mp4`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
    toast.success(t('aiCenter.downloadStarted'));
  };

  const handleCreateViolation = async () => {
    if (result.violation?.id) {
      navigate(`${violationsBasePath}/violations`);
      return;
    }
    if (!hasViolation) {
      toast.info(t('aiCenter.noViolation'));
      return;
    }
    const classKey = String(result.class_key || result.sign_code || '').trim();
    const observedAction = String(result.violation_evaluation?.observed_action || '').trim();
    if (!classKey || !observedAction) {
      toast.error(t('aiCenter.violationSaveFailed') || 'Unable to save violation');
      return;
    }
    setSavingViolation(true);
    try {
      const violation = await violationsAPI.create({
        class_key: classKey,
        observed_action: observedAction,
        sign_code: result.sign_code || undefined,
        ai_detection_log_id: result.log_id != null ? String(result.log_id) : undefined,
        plate_number: plateText || undefined,
      });
      toast.success(t('aiCenter.violationSaved').replace('{id}', String(violation.id)));
      navigate(`${violationsBasePath}/violations`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/driver is required/i.test(message)) {
        toast.error(
          t('aiCenter.violationNeedsDriver') !== 'aiCenter.violationNeedsDriver'
            ? t('aiCenter.violationNeedsDriver')
            : 'Match a registered plate (or open Unknown Vehicles) before creating a violation',
        );
      } else {
        toast.error(t('aiCenter.violationSaveFailed') || message);
      }
    } finally {
      setSavingViolation(false);
    }
  };

  return (
    <div className="enterprise-ai-results ai-video-results">
      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four enterprise-ai-kpi-grid enterprise-ai-kpi-grid--results">
        {[
          { tone: 'violet', icon: Signpost, value: String(stats.signs), label: t('aiCenter.kpiTrafficSign') },
          { tone: 'cyan', icon: Car, value: String(stats.vehicleCount || stats.cars), label: t('aiCenter.kpiVehicle') },
          { tone: 'amber', icon: Hash, value: String(stats.plates), label: t('aiCenter.kpiPlateOcr') },
          { tone: 'emerald', icon: Target, value: `${avgConf.toFixed(1)}%`, label: t('aiCenter.kpiAccuracy') },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={cn('enforcement-page__stat-card', `enforcement-page__stat-card--${card.tone}`)}>
              <div className={cn('enforcement-page__stat-icon', `enforcement-page__stat-icon--${card.tone}`)}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value enterprise-ai-kpi-value--sm">{card.value}</p>
                <p className={cn('enforcement-page__stat-label', `enforcement-page__stat-label--${card.tone}`)}>
                  {card.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <header className="enterprise-ai-results__toolbar">
        <span className="enterprise-ai-chart-dot enterprise-ai-chart-dot--video" aria-hidden />
        <div className="enterprise-ai-workspace__head-copy">
          <p className="enterprise-ai-results__eyebrow">{L(t, 'aiCenter.video.breadcrumb', 'AI Detection › Upload Video')}</p>
          <h2 className="enterprise-ai-results__title">{t('aiCenter.resultsTitle')}</h2>
        </div>
        <div className="enterprise-ai-workspace__head-icon enterprise-ai-workspace__head-icon--video">
          <Film size={16} />
        </div>
        <div className="enterprise-ai-results__toolbar-actions">
          <button type="button" className="enterprise-ai-results__toolbar-btn enterprise-ai-results__toolbar-btn--primary" onClick={onNewDetection}>
            <Plus size={15} />
            {t('aiCenter.newDetection')}
          </button>
          <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={handleSaveJson}>
            <Save size={15} />
            {t('aiCenter.saveResult')}
          </button>
          <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={handleDownloadVideo}>
            <Download size={15} />
            {L(t, 'aiCenter.video.downloadVideo', 'Download Video')}
          </button>
          <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={handleExportPdf}>
            <Printer size={15} />
            {t('aiCenter.exportPdf')}
          </button>
          <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={handleExportExcel}>
            <FileSpreadsheet size={15} />
            {t('aiCenter.exportExcel')}
          </button>
          <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={handleExportCsv}>
            <FileText size={15} />
            {t('aiCenter.exportCsv')}
          </button>
        </div>
      </header>

      <div className="ai-video-results__stage">
        <section className="ai-video-results__media-card">
          <header className="ai-video-results__section-head ai-video-results__section-head--rose">
            <span className="enterprise-ai-chart-dot enterprise-ai-chart-dot--video" aria-hidden />
            <h3>{L(t, 'aiCenter.video.resultTitle', 'AI Detection Result')}</h3>
            <div className="enterprise-ai-workspace__head-icon enterprise-ai-workspace__head-icon--video">
              <Film size={16} />
            </div>
            <span className="ai-video-results__badge is-ok">
              {objectCount > 0
                ? `${objectCount} ${L(t, 'aiCenter.objects', 'objects')}`
                : L(t, 'aiCenter.video.statusCompleted', 'Completed')}
            </span>
          </header>
          <div className="ai-video-console__player ai-video-results__player">
            {bestStill ? (
              <div className="ai-video-results__still-wrap">
                <AnnotatedDetectionImage
                  src={bestStill}
                  alt={L(t, 'aiCenter.video.detectionPreview', 'Detection Preview')}
                  result={result}
                  hero
                  className="ai-video-results__annotated-still"
                />
              </div>
            ) : playUrl && !mediaFailed ? (
              <div className="ai-video-results__video-wrap">
                <video
                  ref={videoRef}
                  src={playUrl}
                  className="ai-video-console__video"
                  controls
                  playsInline
                  onError={() => setMediaFailed(true)}
                />
                {overlayItems.length > 0 ? (
                  <div className="ai-video-results__live-overlay">
                    <LiveDetectionOverlay
                      items={overlayItems}
                      legendSign={t('aiCenter.legendSign')}
                      legendVehicle={t('aiCenter.legendVehicle')}
                      legendPlate={t('aiCenter.legendPlate')}
                    />
                  </div>
                ) : null}
              </div>
            ) : originalUrl ? (
              <video
                ref={videoRef}
                src={originalUrl}
                className="ai-video-console__video"
                controls
                playsInline
              />
            ) : (
              <div className="ai-video-console__player-empty">
                <Film size={32} />
                <p>{t('aiCenter.noImage')}</p>
              </div>
            )}
            {playUrl && bestStill ? (
              <div className="ai-video-results__annotated-video">
                <p className="ai-video-results__annotated-video-label">
                  {L(t, 'aiCenter.video.annotatedClip', 'Annotated clip')}
                </p>
                <video
                  src={playUrl}
                  className="ai-video-console__video ai-video-console__video--secondary"
                  controls
                  playsInline
                  poster={bestStill}
                  onError={() => setMediaFailed(true)}
                />
              </div>
            ) : null}
          </div>
        </section>

        <aside className="ai-video-results__side-card">
          <header className="ai-video-results__section-head ai-video-results__section-head--violet">
            <span className="enterprise-ai-chart-dot" aria-hidden />
            <h3>{L(t, 'aiCenter.video.aiProcessing', 'AI Processing')}</h3>
            <div className="enterprise-ai-workspace__head-icon enterprise-ai-workspace__head-icon--image">
              <Cpu size={16} />
            </div>
          </header>
          <div className="ai-video-results__side-body">
            <div className="ai-video-console__progress-wrap">
              <div className="ai-video-console__progress-label">
                <span>{L(t, 'aiCenter.video.progress', 'Progress')}</span>
                <strong>100%</strong>
              </div>
              <div className="ai-video-console__progress-bar is-done">
                <div style={{ width: '100%' }} />
              </div>
            </div>
            <dl className="ai-video-console__kv">
              <div><dt>{L(t, 'aiCenter.video.aiModel', 'Model')}</dt><dd>{modelLabel}</dd></div>
              <div>
                <dt>OCR</dt>
                <dd className={ocrDone ? 'is-done' : 'is-skip'}>
                  {ocrDone
                    ? L(t, 'aiCenter.video.statusCompleted', 'Completed')
                    : L(t, 'aiCenter.video.statusSkipped', 'Skipped')}
                </dd>
              </div>
              <div><dt>{L(t, 'aiCenter.video.rules', 'Rules')}</dt><dd className="is-done">{L(t, 'aiCenter.video.statusCompleted', 'Completed')}</dd></div>
              <div><dt>{L(t, 'aiCenter.video.fps', 'FPS')}</dt><dd>~{Math.max(1, Math.round(framesAnalyzed / Math.max(processSec, 0.1)))}</dd></div>
              <div><dt>{L(t, 'aiCenter.video.frames', 'Frames')}</dt><dd>{framesAnalyzed}</dd></div>
              <div><dt>{L(t, 'aiCenter.video.elapsed', 'Elapsed')}</dt><dd>{formatClock(processSec)}</dd></div>
              <div><dt>{L(t, 'aiCenter.video.bestFrame', 'Best frame')}</dt><dd>{formatTs(bestTs)}</dd></div>
            </dl>
            <button
              type="button"
              className="enterprise-ai-btn enterprise-ai-btn--danger"
              disabled={savingViolation || (!hasViolation && !result.violation)}
              onClick={() => void handleCreateViolation()}
            >
              <Shield size={14} />
              {savingViolation ? t('common.saving') : t('aiCenter.createViolation')}
            </button>
          </div>
        </aside>
      </div>

      <section className="ai-video-results__table-card enforcement-page__panel">
        <header className="ai-video-results__section-head ai-video-results__section-head--cyan">
          <span className="enterprise-ai-chart-dot enterprise-ai-chart-dot--camera" aria-hidden />
          <h3>{L(t, 'aiCenter.video.timelineTitle', 'Live Detection Timeline')}</h3>
          <div className="enterprise-ai-workspace__head-icon enterprise-ai-workspace__head-icon--camera">
            <Activity size={16} />
          </div>
          <label className="ai-video-panel__search">
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={L(t, 'aiCenter.historySearch', 'Search…')}
            />
          </label>
        </header>
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid enforcement-page__table--ai-video">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                <TableHead className="enforcement-page__th text-left">{L(t, 'aiCenter.video.colTime', 'Time')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{L(t, 'aiCenter.colObject', 'Object')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{L(t, 'aiCenter.plateNumber', 'Plate')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{L(t, 'aiCenter.colConfidence', 'Confidence')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{L(t, 'aiCenter.colCamera', 'Camera')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{L(t, 'aiCenter.summaryViolations', 'Violation')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{L(t, 'aiCenter.colStatus', 'Status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeline.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  tone="violet"
                  icon={<Activity size={28} />}
                  title={t('aiCenter.noObjectsDetected')}
                />
              ) : timelinePagination.pageItems.map((row, i) => {
                const confColor =
                  row.confidence >= 80 ? '#10B981' : row.confidence >= 50 ? '#F59E0B' : '#EF4444';
                return (
                  <TableRow
                    key={`${row.ts}-${i}-${row.object}`}
                    className={cn('enforcement-page__table-row', row.status === 'Violation' && 'ai-video-table__row--violation')}
                  >
                    <TableCell className="py-3.5">
                      <button type="button" className="ai-video-jump" onClick={() => seekTo(row.ts)}>
                        {formatTs(row.ts)}
                      </button>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="enforcement-page__cell-primary">{row.object}</span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="enforcement-page__cell-mono">{row.plate}</span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span
                        className="enforcement-page__badge"
                        style={{ background: `${confColor}18`, color: confColor }}
                      >
                        {row.confidence.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="enforcement-page__cell-secondary">{row.camera}</span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="enforcement-page__cell-body">{row.violation}</span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span
                        className="enforcement-page__badge"
                        style={{
                          background: row.status === 'Violation' ? '#EF444418' : '#10B98118',
                          color: row.status === 'Violation' ? '#EF4444' : '#10B981',
                        }}
                      >
                        {row.status}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {timeline.length > 0 ? (
          <TablePagination
            pagination={timelinePagination}
            labelKey="pagination.label.records"
          />
        ) : null}
      </section>

      <div className="ai-video-kpi-grid">
        <section className="ai-video-kpi ai-video-kpi--violet">
          <h4>{L(t, 'aiCenter.video.detectionSummary', 'Detection Summary')}</h4>
          <ul>
            <li><span>{L(t, 'aiCenter.video.totalObjects', 'Total Objects')}</span><strong>{stats.totalObjects}</strong></li>
            <li><span>{L(t, 'aiCenter.video.statPlates', 'Plates')}</span><strong>{stats.plates}</strong></li>
            <li><span>{L(t, 'aiCenter.video.statSigns', 'Signs')}</span><strong>{stats.signs}</strong></li>
            <li><span>{L(t, 'aiCenter.summaryViolations', 'Violations')}</span><strong>{stats.violations}</strong></li>
          </ul>
        </section>
        <section className="ai-video-kpi ai-video-kpi--cyan">
          <h4>{L(t, 'aiCenter.video.objectStats', 'Object Statistics')}</h4>
          <ul>
            <li><span>{L(t, 'aiCenter.video.statCars', 'Cars')}</span><strong>{stats.cars}</strong></li>
            <li><span>{L(t, 'aiCenter.video.statMotorcycles', 'Motorcycles')}</span><strong>{stats.motorcycles}</strong></li>
            <li><span>{L(t, 'aiCenter.video.statTrucks', 'Trucks')}</span><strong>{stats.trucks}</strong></li>
            <li><span>{L(t, 'aiCenter.video.statBuses', 'Buses')}</span><strong>{stats.buses}</strong></li>
          </ul>
        </section>
        <section className="ai-video-kpi ai-video-kpi--amber">
          <h4>{L(t, 'aiCenter.video.aiPerformance', 'AI Performance')}</h4>
          <ul>
            <li><span>{L(t, 'aiCenter.kpiAccuracy', 'Avg Confidence')}</span><strong>{avgConf.toFixed(1)}%</strong></li>
            <li><span>{L(t, 'aiCenter.video.processingTime', 'Processing Time')}</span><strong>{formatClock(processSec)}</strong></li>
            <li><span>{L(t, 'aiCenter.video.avgFps', 'Average FPS')}</span><strong>{Math.max(1, Math.round(framesAnalyzed / Math.max(processSec, 0.1)))}</strong></li>
            <li><span>{L(t, 'aiCenter.video.ocrAccuracy', 'OCR Accuracy')}</span><strong>{ocrAcc ? `${ocrAcc.toFixed(1)}%` : '—'}</strong></li>
          </ul>
        </section>
        <section className={cn('ai-video-kpi ai-video-kpi--rose', hasViolation && 'is-violation')}>
          <h4>{L(t, 'aiCenter.video.violationSummary', 'Violations')}</h4>
          {hasViolation ? (
            <ul>
              <li>
                <span>{result.violation_evaluation?.title || result.violation_evaluation?.violation_type || 'Violation'}</span>
                <strong>1</strong>
              </li>
              {result.violation_evaluation?.observed_action ? (
                <li><span>{String(result.violation_evaluation.observed_action)}</span><strong>✓</strong></li>
              ) : null}
            </ul>
          ) : (
            <p className="ai-video-kpi__empty">{t('aiCenter.noViolation')}</p>
          )}
        </section>
      </div>

      <section className="ai-video-results__table-card enforcement-page__panel">
        <header className="ai-video-results__section-head ai-video-results__section-head--amber">
          <span className="enterprise-ai-chart-dot" aria-hidden />
          <h3>{L(t, 'aiCenter.video.platesTitle', 'Detected License Plates')}</h3>
          <div className="enterprise-ai-workspace__head-icon">
            <Hash size={16} />
          </div>
        </header>
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid enforcement-page__table--ai-video">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                <TableHead className="enforcement-page__th text-left">{L(t, 'aiCenter.video.colTime', 'Time')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{L(t, 'aiCenter.plateNumber', 'Plate')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{L(t, 'aiCenter.vehicleType', 'Vehicle')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{L(t, 'aiCenter.colConfidence', 'Confidence')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{L(t, 'aiCenter.summaryViolations', 'Violation')}</TableHead>
                <TableHead className="enforcement-page__th text-right">{L(t, 'aiCenter.colActions', 'Action')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plateRows.length === 0 ? (
                <TableEmptyState
                  colSpan={6}
                  tone="amber"
                  icon={<Hash size={28} />}
                  title={t('aiCenter.noPlate')}
                />
              ) : platesPagination.pageItems.map((row, i) => {
                const confColor = row.confidence >= 80 ? '#10B981' : '#F59E0B';
                return (
                  <TableRow key={`${row.plate}-${i}`} className="enforcement-page__table-row">
                    <TableCell className="py-3.5">
                      <button type="button" className="ai-video-jump" onClick={() => seekTo(row.ts)}>
                        {formatTs(row.ts)}
                      </button>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="enforcement-page__code-pill">{row.plate}</span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="enforcement-page__cell-primary">{row.vehicle}</span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span
                        className="enforcement-page__badge"
                        style={{ background: `${confColor}18`, color: confColor }}
                      >
                        {row.confidence.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="enforcement-page__cell-body">{row.violation}</span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="enforcement-page__table-actions justify-end">
                        <button
                          type="button"
                          className="ai-center-history-table__action-btn ai-center-history-table__action-btn--view"
                          onClick={() => seekTo(row.ts)}
                          title={t('aiLogs.view')}
                          aria-label={t('aiLogs.view')}
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {plateRows.length > 0 ? (
          <TablePagination
            pagination={platesPagination}
            labelKey="pagination.label.records"
          />
        ) : null}
      </section>
    </div>
  );
}
