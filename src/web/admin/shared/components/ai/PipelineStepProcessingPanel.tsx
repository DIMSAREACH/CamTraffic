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
import { PipelineStepsStrip } from '@shared/components/ai/PipelineStepsStrip';
import type { FlowStepId } from '@shared/utils/detectionPipelineFlow';
import type { DetectionFlowSource } from '@shared/utils/detectionPipelineFlow';
import { pipelineStepById, stepProgressWithinActive, subTaskStates } from '@shared/utils/detectionPipelineFlow';

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

function VehicleTrackStage({
  stepPct,
  live,
  fallbackLabels,
  accent,
}: {
  stepPct: number;
  live?: DetectionFlowSource | null;
  fallbackLabels: string[];
  accent: string;
}) {
  const { t } = useLanguage();
  const vehicles = live?.vehicles ?? [];
  const palette = ['#06B6D4', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

  if (!vehicles.length) {
    return <SubTaskList labels={fallbackLabels} stepPct={stepPct} accent={accent} showOk />;
  }

  const visible = Math.max(1, Math.ceil((stepPct / 100) * vehicles.length));

  return (
    <div className="pipeline-step-panel__track-stage">
      <div className="pipeline-step-panel__track-header">
        <span className="pipeline-step-panel__live-dot" />
        <span>{t('aiDetection.flow.bytetrackLive')}</span>
        <span className="ml-auto text-[10px] opacity-60">
          {live?.processing_time != null ? `${live.processing_time}s` : `${(stepPct / 100 * 0.8 + 0.1).toFixed(1)}s`}
        </span>
      </div>
      <div className="pipeline-step-panel__track-road">
        {vehicles.slice(0, visible).map((v, i) => {
          const color = palette[i % palette.length];
          const label = v.label || v.vehicle_type || `Vehicle ${i + 1}`;
          const track = v.track_id != null ? ` #${v.track_id}` : '';
          return (
            <motion.div
              key={`${label}-${v.track_id ?? i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="pipeline-step-panel__track-vehicle"
              style={{ left: `${8 + (i * 22) % 78}%`, borderColor: color, top: `${18 + (i % 2) * 28}%` }}
            >
              <span style={{ color }}>{label}{track}</span>
              {(v.confidence ?? 0) > 0 && (
                <span className="text-[9px] opacity-70 ml-1">{v.confidence!.toFixed(0)}%</span>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="pipeline-step-panel__track-stats">
        <div><strong>{vehicles.length}</strong><span>Tracked</span></div>
        <div>
          <strong>
            {vehicles.length
              ? `${(vehicles.reduce((a, v) => a + (v.confidence ?? 0), 0) / vehicles.length).toFixed(0)}%`
              : '—'}
          </strong>
          <span>Avg Conf.</span>
        </div>
        <div><strong>{live?.detected_plate || '—'}</strong><span>Plate</span></div>
      </div>
    </div>
  );
}

function OcrStage({ stepPct, live, fallbackLabels, accent }: { stepPct: number; live?: DetectionFlowSource | null; fallbackLabels: string[]; accent: string }) {
  const { t, locale } = useLanguage();
  const isEn = locale === 'en';
  const ocrStep = pipelineStepById(live?.pipeline, 'plate_ocr');
  const reads = live?.plate_ocr_details ?? [];
  const plates = reads.length
    ? reads.map((r, i) => ({
        id: `R${i + 1}`,
        plate: r.text || '…',
        region: r.region || (isEn ? live?.plate_province_en : live?.plate_province_km) || 'Cambodia',
        conf: r.confidence,
        status: (r.confidence >= 80 ? 'clear' : 'flagged') as 'clear' | 'flagged',
      }))
    : live?.detected_plate
      ? [{
          id: 'V001',
          plate: live.detected_plate,
          region: (isEn ? live.plate_province_en : live.plate_province_km) || 'Cambodia',
          conf: live.plate_confidence ?? ocrStep?.confidence ?? 0,
          status: 'clear' as const,
        }]
      : null;

  if (!plates?.length) {
    return <SubTaskList labels={fallbackLabels} stepPct={stepPct} accent={accent} showOk />;
  }

  const doneCount = Math.min(plates.length, Math.floor((stepPct / 100) * plates.length) || (stepPct > 0 ? 1 : 0));

  return (
    <div className="pipeline-step-panel__ocr">
      <div className="pipeline-step-panel__ocr-banner">
        <ScanLine size={14} className="text-violet-400" />
        <div>
          <p className="text-xs font-semibold">{t('aiDetection.flow.ocrProcessing')}</p>
          <p className="text-[10px] opacity-60">{doneCount}/{plates.length} plates extracted</p>
        </div>
        <span className="ml-auto text-[10px] opacity-50">EasyOCR</span>
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
                  <span className="text-[9px] font-bold text-red-400 px-1.5 py-0.5 rounded bg-red-500/15">Low conf.</span>
                )}
                {state === 'active' && <Loader2 size={12} className="animate-spin text-violet-400" />}
              </div>
              <div className="pipeline-step-panel__ocr-plate">{p.plate}</div>
              {state === 'done' && p.conf > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[9px] mb-1 opacity-60"><span>Confidence</span><span>{p.conf.toFixed(1)}%</span></div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, p.conf)}%` }} />
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

function RuleEngineStage({
  labels,
  stepPct,
  live,
  locale,
}: {
  labels: string[];
  stepPct: number;
  live?: DetectionFlowSource | null;
  locale: Locale;
}) {
  const { t } = useLanguage();
  const violationStep = pipelineStepById(live?.pipeline, 'violation_check');
  const isEn = locale === 'en';
  const resultDetail = isEn ? violationStep?.detail_en : violationStep?.detail_km;
  const evalTitle = live?.violation_evaluation?.title || live?.violation_evaluation?.violation_type;
  const lines = resultDetail
    ? [...labels.slice(0, Math.max(0, labels.length - 1)), resultDetail || evalTitle || labels[labels.length - 1]]
    : evalTitle
      ? [...labels.slice(0, Math.max(0, labels.length - 1)), evalTitle]
      : labels;
  const states = subTaskStates(lines.length, stepPct);

  return (
    <div className="pipeline-step-panel__terminal">
      <p className="pipeline-step-panel__terminal-title">{t('aiDetection.flow.ruleEngineLog')}</p>
      <div className="space-y-1.5 font-mono text-[11px]">
        {lines.map((line, i) => {
          if (states[i] === 'pending') return null;
          return (
          <div
            key={`${line}-${i}`}
            className={`flex items-center gap-2${states[i] === 'active' ? ' text-cyan-400' : states[i] === 'done' ? ' text-muted-foreground' : ' opacity-30'}`}
          >
            {states[i] === 'done' && <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />}
            {states[i] === 'active' && <Play size={10} className="text-cyan-400 flex-shrink-0 fill-cyan-400" />}
            {states[i] === 'pending' && <span className="w-3" />}
            <span>{line}{states[i] === 'active' ? '…' : ''}</span>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function EvidenceStage({ stepPct, live, fallbackLabels, accent }: { stepPct: number; live?: DetectionFlowSource | null; fallbackLabels: string[]; accent: string }) {
  const { t } = useLanguage();
  const evidenceStep = pipelineStepById(live?.pipeline, 'evidence_capture');
  const vehicleCount = live?.vehicle_count ?? live?.vehicles?.length ?? 0;
  const hasLive = Boolean(live?.log_id || evidenceStep || live?.vehicle_snapshot || live?.plate_snapshot);

  if (!hasLive) {
    return <SubTaskList labels={fallbackLabels} stepPct={stepPct} accent={accent} showOk />;
  }

  const cells = [
    { icon: Clock, label: 'TIMESTAMP', value: new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC' },
    { icon: MapPin, label: 'LOCATION', value: 'Cambodia · CamTraffic' },
    { icon: Camera, label: 'LOG ID', value: live?.log_id ? `#${live.log_id}` : 'Pending' },
    { icon: Car, label: 'VEHICLES', value: `${vehicleCount} detected` },
    { icon: Fingerprint, label: 'PLATE OCR', value: live?.plate_confidence ? `${live.plate_confidence.toFixed(1)}%` : '—' },
    { icon: FileText, label: 'MODEL', value: 'YOLOv8 + EasyOCR' },
  ];
  const visible = Math.ceil((stepPct / 100) * cells.length);
  const violation = live?.violation_evaluation?.is_violation;

  return (
    <div className="pipeline-step-panel__evidence">
      <div className="pipeline-step-panel__evidence-package">
        <FileText size={16} className="text-blue-400" />
        <div>
          <p className="text-xs font-bold">{t('aiDetection.flow.evidencePackage')}</p>
          <p className="text-[10px] opacity-60">
            {evidenceStep?.detail_en || (live?.log_id ? `Detection log #${live.log_id}` : 'Packaging evidence…')}
          </p>
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
      {violation && stepPct > 50 && (
        <div className="pipeline-step-panel__evidence-violation">
          <AlertTriangle size={14} className="text-amber-400" />
          <div>
            <p className="text-xs font-bold">{live?.violation_evaluation?.title || 'Violation flagged'}</p>
            <p className="text-[10px] opacity-60">
              {live?.detected_plate || live?.violation?.vehicle_plate || 'Plate linked to violation record'}
            </p>
          </div>
          {live?.violation?.id != null && (
            <span className="ml-auto text-[9px] font-bold text-amber-400 border border-amber-400/40 px-1.5 py-0.5 rounded">
              #{live.violation.id}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function DatabaseStage({
  labels,
  stepPct,
  live,
}: {
  labels: string[];
  stepPct: number;
  live?: DetectionFlowSource | null;
}) {
  const states = subTaskStates(labels.length, stepPct);
  const icons = [Database, FileText, CloudUpload, HardDrive, Lock];
  const saveStep = pipelineStepById(live?.pipeline, 'save_record');
  const saved = Boolean(live?.log_id || saveStep?.status === 'complete');

  return (
    <div className="pipeline-step-panel__subtasks">
      {labels.map((label, i) => {
        const Icon = icons[i] ?? Database;
        const isDone = saved ? i <= labels.length - 1 && (states[i] === 'done' || stepPct >= ((i + 1) / labels.length) * 100) : states[i] === 'done';
        const isActive = !saved && states[i] === 'active';
        if (!isDone && !isActive) return null;
        const displayLabel = i === labels.length - 1 && live?.log_id
          ? `${label} (#${live.log_id})`
          : label;
        return (
          <div
            key={label}
            className={`pipeline-step-panel__subtask${isDone ? ' is-done' : ''}${isActive ? ' is-active' : ''}${!isDone && !isActive ? ' is-pending' : ''}`}
          >
            <div className="pipeline-step-panel__subtask-icon">
              {isDone ? <CheckCircle2 size={16} className="text-emerald-500" /> : isActive ? <Loader2 size={16} className="animate-spin text-emerald-400" /> : <Icon size={14} />}
            </div>
            <span className="pipeline-step-panel__subtask-label">{displayLabel}</span>
            {isDone && <span className="pipeline-step-panel__subtask-ok">OK</span>}
          </div>
        );
      })}
    </div>
  );
}

function StepStageBody({
  stepId,
  labels,
  stepPct,
  accent,
  liveSource,
  locale,
}: {
  stepId: FlowStepId;
  labels: string[];
  stepPct: number;
  accent: string;
  liveSource?: DetectionFlowSource | null;
  locale: Locale;
}) {
  switch (stepId) {
    case 'vehicle_track':
      return <VehicleTrackStage stepPct={stepPct} live={liveSource} fallbackLabels={labels} accent={accent} />;
    case 'ocr':
      return <OcrStage stepPct={stepPct} live={liveSource} fallbackLabels={labels} accent={accent} />;
    case 'rule_engine':
      return <RuleEngineStage labels={labels} stepPct={stepPct} live={liveSource} locale={locale} />;
    case 'evidence':
      return <EvidenceStage stepPct={stepPct} live={liveSource} fallbackLabels={labels} accent={accent} />;
    case 'database':
      return <DatabaseStage labels={labels} stepPct={stepPct} live={liveSource} />;
    case 'dashboard':
    case 'input':
    case 'sign_detect':
      return <SubTaskList labels={labels} stepPct={stepPct} accent={accent} showOk={Boolean(liveSource)} />;
    default:
      return <SubTaskList labels={labels} stepPct={stepPct} accent={accent} showOk={Boolean(liveSource)} />;
  }
}

export function PipelineStepProcessingPanel({
  progress,
  liveSource,
}: {
  progress: number;
  liveSource?: DetectionFlowSource | null;
}) {
  const { locale } = useLanguage();
  const { activeIndex, stepPct, overallPct } = stepProgressWithinActive(progress);
  const meta = STEP_META[activeIndex];
  if (!meta) return null;

  const labels = getSubtasks(locale, meta.id);

  return (
    <div className="pipeline-step-panel flex flex-col flex-1 min-h-0 h-full">
      <div className="flex-1 min-h-0 flex flex-col pipeline-step-panel__inner">
        <div className="flex-shrink-0 pipeline-step-panel__strip-wrap mb-4">
          <PipelineStepsStrip activeIndex={activeIndex} variant="panel" />
        </div>
        <div className="flex-shrink-0 px-1 pb-4">
          <OverallProgressBar pct={overallPct} accent={meta.color} />
        </div>

        <PipelineOneStepView activeIndex={activeIndex} stepPct={stepPct} accent={meta.color}>
          <div className="pipeline-stage-view__content flex-1 min-h-0 flex flex-col justify-center">
            <StepStageBody
              stepId={meta.id}
              labels={labels}
              stepPct={stepPct}
              accent={meta.color}
              liveSource={liveSource}
              locale={locale}
            />
          </div>
        </PipelineOneStepView>
      </div>
    </div>
  );
}
