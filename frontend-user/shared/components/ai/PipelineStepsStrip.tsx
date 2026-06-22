import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
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
    >
      <div className="pipeline-steps-strip__track">
        {STEP_META.map((meta, i) => {
          const state = stripState(i, activeIndex, allComplete);
          const Icon = meta.icon;
          const isDone = state === 'done';
          const isActive = state === 'active';

          return (
            <div key={meta.id} className="pipeline-steps-strip__item">
              {i > 0 && (
                <span
                  className={`pipeline-steps-strip__connector${i <= activeIndex || allComplete ? ' is-done' : ''}`}
                />
              )}
              <div
                className={`pipeline-steps-strip__node${isDone ? ' is-done' : ''}${isActive ? ' is-active' : ''}${state === 'pending' ? ' is-pending' : ''}`}
                style={
                  isActive
                    ? { borderColor: meta.color, boxShadow: `0 0 12px ${meta.glow}` }
                    : isDone
                      ? { borderColor: '#10B981', background: 'rgba(16,185,129,0.12)' }
                      : { borderColor: `${meta.color}40`, background: `${meta.color}08` }
                }
                title={t(meta.labelKey)}
              >
                {isDone ? (
                  <CheckCircle2 size={isPanel ? 18 : 12} className="text-emerald-500" strokeWidth={2.5} />
                ) : isActive ? (
                  <Loader2
                    size={isPanel ? 18 : 12}
                    className="animate-spin"
                    style={{ color: meta.color, animationDuration: '0.9s' }}
                  />
                ) : (
                  <Icon size={isPanel ? 16 : 12} style={{ color: meta.color, opacity: 0.55 }} strokeWidth={2} />
                )}
                <span className="pipeline-steps-strip__num">{i + 1}</span>
              </div>
              {(isPanel || isEmbedded) && (
                <span
                  className={`pipeline-steps-strip__label${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}`}
                  style={isActive ? { color: meta.color } : undefined}
                >
                  {t(meta.shortKey)}
                </span>
              )}
              {!isPanel && !isEmbedded && i < STEP_META.length - 1 && (
                <ChevronRight size={10} className="pipeline-steps-strip__chevron text-muted-foreground/30 mx-0.5 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
