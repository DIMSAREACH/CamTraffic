import { useRef, useState } from 'react';
import { Film, Upload, Loader2, Play } from 'lucide-react';
import { AiCenterDetectButton } from '@shared/components/ai/center/AiCenterDetectButton';
import { DemoObservedActionSelect } from '@shared/components/ai/DemoObservedActionSelect';
import { useLanguage } from '@shared/context/LanguageContext';
import { buildDemoViolationOptions } from '@shared/constants/observedActions';
import { aiAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';
import { cn } from '@shared/components/ui/utils';

const MAX_VIDEO_MB = 500;

interface VideoUploadPanelProps {
  demoObservedAction: string;
  onDemoObservedActionChange: (v: string) => void;
  onResult: (result: CenterDetectionResult, previewUrl: string) => void;
  onDetectingChange: (v: boolean) => void;
  onPreviewChange?: (url: string | null) => void;
  onRegisterAbort?: (abort: (() => void) | null) => void;
  disabled?: boolean;
  layout?: 'default' | 'enterprise';
}

export function VideoUploadPanel({
  demoObservedAction,
  onDemoObservedActionChange,
  onResult,
  onDetectingChange,
  onPreviewChange,
  onRegisterAbort,
  disabled = false,
  layout = 'enterprise',
}: VideoUploadPanelProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confidence, setConfidence] = useState(0.5);
  const [enableOcr, setEnableOcr] = useState(true);
  const [enableTracking, setEnableTracking] = useState(true);
  const [enableViolation, setEnableViolation] = useState(true);
  const [maxFrames, setMaxFrames] = useState(6);

  // Parent keeps using the blob after this panel unmounts during processing.
  const handleFile = (f: File | null) => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setFile(f);
    const url = f ? URL.createObjectURL(f) : null;
    previewRef.current = url;
    setPreview(url);
    onPreviewChange?.(url);
  };

  const runDetection = async () => {
    if (!file) {
      toast.error(t('aiCenter.videoRequired'));
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(t('aiCenter.videoTooLarge', { mb: MAX_VIDEO_MB }));
      return;
    }
    setDetecting(true);
    onDetectingChange(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    onRegisterAbort?.(() => controller.abort());
    try {
      const result = await aiAPI.detectVideo(file, {
        ...buildDemoViolationOptions(demoObservedAction, { enabled: enableViolation }),
        confidence,
        max_frames: maxFrames,
        enable_ocr: enableOcr,
        enable_tracking: enableTracking,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      onResult({
        ...result,
        video_ui_settings: {
          model: 'YOLOv11',
          confidence,
          ocr: enableOcr,
          tracking: enableTracking,
          violation: enableViolation,
          max_frames: maxFrames,
        },
      } as CenterDetectionResult, preview || '');
      toast.success(t('aiCenter.detectSuccess'));
      if ((result as { violation_error?: string }).violation_error) {
        toast.message(String((result as { violation_error?: string }).violation_error));
      }
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')
        || (err instanceof Error && /abort/i.test(err.message))) {
        toast.message(t('aiCenter.detectCancelled') !== 'aiCenter.detectCancelled'
          ? t('aiCenter.detectCancelled')
          : 'Video detection cancelled');
      } else {
        toast.error(t('aiCenter.detectFailed'));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      onRegisterAbort?.(null);
      setDetecting(false);
      onDetectingChange(false);
    }
  };

  const L = (key: string, fallback: string) => {
    const v = t(key);
    return v !== key ? v : fallback;
  };

  const configSection = (
    <section className="ai-center-upload-card__config">
      <DemoObservedActionSelect
        value={demoObservedAction}
        onChange={onDemoObservedActionChange}
        disabled={detecting || disabled || !enableViolation}
      />
      <div className="ai-center-video-inline-settings">
        <label className="ai-center-video-inline-settings__row">
          <span>{L('aiCenter.video.confidence', 'Confidence')}</span>
          <strong>{confidence.toFixed(2)}</strong>
          <input
            type="range"
            min={0.25}
            max={0.9}
            step={0.05}
            value={confidence}
            disabled={detecting || disabled}
            onChange={(e) => setConfidence(Number(e.target.value))}
          />
        </label>
        <label className="ai-center-video-inline-settings__row">
          <span>{L('aiCenter.video.maxFrames', 'Frames')}</span>
          <strong>{maxFrames}</strong>
          <input
            type="range"
            min={2}
            max={16}
            step={1}
            value={maxFrames}
            disabled={detecting || disabled}
            onChange={(e) => setMaxFrames(Number(e.target.value))}
          />
        </label>
        <div className="ai-center-video-inline-settings__checks">
          <label>
            <input
              type="checkbox"
              checked={enableOcr}
              disabled={detecting || disabled}
              onChange={(e) => setEnableOcr(e.target.checked)}
            />
            {L('aiCenter.video.enableOcr', 'OCR')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={enableTracking}
              disabled={detecting || disabled}
              onChange={(e) => setEnableTracking(e.target.checked)}
            />
            {L('aiCenter.video.enableTracking', 'Tracking')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={enableViolation}
              disabled={detecting || disabled}
              onChange={(e) => setEnableViolation(e.target.checked)}
            />
            {L('aiCenter.video.enableViolation', 'Violation')}
          </label>
        </div>
      </div>
    </section>
  );

  const dropzone = (
    <button
      type="button"
      className={cn(
        'ai-center-dropzone ai-center-dropzone--rose',
        dragging && 'ai-center-dropzone--drag',
        preview && 'ai-center-dropzone--has-preview',
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
      disabled={detecting || disabled}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        <video
          src={preview}
          className="ai-center-dropzone__video"
          controls
          muted
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <span className="ai-center-dropzone__icon-wrap" aria-hidden>
            <Film size={28} strokeWidth={1.75} className="ai-center-dropzone__icon" />
          </span>
          <p className="ai-center-dropzone__title">{t('aiCenter.videoDropTitle')}</p>
          <p className="ai-center-dropzone__hint">{t('aiCenter.videoDropHint')}</p>
          <span className="ai-center-dropzone__browse">{t('aiDetection.inputPanelDropBrowse')}</span>
        </>
      )}
    </button>
  );

  const footerSection = (
    <footer className="ai-center-upload-card__footer">
      {file ? (
        <div className="ai-center-file-chip" title={file.name}>
          <Upload size={15} aria-hidden />
          <span className="ai-center-file-chip__name">{file.name}</span>
        </div>
      ) : null}
      <AiCenterDetectButton
        tone="rose"
        className={cn('ai-center-upload-card__cta', !file && 'ai-center-upload-card__cta--solo')}
        onClick={() => void runDetection()}
        disabled={!file || detecting || disabled}
      >
        {detecting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
        {detecting ? t('aiCenter.analyzingVideo') : t('aiCenter.runVideoDetection')}
      </AiCenterDetectButton>
    </footer>
  );

  if (layout === 'enterprise') {
    return (
      <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--rose ai-center-upload-card--enterprise">
        <div className="enterprise-ai-split__source">
          {configSection}
          {footerSection}
        </div>
        <section className="ai-center-upload-card__main enterprise-ai-split__preview">
          {dropzone}
        </section>
      </div>
    );
  }

  return (
    <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--rose">
      {configSection}
      <section className="ai-center-upload-card__main">
        {dropzone}
      </section>
      {footerSection}
    </div>
  );
}
