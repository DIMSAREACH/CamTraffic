import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Film, Hash, Printer, Save, FileSpreadsheet, FileText,
  Download, Shield, Search, Eye, Square, Play, Pause, Plus, Cpu, Activity,
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
import { useContainFitRect } from '@shared/hooks/useContainFitRect';
import { violationsAPI } from '@shared/services/api';
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
  const s = Math.max(0, Number(sec) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const whole = Math.floor(s % 60);
  const tenths = Math.round((s - Math.floor(s)) * 10) % 10;
  const base = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(whole).padStart(2, '0')}`;
  // Sub-second so sampled frames at 1.0s / 1.4s / 1.8s are distinct jump links.
  return tenths > 0 ? `${base}.${tenths}` : base;
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

/** Live processing: play uploaded video while the server analyzes sampled frames. */
export function EnterpriseVideoProcessingPanel({
  previewSrc,
  onStop,
}: EnterpriseVideoProcessingPanelProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const started = useRef(performance.now());

  useEffect(() => {
    if (paused) return undefined;
    started.current = performance.now() - elapsed * 1000;
    let frame = 0;
    const tick = (now: number) => {
      setElapsed((now - started.current) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      const el = videoRef.current;
      if (el) {
        if (next) el.pause();
        else void el.play();
      }
      return next;
    });
  };

  return (
    <div className="ai-video-console ai-video-console--processing ai-video-console--clean">
      <header className="ai-video-console__topbar">
        <div className="ai-video-console__crumb">
          <Film size={14} />
          <span>{L(t, 'aiCenter.video.breadcrumb', 'AI Detection · Video')}</span>
        </div>
        <div className="ai-video-console__status is-processing">
          <span className="ai-video-console__status-dot" aria-hidden />
          {L(t, 'aiCenter.video.statusProcessing', 'Analyzing frames')}
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
              </div>
            ) : (
              <div className="ai-video-console__player-empty">
                <Film size={32} />
                <p>{L(t, 'aiCenter.video.originalTitle', 'Uploaded video')}</p>
              </div>
            )}
            <div className="ai-video-console__overlays ai-video-console__overlays--processing" aria-live="polite">
              <span className="is-pulse">
                {L(t, 'aiCenter.video.detectingObjects', 'Detecting signs, vehicles & plates…')}
              </span>
            </div>
          </div>
        </section>

        <aside className="ai-video-console__side">
          <h3>{L(t, 'aiCenter.video.aiProcessing', 'AI Processing')}</h3>
          <div className="ai-video-console__progress-wrap">
            <div className="ai-video-console__progress-label">
              <span>{L(t, 'aiCenter.video.progress', 'Progress')}</span>
              <strong>{L(t, 'aiCenter.video.running', 'Running')}</strong>
            </div>
            <div className="ai-video-console__progress-bar ai-video-console__progress-bar--indeterminate" role="progressbar" aria-valuetext="running">
              <div />
            </div>
          </div>
          <dl className="ai-video-console__kv">
            <div><dt>{L(t, 'aiCenter.video.aiModel', 'Model')}</dt><dd>YOLOv11</dd></div>
            <div><dt>OCR</dt><dd className="is-run">{L(t, 'aiCenter.video.onBestFrame', 'Best frame')}</dd></div>
            <div><dt>{L(t, 'aiCenter.video.pipeline', 'Pipeline')}</dt><dd className="is-run">{L(t, 'aiCenter.video.sampling', 'Sampling')}</dd></div>
            <div><dt>{L(t, 'aiCenter.video.elapsed', 'Elapsed')}</dt><dd>{formatClock(elapsed)}</dd></div>
          </dl>
          <p className="ai-video-console__hint">
            {L(
              t,
              'aiCenter.video.processingHint',
              'Server is sampling frames for signs, vehicles, plates, and OCR. Results appear when analysis finishes.',
            )}
          </p>
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
  const [currentTime, setCurrentTime] = useState(0);

  const annotatedUrl = getProfileImageUrl(result.annotated_preview_video) || '';
  const originalUrl = previewSrc || '';
  // Prefer clean frame + CSS overlays (aligned). Avoid double-drawing baked OpenCV boxes.
  const cleanStillRaw = result.uploaded_image || result.guide_frame_image || '';
  const annotatedStillRaw = result.annotated_processed_image || result.processed_image || '';
  const bestStillRaw = cleanStillRaw || annotatedStillRaw;
  const bestStill = getProfileImageUrl(bestStillRaw) || bestStillRaw;
  const useCssOverlay = Boolean(cleanStillRaw) || !annotatedStillRaw;
  // Verified riverside GT: play baked annotated preview (correct boxes). Otherwise original + CSS.
  const srcName = (result.video_analysis?.source_filename || '').toLowerCase();
  const riversideHint = srcName.includes('riverside')
    || srcName.includes('vehicles-and-motorbikes')
    || srcName.includes('pp-riverside');
  const isVideoGt = Boolean(
    (result as CenterDetectionResult & { video_gt?: boolean; manual_gt?: boolean }).video_gt
    || (result as CenterDetectionResult & { manual_gt?: boolean }).manual_gt
    || (annotatedUrl && riversideHint),
  );
  const preferredUrl = (isVideoGt && annotatedUrl) ? annotatedUrl : (originalUrl || annotatedUrl);
  const [playSrc, setPlaySrc] = useState(preferredUrl);
  const [triedVideoFallback, setTriedVideoFallback] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    setPlaySrc(preferredUrl || '');
    setTriedVideoFallback(false);
    setMediaFailed(false);
  }, [preferredUrl]);

  const playingAnnotated = Boolean(
    isVideoGt && annotatedUrl && playSrc && playSrc === annotatedUrl,
  );
  const fullVideoUrl = (!mediaFailed && playSrc) ? playSrc : '';
  const playUrl = annotatedUrl || '';
  const analysis = result.video_analysis;
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

  const activeFrame = useMemo(() => {
    if (!frames.length) return null;
    let best = frames[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const f of frames) {
      const d = Math.abs(Number(f.timestamp_sec ?? 0) - currentTime);
      if (d < bestDist) {
        bestDist = d;
        best = f;
      }
    }
    // Hide stale boxes when playback is far from any sampled detection.
    const span = frames.length >= 2
      ? Math.abs(Number(frames[frames.length - 1].timestamp_sec) - Number(frames[0].timestamp_sec)) / (frames.length - 1)
      : 1.2;
    const hold = Math.max(0.85, span * 0.6);
    if (bestDist > hold) return null;
    return best;
  }, [frames, currentTime]);

  const overlayItems = useMemo(() => {
    // Baked GT annotated video already has correct boxes — skip CSS overlay (avoids expand drift).
    if (playingAnnotated) return [];
    if (activeFrame) {
      const helmets = (activeFrame.objects ?? [])
        .filter((o) => o.kind === 'violation' || o.kind === 'helmet')
        .map((o) => ({
          label: o.label,
          confidence: o.confidence,
          bbox: o.bbox,
          is_violation: o.kind === 'violation',
        }));
      const signDetections = (activeFrame.objects ?? [])
        .filter((o) => o.kind === 'sign' && o.bbox)
        .map((o) => ({
          label: o.label,
          confidence: o.confidence,
          sign_bbox: o.bbox,
          class_key: o.label,
        }));
      const frameManualGt = Boolean(
        (activeFrame as { manual_gt?: boolean }).manual_gt || isVideoGt,
      );
      return buildDetectionOverlay({
        sign_name_en: activeFrame.sign_name_en,
        sign_bbox: activeFrame.sign_bbox,
        sign_detections: signDetections.length ? signDetections : undefined,
        confidence: activeFrame.confidence,
        vehicles: activeFrame.vehicles,
        detected_plate: activeFrame.detected_plate || plateText,
        plate_bbox: activeFrame.plate_bbox,
        plate_boxes: activeFrame.plate_boxes,
        helmets,
        manual_gt: frameManualGt,
      }, speechLocale);
    }
    // When paused near best frame with no nearby sample, fall back to full result.
    if (!frames.length && useCssOverlay) {
      return buildDetectionOverlay(result, speechLocale);
    }
    return [];
  }, [activeFrame, plateText, result, speechLocale, useCssOverlay, frames.length, playingAnnotated, isVideoGt]);
  const resultVideoFit = useContainFitRect(videoRef, true);

  const stats = useMemo(() => {
    // Prefer unique counts from the best/result frame — do not sum the same car across samples.
    const byType: Record<string, number> = {};
    for (const v of vehicles) {
      const key = (v.vehicle_type || v.label || 'vehicle').toLowerCase();
      byType[key] = (byType[key] || 0) + 1;
    }
    if (!vehicles.length) {
      const richest = frames.reduce<(typeof frames)[number] | null>((best, f) => {
        const n = f.vehicles?.length ?? f.vehicle_count ?? 0;
        const bn = best ? (best.vehicles?.length ?? best.vehicle_count ?? 0) : -1;
        return n > bn ? f : best;
      }, null);
      for (const v of richest?.vehicles || []) {
        const key = (v.vehicle_type || v.label || 'vehicle').toLowerCase();
        byType[key] = (byType[key] || 0) + 1;
      }
    }
    const signs = result.sign_name_en || result.detected_sign
      ? 1
      : (frames.some((f) => f.sign_name_en) ? 1 : 0);
    const plates = plateText ? 1 : (frames.some((f) => f.detected_plate) ? 1 : 0);
    const cars = byType.car || byType.sedan || byType.suv || 0;
    const motorcycles = byType.motorcycle || byType.scooter || 0;
    const trucks = byType.truck || byType.pickup || 0;
    const buses = byType.bus || 0;
    const bestFrameVehicles = Math.max(
      vehicleCount,
      vehicles.length,
      ...(frames.map((f) => (f.vehicles?.length ?? f.vehicle_count ?? 0))),
      0,
    );
    const helmetSummary = analysis?.helmet_summary;
    const noHelmet = helmetSummary?.no_helmet_detections
      ?? Math.max(0, ...frames.map((f) => f.no_helmet_count || 0));
    return {
      cars: cars || (bestFrameVehicles && !motorcycles && !trucks ? bestFrameVehicles : cars),
      motorcycles,
      trucks,
      buses,
      signs,
      plates,
      noHelmet,
      vehicleCount: bestFrameVehicles,
      bestFrameVehicles,
      totalObjects: Math.max(bestFrameVehicles + signs + plates, 1),
      violations: (hasViolation ? 1 : 0) + (noHelmet > 0 ? 1 : 0),
    };
  }, [vehicles, frames, vehicleCount, plateText, result, hasViolation, analysis]);

  // Badge = boxes on the current frame, never the sum of every sampled frame.
  const objectCount = overlayItems.length || stats.bestFrameVehicles;

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
        const isViolation = obj.kind === 'violation' || Boolean((obj as { is_violation?: boolean }).is_violation);
        const violationType = String(
          (obj as { violation_type?: string }).violation_type
          || (isViolation ? (obj.label || 'Violation') : ''),
        ).trim();
        const kind = (obj.kind === 'plate' || obj.kind === 'sign' || obj.kind === 'vehicle' || obj.kind === 'violation'
          ? obj.kind
          : isViolation
            ? 'violation'
            : 'vehicle') as TimelineKind;
        const tid = (obj as { track_id?: number }).track_id;
        const baseLabel = obj.label || (isViolation ? (violationType || 'Violation') : 'Detection');
        const objectLabel = tid != null && !String(baseLabel).includes('#')
          ? `${baseLabel} #${tid}`
          : baseLabel;
        let violationLabel = 'None';
        if (isViolation) {
          const vt = violationType.toUpperCase().replace(/\s+/g, '_');
          if (vt.includes('HELMET') || /no\s*helmet/i.test(baseLabel)) violationLabel = 'No Helmet';
          else if (vt.includes('NO_PARKING') || /no\s*parking/i.test(baseLabel)) violationLabel = 'No Parking';
          else violationLabel = violationType || baseLabel || 'Violation';
        }
        rows.push({
          ts: f.timestamp_sec,
          object: objectLabel,
          plate: kind === 'plate' ? (obj.label || f.detected_plate || '—') : (f.detected_plate || '—'),
          confidence: toPct(obj.confidence ?? f.confidence),
          camera: 'Upload',
          violation: violationLabel,
          status: isViolation ? 'Violation' : 'Detected',
          kind: isViolation ? 'violation' : kind,
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
    const sourceTs = Math.max(0, Number(sec) || 0);
    setCurrentTime(sourceTs);

    // Annotated stitch is sampled at ~2 fps — map source timestamp → preview time.
    let target = sourceTs;
    if (playingAnnotated && frames.length) {
      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      frames.forEach((f, i) => {
        const d = Math.abs(Number(f.timestamp_sec ?? 0) - sourceTs);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      target = bestIdx / 2;
    }

    if (!el) {
      // Still-image fallback: sync timeline overlays and scroll preview into view (no error toast).
      try {
        document.querySelector('.ai-video-results__player')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } catch { /* ignore */ }
      return;
    }
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const apply = () => {
        try {
          const dur = Number(el.duration);
          const clamped = Number.isFinite(dur) && dur > 0
            ? Math.min(target, Math.max(0, dur - 0.05))
            : target;
          el.currentTime = clamped;
          void el.play();
        } catch { /* ignore */ }
      };
      if (el.readyState >= 1) apply();
      else el.addEventListener('loadedmetadata', apply, { once: true });
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
    const url = originalUrl || annotatedUrl;
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

    // Validate required fields before sending
    if (classKey.trim().length === 0 || observedAction.trim().length === 0) {
      toast.error('Cannot create violation with empty class key or observed action');
      return;
    }

    setSavingViolation(true);
    try {
      const violation = await violationsAPI.create({
        class_key: classKey.trim(),
        observed_action: observedAction.trim(),
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
    <div className="enterprise-ai-results enterprise-ai-results--clean ai-video-results">
      <header className="enterprise-ai-results__toolbar enterprise-ai-results__toolbar--clean">
        <div className="enterprise-ai-results__toolbar-lead">
          <p className="enterprise-ai-results__eyebrow">{L(t, 'aiCenter.video.breadcrumb', 'AI Detection › Upload Video')}</p>
          <div className="enterprise-ai-results__title-row">
            <h2 className="enterprise-ai-results__title">{t('aiCenter.resultsTitle')}</h2>
            <span className={cn(
              'enterprise-ai-results__status-pill',
              hasViolation ? 'is-violation' : 'is-ok',
            )}>
              {hasViolation
                ? (result.violation_evaluation?.title || t('aiCenter.violationDetected'))
                : L(t, 'aiCenter.video.statusCompleted', 'Completed')}
            </span>
          </div>
          <p className="enterprise-ai-results__subtitle">
            {stats.signs} {t('aiCenter.summarySigns').toLowerCase()}
            {' · '}
            {stats.vehicleCount || stats.cars} {t('aiCenter.summaryVehicles').toLowerCase()}
            {' · '}
            {stats.plates} {L(t, 'aiCenter.summaryPlates', 'plates').toLowerCase()}
            {' · '}
            {avgConf.toFixed(0)}% {t('aiCenter.aiConfidence').toLowerCase()}
          </p>
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
        </div>
      </header>

      <div className="ai-video-results__stage">
        <section className="ai-video-results__media-card">
          <header className="ai-video-results__section-head">
            <h3>{L(t, 'aiCenter.video.resultTitle', 'AI Detection Result')}</h3>
            <div className="enterprise-ai-workspace__head-icon">
              <Film size={16} />
            </div>
            <span className="enterprise-ai-results__section-badge">
              {objectCount > 0
                ? `${objectCount} ${L(t, 'aiCenter.objects', 'objects')}`
                : L(t, 'aiCenter.video.statusCompleted', 'Completed')}
            </span>
          </header>
          <div className="ai-video-console__player ai-video-results__player">
            {fullVideoUrl && !mediaFailed ? (
              <div className="ai-video-results__video-wrap">
                <video
                  ref={videoRef}
                  src={fullVideoUrl}
                  className="ai-video-console__video"
                  controls
                  playsInline
                  autoPlay
                  muted
                  onTimeUpdate={(e) => {
                    const tSec = e.currentTarget.currentTime;
                    if (playingAnnotated && frames.length) {
                      // Map stitch time → nearest source timestamp for timeline sync.
                      const idx = Math.min(
                        frames.length - 1,
                        Math.max(0, Math.round(tSec * 2)),
                      );
                      setCurrentTime(Number(frames[idx]?.timestamp_sec ?? tSec));
                    } else {
                      setCurrentTime(tSec);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (bestTs > 0 && videoRef.current) {
                      try {
                        if (playingAnnotated && frames.length) {
                          let bestIdx = 0;
                          let bestDist = Number.POSITIVE_INFINITY;
                          frames.forEach((f, i) => {
                            const d = Math.abs(Number(f.timestamp_sec ?? 0) - bestTs);
                            if (d < bestDist) {
                              bestDist = d;
                              bestIdx = i;
                            }
                          });
                          videoRef.current.currentTime = bestIdx / 2;
                        } else {
                          videoRef.current.currentTime = bestTs;
                        }
                      } catch { /* ignore */ }
                    }
                  }}
                  onError={() => {
                    const alt = playSrc === annotatedUrl
                      ? originalUrl
                      : (playSrc === originalUrl ? annotatedUrl : '');
                    if (alt && alt !== playSrc && !triedVideoFallback) {
                      setTriedVideoFallback(true);
                      setPlaySrc(alt);
                      setMediaFailed(false);
                      return;
                    }
                    setMediaFailed(true);
                  }}
                />
                {overlayItems.length > 0 && resultVideoFit && resultVideoFit.width > 0 ? (
                  <div
                    className="ai-video-results__live-overlay"
                    style={{
                      left: resultVideoFit.left,
                      top: resultVideoFit.top,
                      width: resultVideoFit.width,
                      height: resultVideoFit.height,
                    }}
                  >
                    <LiveDetectionOverlay
                      items={overlayItems}
                      legendSign={t('aiCenter.legendSign')}
                      legendVehicle={t('aiCenter.legendVehicle')}
                      legendPlate={t('aiCenter.legendPlate')}
                      legendHelmet={t('aiCenter.legendHelmet')}
                      legendNoHelmet={t('aiCenter.legendNoHelmet')}
                    />
                  </div>
                ) : null}
              </div>
            ) : bestStill ? (
              <div className="ai-video-results__still-wrap">
                <AnnotatedDetectionImage
                  src={bestStill}
                  alt={L(t, 'aiCenter.video.detectionPreview', 'Detection Preview')}
                  result={result}
                  showOverlay={useCssOverlay}
                  hero
                  className="ai-video-results__annotated-still"
                />
              </div>
            ) : (
              <div className="ai-video-console__player-empty">
                <Film size={32} />
                <p>{t('aiCenter.noImage')}</p>
              </div>
            )}
          </div>
        </section>

        <aside className="ai-video-results__side-card">
          <header className="ai-video-results__section-head">
            <h3>{L(t, 'aiCenter.video.aiProcessing', 'AI Processing')}</h3>
            <div className="enterprise-ai-workspace__head-icon">
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
        <header className="ai-video-results__section-head">
          <h3>{L(t, 'aiCenter.video.timelineTitle', 'Live Detection Timeline')}</h3>
          <div className="enterprise-ai-workspace__head-icon">
            <Activity size={16} />
          </div>
          <div className="enterprise-ai-results__export-mini">
            <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={handleExportCsv}>
              <FileText size={14} />
              {t('aiCenter.exportCsv')}
            </button>
            <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              {t('aiCenter.exportExcel')}
            </button>
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
                <TableHead className="enforcement-page__th text-left" title={L(t, 'aiCenter.video.jumpHint', 'Click a time to jump in the video')}>
                  {L(t, 'aiCenter.video.colTime', 'Time')}
                </TableHead>
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
                const isActive = Math.abs(row.ts - currentTime) < 0.35;
                return (
                  <TableRow
                    key={`${row.ts}-${i}-${row.object}-${row.kind}`}
                    className={cn(
                      'enforcement-page__table-row ai-video-table__row--link',
                      row.status === 'Violation' && 'ai-video-table__row--violation',
                      isActive && 'ai-video-table__row--active',
                    )}
                    onClick={() => seekTo(row.ts)}
                    title={L(t, 'aiCenter.video.jumpToMoment', 'Jump to this moment in the video')}
                  >
                    <TableCell className="py-3.5">
                      <button
                        type="button"
                        className="ai-video-jump"
                        onClick={(e) => {
                          e.stopPropagation();
                          seekTo(row.ts);
                        }}
                      >
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
            <li><span>{L(t, 'aiCenter.video.statNoHelmet', 'No Helmet')}</span><strong>{stats.noHelmet}</strong></li>
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
        <header className="ai-video-results__section-head">
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
