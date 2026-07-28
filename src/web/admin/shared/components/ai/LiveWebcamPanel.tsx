import { useEffect, useMemo, useRef } from 'react';
import { Camera, Pause, Play, Scan, VideoOff, AlertTriangle, Download } from 'lucide-react';
import { LiveWebcamPipelineStrip } from '@shared/components/ai/LiveWebcamPipelineStrip';
import { LiveDetectionOverlay } from '@shared/components/ai/LiveDetectionOverlay';
import { SignNameLabels } from '@shared/components/signs/SignNameLabels';
import { useLanguage } from '@shared/context/LanguageContext';
import type { DetectPipelineOptions } from '@shared/constants/observedActions';
import {
  useWebcamDetection,
  isManualScanResult,
  hasStreetDetections,
  LIVE_VOTE_WINDOW,
  type WebcamDetectionResult,
} from '@shared/hooks/useWebcamDetection';
import { useWebcamSignRegionGuide } from '@shared/hooks/useWebcamSignRegionGuide';
import { useContainFitRect } from '@shared/hooks/useContainFitRect';
import { useVideoStreamStats } from '@shared/hooks/useVideoStreamStats';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import { cn } from '@shared/components/ui/utils';
import { buildDetectionOverlay } from '@shared/utils/detectionOverlay';
import { drawAnnotatedDetectionFrame } from '@shared/utils/webcamFrame';
import { aiAPI } from '@shared/services/api';
import { toast } from 'sonner';

interface LiveWebcamPanelProps {
  onResult?: (result: WebcamDetectionResult, opts?: { quiet?: boolean }) => void;
  disabled?: boolean;
  pipelineOptions?: DetectPipelineOptions;
}

export function LiveWebcamPanel({ onResult, disabled = false, pipelineOptions }: LiveWebcamPanelProps) {
  const { t, locale } = useLanguage();
  const lastPreviewKeyRef = useRef('');
  const stageRef = useRef<HTMLDivElement>(null);
  const annotatedCanvasRef = useRef<HTMLCanvasElement>(null);

  // Warm YOLO on tab open so the first Scan is not a cold 503.
  useEffect(() => {
    void aiAPI.warmup().catch(() => undefined);
  }, []);

  const {
    videoRef,
    canvasRef,
    streaming,
    loopActive,
    scanning,
    cameraError,
    loopError,
    frameResult,
    stableResult,
    lastScanAt,
    scanCount,
    debugMode,
    setDebugMode,
    voteProgress,
    voteSlots,
    pipelineStage,
    detectMode,
    setDetectMode,
    startCamera,
    startDemoCamera,
    stopStream,
    runSingleScan,
    saveEvidenceFrame,
    startScanLoop,
    stopScanLoop,
    videoDevices,
    deviceId,
    setDeviceId,
    refreshVideoDevices,
  } = useWebcamDetection(pipelineOptions);

  // Real flow: capture → OpenCV prep → YOLO → (sign vote lock | street vehicles/plates) → result
  const pipelineStages = useMemo(
    () => [
      { id: 'webcam' as const, label: t('aiDetection.webcam.pipelineWebcam') },
      { id: 'opencv' as const, label: t('aiDetection.webcam.pipelineOpencv') },
      { id: 'yolo' as const, label: t('aiDetection.webcam.pipelineYolo') },
      {
        id: 'vote' as const,
        label:
          detectMode === 'street'
            ? (t('aiDetection.webcam.pipelineStreet') !== 'aiDetection.webcam.pipelineStreet'
              ? t('aiDetection.webcam.pipelineStreet')
              : 'Vehicles + plates')
            : t('aiDetection.webcam.pipelineVote'),
      },
      { id: 'result' as const, label: t('aiDetection.webcam.pipelineResult') },
    ],
    [t, detectMode],
  );
  const activePipelineStage = stableResult ? 'result' : pipelineStage;

  const regionRect = useWebcamSignRegionGuide(videoRef, stageRef, streaming && detectMode === 'sign');
  const streetFit = useContainFitRect(videoRef, streaming && detectMode === 'street');
  const { fps, resolution } = useVideoStreamStats(videoRef, streaming);

  const liveFrameConfidence = frameResult
    ? (frameResult.display_confidence ?? frameResult.confidence ?? 0)
    : 0;
  const showLiveConfidence = loopActive && liveFrameConfidence > 0;

  const overlayItems = useMemo(
    () => buildDetectionOverlay(stableResult ?? frameResult, locale === 'en' ? 'en' : 'km'),
    [stableResult, frameResult, locale],
  );

  const displayResult = [stableResult, frameResult].find(
    (res) => res && (isManualScanResult(res) || hasStreetDetections(res)),
  ) ?? null;

  const capturePreviewUrl =
    // Prefer raw capture under CSS overlays — annotated JPEGs already bake boxes
    // and would double-draw "No Entry" on webcam.
    displayResult?.guide_frame_image
    || displayResult?.uploaded_image
    || displayResult?.processed_image
    || '';

  const lastConfidence = displayResult
    ? (displayResult.display_confidence ?? displayResult.confidence ?? 0)
    : 0;
  const localizationDebug = displayResult?.pipeline_trace || displayResult?.localization_debug;
  const signCropPreview = displayResult?.sign_crop_image || '';
  const processedPreview = displayResult?.processed_image || displayResult?.annotated_processed_image || '';
  const guideFramePreview =
    displayResult?.guide_frame_image ||
    displayResult?.uploaded_image ||
    capturePreviewUrl;
  const vehicleSummary = displayResult?.vehicles?.length
    ? displayResult.vehicles
      .slice(0, 4)
      .map((v) => `${v.label || v.vehicle_type} ${Math.round(v.confidence)}%`)
      .join(' · ')
    : '';
  const helmetSummary = displayResult?.helmet_summary;
  const noHelmetCount = helmetSummary?.no_helmet_detections
    ?? displayResult?.helmets?.filter((h) => h.is_violation || h.class_key === 'no_helmet' || h.class_key === 'head').length
    ?? 0;
  const helmetOkCount = helmetSummary?.helmet_detections
    ?? displayResult?.helmets?.filter((h) => h.class_key === 'helmet').length
    ?? 0;
  const isProvisional = Boolean(!stableResult && displayResult);

  useEffect(() => {
    const canvas = annotatedCanvasRef.current;
    const imageUrl = capturePreviewUrl;
    const result = displayResult;
    if (!canvas || !imageUrl || !result) return;
    void drawAnnotatedDetectionFrame(
      canvas,
      guideFramePreview,
      result,
      locale === 'en' ? 'en' : 'km',
    ).catch(() => {
      /* preview optional */
    });
  }, [guideFramePreview, displayResult, locale]);

  useEffect(() => {
    if (!stableResult || !(isManualScanResult(stableResult) || hasStreetDetections(stableResult))) return;
    const key = (
      stableResult.sign_code
      || stableResult.class_key
      || stableResult.detected_plate
      || `${stableResult.detection_mode || 'scan'}-${stableResult.vehicle_count ?? stableResult.vehicles?.length ?? 0}`
      || 'none'
    ).toUpperCase();
    if (key === lastPreviewKeyRef.current) return;
    lastPreviewKeyRef.current = key;
    onResult?.(stableResult, { quiet: true });
  }, [stableResult, onResult]);

  useEffect(() => {
    if (!streaming) {
      lastPreviewKeyRef.current = '';
    }
  }, [streaming]);

  useEffect(() => {
    void refreshVideoDevices();
  }, [refreshVideoDevices]);

  const handleToggleLoop = () => {
    if (!streaming) return;
    if (loopActive) {
      stopScanLoop();
    } else {
      startScanLoop();
    }
  };

  const handleStop = () => {
    stopScanLoop();
    stopStream();
  };

  const handlePreviewScan = () => {
    void (async () => {
      stopScanLoop();
      lastPreviewKeyRef.current = '';
      try {
        const preview = await runSingleScan({ saveLog: false });
        const ok = Boolean(
          preview && (isManualScanResult(preview) || hasStreetDetections(preview)),
        );
        if (ok && preview) {
          onResult?.(preview, { quiet: true });
          toast.success(
            t('aiDetection.webcam.previewReady') !== 'aiDetection.webcam.previewReady'
              ? t('aiDetection.webcam.previewReady')
              : 'Preview ready — use Scan & Save to store in Recent Detection',
          );
        } else if (preview) {
          toast.message(
            t('aiDetection.webcam.noClearDetection') !== 'aiDetection.webcam.noClearDetection'
              ? t('aiDetection.webcam.noClearDetection')
              : 'No clear detection yet — hold steady and try again',
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Scan failed';
        toast.error(
          /503|502|504|busy|timeout|network|cannot reach/i.test(msg)
            ? 'Server warming up — wait a few seconds and scan again'
            : msg,
        );
      }
    })();
  };

  const handleScanOnce = () => {
    void (async () => {
      stopScanLoop();
      lastPreviewKeyRef.current = '';
      try {
        const confirmed = await runSingleScan({ saveLog: true });
        const ok = Boolean(
          confirmed && (isManualScanResult(confirmed) || hasStreetDetections(confirmed)),
        );
        if (ok && confirmed) {
          onResult?.(confirmed, { quiet: false });
          if (confirmed.log_id) {
            toast.success(
              t('aiDetection.webcam.savedToRecent') !== 'aiDetection.webcam.savedToRecent'
                ? t('aiDetection.webcam.savedToRecent')
                : 'Saved to Recent Detection',
            );
          } else {
            toast.success(
              t('aiDetection.webcam.previewReady') !== 'aiDetection.webcam.previewReady'
                ? t('aiDetection.webcam.previewReady')
                : 'Detection complete',
            );
          }
        } else if (confirmed) {
          toast.message(
            t('aiDetection.webcam.noClearDetection') !== 'aiDetection.webcam.noClearDetection'
              ? t('aiDetection.webcam.noClearDetection')
              : 'No clear detection yet — hold steady and try again',
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Scan failed';
        toast.error(
          /503|502|504|busy|timeout|network|cannot reach/i.test(msg)
            ? 'Server warming up — wait a few seconds and scan again'
            : msg,
        );
      }
    })();
  };

  const handleCaptureFrame = () => {
    void (async () => {
      const captured = await saveEvidenceFrame();
      if (captured) {
        toast.success(
          t('aiDetection.webcam.captureSaved') !== 'aiDetection.webcam.captureSaved'
            ? t('aiDetection.webcam.captureSaved')
            : 'Snapshot saved',
        );
      } else {
        toast.error(
          t('aiDetection.webcam.captureFailed') !== 'aiDetection.webcam.captureFailed'
            ? t('aiDetection.webcam.captureFailed')
            : 'Could not capture snapshot',
        );
      }
    })();
  };

  const handleDeviceChange = (nextId: string) => {
    setDeviceId(nextId);
    if (streaming) {
      stopScanLoop();
      stopStream();
      void startCamera(nextId);
    }
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0 live-webcam-panel live-webcam-panel--clean">
      <div
        ref={stageRef}
        className="relative rounded-xl overflow-hidden bg-black flex-1 min-h-[280px] border border-slate-800 live-webcam-panel__stage"
      >
        {!streaming && !cameraError && (
          <div className="live-webcam-panel__idle absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-3">
            <div className="live-webcam-panel__idle-icon">
              <Camera size={28} strokeWidth={2} />
            </div>
            <p className="live-webcam-panel__idle-title">{t('aiDetection.webcam.startTitle')}</p>
            <p className="live-webcam-panel__idle-hint">
              {detectMode === 'street'
                ? (t('aiDetection.webcam.streetStartHint') !== 'aiDetection.webcam.streetStartHint'
                  ? t('aiDetection.webcam.streetStartHint')
                  : 'Allow camera access, point at traffic, then tap Scan Frame or Scan & Save.')
                : t('aiDetection.webcam.startHint')}
            </p>
            {videoDevices.length > 0 ? (
              <label className="flex flex-col gap-1.5 text-left w-full max-w-xs text-[11px] text-muted-foreground">
                <span>{t('aiDetection.webcam.selectDevice') !== 'aiDetection.webcam.selectDevice'
                  ? t('aiDetection.webcam.selectDevice')
                  : 'Camera device'}</span>
                <FilterSelect
                  tone="teal"
                  size="sm"
                  className="ct-filter-select--block w-full"
                  value={deviceId || videoDevices[0]?.deviceId || 'no_device'}
                  onValueChange={setDeviceId}
                  ariaLabel={t('aiDetection.webcam.selectDevice') !== 'aiDetection.webcam.selectDevice'
                    ? t('aiDetection.webcam.selectDevice')
                    : 'Camera device'}
                  options={videoDevices
                    .filter(d => d.deviceId && d.deviceId.trim().length > 0)
                    .map((d, i) => ({
                      value: d.deviceId,
                      label: d.label || `Camera ${i + 1}`,
                    }))}
                />
              </label>
            ) : null}
            <button
              type="button"
              disabled={disabled}
              onClick={() => void startCamera(deviceId || undefined)}
              className="live-webcam-panel__idle-btn mt-1 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Camera size={15} />
              {t('aiDetection.webcam.enableCamera')}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void startDemoCamera()}
              className="px-4 py-2 rounded-xl text-[12px] font-bold border border-white/25 text-white/90 hover:bg-white/10 cursor-pointer disabled:opacity-50"
            >
              Use demo street video
            </button>
          </div>
        )}

        {cameraError && (
          <div className="live-webcam-panel__error absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-3">
            <AlertTriangle size={32} className="live-webcam-panel__error-icon" />
            <p className="live-webcam-panel__error-title">
              {cameraError === 'permission'
                ? t('aiDetection.webcam.errorPermission')
                : cameraError === 'insecure'
                  ? (t('aiDetection.webcam.errorInsecure') !== 'aiDetection.webcam.errorInsecure'
                    ? t('aiDetection.webcam.errorInsecure')
                    : 'Camera needs a secure page')
                  : cameraError === 'busy'
                    ? (t('aiDetection.webcam.errorBusy') !== 'aiDetection.webcam.errorBusy'
                      ? t('aiDetection.webcam.errorBusy')
                      : 'Camera is busy')
                    : t('aiDetection.webcam.errorUnavailable')}
            </p>
            <p className="live-webcam-panel__error-hint">
              {cameraError === 'insecure'
                ? 'Open http://127.0.0.1:5173 (or 5174) — not a LAN IP over HTTP.'
                : cameraError === 'permission'
                  ? 'Click the camera icon in the address bar → Allow, then retry.'
                  : cameraError === 'busy'
                    ? 'Close Zoom/Teams/other apps using the webcam, then retry.'
                    : t('aiDetection.webcam.errorHint')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <button
                type="button"
                disabled={disabled}
                onClick={() => void startCamera(deviceId || undefined)}
                className="live-webcam-panel__idle-btn px-4 py-2 rounded-xl text-white text-[12px] font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Camera size={14} />
                Retry camera
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => void startDemoCamera()}
                className="px-4 py-2 rounded-xl text-[12px] font-bold border border-white/25 text-white/90 hover:bg-white/10 cursor-pointer disabled:opacity-50"
              >
                Use demo street video
              </button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className={cn(
            'live-webcam-panel__video w-full h-full object-contain bg-black live-webcam-panel__video--natural',
            !streaming && 'hidden',
          )}
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" aria-hidden />

        {streaming && detectMode === 'sign' && regionRect && (
          <div className="absolute inset-0 pointer-events-none live-webcam-panel__guide-wrap">
            <div
              className="absolute live-webcam-panel__guide"
              style={{
                left: regionRect.left,
                top: regionRect.top,
                width: regionRect.width,
                height: regionRect.height,
              }}
            >
              <div className="absolute inset-0 rounded-lg border-2 border-dashed border-violet-300/95 bg-violet-500/[0.04]" />
              {capturePreviewUrl && stableResult ? (
                <img
                  src={capturePreviewUrl}
                  alt=""
                  aria-hidden
                  className="live-webcam-panel__capture-preview absolute inset-0 w-full h-full object-cover rounded-lg pointer-events-none ring-2 ring-emerald-400/90"
                />
              ) : null}
              <span className="absolute -top-5 left-0 right-0 text-center text-[10px] font-semibold text-violet-100 drop-shadow-md">
                {t('aiDetection.webcam.alignSign')}
              </span>
              {scanning && (
                <span className="absolute bottom-1.5 left-1.5 right-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-white px-1.5 py-0.5 rounded bg-violet-600/90">
                  {t('aiDetection.analysingShort')}
                </span>
              )}
              <LiveDetectionOverlay
                items={overlayItems}
                legendSign={t('aiDetection.webcam.legendSign')}
                legendVehicle={t('aiDetection.webcam.legendVehicle')}
                legendPlate={t('aiDetection.webcam.legendPlate')}
                legendHelmet={t('aiCenter.legendHelmet')}
                legendNoHelmet={t('aiCenter.legendNoHelmet')}
              />
            </div>
          </div>
        )}

        {streaming && detectMode === 'street' && streetFit && (
          <div
            className="absolute pointer-events-none z-[5]"
            style={{
              left: streetFit.left,
              top: streetFit.top,
              width: streetFit.width,
              height: streetFit.height,
            }}
          >
            <LiveDetectionOverlay
              items={overlayItems}
              legendSign={t('aiDetection.webcam.legendSign')}
              legendVehicle={t('aiDetection.webcam.legendVehicle')}
              legendPlate={t('aiDetection.webcam.legendPlate')}
              legendHelmet={t('aiCenter.legendHelmet')}
              legendNoHelmet={t('aiCenter.legendNoHelmet')}
            />
            {scanning && (
              <span className="absolute bottom-2 left-2 right-2 text-center text-[9px] font-bold uppercase tracking-wide text-white px-1.5 py-0.5 rounded bg-cyan-700/90">
                {t('aiDetection.analysingShort')}
              </span>
            )}
          </div>
        )}

        {streaming && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1 z-10 pointer-events-none">
            {resolution ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold text-white bg-slate-900/75 border border-white/10">
                {resolution}
              </span>
            ) : null}
            {fps > 0 ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold text-emerald-100 bg-emerald-900/80 border border-emerald-400/30">
                {t('aiDetection.webcam.fps', { fps })}
              </span>
            ) : null}
            {showLiveConfidence ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-violet-600/90">
                {t('aiDetection.webcam.liveConfidence', { value: liveFrameConfidence.toFixed(1) })}
              </span>
            ) : null}
          </div>
        )}

        {streaming && (
          <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap max-w-[85%] z-10">
            <span className={cn(
              'px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-white',
              loopActive ? 'bg-red-600' : stableResult ? 'bg-emerald-600' : 'bg-slate-700/80',
            )}>
              {loopActive
                ? t('aiDetection.webcam.scanning')
                : stableResult
                  ? (detectMode === 'street'
                    ? (t('aiDetection.webcam.streetDetectedLive') !== 'aiDetection.webcam.streetDetectedLive'
                      ? t('aiDetection.webcam.streetDetectedLive')
                      : 'Traffic detected')
                    : t('aiDetection.webcam.detectedLive'))
                  : t('aiDetection.webcam.preview')}
            </span>
            {loopActive && voteProgress.agree > 0 ? (
              <span className="px-2 py-1 rounded-md text-[10px] font-bold text-white bg-indigo-600/90">
                {t('aiDetection.webcam.voteProgress', {
                  agree: voteProgress.agree,
                  total: voteProgress.total,
                })}
              </span>
            ) : null}
            {scanning && (
              <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-violet-600 text-white animate-pulse">
                {t('aiDetection.analysingShort')}
              </span>
            )}
            {displayResult && !scanning && (
              <span className={cn(
                'px-2 py-1 rounded-md text-[10px] font-bold text-white',
                isProvisional ? 'bg-amber-600' : 'bg-emerald-600',
              )}>
                {isProvisional
                  ? t('aiDetection.webcam.scanningHint')
                  : (detectMode === 'street'
                    ? (t('aiDetection.webcam.streetDetectedLive') !== 'aiDetection.webcam.streetDetectedLive'
                      ? t('aiDetection.webcam.streetDetectedLive')
                      : 'Traffic detected')
                    : t('aiDetection.webcam.detectedLive'))}
              </span>
            )}
          </div>
        )}
      </div>

      {streaming && (
        <div className="live-webcam-console">
          <section className={cn(
            'live-webcam-console__status',
            displayResult && !isProvisional && 'is-detected',
            (scanning || isProvisional || loopActive) && !displayResult && 'is-busy',
            loopError && 'is-warn',
          )}>
            <div className="live-webcam-console__status-copy">
              <p className="live-webcam-console__eyebrow">
                {displayResult
                  ? (isProvisional
                    ? t('aiDetection.webcam.scanningHint')
                    : t('aiDetection.webcam.lastDetection'))
                  : loopError
                    ? t('aiDetection.webcam.scanningHint')
                    : loopActive
                      ? t('aiDetection.webcam.scanning')
                      : t('aiDetection.webcam.readyToScan')}
              </p>
              {displayResult ? (
                <div className="live-webcam-console__result-row">
                  {capturePreviewUrl ? (
                    <div className="live-webcam-console__thumb">
                      <canvas
                        ref={annotatedCanvasRef}
                        className="live-webcam-panel__annotated w-full h-full object-contain"
                        aria-label={t('aiDetection.analyzedImage')}
                      />
                    </div>
                  ) : null}
                  <div className="live-webcam-console__result-facts">
                    <SignNameLabels sign={displayResult} size="sm" />
                    <p className="live-webcam-console__result-meta">
                      {lastConfidence.toFixed(0)}% confidence
                      {displayResult.sign_code ? ` · ${displayResult.sign_code}` : ''}
                      {displayResult.detected_plate ? ` · ${displayResult.detected_plate}` : ''}
                    </p>
                    {vehicleSummary ? (
                      <p className="live-webcam-console__result-meta">{vehicleSummary}</p>
                    ) : null}
                  </div>
                </div>
              ) : loopError ? (
                <p className="live-webcam-console__hint is-warn">{loopError}</p>
              ) : (
                <p className="live-webcam-console__hint">
                  {detectMode === 'street'
                    ? (t('aiDetection.webcam.streetTapToScan') !== 'aiDetection.webcam.streetTapToScan'
                      ? t('aiDetection.webcam.streetTapToScan')
                      : 'Point at traffic, then tap Scan Frame or Scan & Save.')
                    : t('aiDetection.webcam.tapToScan')}
                </p>
              )}
            </div>
          </section>

          {(debugMode && displayResult && (localizationDebug || signCropPreview || processedPreview)) ? (
            <details className="live-webcam-console__debug">
              <summary>{t('aiDetection.webcam.debugTitle')}</summary>
              <div className="live-webcam-console__debug-body">
                {localizationDebug || displayResult?.crop_size ? (
                  <dl className="live-webcam-console__debug-grid">
                    <div>
                      <dt>{t('aiDetection.webcam.debugCropSize')}</dt>
                      <dd>{localizationDebug?.crop_size || displayResult?.crop_size || '—'}</dd>
                    </div>
                    <div>
                      <dt>{t('aiDetection.webcam.debugMethod')}</dt>
                      <dd>{localizationDebug?.method || '—'}</dd>
                    </div>
                    <div>
                      <dt>{t('aiDetection.webcam.debugYoloClassName')}</dt>
                      <dd>{localizationDebug?.yolo_class_name || localizationDebug?.yolo_class_key || '—'}</dd>
                    </div>
                    <div>
                      <dt>{t('aiDetection.webcam.debugYoloConfidence')}</dt>
                      <dd>
                        {localizationDebug?.yolo_confidence != null
                          ? `${Number(localizationDebug.yolo_confidence).toFixed(1)}%`
                          : '—'}
                      </dd>
                    </div>
                  </dl>
                ) : null}
                <div className="live-webcam-console__debug-previews">
                  {signCropPreview ? (
                    <img src={signCropPreview} alt="" />
                  ) : null}
                  {processedPreview ? (
                    <img src={processedPreview} alt="" />
                  ) : null}
                </div>
              </div>
            </details>
          ) : null}

          <section className="live-webcam-console__toolbar">
            <div className="live-webcam-console__mode" role="group" aria-label="Detect mode">
              <button
                type="button"
                className={cn('live-webcam-console__mode-btn', detectMode === 'street' && 'is-active')}
                onClick={() => {
                  stopScanLoop();
                  setDetectMode('street');
                }}
              >
                Street traffic
              </button>
              <button
                type="button"
                className={cn('live-webcam-console__mode-btn', detectMode === 'sign' && 'is-active')}
                onClick={() => {
                  stopScanLoop();
                  setDetectMode('sign');
                }}
              >
                Sign only
              </button>
            </div>

            {videoDevices.length > 0 ? (
              <label className="live-webcam-console__device">
                <span>
                  {t('aiDetection.webcam.selectDevice') !== 'aiDetection.webcam.selectDevice'
                    ? t('aiDetection.webcam.selectDevice')
                    : 'Camera'}
                </span>
                <FilterSelect
                  tone="teal"
                  size="sm"
                  className="min-w-[11rem] max-w-[16rem]"
                  value={deviceId || videoDevices[0]?.deviceId || 'no_device'}
                  onValueChange={(v) => handleDeviceChange(v)}
                  ariaLabel={t('aiDetection.webcam.selectDevice') !== 'aiDetection.webcam.selectDevice'
                    ? t('aiDetection.webcam.selectDevice')
                    : 'Camera'}
                  options={videoDevices
                    .filter(d => d.deviceId && d.deviceId.trim().length > 0)
                    .map((d, i) => ({
                      value: d.deviceId,
                      label: d.label || `Camera ${i + 1}`,
                    }))}
                />
              </label>
            ) : null}

            <label className="live-webcam-console__debug-toggle">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
              />
              <span>{t('aiDetection.webcam.debugToggle')}</span>
            </label>
          </section>

          <LiveWebcamPipelineStrip
            stages={pipelineStages}
            activeStage={activePipelineStage}
            voteSlots={loopActive ? voteSlots : []}
            voteRequired={loopActive ? LIVE_VOTE_WINDOW : 0}
            className="live-webcam-pipeline--clean shrink-0"
          />

          <section className="live-webcam-console__actions">
            <button
              type="button"
              onClick={handleScanOnce}
              disabled={disabled || scanning}
              className="live-webcam-console__btn live-webcam-console__btn--primary"
            >
              <Scan size={15} />
              <span className="live-webcam-console__btn-label">{t('aiDetection.webcam.scanOnce')}</span>
            </button>
            <button
              type="button"
              onClick={handlePreviewScan}
              disabled={disabled || scanning}
              className="live-webcam-console__btn live-webcam-console__btn--secondary"
            >
              <Scan size={15} />
              <span className="live-webcam-console__btn-label">{t('aiDetection.webcam.scanPreview')}</span>
            </button>
            <button
              type="button"
              onClick={handleCaptureFrame}
              disabled={disabled || scanning}
              className="live-webcam-console__btn"
            >
              <Download size={15} />
              <span className="live-webcam-console__btn-label">{t('aiDetection.webcam.captureFrame')}</span>
            </button>
            <button
              type="button"
              onClick={handleToggleLoop}
              disabled={disabled}
              className={cn('live-webcam-console__btn', loopActive && 'is-running')}
            >
              {loopActive ? <Pause size={15} /> : <Play size={15} />}
              <span className="live-webcam-console__btn-label">
                {loopActive ? t('aiDetection.webcam.pauseLoop') : t('aiDetection.webcam.startLoop')}
              </span>
            </button>
            <button
              type="button"
              onClick={handleStop}
              className="live-webcam-console__btn live-webcam-console__btn--danger"
            >
              <VideoOff size={15} />
              <span className="live-webcam-console__btn-label">{t('aiDetection.webcam.stopCamera')}</span>
            </button>
          </section>

          <p className="live-webcam-console__meta">
            <span>
              {detectMode === 'sign'
                ? (t('aiDetection.webcam.focusHint') !== 'aiDetection.webcam.focusHint'
                  ? t('aiDetection.webcam.focusHint')
                  : 'Center the sign, then Scan Frame or Scan & Save.')
                : (t('aiDetection.webcam.streetHint') !== 'aiDetection.webcam.streetHint'
                  ? t('aiDetection.webcam.streetHint')
                  : 'Point at traffic — Scan Frame previews, Scan & Save stores the result.')}
            </span>
            <span aria-hidden>·</span>
            <span>
              {t('aiDetection.webcam.scanMeta', {
                count: scanCount,
                time: lastScanAt ? lastScanAt.toLocaleTimeString() : '—',
              })}
            </span>
            {loopError ? (
              <span className="is-warn">{loopError}</span>
            ) : null}
          </p>
        </div>
      )}
    </div>
  );
}
