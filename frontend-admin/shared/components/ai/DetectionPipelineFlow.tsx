import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, SignpostBig, Car, ScanLine, Shield, FileText, Database, LayoutDashboard,
  CheckCircle2, Circle, Loader2, AlertCircle, Minus, ChevronRight, RefreshCw, Zap,
} from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import type { FlowStepId } from '@shared/utils/detectionPipelineFlow';
import { FLOW_STEP_IDS } from '@shared/utils/detectionPipelineFlow';

export type PipelineStepStatus = 'complete' | 'empty' | 'failed' | 'skipped' | 'pending' | 'active';

export interface PipelineStep {
  id: string;
  status: PipelineStepStatus;
  detail_en?: string;
  detail_km?: string;
  confidence?: number;
}

type StepUiStatus = 'done' | 'active' | 'pending';

/** Shared motion timings for pipeline UI (seconds unless noted). */
export const PIPELINE_ANIM = {
  glowPulse: 0.75,
  nodeScale: 0.6,
  progressBar: 0.35,
  connectorMs: 220,
  shimmer: 0.95,
  panelTransition: 0.38,
  sparkle: 0.75,
  rainbowStrip: 2.4,
  /** Stagger when revealing all steps after completion */
  completeStagger: 0.05,
  /** Dwell per step while finishing pipeline after API returns */
  stepFinishDwell: 1600,
} as const;

export interface StepMeta {
  id: FlowStepId;
  icon: typeof Upload;
  color: string;
  grad: string;
  glow: string;
  iconSize: { pending: number; done: number; active: number };
  nodeSize: { pending: number; done: number; active: number };
  labelKey: string;
  shortKey: string;
  descKey: string;
}

export const STEP_META: StepMeta[] = [
  {
    id: 'input',
    icon: Upload,
    color: '#00C8F0',
    grad: 'linear-gradient(145deg,#0284C7,#22D3EE,#67E8F9)',
    glow: 'rgba(0,200,240,0.55)',
    iconSize: { pending: 20, done: 20, active: 24 },
    nodeSize: { pending: 40, done: 44, active: 52 },
    labelKey: 'aiDetection.flow.input',
    shortKey: 'aiDetection.flow.short.input',
    descKey: 'aiDetection.flow.desc.input',
  },
  {
    id: 'sign_detect',
    icon: SignpostBig,
    color: '#7C3AED',
    grad: 'linear-gradient(145deg,#7C3AED,#C084FC,#E9D5FF)',
    glow: 'rgba(124,58,237,0.55)',
    iconSize: { pending: 20, done: 20, active: 24 },
    nodeSize: { pending: 42, done: 46, active: 54 },
    labelKey: 'aiDetection.flow.signDetect',
    shortKey: 'aiDetection.flow.short.signDetect',
    descKey: 'aiDetection.flow.desc.signDetect',
  },
  {
    id: 'vehicle_track',
    icon: Car,
    color: '#4F46E5',
    grad: 'linear-gradient(145deg,#4338CA,#818CF8,#A5B4FC)',
    glow: 'rgba(79,70,229,0.55)',
    iconSize: { pending: 20, done: 20, active: 24 },
    nodeSize: { pending: 38, done: 42, active: 50 },
    labelKey: 'aiDetection.flow.vehicleTrack',
    shortKey: 'aiDetection.flow.short.vehicleTrack',
    descKey: 'aiDetection.flow.desc.vehicleTrack',
  },
  {
    id: 'ocr',
    icon: ScanLine,
    color: '#F43F8E',
    grad: 'linear-gradient(145deg,#DB2777,#F472B6,#FBCFE8)',
    glow: 'rgba(244,63,142,0.55)',
    iconSize: { pending: 20, done: 20, active: 24 },
    nodeSize: { pending: 44, done: 48, active: 56 },
    labelKey: 'aiDetection.flow.ocr',
    shortKey: 'aiDetection.flow.short.ocr',
    descKey: 'aiDetection.flow.desc.ocr',
  },
  {
    id: 'rule_engine',
    icon: Shield,
    color: '#FBBF24',
    grad: 'linear-gradient(145deg,#D97706,#FBBF24,#FDE68A)',
    glow: 'rgba(251,191,36,0.55)',
    iconSize: { pending: 20, done: 20, active: 24 },
    nodeSize: { pending: 42, done: 46, active: 52 },
    labelKey: 'aiDetection.flow.ruleEngine',
    shortKey: 'aiDetection.flow.short.ruleEngine',
    descKey: 'aiDetection.flow.desc.ruleEngine',
  },
  {
    id: 'evidence',
    icon: FileText,
    color: '#FB923C',
    grad: 'linear-gradient(145deg,#EA580C,#FB923C,#FED7AA)',
    glow: 'rgba(251,146,60,0.55)',
    iconSize: { pending: 20, done: 20, active: 24 },
    nodeSize: { pending: 40, done: 44, active: 50 },
    labelKey: 'aiDetection.flow.evidence',
    shortKey: 'aiDetection.flow.short.evidence',
    descKey: 'aiDetection.flow.desc.evidence',
  },
  {
    id: 'database',
    icon: Database,
    color: '#34D399',
    grad: 'linear-gradient(145deg,#059669,#34D399,#6EE7B7)',
    glow: 'rgba(52,211,153,0.55)',
    iconSize: { pending: 20, done: 20, active: 24 },
    nodeSize: { pending: 42, done: 46, active: 54 },
    labelKey: 'aiDetection.flow.database',
    shortKey: 'aiDetection.flow.short.database',
    descKey: 'aiDetection.flow.desc.database',
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    color: '#38BDF8',
    grad: 'linear-gradient(145deg,#0284C7,#38BDF8,#BAE6FD)',
    glow: 'rgba(56,189,248,0.55)',
    iconSize: { pending: 20, done: 20, active: 24 },
    nodeSize: { pending: 46, done: 50, active: 58 },
    labelKey: 'aiDetection.flow.dashboard',
    shortKey: 'aiDetection.flow.short.dashboard',
    descKey: 'aiDetection.flow.desc.dashboard',
  },
];

function toUiStatus(status: PipelineStepStatus): StepUiStatus {
  if (status === 'complete') return 'done';
  if (status === 'active') return 'active';
  return 'pending';
}

function isClickable(uiStatus: StepUiStatus, stepId?: FlowStepId) {
  if (stepId === 'input') return true;
  return uiStatus === 'done' || uiStatus === 'active';
}

function StepStatusBadge({ status, color }: { status: PipelineStepStatus; color: string }) {
  if (status === 'active') return <Loader2 size={14} className="animate-spin" style={{ color }} />;
  if (status === 'complete') return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (status === 'failed') return <AlertCircle size={14} className="text-red-500" />;
  if (status === 'skipped' || status === 'empty') return <Minus size={14} className="text-muted-foreground" />;
  return <Circle size={12} className="text-muted-foreground/40" />;
}

export function DetectionPipelineFlow({
  steps,
  completedCount,
  compact = false,
  detecting = false,
  onRestart,
  resultReady = false,
  renderStepPanel,
  stats,
}: {
  steps: PipelineStep[];
  completedCount?: number;
  compact?: boolean;
  detecting?: boolean;
  onRestart?: () => void;
  resultReady?: boolean;
  renderStepPanel?: (ctx: {
    stepId: FlowStepId;
    step: PipelineStep | undefined;
    meta: StepMeta;
  }) => ReactNode;
  stats?: { accuracy?: string; scans?: string };
}) {
  const { t, locale } = useLanguage();
  const isEn = locale === 'en';
  const done = completedCount ?? steps.filter((s) => s.status === 'complete').length;

  const stepMap = useMemo(() => {
    const map = new Map<string, PipelineStep>();
    for (const step of steps) map.set(step.id, step);
    return map;
  }, [steps]);

  const activeStepId = useMemo(() => {
    const running = steps.find((s) => s.status === 'active');
    if (running) return running.id as FlowStepId;
    const lastDoneIdx = [...steps].reverse().findIndex((s) => s.status === 'complete');
    if (lastDoneIdx >= 0) {
      const idx = steps.length - 1 - lastDoneIdx;
      return (steps[Math.min(idx + 1, steps.length - 1)]?.id ?? steps[0]?.id) as FlowStepId;
    }
    return 'input';
  }, [steps]);

  const [viewStepId, setViewStepId] = useState<FlowStepId>('input');

  useEffect(() => {
    if (detecting) setViewStepId(activeStepId);
  }, [activeStepId, detecting]);

  useEffect(() => {
    if (resultReady && !detecting) {
      setViewStepId('dashboard');
    } else if (!resultReady && !detecting) {
      setViewStepId('input');
    }
  }, [resultReady, detecting]);

  const viewMeta = STEP_META.find((m) => m.id === viewStepId) ?? STEP_META[0];
  const viewStep = stepMap.get(viewStepId);
  const viewIndex = STEP_META.findIndex((m) => m.id === viewStepId);
  const viewUiStatus = toUiStatus(viewStep?.status ?? 'pending');
  const viewDetail = isEn ? viewStep?.detail_en : (viewStep?.detail_km || viewStep?.detail_en);
  const allComplete = done >= steps.length;
  const ViewIcon = viewMeta.icon;

  const customPanel = renderStepPanel?.({ stepId: viewStepId, step: viewStep, meta: viewMeta });

  if (compact) {
    return (
      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STEP_META.map((meta, index) => {
            const step = stepMap.get(meta.id);
            const Icon = meta.icon;
            const isDone = step?.status === 'complete';
            const isActive = step?.status === 'active';
            return (
              <div key={meta.id} className="flex items-center">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center border"
                  style={{
                    borderColor: isDone ? '#10B981' : isActive ? meta.color : 'var(--border)',
                    background: isDone ? 'rgba(16,185,129,0.1)' : isActive ? `${meta.color}18` : 'var(--background)',
                  }}
                >
                  <Icon size={14} style={{ color: isDone ? '#10B981' : isActive ? meta.color : undefined }} className={!isDone && !isActive ? 'text-muted-foreground' : ''} />
                </div>
                {index < STEP_META.length - 1 && <ChevronRight size={12} className="text-muted-foreground/30 mx-0.5" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero strip */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-5 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-20 translate-x-20 pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)' }} />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Zap size={20} color="#C4B5FD" />
            </div>
            <div>
              <p className="text-xs font-medium text-violet-200/80 uppercase tracking-wider">{t('aiDetection.heroEyebrow')}</p>
              <h1 className="text-xl font-bold leading-tight">{t('aiDetection.flow.title')}</h1>
              <p className="text-sm text-slate-400 mt-0.5">{t('aiDetection.flow.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {stats?.accuracy && (
              <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}>
                <p className="text-[10px] text-cyan-200/70">{t('aiDetection.accuracy')}</p>
                <p className="text-lg font-bold text-cyan-300">{stats.accuracy}</p>
              </div>
            )}
            {stats?.scans && (
              <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <p className="text-[10px] text-emerald-200/70">{t('aiDetection.scansLabel')}</p>
                <p className="text-lg font-bold text-emerald-300">{stats.scans}</p>
              </div>
            )}
            <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <p className="text-[10px] text-slate-400">{t('aiDetection.flow.complete')}</p>
              <p className="text-lg font-bold">{done}/{steps.length}</p>
            </div>
            {onRestart && (
              <button
                type="button"
                onClick={onRestart}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <RefreshCw size={14} /> {t('aiDetection.flow.restart')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal step strip */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 overflow-x-auto">
        <div className="flex items-center min-w-max gap-0">
          {STEP_META.map((meta, i) => {
            const step = stepMap.get(meta.id);
            const uiStatus = toUiStatus(step?.status ?? 'pending');
            const clickable = isClickable(uiStatus, meta.id);
            const selected = viewStepId === meta.id;
            const Icon = meta.icon;
            const isDone = uiStatus === 'done';
            const isActive = uiStatus === 'active';

            return (
              <div key={meta.id} className="flex items-center">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && setViewStepId(meta.id)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all min-w-[72px] ${
                    selected ? 'scale-105' : clickable ? 'hover:bg-muted/60' : 'opacity-40 cursor-default'
                  }`}
                >
                  <div
                    className="relative w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all"
                    style={{
                      background: isDone ? 'rgba(16,185,129,0.12)' : isActive || selected ? `${meta.color}15` : 'var(--muted)',
                      borderColor: isDone ? '#10B981' : isActive || selected ? meta.color : 'var(--border)',
                      boxShadow: selected ? `0 4px 14px ${meta.color}30` : undefined,
                    }}
                  >
                    <Icon size={18} style={{ color: isDone ? '#10B981' : meta.color }} />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center">
                      <StepStatusBadge status={step?.status ?? 'pending'} color={meta.color} />
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-bold text-center leading-tight"
                    style={{ color: selected || isActive ? meta.color : isDone ? '#059669' : undefined }}
                  >
                    {t(meta.shortKey)}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">{i + 1}</span>
                </button>
                {i < STEP_META.length - 1 && (
                  <ChevronRight size={16} className={`shrink-0 mx-0.5 ${isDone ? 'text-emerald-400' : 'text-muted-foreground/25'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="relative px-6 pt-5 pb-8" style={{ background: viewMeta.grad }}>
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full pointer-events-none opacity-20"
            style={{ background: 'rgba(255,255,255,0.3)' }} />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg mb-2"
                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)' }}>
                <ViewIcon size={14} color="white" />
                <span className="text-[11px] font-bold text-white">
                  {t('aiDetection.flow.stepOf').replace('{current}', String(viewIndex + 1)).replace('{total}', String(STEP_META.length))}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">{t(viewMeta.labelKey)}</h2>
              <p className="text-sm text-white/75 mt-1 max-w-xl">{t(viewMeta.descKey)}</p>
            </div>
            <div className="text-right shrink-0">
              <StepStatusBadge status={viewStep?.status ?? 'pending'} color="#fff" />
              {viewDetail && (
                <p className="text-[11px] text-white/80 mt-1 max-w-[160px] truncate" title={viewDetail}>
                  {viewDetail}
                  {viewStep?.confidence != null && viewStep.confidence > 0 && (
                    <span className="font-bold"> ({viewStep.confidence.toFixed(0)}%)</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="relative -mt-4 mx-4 mb-5">
          <div className="rounded-2xl bg-background border border-border/60 shadow-sm p-5 min-h-[360px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={viewStepId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: PIPELINE_ANIM.panelTransition }}
              >
                {viewUiStatus === 'active' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span className="text-muted-foreground font-medium">{t('aiDetection.flow.statusRunning')}</span>
                      <Loader2 size={14} className="animate-spin" style={{ color: viewMeta.color, animationDuration: '0.65s' }} />
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: viewMeta.grad }}
                        animate={{ width: ['12%', '88%', '28%', '92%'] }}
                        transition={{ repeat: Infinity, duration: PIPELINE_ANIM.shimmer, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                )}

                {customPanel}

                {allComplete && viewStepId === 'dashboard' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800"
                  >
                    <div>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t('aiDetection.flow.pipelineComplete')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('aiDetection.flow.pipelineCompleteHint')}</p>
                    </div>
                    {onRestart && (
                      <button
                        type="button"
                        onClick={onRestart}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}
                      >
                        {t('aiDetection.flow.restart')}
                      </button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { FlowStepId };
export const PIPELINE_STEP_ORDER = [...FLOW_STEP_IDS] as const;

export function buildLoadingPipeline(activeIndex: number): PipelineStep[] {
  return PIPELINE_STEP_ORDER.map((id, index) => ({
    id,
    status: index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'pending',
    detail_en: index < activeIndex ? 'Done' : index === activeIndex ? 'Running…' : '',
    detail_km: index < activeIndex ? 'រួចរាល់' : index === activeIndex ? 'កំពុងដំណើរការ…' : '',
  }));
}
