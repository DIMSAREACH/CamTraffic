import { useRef, useState } from 'react';
import { Film, Upload, Loader2, Play } from 'lucide-react';
import { AiCenterDetectButton } from '@shared/components/ai/center/AiCenterDetectButton';
import { DemoObservedActionSelect } from '@shared/components/ai/DemoObservedActionSelect';
import { useLanguage } from '@shared/context/LanguageContext';
import { aiAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';
import { cn } from '@shared/components/ui/utils';

const MAX_VIDEO_MB = 50;

interface VideoUploadPanelProps {
  demoObservedAction: string;
  onDemoObservedActionChange: (v: string) => void;
  onResult: (result: CenterDetectionResult, previewUrl: string) => void;
  onDetectingChange: (v: boolean) => void;
  disabled?: boolean;
}

export function VideoUploadPanel({
  demoObservedAction,
  onDemoObservedActionChange,
  onResult,
  onDetectingChange,
  disabled = false,
}: VideoUploadPanelProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const handleFile = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
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
    try {
      const result = await aiAPI.detectVideo(file, {
        observed_action: demoObservedAction || undefined,
        demo_violation: !!demoObservedAction,
        auto_create_violation: true,
      });
      onResult(result as CenterDetectionResult, preview || '');
      toast.success(t('aiCenter.detectSuccess'));
    } catch {
      toast.error(t('aiCenter.detectFailed'));
    } finally {
      setDetecting(false);
      onDetectingChange(false);
    }
  };

  return (
    <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--rose">
      <section className="ai-center-upload-card__config">
        <DemoObservedActionSelect
          value={demoObservedAction}
          onChange={onDemoObservedActionChange}
          disabled={detecting || disabled}
        />
      </section>

      <section className="ai-center-upload-card__main">
        <button
          type="button"
          className={cn(
            'ai-center-dropzone ai-center-dropzone--rose',
            preview && 'ai-center-dropzone--has-preview',
          )}
          onClick={() => inputRef.current?.click()}
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
            <video src={preview} className="ai-center-dropzone__video" controls muted />
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
      </section>

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
    </div>
  );
}
