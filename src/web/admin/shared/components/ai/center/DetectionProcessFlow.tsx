import { ArrowRight, CheckCircle, Hash, ScanLine, Shield, Upload } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useLanguage } from '@shared/context/LanguageContext';
import { cn } from '@shared/components/ui/utils';

export const DETECTION_PROCESS_STEPS = [
  {
    key: 'input',
    icon: Upload,
    labelKey: 'aiCenter.pipeline.input',
    hintKey: 'aiCenter.pipeline.inputHint',
    hintFallback: 'Image, video, or camera frame',
    tone: 'violet',
    step: '01',
  },
  {
    key: 'yolo',
    icon: ScanLine,
    labelKey: 'aiCenter.pipeline.yolo',
    hintKey: 'aiCenter.pipeline.yoloHint',
    hintFallback: 'Signs, vehicles & plates',
    tone: 'cyan',
    step: '02',
  },
  {
    key: 'ocr',
    icon: Hash,
    labelKey: 'aiCenter.pipeline.ocr',
    hintKey: 'aiCenter.pipeline.ocrHint',
    hintFallback: 'License plate text',
    tone: 'amber',
    step: '03',
  },
  {
    key: 'rules',
    icon: Shield,
    labelKey: 'aiCenter.pipeline.rules',
    hintKey: 'aiCenter.pipeline.rulesHint',
    hintFallback: 'Violation evaluation',
    tone: 'rose',
    step: '04',
  },
] as const;

type StepState = 'idle' | 'pending' | 'active' | 'done';

function resolveStepState(index: number, activeStep: number, animated: boolean): StepState {
  if (!animated || activeStep < 0) return 'idle';
  if (index < activeStep) return 'done';
  if (index === activeStep) return 'active';
  return 'pending';
}

export function DetectionProcessFlow({
  variant = 'banner',
  activeStep = -1,
  animated = false,
  showConnectors = true,
  className,
}: {
  variant?: 'banner' | 'compact' | 'loading';
  activeStep?: number;
  animated?: boolean;
  showConnectors?: boolean;
  className?: string;
}) {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v !== key ? v : fallback;
  };

  const isLoading = variant === 'loading';

  return (
    <ol
      className={cn(
        'ai-center-process__grid',
        variant === 'compact' && 'ai-center-process__grid--compact',
        isLoading && 'ai-center-process__grid--loading',
        isLoading && animated && 'ai-center-process__grid--animated',
        className,
      )}
      style={
        isLoading && animated && activeStep >= 0
          ? ({ '--process-progress': `${((activeStep + 1) / DETECTION_PROCESS_STEPS.length) * 100}%` } as CSSProperties)
          : undefined
      }
    >
      {DETECTION_PROCESS_STEPS.map((step, index, arr) => {
        const Icon = step.icon;
        const state = resolveStepState(index, activeStep, animated);
        const isDone = state === 'done';
        const isActive = state === 'active';

        return (
          <li
            key={step.key}
            className={cn(
              'ai-center-process__item',
              isLoading && 'ai-center-process__item--loading',
              animated && `is-${state}`,
            )}
          >
            {isLoading ? (
              <div className={cn('ai-center-process__node', `ai-center-process__node--${step.tone}`, isDone && 'is-done', isActive && 'is-active')}>
                {isDone ? <CheckCircle size={14} strokeWidth={2.4} /> : <Icon size={14} strokeWidth={2.2} />}
              </div>
            ) : null}
            <article
              className={cn(
                'ai-center-process__card',
                `ai-center-process__card--${step.tone}`,
                isActive && 'is-active',
                isDone && 'is-done',
                isLoading && 'ai-center-process__card--loading',
              )}
            >
              {!isLoading ? (
                <span className="ai-center-process__num">{step.step}</span>
              ) : (
                <span className="ai-center-process__step-tag">{step.step}</span>
              )}
              {!isLoading ? (
                <div className={cn('ai-center-process__icon', `ai-center-process__icon--${step.tone}`)}>
                  {isDone ? <CheckCircle size={18} strokeWidth={2.2} /> : <Icon size={18} strokeWidth={2.1} />}
                </div>
              ) : null}
              <div className="ai-center-process__copy">
                <span className="ai-center-process__label">{t(step.labelKey)}</span>
                <span className={cn('ai-center-process__hint', isLoading && 'ai-center-process__hint--loading')}>
                  {tr(step.hintKey, step.hintFallback)}
                </span>
                {animated ? (
                  <span className={cn('ai-center-process__status', isLoading && `ai-center-process__status--${state}`)}>
                    {isDone
                      ? t('aiCenter.pipelineDone')
                      : isActive
                        ? t('aiCenter.pipelineRunning')
                        : t('aiCenter.pipelineWaiting')}
                  </span>
                ) : null}
              </div>
            </article>
            {showConnectors && !isLoading && index < arr.length - 1 ? (
              <ArrowRight size={16} className="ai-center-process__connector" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
