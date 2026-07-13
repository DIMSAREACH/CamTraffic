import { useRef, useState } from 'react';
import { ImageIcon, Upload, Loader2, Scan } from 'lucide-react';
import { AiCenterDetectButton } from '@shared/components/ai/center/AiCenterDetectButton';
import { DemoObservedActionSelect } from '@shared/components/ai/DemoObservedActionSelect';
import { DetectionDisplayImage } from '@shared/components/ai/DetectionDisplayImage';
import { useLanguage } from '@shared/context/LanguageContext';
import { aiAPI } from '@shared/services/api';
import { convertImageToJpeg } from '@shared/utils/convertImageToJpeg';
import { toast } from 'sonner';
import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';
import { cn } from '@shared/components/ui/utils';

const MAX_IMAGE_MB = 10;

interface ImageUploadPanelProps {
  demoObservedAction: string;
  onDemoObservedActionChange: (v: string) => void;
  onResult: (result: CenterDetectionResult, previewUrl: string) => void;
  onDetectingChange: (v: boolean) => void;
  disabled?: boolean;
  layout?: 'default' | 'enterprise';
  /** When layout=enterprise: controls = config+run only, preview = dropzone only */
  surface?: 'full' | 'controls' | 'preview';
}

export function ImageUploadPanel({
  demoObservedAction,
  onDemoObservedActionChange,
  onResult,
  onDetectingChange,
  disabled = false,
  layout = 'default',
  surface = 'full',
}: ImageUploadPanelProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const handleFile = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const runDetection = async () => {
    if (!file) {
      toast.error(t('aiCenter.imageRequired'));
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(t('aiCenter.imageTooLarge', { mb: MAX_IMAGE_MB }));
      return;
    }
    setDetecting(true);
    onDetectingChange(true);
    try {
      const jpeg = await convertImageToJpeg(file);
      const result = await aiAPI.detect(jpeg, {
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

  const configSection = (
    <section className="ai-center-upload-card__config">
      <DemoObservedActionSelect
        value={demoObservedAction}
        onChange={onDemoObservedActionChange}
        disabled={detecting || disabled}
      />
    </section>
  );

  const dropzone = (
    <button
      type="button"
      className={cn(
        'ai-center-dropzone ai-center-dropzone--violet',
        dragging && 'ai-center-dropzone--drag',
        preview && 'ai-center-dropzone--has-preview',
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f?.type.startsWith('image/')) handleFile(f);
      }}
      disabled={detecting || disabled}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        <DetectionDisplayImage src={preview} alt="" variant="preview" fill className="ai-center-dropzone__preview" />
      ) : (
        <>
          <span className="ai-center-dropzone__icon-wrap" aria-hidden>
            <ImageIcon size={28} strokeWidth={1.75} className="ai-center-dropzone__icon" />
          </span>
          <p className="ai-center-dropzone__title">{t('aiCenter.imageDropTitle')}</p>
          <p className="ai-center-dropzone__hint">{t('aiCenter.imageDropHint')}</p>
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
        tone="violet"
        className={cn('ai-center-upload-card__cta', !file && 'ai-center-upload-card__cta--solo')}
        onClick={() => void runDetection()}
        disabled={!file || detecting || disabled}
      >
        {detecting ? <Loader2 size={18} className="animate-spin" /> : <Scan size={18} />}
        {detecting ? t('aiCenter.analyzing') : t('aiCenter.runDetection')}
      </AiCenterDetectButton>
    </footer>
  );

  if (layout === 'enterprise') {
    if (surface === 'controls') {
      return (
        <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--violet ai-center-upload-card--controls-only">
          {configSection}
          {footerSection}
        </div>
      );
    }
    if (surface === 'preview') {
      return (
        <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--violet ai-center-upload-card--preview-only">
          <section className="ai-center-upload-card__main enterprise-ai-split__preview">
            {dropzone}
          </section>
        </div>
      );
    }
    return (
      <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--violet ai-center-upload-card--enterprise">
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
    <div className="ai-center-input-panel ai-center-upload-card ai-center-upload-card--violet">
      {configSection}
      <section className="ai-center-upload-card__main">
        {dropzone}
      </section>
      {footerSection}
    </div>
  );
}
