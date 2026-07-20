import { useCallback, useEffect, useState } from 'react';
import { Cctv, Loader2, MapPin, RefreshCw, Scan } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { AiCenterDetectButton } from '@shared/components/ai/center/AiCenterDetectButton';
import { DemoObservedActionSelect } from '@shared/components/ai/DemoObservedActionSelect';
import { useLanguage } from '@shared/context/LanguageContext';
import { camerasAPI } from '@shared/services/api';
import { detectFromImageUrl } from '@shared/hooks/useWebcamDetection';
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [detecting, setDetecting] = useState(false);

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

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, []);

  const selected = cameras.find((c) => c.id === selectedId) ?? null;
  const src = selected
    ? frameUrl(resolveCameraFrameUrl(selected.frame_source_url, selected), tick)
    : '';

  const runDetection = async () => {
    if (!selected || !src) {
      toast.error(t('aiCenter.selectCamera'));
      return;
    }
    setDetecting(true);
    onDetectingChange(true);
    try {
      const res = await detectFromImageUrl(src);
      onResult(res as CenterDetectionResult, src);
      toast.success(t('aiCenter.detectSuccess'));
    } catch {
      toast.error(t('aiCenter.detectFailed'));
    } finally {
      setDetecting(false);
      onDetectingChange(false);
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

  return (
    <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--cyan ai-center-camera-card">
      <section className="ai-center-upload-card__config">
        <DemoObservedActionSelect
          value={demoObservedAction}
          onChange={onDemoObservedActionChange}
          disabled={detecting || disabled}
        />
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
            disabled={detecting || disabled}
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
                onClick={() => setSelectedId(cam.id)}
                disabled={detecting || disabled}
              >
                <span className="ai-center-camera-item__icon" aria-hidden>
                  <Cctv size={17} strokeWidth={2} />
                </span>
                <span className="ai-center-camera-item__copy">
                  <span className="ai-center-camera-item__name">{cam.name}</span>
                  <span className="ai-center-camera-item__road">
                    <MapPin size={11} aria-hidden />
                    {cam.road_name}
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
              <img src={src} alt={selected?.name || ''} className="ai-center-camera-preview__img" />
              <div className="ai-center-camera-preview__overlay">
                <span className="ai-center-camera-preview__live">
                  <span className="ai-center-camera-preview__live-dot" aria-hidden />
                  {t('cameras.liveBadge')}
                </span>
                <div className="ai-center-camera-preview__meta">
                  <p className="ai-center-camera-preview__title">{selected?.name}</p>
                  <p className="ai-center-camera-preview__road">{selected?.road_name}</p>
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

      <footer className="ai-center-upload-card__footer">
        {selected ? (
          <div className="ai-center-file-chip ai-center-file-chip--camera" title={selected.name}>
            <Cctv size={15} aria-hidden />
            <span className="ai-center-file-chip__name">{selected.name}</span>
          </div>
        ) : null}
        <AiCenterDetectButton
          tone="cyan"
          className={cn('ai-center-upload-card__cta', !selected && 'ai-center-upload-card__cta--solo')}
          onClick={() => void runDetection()}
          disabled={!src || detecting || disabled}
        >
          {detecting ? <Loader2 size={18} className="animate-spin" /> : <Scan size={18} />}
          {detecting ? t('aiCenter.analyzing') : t('aiCenter.runCameraDetection')}
        </AiCenterDetectButton>
      </footer>
    </div>
  );
}
