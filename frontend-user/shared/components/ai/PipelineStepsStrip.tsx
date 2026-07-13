import type { CSSProperties } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { STEP_META } from '@shared/components/ai/DetectionPipelineFlow';

export type PipelineStepStripState = 'done' | 'active' | 'pending';

function stripState(index: number, activeIndex: number, allComplete = false): PipelineStepStripState {
  if (allComplete || index < activeIndex) return 'done';
  if (index === activeIndex) return 'active';
  return 'pending';
}

/** Compact horizontal strip — all 8 pipeline steps with status */
export function PipelineStepsStrip({
  activeIndex,
  allComplete = false,
  variant = 'default',
}: {
  activeIndex: number;
  allComplete?: boolean;
  variant?: 'default' | 'embedded' | 'panel';
}) {
  const { t } = useLanguage();
  const isPanel = variant === 'panel';
  const isEmbedded = variant === 'embedded';

  return (
    <div
      className={`pipeline-steps-strip${isPanel ? ' pipeline-steps-strip--panel' : ''}${isEmbedded ? ' pipeline-steps-strip--embedded' : ''}`}
      role="list"
      aria-label={t('aiDetection.flow.title')}
    >
      <div className="pipeline-steps-strip__track">
        {STEP_META.map((meta, i) => {
          const state = stripState(i, activeIndex, allComplete);
          const Icon = meta.icon;
          const isDone = state === 'done';
          const isActive = state === 'active';
          const isPending = state === 'pending';
          const connectorDone = allComplete || i <= activeIndex;
          const iconSize = isPanel
            ? isActive
              ? meta.iconSize.active
              : isDone
                ? meta.iconSize.done
                : meta.iconSize.pending
            : isActive
              ? 16
              : 12;

          return (
            <div key={meta.id} className="pipeline-steps-strip__item" role="listitem">
              {i > 0 && (
                <span
                  className={[
                    'pipeline-steps-strip__connector',
                    connectorDone ? 'is-done' : '',
                    i === activeIndex ? 'is-to-active' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ '--step-color': meta.color } as CSSProperties}
                />
              )}
              <div
                className={[
                  'pipeline-steps-strip__node',
                  isDone ? 'is-done' : '',
                  isActive ? 'is-active' : '',
                  isPending ? 'is-pending' : '',
                ].filter(Boolean).join(' ')}
                style={{ '--step-color': meta.color } as CSSProperties}
                title={t(meta.labelKey)}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="pipeline-steps-strip__icon-wrap">
                  {isDone ? (
                    <CheckCircle2
                      size={iconSize}
                      className="pipeline-steps-strip__icon pipeline-steps-strip__icon--done"
                      strokeWidth={2.75}
                    />
                  ) : (
                    <Icon
                      size={iconSize}
                      className={`pipeline-steps-strip__icon${isActive ? ' is-active' : ''}${isPending ? ' is-pending' : ''}`}
                      strokeWidth={2.75}
                    />
                  )}
                </span>
                {isActive && <span className="pipeline-steps-strip__pulse" aria-hidden />}
                <span className="pipeline-steps-strip__num">{i + 1}</span>
              </div>
              {(isPanel || isEmbedded) && (
                <span
                  className={[
                    'pipeline-steps-strip__label',
                    isActive ? 'is-active' : '',
                    isDone ? 'is-done' : '',
                    isPending ? 'is-pending' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ '--step-color': meta.color } as CSSProperties}
                >
                  {t(meta.shortKey)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
