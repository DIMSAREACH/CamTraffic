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
  const studioMode = inputMode === 'video' || inputMode === 'camera';

  return (
    <div
      className={cn(
        'enterprise-ai-workspace',
        'enterprise-ai-workspace--clean',
        studioMode && 'enterprise-ai-workspace--console',
      )}
    >
      <div className="enterprise-ai-workspace__modes enforcement-page__panel">
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
      </div>

      <section
        className={cn(
          'enterprise-ai-workspace__preview',
          'enforcement-page__panel',
          `enterprise-ai-workspace__preview--${inputMode}`,
        )}
      >
        {!studioMode && (
          <header
            className={cn(
              'enterprise-ai-workspace__preview-head',
              `enterprise-ai-workspace__preview-head--${inputMode}`,
            )}
          >
            <div className="enterprise-ai-workspace__head-copy">
              <h2 className="enterprise-ai-workspace__preview-title">
                {t(`aiCenter.input.${inputMode}`)}
              </h2>
              <p className="enterprise-ai-workspace__source-hint">
                {t(`aiCenter.preview.${inputMode}`)}
              </p>
            </div>
            <div
              className={cn(
                'enterprise-ai-workspace__head-icon',
                `enterprise-ai-workspace__head-icon--${inputMode}`,
              )}
            >
              <PreviewIcon size={16} />
            </div>
          </header>
        )}
        <div className="enterprise-ai-workspace__preview-body" data-mode={inputMode}>
          {detecting && processingOverlay ? processingOverlay : previewContent}
        </div>
      </section>
    </div>
  );
}
