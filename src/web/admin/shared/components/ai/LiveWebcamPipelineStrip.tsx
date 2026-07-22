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

function slotColor(signKey: string): string {
  if (!signKey || signKey === 'none') return 'bg-slate-500/60';
  return 'bg-emerald-500';
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
        'live-webcam-pipeline rounded-xl border border-violet-500/25 bg-card/95 px-3 py-2.5 shadow-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
        {stages.map((stage, idx) => {
          const isActive = stage.id === activeStage;
          const isPast = activeIdx > idx;
          return (
            <div key={stage.id} className="flex items-center gap-1.5">
              {idx > 0 ? (
                <span className="text-muted-foreground/50 select-none" aria-hidden>
                  →
                </span>
              ) : null}
              <span
                className={cn(
                  'px-2 py-1 rounded-md border transition-colors',
                  isActive && 'bg-violet-600 text-white border-violet-500 shadow-sm',
                  isPast && !isActive && 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
                  !isActive && !isPast && 'bg-muted/40 text-muted-foreground border-border',
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {voteSlots.length > 0 || voteRequired > 0 ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
            5-frame
          </span>
          <div className="flex gap-1" aria-label="Recent frame votes">
            {Array.from({ length: voteRequired }, (_, i) => {
              const offset = Math.max(0, voteRequired - voteSlots.length);
              const key = voteSlots[i - offset] ?? '';
              const filled = i >= offset && i - offset < voteSlots.length;
              return (
                <span
                  key={i}
                  title={filled ? key || 'no sign' : 'pending'}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full border border-white/20',
                    filled ? slotColor(key) : 'bg-muted/30',
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
