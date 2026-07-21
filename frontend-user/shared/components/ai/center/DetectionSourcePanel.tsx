import { Upload, Film, Cctv, Camera, Radio, ArrowRight } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { cn } from '@shared/components/ui/utils';
import type { EnterpriseInputMode } from '@shared/components/ai/center/EnterpriseDetectionInputWorkspace';

const INPUT_MODES: { id: EnterpriseInputMode; icon: typeof Upload; tone: string }[] = [
  { id: 'image', icon: Upload, tone: 'violet' },
  { id: 'video', icon: Film, tone: 'rose' },
  { id: 'webcam', icon: Camera, tone: 'emerald' },
  { id: 'camera', icon: Cctv, tone: 'cyan' },
];

interface DetectionSourcePanelProps {
  selectedMode: EnterpriseInputMode;
  onSelect: (mode: EnterpriseInputMode) => void;
  disabled?: boolean;
  className?: string;
  /** inline = embedded in split workspace; page = standalone source page */
  variant?: 'page' | 'inline';
}

export function DetectionSourcePanel({
  selectedMode,
  onSelect,
  disabled = false,
  className,
  variant = 'page',
}: DetectionSourcePanelProps) {
  const { t } = useLanguage();
  const isInline = variant === 'inline';

  return (
    <div className={cn(
      'enterprise-ai-source-page',
      !isInline && 'enforcement-page__panel',
      isInline && 'enterprise-ai-source-page--inline',
      className,
    )}>
      <header className="enterprise-ai-workspace__source-head enterprise-ai-workspace__source-head--source">
        <span className="enterprise-ai-chart-dot enterprise-ai-chart-dot--source" aria-hidden />
        <div className="enterprise-ai-workspace__head-copy">
          <h2 className="enterprise-ai-workspace__source-title">{t('aiCenter.detectionSource')}</h2>
          <p className="enterprise-ai-workspace__source-hint">{t('aiCenter.panelInputHint')}</p>
        </div>
        <div className="enterprise-ai-workspace__head-icon enterprise-ai-workspace__head-icon--source">
          <Radio size={16} />
        </div>
      </header>

      <div className={cn(
        'enterprise-ai-source-radios',
        !isInline && 'enterprise-ai-source-radios--page',
        isInline && 'enterprise-ai-source-radios--inline',
      )} role="radiogroup" aria-label={t('aiCenter.detectionSource')}>
        {INPUT_MODES.map(({ id, icon: Icon, tone }) => {
          const active = selectedMode === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(id)}
              className={cn(
                'enterprise-ai-source-radio enterprise-ai-source-radio--button',
                `enterprise-ai-source-radio--${tone}`,
                active && 'is-active',
                disabled && 'is-disabled',
              )}
            >
              <span className="enterprise-ai-source-radio__bullet" aria-hidden />
              <Icon size={isInline ? 16 : 18} />
              <span className="enterprise-ai-source-radio__label">{t(`aiCenter.input.${id}`)}</span>
              {!isInline && (
                <span className="enterprise-ai-source-radio__desc">{t(`aiCenter.sourceDesc.${id}`)}</span>
              )}
              {!isInline && active && (
                <span className="enterprise-ai-source-radio__cta">
                  {t('aiCenter.openLiveDetection')}
                  <ArrowRight size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
