import { useCallback, useEffect, useMemo, useRef, useState, type Ref } from 'react';
import {
  Cctv, Loader2, MapPin, Pause, Play, Plug, PlugZap, RefreshCw, Scan, Camera as CamIcon, Circle,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import { AiCenterDetectButton } from '@shared/components/ai/center/AiCenterDetectButton';
import { DemoObservedActionSelect } from '@shared/components/ai/DemoObservedActionSelect';
import { LiveDetectionOverlay } from '@shared/components/ai/LiveDetectionOverlay';
import { buildDemoViolationOptions } from '@shared/constants/observedActions';
import { useLanguage } from '@shared/context/LanguageContext';
import { useContainFitRect } from '@shared/hooks/useContainFitRect';
import { camerasAPI, aiAPI } from '@shared/services/api';
import { videoLiveAPI } from '@shared/services/videoLiveApi';
import { isCameraVideoUrl, resolveCameraFrameUrl } from '@shared/constants/cameraFrameDemo';
import { buildDetectionOverlay } from '@shared/utils/detectionOverlay';
import { captureMediaFrame } from '@shared/utils/captureMediaFrame';
import { toast } from 'sonner';
import type { Camera } from '@shared/types';
import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';
import { cn } from '@shared/components/ui/utils';

interface LiveCameraDetectionPanelProps {
  demoObservedAction: string;
  onDemoObservedActionChange: (v: string) => void;
  onResult: (result: CenterDetectionResult, previewUrl: string) => void;
  onDetectingChange: (v: boolean) => void;
  disabled?: boolean;
}

const INTERVAL_OPTIONS = [1500, 2000, 3000] as const;

function frameUrl(base: string, tick: number) {
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}_t=${tick}`;
}

function label(t: (k: string) => string, key: string, fallback: string) {
  const v = t(key);
  return v !== key ? v : fallback;
}

export function LiveCameraDetectionPanel({
  demoObservedAction,
  onDemoObservedActionChange,
  onResult,
  onDetectingChange,
  disabled = false,
}: LiveCameraDetectionPanelProps) {
  const { t, locale } = useLanguage();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [intervalMs, setIntervalMs] = useState<number>(1500);
  const [autoSave, setAutoSave] = useState(false);
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);
  const [failStreak, setFailStreak] = useState(0);
  const [lastPreview, setLastPreview] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<CenterDetectionResult | null>(null);
  const [fps, setFps] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);
  const [liveAnnotated, setLiveAnnotated] = useState<string | null>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);
  const inFlight = useRef(false);
  const lastDetectMs = useRef(0);
  const backoffUntil = useRef(0);
  const sessionRef = useRef<string | null>(null);

  const loadCameras = useCallback(async () => {
    setLoading(true);
    try {
      const data = await camerasAPI.getAll();
      const active = data.filter((c) => c.status === 'active');
      const preferred =
        active.find((c) => c.code === 'CAM-PP-001')
        ?? active.find((c) => c.code === 'CAM-PP-002')
        ?? active[0]
        ?? data[0];
      setCameras(active.length ? active : data);
      setSelectedId((prev) => {
        if (prev && data.some((c) => c.id === prev)) return prev;
        return preferred?.id ?? null;
      });
    } catch {
      toast.error(t('aiCenter.cameraLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadCameras(); }, [loadCameras]);

  useEffect(() => {
    if (!connected) return undefined;
    const id = window.setInterval(() => setTick((n) => n + 1), Math.max(1500, intervalMs));
    return () => window.clearInterval(id);
  }, [connected, intervalMs]);

  const selected = cameras.find((c) => c.id === selectedId) ?? null;
  const resolvedSrc = selected
    ? resolveCameraFrameUrl(selected.frame_source_url, selected)
    : '';
  const isVideoFeed = isCameraVideoUrl(selected?.frame_source_url) || isCameraVideoUrl(resolvedSrc);
  const src = resolvedSrc
    ? (isVideoFeed ? resolvedSrc : frameUrl(resolvedSrc, tick))
    : '';

  // Ensure looping CCTV video actually plays after Connect (autoplay policies).
  useEffect(() => {
    if (!connected || !isVideoFeed || paused) return;
    const el = mediaRef.current;
    if (el && el instanceof HTMLVideoElement) {
      el.muted = true;
      void el.play().catch(() => undefined);
    }
  }, [connected, isVideoFeed, paused, src]);

  const cameraOnline = selected ? selected.status === 'active' : false;
  const overlayActive = Boolean(connected && liveResult);
  const mediaFit = useContainFitRect(mediaRef, overlayActive || connected);

  const overlayItems = useMemo(
    () => buildDetectionOverlay(liveResult, locale === 'en' ? 'en' : 'km'),
    [liveResult, locale],
  );

  const vehicleCrop = liveResult?.vehicle_snapshot || '';
  const plateCrop = liveResult?.plate_snapshot || '';
  const annotatedStill = liveResult?.annotated_processed_image || liveAnnotated || lastPreview || '';
  const objectCount = overlayItems.length;

  const runDetection = useCallback(async (opts?: { silent?: boolean }) => {
    if (!selected || !src || inFlight.current) {
      if (!opts?.silent && !selected) toast.error(t('aiCenter.selectCamera'));
      return;
    }
    if (Date.now() < backoffUntil.current) return;

    const frameUrlRaw = (selected.frame_source_url || '').trim();
    if (!frameUrlRaw) {
      if (!opts?.silent) {
        toast.error(label(t, 'aiCenter.cameraNoUrl', 'Camera has no frame_source_url'));
      }
      return;
    }

    inFlight.current = true;
    setScanning(true);
    if (!opts?.silent) {
      setDetecting(true);
      // Do not flip parent detecting — keeps live theater mounted for instant overlay updates.
    }
    const persist = Boolean(autoSave || !opts?.silent);
    const silent = Boolean(opts?.silent);
    const extra: Record<string, string> = {
      full_frame: 'true',
      live_scan: persist ? 'false' : 'true',
      save_log: persist ? 'true' : 'false',
      // Persist Detect/Save: OCR + DB log. Silent live ticks stay preview-only.
      enable_ocr: persist ? 'true' : 'false',
      live_fast: 'true',
    };
    const demoOpts = buildDemoViolationOptions(demoObservedAction, {
      autoCreate: persist && Boolean(demoObservedAction?.trim()),
    });
    if (demoOpts.observed_action) extra.observed_action = demoOpts.observed_action;
    if (demoOpts.demo_violation) extra.demo_violation = 'true';
    if (demoOpts.auto_create_violation) extra.auto_create_violation = 'true';
    try {
      let res: CenterDetectionResult;
      const mediaEl = mediaRef.current;
      // Video feeds: capture the exact on-screen frame so boxes align 1:1 with playback.
      const useClientFrame = Boolean(
        isVideoFeed
        && mediaEl instanceof HTMLVideoElement
        && mediaEl.readyState >= 2
        && mediaEl.videoWidth > 0,
      );
      const sid = sessionRef.current;
      // Prefer live session pipeline when a session is active (annotated frame + DB evidence).
      if (sid && (useClientFrame || selected.id)) {
        let frameBlob: Blob | undefined;
        if (useClientFrame) {
          const file = await captureMediaFrame(mediaEl as HTMLVideoElement, {
            maxEdge: silent ? 640 : 960,
            filenamePrefix: `live-sess-${selected.code || 'cam'}`,
          });
          if (file) frameBlob = file;
        }
        const live = await videoLiveAPI.liveFrame(sid, {
          camera_id: String(selected.id),
          image: frameBlob,
        });
        if (live.error) throw new Error(String(live.error));
        const b64 = String(live.image_b64 || '');
        const annotated = b64 ? `data:image/jpeg;base64,${b64}` : '';
        if (annotated) setLiveAnnotated(annotated);
        setLatencyMs(Number(live.latency_ms || 0));
        const det = (live.detections || {}) as CenterDetectionResult;
        res = {
          ...det,
          annotated_processed_image: annotated || undefined,
          processed_image: annotated || undefined,
          confidence: Number(live.confidence ?? det.confidence ?? 0),
          detected_plate: String(live.plate_text || det.detected_plate || ''),
          plate_confidence: Number(live.plate_confidence ?? det.plate_confidence ?? 0),
        } as CenterDetectionResult;
        if (typeof live.fps === 'number' && live.fps > 0) setFps(Math.min(30, Number(live.fps)));
      } else if (useClientFrame) {
        const file = await captureMediaFrame(mediaEl as HTMLVideoElement, {
          maxEdge: silent ? 640 : 960,
          filenamePrefix: `webcam-street-${selected.code || 'cam'}`,
        });
        if (!file) throw new Error('Could not capture live camera frame');
        res = (await aiAPI.detect(file, {
          live_scan: !persist,
          live_fast: true,
          full_frame: true,
          enable_ocr: persist,
          save_log: persist,
          auto_create_violation: Boolean(demoOpts.auto_create_violation),
          demo_violation: Boolean(demoOpts.demo_violation),
          observed_action: demoOpts.observed_action,
          camera_id: Number(selected.id) || undefined,
        })) as CenterDetectionResult;
      } else {
        res = (await camerasAPI.processFrame(String(selected.id), extra)) as CenterDetectionResult;
      }
      const preview =
        res.annotated_processed_image ||
        res.processed_image ||
        res.uploaded_image ||
        liveAnnotated ||
        src;
      setLastPreview(preview);
      setLiveResult(res);
      // Keep theater mounted during silent loop — only open full results on manual Detect.
      if (!silent) {
        onResult(res, preview);
      }
      setLastPingAt(Date.now());
      setFailStreak(0);
      backoffUntil.current = 0;
      const now = performance.now();
      if (lastDetectMs.current > 0) {
        const dt = (now - lastDetectMs.current) / 1000;
        if (dt > 0) setFps((prev) => (prev > 0 ? prev : Math.min(30, 1 / dt)));
      }
      lastDetectMs.current = now;
      if (!opts?.silent) toast.success(t('aiCenter.detectSuccess'));
      if (res.violation_evaluation?.is_violation && (persist || !opts?.silent)) {
        toast.message(label(t, 'aiCenter.violationFoundToast', 'Violation detected on live camera'));
      }
      if (res.violation_error && !opts?.silent) {
        toast.message(String(res.violation_error));
      }
      if ((res.detected_plate == null || res.detected_plate === '') && !opts?.silent) {
        toast.message(label(t, 'aiCenter.ocrWeak', 'No plate OCR on this frame'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/offline|unavailable|rtsp|timeout|connect|502|capture/i.test(msg)) {
        toast.error(label(t, 'aiCenter.cameraOffline', 'Camera offline or frame capture failed'));
      } else if (!opts?.silent) {
        toast.error(t('aiCenter.detectFailed'));
      }
      setFailStreak((n) => {
        const next = n + 1;
        const delay = Math.min(30_000, 2000 * 2 ** Math.min(next, 4));
        backoffUntil.current = Date.now() + delay;
        return next;
      });
    } finally {
      inFlight.current = false;
      setScanning(false);
      if (!opts?.silent) {
        setDetecting(false);
      }
    }
  }, [selected, src, demoObservedAction, autoSave, onResult, t, isVideoFeed, liveAnnotated]);

  useEffect(() => {
    if (!connected || paused || disabled) return undefined;
    const id = window.setInterval(() => {
      void runDetection({ silent: true });
    }, intervalMs);
    void runDetection({ silent: true });
    return () => window.clearInterval(id);
  }, [connected, paused, disabled, intervalMs, runDetection]);

  const handleConnect = async () => {
    if (!selected) {
      toast.error(t('aiCenter.selectCamera'));
      return;
    }
    if (!cameraOnline && selected.status === 'inactive') {
      toast.error(label(t, 'aiCenter.cameraOffline', 'Selected camera is offline'));
      return;
    }
    try {
      const sess = await videoLiveAPI.liveStart({
        camera_id: String(selected.id),
        source: 'camera',
        observed_action: demoObservedAction || undefined,
      });
      sessionRef.current = sess.session_id;
      setSessionId(sess.session_id);
      setConnected(true);
      setPaused(false);
      setFailStreak(0);
      backoffUntil.current = 0;
      toast.success(label(t, 'aiCenter.cameraConnected', 'Live camera connected'));
    } catch {
      toast.error(label(t, 'aiCenter.liveSessionFailed', 'Could not start live session'));
    }
  };

  const handleDisconnect = async () => {
    const sid = sessionRef.current;
    if (sid) {
      try {
        if (recording) await videoLiveAPI.recordStop(sid);
        await videoLiveAPI.liveStop(sid);
      } catch {
        /* ignore */
      }
    }
    sessionRef.current = null;
    setSessionId(null);
    setRecording(false);
    setLiveAnnotated(null);
    setConnected(false);
    setPaused(false);
    setFps(0);
    setLatencyMs(0);
    setLiveResult(null);
    setScanning(false);
    toast.message(label(t, 'aiCenter.cameraDisconnected', 'Live camera disconnected'));
  };

  const handleScreenshot = async () => {
    const sid = sessionRef.current;
    if (sid) {
      try {
        const mediaEl = mediaRef.current;
        let image: Blob | undefined;
        if (mediaEl instanceof HTMLVideoElement && mediaEl.readyState >= 2) {
          const file = await captureMediaFrame(mediaEl, {
            maxEdge: 1280,
            filenamePrefix: `snap-${selected?.code || 'cam'}`,
          });
          if (file) image = file;
        }
        const snap = await videoLiveAPI.liveSnapshot(sid, selected?.id ? String(selected.id) : undefined);
        if (image) {
          await videoLiveAPI.liveFrame(sid, { camera_id: selected?.id ? String(selected.id) : undefined, image });
        }
        const b64 = String((snap as any)?.image_b64 || '');
        if (b64) {
          const a = document.createElement('a');
          a.href = `data:image/jpeg;base64,${b64}`;
          a.download = `live-camera-${selected?.code || selected?.id || 'shot'}-${Date.now()}.jpg`;
          a.click();
        }
        toast.success(label(t, 'aiCenter.screenshotSaved', 'Snapshot saved as evidence'));
        return;
      } catch {
        /* fall through to local download */
      }
    }
    const url = annotatedStill || lastPreview || liveAnnotated || src;
    if (!url) {
      toast.error(t('aiCenter.noFeed'));
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-camera-${selected?.code || selected?.id || 'shot'}-${Date.now()}.jpg`;
    a.click();
    toast.success(label(t, 'aiCenter.screenshotSaved', 'Screenshot downloaded'));
  };

  const toggleRecording = async () => {
    const sid = sessionRef.current;
    if (!sid) {
      toast.error(label(t, 'aiCenter.connectFirst', 'Connect the camera first'));
      return;
    }
    try {
      if (recording) {
        await videoLiveAPI.recordStop(sid);
        setRecording(false);
        toast.message(label(t, 'aiCenter.recordingStopped', 'Recording stopped'));
      } else {
        await videoLiveAPI.recordStart(sid);
        setRecording(true);
        toast.success(label(t, 'aiCenter.recordingStarted', 'Recording started'));
      }
    } catch {
      toast.error(label(t, 'aiCenter.recordingFailed', 'Recording control failed'));
    }
  };

  if (loading) {
    return (
      <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--cyan ai-center-camera-card ai-center-camera-card--theater ai-center-input-panel--centered">
        <Loader2 size={32} className="animate-spin text-cyan-600" />
        <p className="ai-center-camera-card__state-text">{t('aiCenter.loadingCameras')}</p>
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--cyan ai-center-camera-card ai-center-camera-card--theater ai-center-input-panel--centered">
        <span className="ai-center-camera-card__empty-icon" aria-hidden>
          <Cctv size={32} strokeWidth={1.5} />
        </span>
        <p className="ai-center-camera-card__state-text">{t('aiCenter.noCameras')}</p>
        <Button variant="outline" size="sm" onClick={() => void loadCameras()} className="gap-1.5">
          <RefreshCw size={14} />
          {t('aiCenter.reloadCameras')}
        </Button>
      </div>
    );
  }

  const statusLabel = !connected
    ? label(t, 'aiCenter.statusDisconnected', 'Disconnected')
    : paused
      ? label(t, 'aiCenter.statusPaused', 'Paused')
      : failStreak > 0
        ? label(t, 'aiCenter.statusReconnecting', 'Reconnecting…')
        : scanning
          ? label(t, 'aiCenter.statusScanning', 'Scanning…')
          : label(t, 'aiCenter.statusLive', 'LIVE');

  return (
    <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--cyan ai-center-camera-card ai-center-camera-card--theater ai-detect-console ai-detect-console--live">
      <header className="ai-detect-console__topbar">
        <div className="ai-detect-console__brand">
          <Cctv size={16} />
          <strong>{label(t, 'aiCenter.liveCamera', 'AI Detection')}</strong>
          <span className="ai-detect-console__muted">Live Camera Feed</span>
        </div>
        <div className="ai-detect-console__topmeta">
          <span className={cn('ai-detect-console__live', connected && !paused && 'is-on')}>
            <i /> {connected && !paused ? 'LIVE' : statusLabel}
          </span>
          <span>FPS: {connected ? fps.toFixed(1) : '—'}</span>
          <span>{latencyMs ? `${Math.round(latencyMs)} ms` : '—'}</span>
          <span>{selected?.code || '—'}</span>
        </div>
      </header>

      <header className="ai-center-camera-toolbar">
        <label className="ai-center-camera-toolbar__field ai-center-camera-toolbar__field--cam">
          <span className="ai-center-camera-toolbar__label">
            {label(t, 'pages.cameras.switchCamera', 'Camera')}
          </span>
          <FilterSelect
            tone="teal"
            size="sm"
            value={selectedId ?? ''}
            onValueChange={(v) => {
              if (connected) return;
              setSelectedId(v);
              setLastPreview(null);
              setLiveResult(null);
            }}
            disabled={detecting || disabled || connected}
            ariaLabel={label(t, 'pages.cameras.switchCamera', 'Camera')}
            options={cameras.map((cam) => ({
              value: cam.id,
              label: cam.code ? `${cam.code} · ${cam.name}` : cam.name,
            }))}
          />
        </label>

        <label className="ai-center-camera-toolbar__field">
          <span className="ai-center-camera-toolbar__label">
            {label(t, 'aiCenter.detectInterval', 'Interval')}
          </span>
          <FilterSelect
            tone="teal"
            size="sm"
            value={String(intervalMs)}
            onValueChange={(v) => setIntervalMs(Number(v))}
            disabled={disabled}
            ariaLabel={label(t, 'aiCenter.detectInterval', 'Interval')}
            options={INTERVAL_OPTIONS.map((ms) => ({
              value: String(ms),
              label: `${ms / 1000}s`,
            }))}
          />
        </label>

        <label className="ai-center-camera-toolbar__autosave">
          <input
            type="checkbox"
            checked={autoSave}
            onChange={(e) => setAutoSave(e.target.checked)}
            disabled={disabled}
          />
          <span>{label(t, 'aiCenter.autoSave', 'Auto-save')}</span>
        </label>

        <button
          type="button"
          className="ai-center-camera-toolbar__refresh"
          onClick={() => void loadCameras()}
          disabled={detecting || disabled || connected}
          title={label(t, 'pages.cameras.reloadList', 'Reload cameras')}
        >
          <RefreshCw size={15} />
        </button>
      </header>

      <section
        className="ai-center-camera-monitor"
        aria-label={label(t, 'pages.cameras.previewTitle', 'Live Frame Preview')}
      >
        <div className={cn(
          'ai-center-camera-monitor__frame',
          connected && !paused && 'is-live',
          connected && 'ai-center-camera-monitor__frame--contain',
        )}>
          {src ? (
            isVideoFeed ? (
              <video
                key={src}
                ref={mediaRef as Ref<HTMLVideoElement>}
                src={src}
                className="ai-center-camera-monitor__media"
                autoPlay
                muted
                loop
                playsInline
                aria-label={selected?.name || 'Live camera stream'}
              />
            ) : (
              <img
                ref={mediaRef as Ref<HTMLImageElement>}
                src={lastPreview || src}
                alt={selected?.name || ''}
                className="ai-center-camera-monitor__media"
              />
            )
          ) : (
            <div className="ai-center-camera-monitor__empty">
              <Cctv size={40} strokeWidth={1.4} />
              <p>{t('aiCenter.noFeed')}</p>
            </div>
          )}

          {connected && mediaFit && mediaFit.width > 0 && overlayItems.length > 0 ? (
            <div
              className="ai-center-camera-monitor__overlay-layer"
              style={{
                left: mediaFit.left,
                top: mediaFit.top,
                width: mediaFit.width,
                height: mediaFit.height,
              }}
            >
              <LiveDetectionOverlay
                items={overlayItems}
                legendSign={label(t, 'aiDetection.webcam.legendSign', 'Sign')}
                legendVehicle={label(t, 'aiDetection.webcam.legendVehicle', 'Vehicle')}
                legendPlate={label(t, 'aiDetection.webcam.legendPlate', 'Plate')}
              />
            </div>
          ) : null}

          <div className="ai-center-camera-monitor__chrome">
            <span className={cn(
              'ai-center-camera-monitor__badge',
              connected && !paused && 'is-on',
              scanning && 'is-scan',
            )}>
              <span className="ai-center-camera-monitor__badge-dot" />
              {statusLabel}
            </span>
            <div className="ai-center-camera-monitor__chrome-right">
              {objectCount > 0 ? (
                <span className="ai-center-camera-monitor__count">
                  {objectCount} {label(t, 'aiCenter.objects', 'objects')}
                </span>
              ) : null}
              {selected?.code ? (
                <span className="ai-center-camera-monitor__code">{selected.code}</span>
              ) : null}
            </div>
          </div>
        </div>

        {(vehicleCrop || plateCrop || (connected && annotatedStill?.startsWith('data:'))) ? (
          <div className="ai-center-camera-crops" aria-label={label(t, 'aiCenter.autoCrops', 'Auto crops')}>
            {vehicleCrop ? (
              <figure className="ai-center-camera-crops__item">
                <img src={vehicleCrop} alt="" />
                <figcaption>{label(t, 'aiCenter.kpiVehicle', 'Vehicle')}</figcaption>
              </figure>
            ) : null}
            {plateCrop ? (
              <figure className="ai-center-camera-crops__item">
                <img src={plateCrop} alt="" />
                <figcaption>{label(t, 'aiCenter.kpiPlateOcr', 'Plate')}</figcaption>
              </figure>
            ) : null}
            {connected && annotatedStill?.startsWith('data:') ? (
              <figure className="ai-center-camera-crops__item ai-center-camera-crops__item--wide">
                <img src={annotatedStill} alt="" />
                <figcaption>{label(t, 'aiCenter.annotatedFrame', 'Annotated')}</figcaption>
              </figure>
            ) : null}
          </div>
        ) : null}
      </section>

      <footer className="ai-center-camera-dock">
        <div className="ai-center-camera-dock__meta">
          <p className="ai-center-camera-dock__title">{selected?.name || '—'}</p>
          <p className="ai-center-camera-dock__sub">
            <MapPin size={12} aria-hidden />
            <span>{selected?.road_name || selected?.street || '—'}</span>
            {connected ? <span className="ai-center-camera-dock__sep">·</span> : null}
            {connected ? <span>{fps.toFixed(1)} FPS</span> : null}
            {connected && latencyMs > 0 ? (
              <>
                <span className="ai-center-camera-dock__sep">·</span>
                <span>{Math.round(latencyMs)} ms</span>
              </>
            ) : null}
            {sessionId ? (
              <>
                <span className="ai-center-camera-dock__sep">·</span>
                <span title={sessionId}>sess {sessionId.slice(0, 8)}</span>
              </>
            ) : null}
            {recording ? (
              <>
                <span className="ai-center-camera-dock__sep">·</span>
                <span className="text-red-600 font-semibold">REC</span>
              </>
            ) : null}
            {objectCount > 0 ? (
              <>
                <span className="ai-center-camera-dock__sep">·</span>
                <span>{objectCount} boxes</span>
              </>
            ) : null}
            {lastPingAt ? (
              <>
                <span className="ai-center-camera-dock__sep">·</span>
                <span>{new Date(lastPingAt).toLocaleTimeString()}</span>
              </>
            ) : null}
          </p>
        </div>

        <div className="ai-center-camera-dock__actions">
          {!connected ? (
            <Button type="button" size="sm" className="gap-1.5" onClick={() => void handleConnect()} disabled={!selected || disabled}>
              <PlugZap size={14} />
              {label(t, 'aiCenter.connect', 'Connect')}
            </Button>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => void handleDisconnect()} disabled={disabled}>
                <Plug size={14} />
                {label(t, 'aiCenter.disconnect', 'Disconnect')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setPaused((p) => !p)}
                disabled={disabled}
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
                {paused
                  ? label(t, 'aiCenter.resumeDetect', 'Resume')
                  : label(t, 'aiCenter.pauseDetect', 'Pause')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={recording ? 'destructive' : 'outline'}
                className="gap-1.5"
                onClick={() => void toggleRecording()}
                disabled={disabled}
              >
                <Circle size={14} className={recording ? 'fill-current' : ''} />
                {recording
                  ? label(t, 'aiCenter.stopRecord', 'Stop Rec')
                  : label(t, 'aiCenter.startRecord', 'Record')}
              </Button>
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => void handleScreenshot()}
            disabled={!src || disabled}
          >
            <CamIcon size={14} />
            {label(t, 'aiCenter.screenshot', 'Screenshot')}
          </Button>
          <AiCenterDetectButton
            tone="cyan"
            className="ai-center-upload-card__cta"
            onClick={() => void runDetection()}
            disabled={!src || detecting || disabled}
          >
            {detecting ? <Loader2 size={18} className="animate-spin" /> : <Scan size={18} />}
            {detecting ? t('aiCenter.analyzing') : t('aiCenter.runCameraDetection')}
          </AiCenterDetectButton>
        </div>
      </footer>

      <section className="ai-detect-console__panel ai-detect-console__panel--live">
        <div className="ai-detect-console__panel-head">
          <h3>{label(t, 'aiCenter.detectionResults', 'Detection Results')}</h3>
          <span className="ai-detect-console__muted">
            {recording ? 'REC ●' : connected ? statusLabel : 'Idle'}
            {sessionId ? ` · ${sessionId.slice(0, 8)}` : ''}
          </span>
        </div>
        <div className="ai-detect-console__grid">
          <div className="ai-detect-console__row">
            <span className="ai-detect-console__label">Camera</span>
            <span className="ai-detect-console__value">{selected?.name || '—'}</span>
          </div>
          <div className="ai-detect-console__row">
            <span className="ai-detect-console__label">Status</span>
            <span className="ai-detect-console__value">{statusLabel}</span>
          </div>
          <div className="ai-detect-console__row">
            <span className="ai-detect-console__label">Current FPS</span>
            <span className="ai-detect-console__value">{connected ? fps.toFixed(1) : '—'}</span>
          </div>
          <div className="ai-detect-console__row">
            <span className="ai-detect-console__label">Latency</span>
            <span className="ai-detect-console__value">{latencyMs ? `${Math.round(latencyMs)} ms` : '—'}</span>
          </div>
          <div className="ai-detect-console__row">
            <span className="ai-detect-console__label">Objects</span>
            <span className="ai-detect-console__value">{String(objectCount)}</span>
          </div>
          <div className="ai-detect-console__row">
            <span className="ai-detect-console__label">Vehicles</span>
            <span className="ai-detect-console__value">
              {String(
                (liveResult as any)?.vehicles?.length
                ?? (Array.isArray((liveResult as any)?.detected_vehicles)
                  ? (liveResult as any).detected_vehicles.length
                  : 0),
              )}
            </span>
          </div>
          <div className="ai-detect-console__row">
            <span className="ai-detect-console__label">OCR / Plate</span>
            <span className="ai-detect-console__value">
              {liveResult?.detected_plate
                ? `${liveResult.detected_plate}${liveResult.plate_confidence ? ` (${Number(liveResult.plate_confidence).toFixed(0)}%)` : ''}`
                : '—'}
            </span>
          </div>
          <div className="ai-detect-console__row">
            <span className="ai-detect-console__label">Confidence</span>
            <span className="ai-detect-console__value">
              {liveResult?.confidence != null ? `${Number(liveResult.confidence).toFixed(1)}%` : '—'}
            </span>
          </div>
          <div className="ai-detect-console__row">
            <span className="ai-detect-console__label">Violation</span>
            <span className="ai-detect-console__value">
              {liveResult?.violation_evaluation?.is_violation
                ? String((liveResult.violation_evaluation as any).title || (liveResult.violation_evaluation as any).violation_type || 'Yes')
                : 'None'}
            </span>
          </div>
          <div className="ai-detect-console__row">
            <span className="ai-detect-console__label">Recording</span>
            <span className="ai-detect-console__value">{recording ? 'ON' : 'OFF'}</span>
          </div>
          <div className="ai-detect-console__row">
            <span className="ai-detect-console__label">Current Time</span>
            <span className="ai-detect-console__value">
              {lastPingAt ? new Date(lastPingAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
            </span>
          </div>
          <div className="ai-detect-console__row">
            <span className="ai-detect-console__label">Road</span>
            <span className="ai-detect-console__value">{selected?.road_name || selected?.street || '—'}</span>
          </div>
        </div>
        <div className="ai-detect-console__legend">
          <span><i className="is-sign" /> Sign</span>
          <span><i className="is-vehicle" /> Vehicle</span>
          <span><i className="is-plate" /> Plate</span>
          <span><i className="is-violation" /> Violation</span>
        </div>
        <div className="ai-detect-console__actions">
          <Button type="button" size="sm" onClick={() => void runDetection()} disabled={!src || detecting || disabled}>
            {detecting ? <Loader2 size={14} className="animate-spin" /> : <Scan size={14} />}
            Detect & Save
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void handleScreenshot()} disabled={!src || disabled}>
            <CamIcon size={14} /> Save Evidence
          </Button>
          <Button
            type="button"
            size="sm"
            variant={recording ? 'destructive' : 'outline'}
            onClick={() => void toggleRecording()}
            disabled={!connected || disabled}
          >
            <Circle size={14} className={recording ? 'fill-current' : ''} />
            {recording ? 'Stop Recording' : 'Start Recording'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!liveResult}
            onClick={() => {
              if (!liveResult) return;
              const blob = new Blob([JSON.stringify(liveResult, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `live-detection-${selected?.code || Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download JSON
          </Button>
        </div>
      </section>

      <section className="ai-center-camera-card__config-slim">
        <DemoObservedActionSelect
          value={demoObservedAction}
          onChange={onDemoObservedActionChange}
          disabled={detecting || disabled}
        />
      </section>
    </div>
  );
}
