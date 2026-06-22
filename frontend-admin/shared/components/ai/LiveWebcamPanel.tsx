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
  LIVE_VOTE_MIN_AGREE,
  LIVE_VOTE_WINDOW,
  type WebcamDetectionResult,
} from '@shared/hooks/useWebcamDetection';
import { useWebcamSignRegionGuide } from '@shared/hooks/useWebcamSignRegionGuide';
import { useVideoStreamStats } from '@shared/hooks/useVideoStreamStats';
import { cn } from '@shared/components/ui/utils';
import { buildDetectionOverlay } from '@shared/utils/detectionOverlay';
import { drawAnnotatedDetectionFrame } from '@shared/utils/webcamFrame';

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
    startCamera,
    stopStream,
    runSingleScan,
    saveEvidenceFrame,
    startScanLoop,
    stopScanLoop,
  } = useWebcamDetection(pipelineOptions);

  const pipelineStages = useMemo(
    () => [
      { id: 'webcam' as const, label: t('aiDetection.webcam.pipelineWebcam') },
      { id: 'opencv' as const, label: t('aiDetection.webcam.pipelineOpencv') },
      { id: 'vote' as const, label: t('aiDetection.webcam.pipelineVote') },
      { id: 'yolo' as const, label: t('aiDetection.webcam.pipelineYolo') },
      { id: 'result' as const, label: t('aiDetection.webcam.pipelineResult') },
    ],
    [t],
  );
  const activePipelineStage = stableResult ? 'result' : pipelineStage;

  const regionRect = useWebcamSignRegionGuide(videoRef, stageRef, streaming);
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
    (res) => res && isManualScanResult(res),
  ) ?? null;

  const capturePreviewUrl = displayResult?.uploaded_image || '';

  const lastDescription = displayResult
    ? (locale === 'en'
      ? (displayResult.description_en || displayResult.description || displayResult.guidance_en || displayResult.guidance)
      : (displayResult.description || displayResult.guidance))
    : '';
  const lastConfidence = displayResult
    ? (displayResult.display_confidence ?? displayResult.confidence ?? 0)
    : 0;
  const localizationDebug = displayResult?.pipeline_trace || displayResult?.localization_debug;
  const signCropPreview = displayResult?.sign_crop_image || '';
  const processedPreview = displayResult?.processed_image || displayResult?.annotated_processed_image || '';
  const guideFramePreview = displayResult?.guide_frame_image || capturePreviewUrl;
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
    if (!stableResult || !isManualScanResult(stableResult)) return;
    const key = (stableResult.sign_code || stableResult.class_key || 'none').toUpperCase();
    if (key === lastPreviewKeyRef.current) return;
    lastPreviewKeyRef.current = key;
    onResult?.(stableResult, { quiet: true });
  }, [stableResult, onResult]);

  useEffect(() => {
    if (!streaming) {
      lastPreviewKeyRef.current = '';
    }
  }, [streaming]);

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
      const preview = await runSingleScan({ saveLog: false });
      if (preview && isManualScanResult(preview)) {
        onResult?.(preview, { quiet: false });
      }
    })();
  };

  const handleCaptureFrame = () => {
    void saveEvidenceFrame();
  };

  const handleScanOnce = () => {
    void (async () => {
      stopScanLoop();
      lastPreviewKeyRef.current = '';
      const confirmed = await runSingleScan({ saveLog: true });
      if (confirmed && isManualScanResult(confirmed)) {
        onResult?.(confirmed, { quiet: false });
      }
    })();
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0 live-webcam-panel">
      <div
        ref={stageRef}
        className="relative rounded-2xl overflow-hidden bg-black flex-1 min-h-[280px] border border-violet-500/20 live-webcam-panel__stage"
      >
        {!streaming && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <Camera size={28} color="#A78BFA" />
            </div>
            <p className="text-[15px] font-bold text-foreground">{t('aiDetection.webcam.startTitle')}</p>
            <p className="text-[12px] text-muted-foreground max-w-xs">{t('aiDetection.webcam.startHint')}</p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void startCamera()}
              className="mt-1 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#2563EB)' }}
            >
              <Camera size={15} />
              {t('aiDetection.webcam.enableCamera')}
            </button>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-2">
            <AlertTriangle size={32} className="text-amber-500" />
            <p className="text-[14px] font-bold text-foreground">
              {cameraError === 'permission'
                ? t('aiDetection.webcam.errorPermission')
                : t('aiDetection.webcam.errorUnavailable')}
            </p>
            <p className="text-[12px] text-muted-foreground max-w-sm">
              {t('aiDetection.webcam.errorHint')}
            </p>
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

        {streaming && regionRect && (
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
              />
            </div>
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
                  ? t('aiDetection.webcam.detectedLive')
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
                  : t('aiDetection.webcam.detectedLive')}
              </span>
            )}
          </div>
        )}
      </div>

      {streaming && (
        <div className="live-webcam-panel__info rounded-xl border border-violet-500/20 bg-card px-3.5 py-3 shadow-sm">
          <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-300 uppercase tracking-wide">
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
            <>
              <div className="mt-2 flex items-start gap-3">
                {capturePreviewUrl ? (
                  <div className="relative flex-shrink-0 w-[5.5rem] h-[5.5rem] rounded-lg overflow-hidden border border-violet-500/30 bg-black/50">
                    <canvas
                      ref={annotatedCanvasRef}
                      className="live-webcam-panel__annotated w-full h-full object-contain"
                      aria-label={t('aiDetection.analyzedImage')}
                    />
                  </div>
                ) : null}
                <dl className="min-w-0 flex-1 grid gap-1.5 text-[12px]">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('aiDetection.webcam.signName')}
                    </dt>
                    <dd className="mt-0.5">
                      <SignNameLabels sign={displayResult} size="sm" />
                    </dd>
                  </div>
                  {displayResult.sign_code ? (
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('aiDetection.webcam.signCode')}
                      </dt>
                      <dd className="font-mono font-semibold text-foreground">{displayResult.sign_code}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('aiDetection.webcam.confidenceScore')}
                    </dt>
                    <dd className="font-semibold text-foreground">{lastConfidence.toFixed(1)}%</dd>
                  </div>
                </dl>
              </div>
              {lastDescription ? (
                <div className="mt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('aiDetection.webcam.description')}
                  </p>
                  <p className="text-[12px] text-foreground/85 mt-1 leading-relaxed">
                    {lastDescription}
                  </p>
                </div>
              ) : null}
              {(debugMode || localizationDebug || signCropPreview) ? (
                <div className="mt-3 rounded-lg border border-dashed border-violet-500/30 bg-violet-500/5 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                      {t('aiDetection.webcam.debugTitle')}
                    </p>
                  </div>
                  {localizationDebug || displayResult?.crop_size ? (
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                      <div>
                        <dt className="text-[9px] uppercase text-muted-foreground">{t('aiDetection.webcam.debugCropSize')}</dt>
                        <dd className="font-mono">{localizationDebug?.crop_size || displayResult?.crop_size || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-[9px] uppercase text-muted-foreground">{t('aiDetection.webcam.debugMethod')}</dt>
                        <dd className="font-mono">{localizationDebug?.method || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-[9px] uppercase text-muted-foreground">{t('aiDetection.webcam.debugYoloClassId')}</dt>
                        <dd className="font-mono">{localizationDebug?.yolo_class_id ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-[9px] uppercase text-muted-foreground">{t('aiDetection.webcam.debugYoloClassName')}</dt>
                        <dd className="font-mono truncate">{localizationDebug?.yolo_class_name || localizationDebug?.yolo_class_key || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-[9px] uppercase text-muted-foreground">{t('aiDetection.webcam.debugYoloConfidence')}</dt>
                        <dd className="font-mono">
                          {localizationDebug?.yolo_confidence != null
                            ? `${Number(localizationDebug.yolo_confidence).toFixed(1)}%`
                            : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[9px] uppercase text-muted-foreground">{t('aiDetection.webcam.signCode')}</dt>
                        <dd className="font-mono">{localizationDebug?.sign_code || displayResult?.sign_code || '—'}</dd>
                      </div>
                    </dl>
                  ) : debugMode ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">{t('aiDetection.webcam.debugEmpty')}</p>
                  ) : null}
                  {signCropPreview ? (
                    <div className="mt-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        {t('aiDetection.webcam.debugCropImage')}
                      </p>
                      <img
                        src={signCropPreview}
                        alt=""
                        className="w-full max-w-[10rem] rounded border border-violet-500/30 bg-black object-contain"
                      />
                    </div>
                  ) : null}
                  {processedPreview ? (
                    <div className="mt-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        {t('aiDetection.webcam.debugProcessedImage')}
                      </p>
                      <img
                        src={processedPreview}
                        alt=""
                        className="w-full max-w-[10rem] rounded border border-amber-500/30 bg-black object-contain"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : loopError ? (
            <>
              <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-1">{loopError}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{t('aiDetection.webcam.noSignPrintedHint')}</p>
            </>
          ) : (
            <p className="text-[12px] text-muted-foreground mt-1">{t('aiDetection.webcam.tapToScan')}</p>
          )}
        </div>
      )}

      {streaming && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              className="rounded border-violet-400"
            />
            {t('aiDetection.webcam.debugToggle')}
          </label>
        </div>
      )}

      {streaming && (
        <LiveWebcamPipelineStrip
          stages={pipelineStages}
          activeStage={activePipelineStage}
          voteSlots={loopActive ? voteSlots : []}
          voteRequired={loopActive ? LIVE_VOTE_WINDOW : 0}
          className="shrink-0"
        />
      )}

      {streaming && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 text-[10px] text-muted-foreground">
          <span>
            {t('aiDetection.webcam.voteRule', {
              min: LIVE_VOTE_MIN_AGREE,
              total: LIVE_VOTE_WINDOW,
            })}
          </span>
          {loopActive && voteProgress.agree > 0 ? (
            <span className="font-semibold text-indigo-600 dark:text-indigo-300">
              {t('aiDetection.webcam.voteProgress', {
                agree: voteProgress.agree,
                total: voteProgress.total,
              })}
            </span>
          ) : null}
        </div>
      )}

      {streaming && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCaptureFrame}
            disabled={disabled || scanning}
            className="flex-1 min-w-[8rem] py-2.5 rounded-xl border border-emerald-500/40 text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 hover:bg-emerald-500/10"
          >
            <Download size={15} />
            {t('aiDetection.webcam.captureFrame')}
          </button>
          <button
            type="button"
            onClick={handlePreviewScan}
            disabled={disabled || scanning}
            className="flex-1 min-w-[8rem] py-2.5 rounded-xl border border-violet-500/40 text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 hover:bg-violet-500/10"
          >
            <Scan size={15} />
            {t('aiDetection.webcam.scanPreview')}
          </button>
          <button
            type="button"
            onClick={handleScanOnce}
            disabled={disabled || scanning}
            className="flex-1 min-w-[8rem] py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#2563EB)' }}
          >
            <Scan size={15} />
            {t('aiDetection.webcam.scanOnce')}
          </button>
          <button
            type="button"
            onClick={handleToggleLoop}
            disabled={disabled}
            className="px-4 py-2.5 rounded-xl border border-border text-[13px] font-semibold flex items-center gap-2 cursor-pointer hover:bg-muted/60"
          >
            {loopActive ? <Pause size={15} /> : <Play size={15} />}
            {loopActive ? t('aiDetection.webcam.pauseLoop') : t('aiDetection.webcam.startLoop')}
          </button>
          <button
            type="button"
            onClick={handleStop}
            className="px-4 py-2.5 rounded-xl border border-border text-[13px] font-semibold flex items-center gap-2 cursor-pointer hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
          >
            <VideoOff size={15} />
            {t('aiDetection.webcam.stopCamera')}
          </button>
        </div>
      )}

      {streaming && (
        <p className="text-[11px] text-muted-foreground text-center">
          {t('aiDetection.webcam.focusHint')}
          <br />
          {t('aiDetection.webcam.printedSignHint')}
          <br />
          {t('aiDetection.webcam.scanMeta', {
            count: scanCount,
            time: lastScanAt ? lastScanAt.toLocaleTimeString() : '—',
          })}
          {loopError ? (
            <>
              <br />
              <span className="text-amber-600">{loopError}</span>
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
