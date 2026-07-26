import { useCallback, useEffect, useMemo, useRef, useState, type Ref } from 'react';
import {
  Cctv, Loader2, MapPin, Pause, Play, Plug, PlugZap, RefreshCw, Scan, Camera as CamIcon,
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
  const [streamUrl, setStreamUrl] = useState('');
  const [protocol, setProtocol] = useState<'catalog' | 'rtsp' | 'http'>('catalog');
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
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);
  const inFlight = useRef(false);
  const lastDetectMs = useRef(0);
  const backoffUntil = useRef(0);

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
  const useAdhocStream = protocol !== 'catalog' && streamUrl.trim().length > 0;
  const resolvedSrc = useAdhocStream
    ? streamUrl.trim()
    : selected
      ? resolveCameraFrameUrl(selected.frame_source_url, selected)
      : '';
  const isVideoFeed = isCameraVideoUrl(selected?.frame_source_url) || isCameraVideoUrl(resolvedSrc)
    || /^rtsp/i.test(resolvedSrc);
  const src = resolvedSrc
    ? (isVideoFeed || useAdhocStream ? resolvedSrc : frameUrl(resolvedSrc, tick))
    : '';

  const cameraOnline = useAdhocStream ? true : (selected ? selected.status === 'active' : false);
  const overlayActive = Boolean(connected && liveResult);
  const mediaFit = useContainFitRect(mediaRef, overlayActive || connected);

  const overlayItems = useMemo(
    () => buildDetectionOverlay(liveResult, locale === 'en' ? 'en' : 'km'),
    [liveResult, locale],
  );

  const vehicleCrop = liveResult?.vehicle_snapshot || '';
  const plateCrop = liveResult?.plate_snapshot || '';
  const annotatedStill = liveResult?.annotated_processed_image || lastPreview || '';
  const objectCount = overlayItems.length;

  const runDetection = useCallback(async (opts?: { silent?: boolean }) => {
    if ((!selected && !useAdhocStream) || !src || inFlight.current) {
      if (!opts?.silent && !selected && !useAdhocStream) toast.error(t('aiCenter.selectCamera'));
      return;
    }
    if (Date.now() < backoffUntil.current) return;

    const frameUrlRaw = useAdhocStream
      ? streamUrl.trim()
      : (selected?.frame_source_url || '').trim();
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
        !useAdhocStream
        && isVideoFeed
        && mediaEl instanceof HTMLVideoElement
        && mediaEl.readyState >= 2
        && mediaEl.videoWidth > 0,
      );
      if (useClientFrame) {
        const file = await captureMediaFrame(mediaEl as HTMLVideoElement, {
          maxEdge: silent ? 640 : 960,
          filenamePrefix: `webcam-street-${selected?.code || 'cam'}`,
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
          camera_id: Number(selected?.id) || undefined,
        })) as CenterDetectionResult;
      } else if (useAdhocStream) {
        res = (await camerasAPI.processStreamUrl(frameUrlRaw, extra)) as CenterDetectionResult;
      } else {
        res = (await camerasAPI.processFrame(String(selected!.id), extra)) as CenterDetectionResult;
      }
      const preview =
        res.annotated_processed_image ||
        res.processed_image ||
        res.uploaded_image ||
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
        if (dt > 0) setFps(Math.min(30, 1 / dt));
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
  }, [selected, src, demoObservedAction, autoSave, onResult, t, isVideoFeed, useAdhocStream, streamUrl]);

  useEffect(() => {
    if (!connected || paused || disabled) return undefined;
    const id = window.setInterval(() => {
      void runDetection({ silent: true });
    }, intervalMs);
    void runDetection({ silent: true });
    return () => window.clearInterval(id);
  }, [connected, paused, disabled, intervalMs, runDetection]);

  const handleConnect = () => {
    if (!useAdhocStream && !selected) {
      toast.error(t('aiCenter.selectCamera'));
      return;
    }
    if (useAdhocStream && !streamUrl.trim()) {
      toast.error(label(t, 'aiCenter.streamUrlRequired', 'Enter RTSP or HTTP stream URL'));
      return;
    }
    if (!useAdhocStream && !cameraOnline && selected?.status === 'inactive') {
      toast.error(label(t, 'aiCenter.cameraOffline', 'Selected camera is offline'));
      return;
    }
    setConnected(true);
    setPaused(false);
    setFailStreak(0);
    backoffUntil.current = 0;
    toast.success(label(t, 'aiCenter.cameraConnected', 'Live camera connected'));
  };

  const handleDisconnect = () => {
    setConnected(false);
    setPaused(false);
    setFps(0);
    setLiveResult(null);
    setScanning(false);
    toast.message(label(t, 'aiCenter.cameraDisconnected', 'Live camera disconnected'));
  };

  const handleScreenshot = () => {
    const url = annotatedStill || lastPreview || src;
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

  if (loading) {
    return (
      <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--cyan ai-center-camera-card ai-center-camera-card--theater ai-center-input-panel--centered">
        <Loader2 size={32} className="animate-spin text-cyan-600" />
        <p className="ai-center-camera-card__state-text">{t('aiCenter.loadingCameras')}</p>
      </div>
    );
  }

  if (cameras.length === 0 && protocol === 'catalog') {
    return (
      <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--cyan ai-center-camera-card ai-center-camera-card--theater ai-center-input-panel--centered">
        <span className="ai-center-camera-card__empty-icon" aria-hidden>
          <Cctv size={32} strokeWidth={1.5} />
        </span>
        <p className="ai-center-camera-card__state-text">{t('aiCenter.noCameras')}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setProtocol('rtsp')}
          className="gap-1.5"
        >
          {label(t, 'aiCenter.useStreamUrl', 'Use RTSP / HTTP URL')}
        </Button>
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
    <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--cyan ai-center-camera-card ai-center-camera-card--theater">
      <header className="ai-center-camera-toolbar">
        <label className="ai-center-camera-toolbar__field">
          <span className="ai-center-camera-toolbar__label">
            {label(t, 'aiCenter.sourceProtocol', 'Source')}
          </span>
          <FilterSelect
            tone="teal"
            size="sm"
            value={protocol}
            onValueChange={(v) => {
              if (connected) return;
              setProtocol(v as 'catalog' | 'rtsp' | 'http');
              setLiveResult(null);
              setLastPreview(null);
            }}
            disabled={detecting || disabled || connected}
            ariaLabel={label(t, 'aiCenter.sourceProtocol', 'Source')}
            options={[
              { value: 'catalog', label: label(t, 'aiCenter.sourceCatalog', 'Registered camera') },
              { value: 'rtsp', label: 'RTSP / IP' },
              { value: 'http', label: 'HTTP / CCTV snapshot' },
            ]}
          />
        </label>

        {protocol === 'catalog' ? (
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
        ) : (
          <label className="ai-center-camera-toolbar__field ai-center-camera-toolbar__field--cam" style={{ flex: 1, minWidth: 220 }}>
            <span className="ai-center-camera-toolbar__label">
              {protocol === 'rtsp' ? 'RTSP URL' : 'HTTP URL'}
            </span>
            <input
              type="url"
              className="ai-center-camera-toolbar__url-input"
              placeholder={protocol === 'rtsp' ? 'rtsp://user:pass@ip:554/stream' : 'http://ip/snapshot.jpg'}
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              disabled={detecting || disabled || connected}
              aria-label={label(t, 'aiCenter.streamUrl', 'Stream URL')}
            />
          </label>
        )}

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
            {connected ? <span>{fps.toFixed(1)} det/s</span> : null}
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
            <Button type="button" size="sm" className="gap-1.5" onClick={handleConnect} disabled={!selected || disabled}>
              <PlugZap size={14} />
              {label(t, 'aiCenter.connect', 'Connect')}
            </Button>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={handleDisconnect} disabled={disabled}>
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
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleScreenshot}
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
