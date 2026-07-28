import { ChevronRight } from 'lucide-react';
import { cn } from '@shared/components/ui/utils';

export type PipelineStageId = 'webcam' | 'opencv' | 'vote' | 'yolo' | 'result';

export interface PipelineStage {
  id: PipelineStageId;
  label: string;
}

interface LiveWebcamPipelineStripProps {
  stages: PipelineStage[];
  activeStage: PipelineStageId;
  voteSlots?: string[];
  voteRequired?: number;
  className?: string;
}

function slotFilled(signKey: string): boolean {
  return Boolean(signKey && signKey !== 'none');
}

export function LiveWebcamPipelineStrip({
  stages,
  activeStage,
  voteSlots = [],
  voteRequired = 5,
  className,
}: LiveWebcamPipelineStripProps) {
  const activeIdx = stages.findIndex((s) => s.id === activeStage);

  return (
    <div
      className={cn(
        'live-webcam-pipeline live-webcam-pipeline--clean',
        className,
      )}
    >
      <div className="live-webcam-pipeline__steps" aria-label="Detection pipeline">
        {stages.map((stage, idx) => {
          const isActive = stage.id === activeStage;
          const isPast = activeIdx > idx;
          return (
            <div key={stage.id} className="live-webcam-pipeline__step-wrap">
              {idx > 0 ? (
                <ChevronRight size={12} className="live-webcam-pipeline__arrow" aria-hidden />
              ) : null}
              <span
                className={cn(
                  'live-webcam-pipeline__step',
                  isActive && 'is-active',
                  isPast && !isActive && 'is-done',
                )}
              >
                <span className="live-webcam-pipeline__step-index" aria-hidden>
                  {idx + 1}
                </span>
                <span className="live-webcam-pipeline__step-label">{stage.label}</span>
              </span>
            </div>
          );
        })}
      </div>

      {voteSlots.length > 0 || voteRequired > 0 ? (
        <div className="live-webcam-pipeline__votes">
          <span className="live-webcam-pipeline__votes-label">Frames</span>
          <div className="live-webcam-pipeline__dots" aria-label="Recent frame votes">
            {Array.from({ length: voteRequired }, (_, i) => {
              const offset = Math.max(0, voteRequired - voteSlots.length);
              const key = voteSlots[i - offset] ?? '';
              const filled = i >= offset && i - offset < voteSlots.length;
              return (
                <span
                  key={i}
                  title={filled ? key || 'no sign' : 'pending'}
                  className={cn(
                    'live-webcam-pipeline__dot',
                    filled && (slotFilled(key) ? 'is-hit' : 'is-miss'),
                    !filled && 'is-empty',
                  )}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
