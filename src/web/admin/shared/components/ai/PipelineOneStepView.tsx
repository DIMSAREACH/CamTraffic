import { AnimatePresence, motion } from 'motion/react';
import { STEP_META } from '@shared/components/ai/DetectionPipelineFlow';
import type { ReactNode } from 'react';

function PipelineStepSegments({ activeIndex, stepPct }: { activeIndex: number; stepPct: number }) {
  return (
    <div className="pipeline-segments" aria-hidden>
      {STEP_META.map((m, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        const fill = isDone ? 100 : isActive ? stepPct : 0;
        return (
          <div key={m.id} className="pipeline-segments__cell">
            <div
              className={`pipeline-segments__fill${isDone ? ' is-done' : ''}${isActive ? ' is-active' : ''}`}
              style={{
                width: `${fill}%`,
                background: isDone || isActive ? m.color : undefined,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Animated stage body — title is shown only in the panel header */
export function PipelineOneStepView({
  activeIndex,
  stepPct,
  accent,
  children,
}: {
  activeIndex: number;
  stepPct: number;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="pipeline-stage-view flex flex-col flex-1 min-h-0">
      <PipelineStepSegments activeIndex={activeIndex} stepPct={stepPct} />

      <AnimatePresence mode="wait">
        <motion.div
          key={STEP_META[activeIndex]?.id ?? activeIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="pipeline-stage-view__body flex flex-col flex-1 min-h-0"
          style={{ '--stage-accent': accent } as React.CSSProperties}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
