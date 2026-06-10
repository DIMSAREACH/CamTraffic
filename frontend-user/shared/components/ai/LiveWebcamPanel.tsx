import { useEffect, useMemo, useState } from 'react';
import { Camera, Pause, Play, Scan, VideoOff, AlertTriangle } from 'lucide-react';
import { LiveDetectionOverlay } from '@shared/components/ai/LiveDetectionOverlay';
import { useLanguage } from '@shared/context/LanguageContext';
import { useWebcamDetection, SIGN_REGION_FRACTION, type WebcamDetectionResult } from '@shared/hooks/useWebcamDetection';
import { cn } from '@shared/components/ui/utils';
import { buildDetectionOverlay } from '@shared/utils/detectionOverlay';

interface LiveWebcamPanelProps {
  onResult?: (result: WebcamDetectionResult) => void;
  onScanComplete?: () => void;
  disabled?: boolean;
}

export function LiveWebcamPanel({ onResult, onScanComplete, disabled = false }: LiveWebcamPanelProps) {
  const { t, locale } = useLanguage();
  const [loopActive, setLoopActive] = useState(false);
  const {
    videoRef,
    canvasRef,
    streaming,
    scanning,
    cameraError,
    lastResult,
    lastScanAt,
    scanCount,
    startCamera,
    stopStream,
    runSingleScan,
    startScanLoop,
    stopScanLoop,
  } = useWebcamDetection();

  const overlayItems = useMemo(
    () => buildDetectionOverlay(lastResult, locale === 'en' ? 'en' : 'km'),
    [lastResult, locale],
  );

  const lastTitle = lastResult
    ? (locale === 'en'
      ? (lastResult.display_title_en || lastResult.sign_name_en || lastResult.sign_name)
      : (lastResult.display_title_km || lastResult.sign_name_km || lastResult.sign_name))
    : '';
  const lastConfidence = lastResult
    ? (lastResult.display_confidence ?? lastResult.confidence ?? 0)
    : 0;

  useEffect(() => {
    if (lastResult) {
      onResult?.(lastResult);
      onScanComplete?.();
    }
  }, [lastResult, onResult, onScanComplete]);

  useEffect(() => {
    if (!streaming) setLoopActive(false);
  }, [streaming]);

  useEffect(() => {
    if (loopActive && streaming) {
      startScanLoop();
      return () => stopScanLoop();
    }
    stopScanLoop();
    return undefined;
  }, [loopActive, streaming, startScanLoop, stopScanLoop]);

  const handleToggleLoop = () => {
    if (!streaming) return;
    setLoopActive((v) => !v);
  };

  const handleStop = () => {
    setLoopActive(false);
    stopScanLoop();
    stopStream();
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="relative rounded-2xl overflow-hidden bg-black flex-1 min-h-[240px] border border-violet-500/20">
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
          className={cn('w-full h-full object-cover', !streaming && 'hidden')}
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" aria-hidden />

        {streaming && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className="relative rounded-xl border-2 border-dashed border-violet-300/85"
              style={{
                width: `${SIGN_REGION_FRACTION * 100}%`,
                aspectRatio: '1',
                maxHeight: `${SIGN_REGION_FRACTION * 100}%`,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
              }}
            >
              <span className="absolute -top-5 left-0 right-0 text-center text-[10px] font-semibold text-violet-100 drop-shadow-md">
                {t('aiDetection.webcam.alignSign')}
              </span>
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
          <>
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className={cn(
                'px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-white',
                loopActive ? 'bg-red-600' : 'bg-slate-700/80',
              )}>
                {loopActive ? t('aiDetection.webcam.scanning') : t('aiDetection.webcam.preview')}
              </span>
              {scanning && (
                <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-violet-600 text-white animate-pulse">
                  {t('aiDetection.analysingShort')}
                </span>
              )}
            </div>
            {lastResult && (
              <div className="absolute bottom-3 left-3 right-3 rounded-xl px-3 py-2.5 text-white text-left"
                style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(139,92,246,0.35)' }}>
                <p className="text-[11px] font-semibold text-violet-200 uppercase tracking-wide">
                  {t('aiDetection.webcam.lastDetection')}
                </p>
                <p className="text-[14px] font-bold truncate">{lastTitle}</p>
                <p className="text-[11px] text-slate-300">
                  {lastConfidence.toFixed(1)}%
                  {lastResult.sign_code ? ` · ${lastResult.sign_code}` : ''}
                  {lastResult.detected_plate ? ` · ${lastResult.detected_plate}` : ''}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {streaming && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runSingleScan()}
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
          {t('aiDetection.webcam.scanMeta', {
            count: scanCount,
            time: lastScanAt ? lastScanAt.toLocaleTimeString() : '—',
          })}
        </p>
      )}
    </div>
  );
}
