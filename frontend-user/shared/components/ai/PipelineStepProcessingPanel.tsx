import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  ScanLine,
  AlertTriangle,
  Car,
  Clock,
  MapPin,
  Camera,
  Fingerprint,
  FileText,
  Database,
  CloudUpload,
  HardDrive,
  Lock,
  Play,
} from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { translations, type Locale } from '@shared/i18n/translations';
import { STEP_META } from '@shared/components/ai/DetectionPipelineFlow';
import { PipelineOneStepView } from '@shared/components/ai/PipelineOneStepView';
import type { FlowStepId } from '@shared/utils/detectionPipelineFlow';
import { stepProgressWithinActive, subTaskStates } from '@shared/utils/detectionPipelineFlow';

type SubtaskLocaleKey = keyof typeof translations.en.aiDetection.flow.subtasks;

const FLOW_TO_SUBTASK_KEY: Record<FlowStepId, SubtaskLocaleKey> = {
  input: 'input',
  sign_detect: 'signDetect',
  vehicle_track: 'vehicleTrack',
  ocr: 'ocr',
  rule_engine: 'ruleEngine',
  evidence: 'evidence',
  database: 'database',
  dashboard: 'dashboard',
};

function getSubtasks(locale: Locale, stepId: FlowStepId): string[] {
  const key = FLOW_TO_SUBTASK_KEY[stepId];
  const list = translations[locale]?.aiDetection?.flow?.subtasks?.[key]
    ?? translations.en.aiDetection.flow.subtasks[key];
  return Array.isArray(list) ? list : [];
}

function OverallProgressBar({ pct, accent }: { pct: number; accent: string }) {
  const { t } = useLanguage();
  return (
    <div className="pipeline-step-panel__progress-block">
      <div className="pipeline-step-panel__progress-head">
        <span>{t('aiDetection.flow.overallProgress')}</span>
        <span style={{ color: accent }}>{pct}%</span>
      </div>
      <div className="pipeline-step-panel__progress-track">
        <motion.div
          className="pipeline-step-panel__progress-fill"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          style={{ background: `linear-gradient(90deg, ${accent}, ${accent}99)` }}
        />
      </div>
    </div>
  );
}

function SubTaskRow({
  label,
  state,
  accent,
  showOk,
}: {
  label: string;
  state: 'done' | 'active' | 'pending';
  accent: string;
  showOk?: boolean;
}) {
  const { t } = useLanguage();
  const isDone = state === 'done';
  const isActive = state === 'active';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`pipeline-step-panel__subtask${isDone ? ' is-done' : ''}${isActive ? ' is-active' : ''}`}
      style={isActive ? { borderColor: accent, boxShadow: `0 4px 24px ${accent}22` } : undefined}
    >
      <div
        className="pipeline-step-panel__subtask-icon"
        style={
          isDone
            ? { background: 'rgba(16,185,129,0.15)', color: '#10B981', borderColor: 'rgba(16,185,129,0.4)' }
            : { background: `${accent}18`, color: accent, borderColor: `${accent}55` }
        }
      >
        {isDone ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <Loader2 size={20} className="animate-spin" style={{ animationDuration: '1s' }} />}
      </div>
      <span className="pipeline-step-panel__subtask-label">{label}</span>
      {isDone && showOk && <span className="pipeline-step-panel__subtask-ok">{t('aiDetection.flow.ok')}</span>}
    </motion.div>
  );
}

function SubTaskList({ labels, stepPct, accent, showOk }: { labels: string[]; stepPct: number; accent: string; showOk?: boolean }) {
  const states = subTaskStates(labels.length, stepPct);
  return (
    <div className="pipeline-step-panel__subtasks">
      {labels.map((label, i) => {
        const state = states[i];
        if (state === 'pending') return null;
        return (
          <SubTaskRow key={label} label={label} state={state} accent={accent} showOk={showOk} />
        );
      })}
    </div>
  );
}

function VehicleTrackStage({ stepPct }: { stepPct: number }) {
  const { t } = useLanguage();
  const vehicles = [
    { id: 1, label: '#1 Car 52km/h', color: '#06B6D4', left: '8%', violation: false },
    { id: 2, label: '#2 Truck 63km/h', color: '#F59E0B', left: '32%', violation: false },
    { id: 4, label: '#4 Bus 84km/h', color: '#10B981', left: '55%', violation: false },
    { id: 5, label: '#5 Car 121km/h', color: '#EF4444', left: '78%', violation: true },
  ];
  const visible = Math.max(1, Math.ceil((stepPct / 100) * vehicles.length));

  return (
    <div className="pipeline-step-panel__track-stage">
      <div className="pipeline-step-panel__track-header">
        <span className="pipeline-step-panel__live-dot" />
        <span>{t('aiDetection.flow.bytetrackLive')}</span>
        <span className="ml-auto text-[10px] opacity-60">{(stepPct / 100 * 0.8 + 0.1).toFixed(1)}s</span>
      </div>
      <div className="pipeline-step-panel__track-road">
        {vehicles.slice(0, visible).map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pipeline-step-panel__track-vehicle"
            style={{ left: v.left, borderColor: v.color, top: `${18 + (i % 2) * 28}%` }}
          >
            <span style={{ color: v.color }}>{v.label}</span>
            {v.violation && <span className="pipeline-step-panel__track-violation" />}
          </motion.div>
        ))}
      </div>
      <div className="pipeline-step-panel__track-stats">
        <div><strong>5</strong><span>Tracked</span></div>
        <div><strong>75 km/h</strong><span>Avg Speed</span></div>
        <div className="text-red-400"><strong>1</strong><span>Violations</span></div>
      </div>
    </div>
  );
}

function OcrStage({ stepPct }: { stepPct: number }) {
  const { t } = useLanguage();
  const plates = [
    { id: 'V001', plate: '2AB-1234', region: 'Phnom Penh', conf: 98, status: 'clear' as const },
    { id: 'V002', plate: 'XYZ-9842', region: 'Siem Reap', conf: 95, status: 'flagged' as const },
    { id: 'V003', plate: 'LKJ-0032', region: 'Battambang', conf: 92, status: 'clear' as const },
    { id: 'V004', plate: '…', region: 'Scanning', conf: 0, status: 'pending' as const },
  ];
  const doneCount = Math.min(plates.length, Math.floor((stepPct / 100) * plates.length));

  return (
    <div className="pipeline-step-panel__ocr">
      <div className="pipeline-step-panel__ocr-banner">
        <ScanLine size={14} className="text-violet-400" />
        <div>
          <p className="text-xs font-semibold">{t('aiDetection.flow.ocrProcessing')}</p>
          <p className="text-[10px] opacity-60">{doneCount}/{plates.length} plates extracted</p>
        </div>
        <span className="ml-auto text-[10px] opacity-50">EasyOCR v1.7</span>
      </div>
      <div className="space-y-2">
        {plates.map((p, i) => {
          const state = i < doneCount ? 'done' : i === doneCount ? 'active' : 'pending';
          return (
            <div
              key={p.id}
              className={`pipeline-step-panel__ocr-card${state === 'active' ? ' is-active' : ''}${state === 'pending' ? ' is-pending' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold opacity-70">{p.id} · {p.region}</span>
                {state === 'done' && p.status === 'clear' && (
                  <span className="text-[9px] font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/15">Clear</span>
                )}
                {state === 'done' && p.status === 'flagged' && (
                  <span className="text-[9px] font-bold text-red-400 px-1.5 py-0.5 rounded bg-red-500/15">Flagged</span>
                )}
                {state === 'active' && <Loader2 size={12} className="animate-spin text-violet-400" />}
              </div>
              <div className="pipeline-step-panel__ocr-plate">{p.plate}</div>
              {state === 'done' && p.conf > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[9px] mb-1 opacity-60"><span>Confidence</span><span>{p.conf}%</span></div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${p.conf}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RuleEngineStage({ labels, stepPct }: { labels: string[]; stepPct: number }) {
  const { t } = useLanguage();
  const states = subTaskStates(labels.length, stepPct);

  return (
    <div className="pipeline-step-panel__terminal">
      <p className="pipeline-step-panel__terminal-title">{t('aiDetection.flow.ruleEngineLog')}</p>
      <div className="space-y-1.5 font-mono text-[11px]">
        {labels.map((line, i) => {
          if (states[i] === 'pending') return null;
          return (
          <div
            key={line}
            className={`flex items-center gap-2${states[i] === 'active' ? ' text-cyan-400' : states[i] === 'done' ? ' text-muted-foreground' : ' opacity-30'}`}
          >
            {states[i] === 'done' && <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />}
            {states[i] === 'active' && <Play size={10} className="text-cyan-400 flex-shrink-0 fill-cyan-400" />}
            {states[i] === 'pending' && <span className="w-3" />}
            <span>{line}{states[i] !== 'pending' ? '…' : ''}</span>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function EvidenceStage({ stepPct }: { stepPct: number }) {
  const cells = [
    { icon: Clock, label: 'TIMESTAMP', value: new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC' },
    { icon: MapPin, label: 'LOCATION', value: 'Cambodia · CamTraffic Demo' },
    { icon: Camera, label: 'FRAMES', value: `${Math.round(stepPct * 8.47)} frames` },
    { icon: Car, label: 'VEHICLES', value: '5 vehicles' },
    { icon: Fingerprint, label: 'OCR CONFIDENCE', value: '95.2%' },
    { icon: FileText, label: 'MODEL', value: 'YOLOv8 + ByteTrack' },
  ];
  const visible = Math.ceil((stepPct / 100) * cells.length);

  return (
    <div className="pipeline-step-panel__evidence">
      <div className="pipeline-step-panel__evidence-package">
        <FileText size={16} className="text-blue-400" />
        <div>
          <p className="text-xs font-bold">Evidence Package</p>
          <p className="text-[10px] opacity-60">EVD-{new Date().toISOString().slice(0, 10)}-00142</p>
        </div>
      </div>
      <div className="pipeline-step-panel__evidence-grid">
        {cells.slice(0, visible).map((c) => (
          <motion.div key={c.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pipeline-step-panel__evidence-cell">
            <c.icon size={12} className="opacity-50 mb-1" />
            <p className="text-[8px] font-bold tracking-wider opacity-50">{c.label}</p>
            <p className="text-[10px] font-semibold mt-0.5 leading-tight">{c.value}</p>
          </motion.div>
        ))}
      </div>
      {stepPct > 70 && (
        <div className="pipeline-step-panel__evidence-violation">
          <AlertTriangle size={14} className="text-amber-400" />
          <div>
            <p className="text-xs font-bold">Speed Violation</p>
            <p className="text-[10px] opacity-60">XYZ-9842 — 124 km/h in 60 zone</p>
          </div>
          <span className="ml-auto text-[9px] font-bold text-amber-400 border border-amber-400/40 px-1.5 py-0.5 rounded">HIGH</span>
        </div>
      )}
    </div>
  );
}

function DatabaseStage({ labels, stepPct }: { labels: string[]; stepPct: number }) {
  const states = subTaskStates(labels.length, stepPct);
  const icons = [Database, FileText, CloudUpload, HardDrive, Lock];

  return (
    <div className="pipeline-step-panel__subtasks">
      {labels.map((label, i) => {
        const Icon = icons[i] ?? Database;
        const isDone = states[i] === 'done';
        const isActive = states[i] === 'active';
        if (!isDone && !isActive) return null;
        return (
          <div
            key={label}
            className={`pipeline-step-panel__subtask${isDone ? ' is-done' : ''}${isActive ? ' is-active' : ''}${!isDone && !isActive ? ' is-pending' : ''}`}
          >
            <div className="pipeline-step-panel__subtask-icon">
              {isDone ? <CheckCircle2 size={16} className="text-emerald-500" /> : isActive ? <Loader2 size={16} className="animate-spin text-emerald-400" /> : <Icon size={14} />}
            </div>
            <span className="pipeline-step-panel__subtask-label">{label}</span>
            {isDone && <span className="pipeline-step-panel__subtask-ok">OK</span>}
          </div>
        );
      })}
    </div>
  );
}

function StepStageBody({ stepId, labels, stepPct, accent }: { stepId: FlowStepId; labels: string[]; stepPct: number; accent: string }) {
  switch (stepId) {
    case 'vehicle_track':
      return <VehicleTrackStage stepPct={stepPct} />;
    case 'ocr':
      return <OcrStage stepPct={stepPct} />;
    case 'rule_engine':
      return <RuleEngineStage labels={labels} stepPct={stepPct} />;
    case 'evidence':
      return <EvidenceStage stepPct={stepPct} />;
    case 'database':
      return <DatabaseStage labels={labels} stepPct={stepPct} />;
    case 'dashboard':
    case 'input':
    case 'sign_detect':
      return <SubTaskList labels={labels} stepPct={stepPct} accent={accent} />;
    default:
      return <SubTaskList labels={labels} stepPct={stepPct} accent={accent} />;
  }
}

export function PipelineStepProcessingPanel({
  progress,
}: {
  progress: number;
}) {
  const { locale } = useLanguage();
  const { activeIndex, stepPct, overallPct } = stepProgressWithinActive(progress);
  const meta = STEP_META[activeIndex];
  if (!meta) return null;

  const labels = getSubtasks(locale, meta.id);

  return (
    <div className="pipeline-step-panel flex flex-col flex-1 min-h-0 h-full">
      <div className="flex-1 min-h-0 flex flex-col pipeline-step-panel__inner">
        <div className="flex-shrink-0 px-1 pb-4">
          <OverallProgressBar pct={overallPct} accent={meta.color} />
        </div>

        <PipelineOneStepView activeIndex={activeIndex} stepPct={stepPct} accent={meta.color}>
          <div className="pipeline-stage-view__content flex-1 min-h-0 flex flex-col justify-center">
            <StepStageBody stepId={meta.id} labels={labels} stepPct={stepPct} accent={meta.color} />
          </div>
        </PipelineOneStepView>
      </div>
    </div>
  );
}
