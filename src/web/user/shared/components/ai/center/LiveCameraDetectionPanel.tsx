import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Cctv, Loader2, MapPin, Pause, Play, Plug, PlugZap, RefreshCw, Scan, Camera as CamIcon,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import { AiCenterDetectButton } from '@shared/components/ai/center/AiCenterDetectButton';
import { DemoObservedActionSelect } from '@shared/components/ai/DemoObservedActionSelect';
import { buildDemoViolationOptions } from '@shared/constants/observedActions';
import { useLanguage } from '@shared/context/LanguageContext';
import { camerasAPI } from '@shared/services/api';
import { resolveCameraFrameUrl } from '@shared/constants/cameraFrameDemo';
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

const INTERVAL_OPTIONS = [2000, 3000, 5000] as const;

function frameUrl(base: string, tick: number) {
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}_t=${tick}`;
}

export function LiveCameraDetectionPanel({
  demoObservedAction,
  onDemoObservedActionChange,
  onResult,
  onDetectingChange,
  disabled = false,
}: LiveCameraDetectionPanelProps) {
  const { t } = useLanguage();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [intervalMs, setIntervalMs] = useState<number>(3000);
  const [autoSave, setAutoSave] = useState(false);
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);
  const [failStreak, setFailStreak] = useState(0);
  const [lastPreview, setLastPreview] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const inFlight = useRef(false);
  const lastDetectMs = useRef(0);
  const backoffUntil = useRef(0);

  const loadCameras = useCallback(async () => {
    setLoading(true);
    try {
      const data = await camerasAPI.getAll();
      const active = data.filter((c) => c.status === 'active');
      setCameras(active.length ? active : data);
      setSelectedId((prev) => {
        if (prev && data.some((c) => c.id === prev)) return prev;
        return (active[0] ?? data[0])?.id ?? null;
      });
    } catch {
      toast.error(t('aiCenter.cameraLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadCameras(); }, [loadCameras]);

  // Preview refresh while connected
  useEffect(() => {
    if (!connected) return undefined;
    const id = window.setInterval(() => setTick((n) => n + 1), Math.max(2000, intervalMs));
    return () => window.clearInterval(id);
  }, [connected, intervalMs]);

  const selected = cameras.find((c) => c.id === selectedId) ?? null;
  const src = selected
    ? frameUrl(resolveCameraFrameUrl(selected.frame_source_url, selected), tick)
    : '';

  const cameraOnline = selected ? selected.status === 'active' : false;

  const runDetection = useCallback(async (opts?: { silent?: boolean }) => {
    if (!selected || !src || inFlight.current) {
      if (!opts?.silent && !selected) toast.error(t('aiCenter.selectCamera'));
      return;
    }
    if (Date.now() < backoffUntil.current) return;

    const frameUrlRaw = (selected.frame_source_url || '').trim();
    if (!frameUrlRaw) {
      if (!opts?.silent) {
        toast.error(t('aiCenter.cameraNoUrl') !== 'aiCenter.cameraNoUrl'
          ? t('aiCenter.cameraNoUrl')
          : 'Camera has no frame_source_url — set an HTTP snapshot, RTSP, or /demo-cameras/… path');
      }
      return;
    }

    inFlight.current = true;
    setDetecting(true);
    onDetectingChange(true);
    const persist = Boolean(autoSave || !opts?.silent);
    const extra: Record<string, string> = {
      live_scan: persist ? 'false' : 'true',
      save_log: persist ? 'true' : 'false',
    };
    const demoOpts = buildDemoViolationOptions(demoObservedAction, {
      autoCreate: persist && Boolean(demoObservedAction?.trim()),
    });
    if (demoOpts.observed_action) extra.observed_action = demoOpts.observed_action;
    if (demoOpts.demo_violation) extra.demo_violation = 'true';
    if (demoOpts.auto_create_violation) extra.auto_create_violation = 'true';
    try {
      const res = (await camerasAPI.processFrame(String(selected.id), extra)) as CenterDetectionResult;
      const preview =
        res.processed_image ||
        res.annotated_processed_image ||
        res.uploaded_image ||
        src;
      setLastPreview(preview);
      onResult(res, preview);
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
        toast.message(t('aiCenter.violationFoundToast') !== 'aiCenter.violationFoundToast'
          ? t('aiCenter.violationFoundToast')
          : 'Violation detected on live camera');
      }
      if (res.violation_error && !opts?.silent) {
        toast.message(String(res.violation_error));
      }
      if ((res.detected_plate == null || res.detected_plate === '') && opts?.silent) {
        // weak OCR — silent loop, no spam
      } else if ((res.detected_plate == null || res.detected_plate === '') && !opts?.silent) {
        toast.message(t('aiCenter.ocrWeak') !== 'aiCenter.ocrWeak'
          ? t('aiCenter.ocrWeak')
          : 'No plate OCR on this frame');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/offline|unavailable|rtsp|timeout|connect|502|capture/i.test(msg)) {
        toast.error(t('aiCenter.cameraOffline') !== 'aiCenter.cameraOffline'
          ? t('aiCenter.cameraOffline')
          : 'Camera offline or frame capture failed');
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
      setDetecting(false);
      onDetectingChange(false);
    }
  }, [selected, src, demoObservedAction, autoSave, onDetectingChange, onResult, t]);

  // Continuous detection loop while connected & not paused
  useEffect(() => {
    if (!connected || paused || disabled) return undefined;
    const id = window.setInterval(() => {
      void runDetection({ silent: true });
    }, intervalMs);
    // Kick once on connect
    void runDetection({ silent: true });
    return () => window.clearInterval(id);
  }, [connected, paused, disabled, intervalMs, runDetection]);

  const handleConnect = () => {
    if (!selected) {
      toast.error(t('aiCenter.selectCamera'));
      return;
    }
    if (!cameraOnline && selected.status === 'inactive') {
      toast.error(t('aiCenter.cameraOffline') !== 'aiCenter.cameraOffline'
        ? t('aiCenter.cameraOffline')
        : 'Selected camera is offline');
      return;
    }
    setConnected(true);
    setPaused(false);
    setFailStreak(0);
    backoffUntil.current = 0;
    toast.success(t('aiCenter.cameraConnected') !== 'aiCenter.cameraConnected'
      ? t('aiCenter.cameraConnected')
      : 'Live camera connected');
  };

  const handleDisconnect = () => {
    setConnected(false);
    setPaused(false);
    setFps(0);
    toast.message(t('aiCenter.cameraDisconnected') !== 'aiCenter.cameraDisconnected'
      ? t('aiCenter.cameraDisconnected')
      : 'Live camera disconnected');
  };

  const handleScreenshot = () => {
    const url = lastPreview || src;
    if (!url) {
      toast.error(t('aiCenter.noFeed'));
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-camera-${selected?.code || selected?.id || 'shot'}-${Date.now()}.jpg`;
    a.click();
    toast.success(t('aiCenter.screenshotSaved') !== 'aiCenter.screenshotSaved'
      ? t('aiCenter.screenshotSaved')
      : 'Screenshot downloaded');
    if (autoSave && lastPreview) {
      // auto-save already captured last detection via onResult; toast only
      toast.message(t('aiCenter.autoSaveOn') !== 'aiCenter.autoSaveOn'
        ? t('aiCenter.autoSaveOn')
        : 'Auto-save keeps latest detection in results');
    }
  };

  if (loading) {
    return (
      <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--cyan ai-center-input-panel--centered">
        <Loader2 size={32} className="animate-spin text-cyan-600" />
        <p className="ai-center-camera-card__state-text">{t('aiCenter.loadingCameras')}</p>
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--cyan ai-center-input-panel--centered">
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
    ? (t('aiCenter.statusDisconnected') !== 'aiCenter.statusDisconnected' ? t('aiCenter.statusDisconnected') : 'Disconnected')
    : paused
      ? (t('aiCenter.statusPaused') !== 'aiCenter.statusPaused' ? t('aiCenter.statusPaused') : 'Paused')
      : failStreak > 0
        ? (t('aiCenter.statusReconnecting') !== 'aiCenter.statusReconnecting' ? t('aiCenter.statusReconnecting') : 'Reconnecting…')
        : (t('aiCenter.statusLive') !== 'aiCenter.statusLive' ? t('aiCenter.statusLive') : 'Live');

  return (
    <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--cyan ai-center-camera-card">
      <section className="ai-center-upload-card__config">
        <DemoObservedActionSelect
          value={demoObservedAction}
          onChange={onDemoObservedActionChange}
          disabled={detecting || disabled}
        />
        <div className="ai-center-camera-card__controls">
          <label className="ai-center-camera-card__interval">
            <span>{t('aiCenter.detectInterval') !== 'aiCenter.detectInterval' ? t('aiCenter.detectInterval') : 'Interval'}</span>
            <FilterSelect
              tone="teal"
              size="sm"
              value={String(intervalMs)}
              onValueChange={(v) => setIntervalMs(Number(v))}
              disabled={disabled}
              ariaLabel={t('aiCenter.detectInterval') !== 'aiCenter.detectInterval' ? t('aiCenter.detectInterval') : 'Interval'}
              options={INTERVAL_OPTIONS.map((ms) => ({
                value: String(ms),
                label: `${ms / 1000}s`,
              }))}
            />
          </label>
          <label className="ai-center-camera-card__autosave">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              disabled={disabled}
            />
            <span>{t('aiCenter.autoSave') !== 'aiCenter.autoSave' ? t('aiCenter.autoSave') : 'Auto-save detections'}</span>
          </label>
        </div>
      </section>

      <section className="ai-center-camera-card__picker" aria-label={t('cameras.listTitle')}>
        <div className="ai-center-camera-card__picker-head">
          <div>
            <h3 className="ai-center-camera-card__picker-title">{t('cameras.listTitle')}</h3>
            <p className="ai-center-camera-card__picker-desc">{t('cameras.listSubtitle')}</p>
          </div>
          <button
            type="button"
            className="ai-center-camera-card__refresh"
            onClick={() => void loadCameras()}
            disabled={detecting || disabled || connected}
            title={t('cameras.reloadList')}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="ai-center-camera-list" role="listbox" aria-label={t('cameras.switchCamera')}>
          {cameras.map((cam) => {
            const active = cam.id === selectedId;
            return (
              <button
                key={cam.id}
                type="button"
                role="option"
                aria-selected={active}
                className={cn('ai-center-camera-item', active && 'ai-center-camera-item--active')}
                onClick={() => {
                  if (connected) return;
                  setSelectedId(cam.id);
                }}
                disabled={detecting || disabled || connected}
              >
                <span className="ai-center-camera-item__icon" aria-hidden>
                  <Cctv size={17} strokeWidth={2} />
                </span>
                <span className="ai-center-camera-item__copy">
                  <span className="ai-center-camera-item__name">{cam.name}</span>
                  <span className="ai-center-camera-item__road">
                    <MapPin size={11} aria-hidden />
                    {cam.road_name}
                    <span className={cn(
                      'ai-center-camera-item__status',
                      cam.status === 'active' ? 'is-online' : 'is-offline',
                    )}>
                      {cam.status}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="ai-center-camera-card__preview-wrap">
        <div className="ai-center-camera-preview">
          {src ? (
            <>
              <img src={lastPreview || src} alt={selected?.name || ''} className="ai-center-camera-preview__img" />
              <div className="ai-center-camera-preview__overlay">
                <span className={cn('ai-center-camera-preview__live', connected && !paused && 'is-on')}>
                  <span className="ai-center-camera-preview__live-dot" aria-hidden />
                  {statusLabel}
                </span>
                <div className="ai-center-camera-preview__meta">
                  <p className="ai-center-camera-preview__title">{selected?.name}</p>
                  <p className="ai-center-camera-preview__road">
                    {selected?.road_name}
                    {connected ? ` · ${fps.toFixed(1)} det/s` : ''}
                    {lastPingAt ? ` · ${new Date(lastPingAt).toLocaleTimeString()}` : ''}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="ai-center-camera-preview__empty">
              <Cctv size={28} strokeWidth={1.5} />
              <p>{t('aiCenter.noFeed')}</p>
            </div>
          )}
        </div>
      </section>

      <footer className="ai-center-upload-card__footer ai-center-camera-card__footer">
        {selected ? (
          <div className="ai-center-file-chip ai-center-file-chip--camera" title={selected.name}>
            <Cctv size={15} aria-hidden />
            <span className="ai-center-file-chip__name">{selected.name}</span>
          </div>
        ) : null}
        <div className="ai-center-camera-card__footer-actions">
          {!connected ? (
            <Button type="button" size="sm" className="gap-1.5" onClick={handleConnect} disabled={!selected || disabled}>
              <PlugZap size={14} />
              {t('aiCenter.connect') !== 'aiCenter.connect' ? t('aiCenter.connect') : 'Connect'}
            </Button>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={handleDisconnect} disabled={disabled}>
                <Plug size={14} />
                {t('aiCenter.disconnect') !== 'aiCenter.disconnect' ? t('aiCenter.disconnect') : 'Disconnect'}
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
                  ? (t('aiCenter.resumeDetect') !== 'aiCenter.resumeDetect' ? t('aiCenter.resumeDetect') : 'Resume')
                  : (t('aiCenter.pauseDetect') !== 'aiCenter.pauseDetect' ? t('aiCenter.pauseDetect') : 'Pause')}
              </Button>
            </>
          )}
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={handleScreenshot} disabled={!src || disabled}>
            <CamIcon size={14} />
            {t('aiCenter.screenshot') !== 'aiCenter.screenshot' ? t('aiCenter.screenshot') : 'Screenshot'}
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
    </div>
  );
}
