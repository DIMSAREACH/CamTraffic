import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ChevronRight, Loader2, Minus, Sparkles, Zap } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { PIPELINE_ANIM, STEP_META, type PipelineStep } from '@shared/components/ai/DetectionPipelineFlow';
import { PipelineStepsStrip } from '@shared/components/ai/PipelineStepsStrip';

const RAINBOW_GRADIENT =
  'linear-gradient(90deg,#00C8F0,#A855F7,#F43F8E,#FBBF24,#34D399,#38BDF8,#6366F1,#00C8F0)';

function stepVisualState(
  step: PipelineStep | undefined,
  detecting: boolean,
): 'done' | 'active' | 'pending' | 'skipped' {
  if (step?.status === 'complete') return 'done';
  if (step?.status === 'skipped' || step?.status === 'empty') return 'skipped';
  if (step?.status === 'active' && detecting) return 'active';
  return 'pending';
}

function activeStepIndex(steps: PipelineStep[], detecting: boolean): number {
  if (!detecting) return -1;
  const idx = STEP_META.findIndex((m) => steps.find((s) => s.id === m.id)?.status === 'active');
  if (idx >= 0) return idx;
  const doneCount = STEP_META.filter((m) => steps.find((s) => s.id === m.id)?.status === 'complete').length;
  return Math.min(doneCount, STEP_META.length - 1);
}

function StepIcon({
  meta,
  state,
  index,
  size = 'md',
}: {
  meta: (typeof STEP_META)[number];
  state: ReturnType<typeof stepVisualState>;
  index: number;
  size?: 'sm' | 'md';
}) {
  const Icon = meta.icon;
  const nodePx = size === 'sm' ? 28 : 40;
  const iconPx = size === 'sm' ? 12 : 17;
  const isActive = state === 'active';
  const isDone = state === 'done';
  const isSkipped = state === 'skipped';

  return (
    <div className="relative flex-shrink-0" style={{ width: nodePx, height: nodePx }}>
      {isActive && (
        <motion.span
          className="absolute inset-0 rounded-xl"
          animate={{ scale: [1, 1.22, 1], opacity: [0.55, 0.1, 0.55] }}
          transition={{ repeat: Infinity, duration: PIPELINE_ANIM.glowPulse }}
          style={{ background: meta.glow, filter: 'blur(5px)' }}
        />
      )}
      <div
        className="relative rounded-xl flex items-center justify-center border-2 w-full h-full"
        style={{
          background: isDone ? meta.grad : isActive ? `${meta.color}18` : isSkipped ? 'var(--muted)' : `${meta.color}10`,
          borderColor: isDone ? 'transparent' : isActive ? meta.color : isSkipped ? 'var(--border)' : `${meta.color}35`,
          boxShadow: isActive ? `0 0 16px ${meta.glow}` : undefined,
        }}
      >
        {isDone ? (
          <CheckCircle2 size={iconPx + 1} color="white" strokeWidth={2.5} />
        ) : isSkipped ? (
          <Minus size={iconPx} className="text-muted-foreground" />
        ) : (
          <Icon size={iconPx} style={{ color: meta.color }} strokeWidth={isActive ? 2.5 : 2} />
        )}
      </div>
      <span
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white"
        style={{ background: isActive ? meta.color : isDone ? '#34D399' : `${meta.color}99` }}
      >
        {index + 1}
      </span>
    </div>
  );
}

/** While waiting for API: one step at a time, synced to progress (no artificial delay) */
function ProcessingSingleStep({
  steps,
  activeIdx,
}: {
  steps: PipelineStep[];
  activeIdx: number;
}) {
  const { t, locale } = useLanguage();
  const stepMap = new Map(steps.map((s) => [s.id, s]));
  const meta = STEP_META[activeIdx];
  if (!meta) return null;

  const step = stepMap.get(meta.id);
  const detail = locale === 'km' ? step?.detail_km : step?.detail_en;
  const pct = Math.round(((activeIdx + 1) / STEP_META.length) * 100);

  return (
    <div className="flex-1 min-h-0 flex flex-col px-2 sm:px-3 py-3 justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={meta.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex items-center gap-4 px-4 py-5 rounded-xl border-2"
          style={{
            borderColor: meta.color,
            background: `linear-gradient(135deg, ${meta.color}12, ${meta.color}04)`,
            boxShadow: `0 8px 28px ${meta.glow}`,
          }}
        >
          <StepIcon meta={meta} state="active" index={activeIdx} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('aiDetection.flow.stepOf').replace('{current}', String(activeIdx + 1)).replace('{total}', String(STEP_META.length))}
            </p>
            <p className="text-base font-bold truncate mt-0.5" style={{ color: meta.color }}>
              {t(meta.labelKey)}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-1">
              {detail || t('aiDetection.flow.statusRunning')}
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{ background: meta.grad }}
              />
            </div>
          </div>
          <Loader2 size={22} className="animate-spin flex-shrink-0" style={{ color: meta.color, animationDuration: '0.7s' }} />
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-[10px] font-semibold text-muted-foreground mt-4">
        {t('aiDetection.flow.statusRunning')} · {activeIdx + 1}/{STEP_META.length}
      </p>
    </div>
  );
}

/** While waiting for API: all steps visible, tick complete one-by-one */
function ProcessingStepList({ steps }: { steps: PipelineStep[] }) {
  const { t, locale } = useLanguage();
  const stepMap = new Map(steps.map((s) => [s.id, s]));

  return (
    <div className="flex-1 min-h-0 flex flex-col px-2 sm:px-3 py-2">
      <div className="flex-1 min-h-0 flex flex-col gap-1.5 justify-between overflow-y-auto">
        {STEP_META.map((meta, i) => {
          const step = stepMap.get(meta.id);
          const state = stepVisualState(step, true);
          const detail = locale === 'km' ? step?.detail_km : step?.detail_en;
          const isDone = state === 'done';
          const isActive = state === 'active';
          const isSkipped = state === 'skipped';

          return (
            <motion.div
              key={meta.id}
              layout
              className={`flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg border min-h-[36px] transition-colors ${
                isActive
                  ? 'border-2 bg-background/80'
                  : 'border-border/50 bg-background/60'
              }`}
              style={isActive ? { borderColor: meta.color, boxShadow: `0 4px 16px ${meta.glow}` } : undefined}
            >
              <StepIcon meta={meta} state={state} index={i} size="sm" />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[11px] font-bold leading-tight truncate"
                  style={{
                    color: meta.color,
                    opacity: isDone || isActive ? 1 : isSkipped ? 0.5 : 0.65,
                  }}
                >
                  {t(meta.shortKey)}
                </p>
                {(detail || isActive) && (
                  <p className="text-[10px] text-muted-foreground truncate" title={detail || undefined}>
                    {detail || (isActive ? t('aiDetection.flow.statusRunning') : '')}
                  </p>
                )}
              </div>
              {isDone && <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />}
              {isActive && (
                <Loader2
                  size={13}
                  className="animate-spin flex-shrink-0"
                  style={{ color: meta.color, animationDuration: '0.7s' }}
                />
              )}
              {isSkipped && <Minus size={13} className="text-muted-foreground flex-shrink-0" />}
              {!isDone && !isActive && !isSkipped && (
                <ChevronRight size={13} className="text-muted-foreground/40 flex-shrink-0" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Result ready: all 8 steps at once */
function CompleteStepList({ steps }: { steps: PipelineStep[] }) {
  const { t, locale } = useLanguage();
  const stepMap = new Map(steps.map((s) => [s.id, s]));

  return (
    <div className="flex-1 min-h-0 flex flex-col px-2 sm:px-3 py-2">
      <div className="flex items-center gap-2 px-2 py-1.5 mb-2 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 flex-shrink-0">
        <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{t('aiDetection.flow.pipelineComplete')}</p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-1.5 justify-between overflow-y-auto">
        {STEP_META.map((meta, i) => {
          const step = stepMap.get(meta.id);
          const state = stepVisualState(step, false);
          const detail = locale === 'km' ? step?.detail_km : step?.detail_en;
          const isDone = state === 'done';
          const isSkipped = state === 'skipped';

          return (
            <div
              key={meta.id}
              className="flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-border/50 bg-background/60 min-h-[36px]"
            >
              <StepIcon meta={meta} state={state} index={i} size="sm" />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[11px] font-bold leading-tight truncate"
                  style={{ color: isDone ? meta.color : isSkipped ? undefined : meta.color, opacity: isSkipped ? 0.5 : 1 }}
                >
                  {t(meta.shortKey)}
                </p>
                {detail && (
                  <p className="text-[10px] text-muted-foreground truncate" title={detail}>
                    {detail}
                  </p>
                )}
                {isSkipped && !detail && (
                  <p className="text-[10px] text-muted-foreground">{t('aiDetection.flow.statusPending')}</p>
                )}
              </div>
              {isDone && <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />}
              {isSkipped && <Minus size={13} className="text-muted-foreground flex-shrink-0" />}
              {!isDone && !isSkipped && state === 'pending' && (
                <ChevronRight size={13} className="text-muted-foreground/40 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmbeddedStepRow({
  steps,
  detecting,
  resultReady,
  fillHeight,
}: {
  steps: PipelineStep[];
  detecting: boolean;
  resultReady: boolean;
  fillHeight?: boolean;
}) {
  const wrap = fillHeight ? 'flex-1 min-h-0 flex flex-col' : '';

  if (resultReady) {
    return (
      <div className={wrap}>
        <CompleteStepList steps={steps} />
      </div>
    );
  }

  if (detecting) {
    return (
      <div className={wrap}>
        <ProcessingStepList steps={steps} />
      </div>
    );
  }

  return null;
}

export function PipelineFlowBar({
  steps,
  detecting = false,
  resultReady = false,
  embedded = false,
  fillHeight = false,
}: {
  steps: PipelineStep[];
  detecting?: boolean;
  resultReady?: boolean;
  embedded?: boolean;
  fillHeight?: boolean;
}) {
  const { t } = useLanguage();
  const finished = resultReady;
  const activeIdx = detecting && !resultReady ? activeStepIndex(steps, true) : -1;
  const progressPct = finished
    ? 100
    : activeIdx >= 0
      ? Math.round(((activeIdx + 1) / STEP_META.length) * 100)
      : 0;

  const statusLabel = finished
    ? `✓ ${t('aiDetection.flow.pipelineComplete')}`
    : detecting
      ? `${t('aiDetection.flow.statusRunning')} · ${Math.min(activeIdx + 1, STEP_META.length)}/${STEP_META.length}`
      : t('aiDetection.awaitingTitle');

  const activeMeta = activeIdx >= 0 ? STEP_META[activeIdx] : undefined;

  return (
    <div
      className={
        embedded
          ? `rounded-xl border border-border/70 bg-muted/20 overflow-hidden ${fillHeight ? 'flex flex-col flex-1 min-h-0 h-full' : ''}`
          : 'rounded-2xl border border-border bg-card shadow-md overflow-hidden'
      }
    >
      <motion.div
        className={`flex-shrink-0 ${embedded ? 'h-1 w-full' : 'h-1.5 w-full'}`}
        style={{ backgroundImage: RAINBOW_GRADIENT, backgroundSize: detecting && !finished ? '200% 100%' : '100% 100%' }}
        animate={detecting && !finished ? { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] } : { backgroundPosition: '0% 50%' }}
        transition={detecting && !finished ? { repeat: Infinity, duration: PIPELINE_ANIM.rainbowStrip, ease: 'linear' } : undefined}
      />

      <div className={`flex-shrink-0 flex items-center justify-between gap-3 border-b border-border/80 bg-gradient-to-r from-slate-50/80 via-violet-50/40 to-cyan-50/40 dark:from-slate-900/40 dark:via-violet-950/20 dark:to-cyan-950/20 ${embedded ? 'px-3 py-2' : 'px-5 py-3.5'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6366F1,#A855F7)' }}>
            <Zap size={14} color="white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/80 truncate">{t('aiDetection.flow.title')}</p>
            {activeMeta && detecting && !finished && (
              <p className="text-[9px] truncate font-semibold" style={{ color: activeMeta.color }}>{t(activeMeta.labelKey)}…</p>
            )}
          </div>
        </div>
        <span
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
            finished
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : detecting
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {detecting && !finished && (
            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: PIPELINE_ANIM.sparkle }}>
              <Sparkles size={11} />
            </motion.span>
          )}
          {statusLabel}
        </span>
      </div>

      <div className={`flex-shrink-0 ${embedded ? 'px-3 pt-1.5 pb-0.5' : 'px-5 pt-3 pb-1'}`}>
        <div className="flex items-center justify-between text-[9px] font-semibold text-muted-foreground mb-1">
          <span>{t('aiDetection.flow.progress')}</span>
          <span style={{ color: finished ? '#34D399' : detecting ? '#A855F7' : undefined }}>{progressPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              background: finished
                ? 'linear-gradient(90deg,#34D399,#00C8F0,#38BDF8)'
                : 'linear-gradient(90deg,#6366F1,#F43F8E,#FBBF24,#34D399)',
            }}
          />
        </div>
      </div>

      <div className={`flex-shrink-0 border-b border-border/50 ${embedded ? 'px-2 py-2' : 'px-4 py-2.5'}`}>
        <PipelineStepsStrip
          activeIndex={Math.max(0, activeIdx)}
          allComplete={finished}
          variant={embedded ? 'embedded' : 'default'}
        />
      </div>

      <EmbeddedStepRow steps={steps} detecting={detecting} resultReady={resultReady} fillHeight={fillHeight} />
    </div>
  );
}
