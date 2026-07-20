import type { ReactNode } from 'react';
import { Upload, Film, Cctv, Camera } from 'lucide-react';
import { DetectionSourcePanel } from '@shared/components/ai/center/DetectionSourcePanel';
import { useLanguage } from '@shared/context/LanguageContext';
import { cn } from '@shared/components/ui/utils';

export type EnterpriseInputMode = 'image' | 'video' | 'webcam' | 'camera';
const INPUT_MODES: { id: EnterpriseInputMode; icon: typeof Upload }[] = [
  { id: 'image', icon: Upload },
  { id: 'video', icon: Film },
  { id: 'webcam', icon: Camera },
  { id: 'camera', icon: Cctv },
];

interface EnterpriseDetectionInputWorkspaceProps {
  inputMode: EnterpriseInputMode;
  onInputModeChange: (mode: EnterpriseInputMode) => void;
  detecting: boolean;
  disabled?: boolean;
  sourceControls?: ReactNode;
  previewContent: ReactNode;
  processingOverlay?: ReactNode;
}

export function EnterpriseDetectionInputWorkspace({
  inputMode,
  onInputModeChange,
  detecting,
  disabled = false,
  sourceControls,
  previewContent,
  processingOverlay,
}: EnterpriseDetectionInputWorkspaceProps) {
  const { t } = useLanguage();
  const PreviewIcon = INPUT_MODES.find((m) => m.id === inputMode)?.icon ?? Upload;

  return (
    <div className="enterprise-ai-workspace">
      <aside className="enterprise-ai-workspace__source enforcement-page__panel">
        <DetectionSourcePanel
          selectedMode={inputMode}
          onSelect={onInputModeChange}
          disabled={detecting || disabled}
          variant="inline"
        />
        {sourceControls ? (
          <div className="enterprise-ai-workspace__source-controls">
            {sourceControls}
          </div>
        ) : null}
      </aside>

      <section className={cn(
        'enterprise-ai-workspace__preview',
        'enforcement-page__panel',
        `enterprise-ai-workspace__preview--${inputMode}`,
      )}>
        <header className={cn(
          'enterprise-ai-workspace__preview-head',
          `enterprise-ai-workspace__preview-head--${inputMode}`,
        )}>
          <span
            className={cn('enterprise-ai-chart-dot', `enterprise-ai-chart-dot--${inputMode}`)}
            aria-hidden
          />
          <div className="enterprise-ai-workspace__head-copy">
            <h2 className="enterprise-ai-workspace__preview-title">
              {t('aiCenter.detectionPreview')}
            </h2>
            <p className="enterprise-ai-workspace__source-hint">
              {t(`aiCenter.preview.${inputMode}`)}
            </p>
          </div>
          <div className={cn(
            'enterprise-ai-workspace__head-icon',
            `enterprise-ai-workspace__head-icon--${inputMode}`,
          )}>
            <PreviewIcon size={16} />
          </div>
        </header>
        <div className="enterprise-ai-workspace__preview-body">
          {detecting && processingOverlay ? processingOverlay : previewContent}
        </div>
      </section>
    </div>
  );
}
