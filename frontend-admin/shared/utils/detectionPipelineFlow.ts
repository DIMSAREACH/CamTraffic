import type { PipelineStep, PipelineStepStatus } from '@shared/components/ai/DetectionPipelineFlow';

export const FLOW_STEP_IDS = [
  'input',
  'sign_detect',
  'vehicle_track',
  'ocr',
  'rule_engine',
  'evidence',
  'database',
  'dashboard',
] as const;

export type FlowStepId = (typeof FLOW_STEP_IDS)[number];

export interface FlowStepView extends PipelineStep {
  id: FlowStepId;
}

export interface DetectionFlowSource {
  sign_name?: string;
  sign_name_en?: string;
  sign_name_km?: string;
  confidence?: number;
  detected_plate?: string;
  plate_confidence?: number;
  vehicles?: Array<{ track_id?: number; label?: string; confidence?: number }>;
  violation_evaluation?: {
    is_violation?: boolean;
    title?: string;
  };
  violation?: { id?: number };
  log_id?: number;
  vehicle_snapshot?: string;
  plate_snapshot?: string;
  pipeline?: Array<{
    id: string;
    status: string;
    detail_en?: string;
    detail_km?: string;
    confidence?: number;
  }>;
}

function pipelineById(pipeline: DetectionFlowSource['pipeline']) {
  const map = new Map<string, NonNullable<DetectionFlowSource['pipeline']>[number]>();
  for (const step of pipeline ?? []) {
    map.set(step.id, step);
  }
  return map;
}

function mapApiStatus(status: string | undefined): PipelineStepStatus {
  if (status === 'complete') return 'complete';
  if (status === 'failed') return 'failed';
  if (status === 'skipped' || status === 'empty') return 'empty';
  if (status === 'active') return 'active';
  return 'pending';
}

function signLabel(source: DetectionFlowSource, locale: 'en' | 'km'): string {
  if (locale === 'km') {
    return source.sign_name_km || source.sign_name || source.sign_name_en || '';
  }
  return source.sign_name_en || source.sign_name || source.sign_name_km || '';
}

export function activeFlowIndexFromProgress(progress: number): number {
  if (progress < 10) return 0;
  if (progress < 22) return 1;
  if (progress < 36) return 2;
  if (progress < 50) return 3;
  if (progress < 64) return 4;
  if (progress < 76) return 5;
  if (progress < 90) return 6;
  return 7;
}

export function buildLoadingFlowSteps(progress: number): FlowStepView[] {
  const activeIndex = activeFlowIndexFromProgress(progress);
  return FLOW_STEP_IDS.map((id, index) => ({
    id,
    status: index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'pending',
    detail_en: index < activeIndex ? 'Done' : index === activeIndex ? 'Running…' : '',
    detail_km: index < activeIndex ? 'រួចរាល់' : index === activeIndex ? 'កំពុងដំណើរការ…' : '',
  }));
}

const PIPELINE_PROGRESS_TARGETS = [10, 22, 36, 50, 64, 76, 90, 100];

export function stepProgressWithinActive(globalProgress: number): {
  activeIndex: number;
  stepPct: number;
  overallPct: number;
} {
  const activeIndex = activeFlowIndexFromProgress(globalProgress);
  const start = activeIndex === 0 ? 0 : PIPELINE_PROGRESS_TARGETS[activeIndex - 1];
  const end = PIPELINE_PROGRESS_TARGETS[activeIndex];
  const stepPct =
    end === start ? 100 : Math.min(100, Math.max(0, ((globalProgress - start) / (end - start)) * 100));
  return { activeIndex, stepPct: Math.round(stepPct), overallPct: Math.round(Math.min(100, globalProgress)) };
}

function subTaskStates(count: number, stepPct: number): Array<'done' | 'active' | 'pending'> {
  if (count <= 0) return [];
  const doneCount = Math.min(count, Math.floor((stepPct / 100) * count));
  const allDone = stepPct >= 100;
  return Array.from({ length: count }, (_, i) => {
    if (allDone || i < doneCount) return 'done';
    if (i === doneCount) return 'active';
    return 'pending';
  });
}

export { subTaskStates };

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Advance progress through remaining pipeline steps one-by-one, then allow result UI. */
export async function animatePipelineToComplete(
  setProgress: (value: number) => void,
  fromProgress: number,
  stepMs: number,
  isCancelled: () => boolean,
): Promise<void> {
  const targets = PIPELINE_PROGRESS_TARGETS.filter((t) => t > fromProgress);
  const tickMs = 70;
  let current = fromProgress;

  for (const target of targets) {
    if (isCancelled()) return;
    const frames = Math.max(1, Math.ceil(stepMs / tickMs));
    for (let i = 1; i <= frames; i++) {
      if (isCancelled()) return;
      const p = current + ((target - current) * i) / frames;
      setProgress(Math.min(100, p));
      await sleep(tickMs);
    }
    current = target;
    await sleep(Math.round(stepMs * 0.65));
  }
}

export function resolveFlowStepsFromResult(
  source: DetectionFlowSource | null | undefined,
  locale: 'en' | 'km',
): FlowStepView[] {
  if (!source) {
    return FLOW_STEP_IDS.map((id) => ({ id, status: 'pending' }));
  }

  const steps = pipelineById(source.pipeline);
  const upload = steps.get('upload');
  const signStep = steps.get('sign_detect');
  const vehicle = steps.get('vehicle_detect');
  const plateOcr = steps.get('plate_ocr');
  const violation = steps.get('violation_check');
  const evidence = steps.get('evidence_capture');
  const save = steps.get('save_record');

  const signName = signLabel(source, locale);
  const signConf = signStep?.confidence ?? source.confidence ?? 0;
  const trackId = source.vehicles?.[0]?.track_id;
  const trackSuffixEn = trackId != null ? ` · Track #${trackId}` : '';
  const trackSuffixKm = trackId != null ? ` · ល.រ #${trackId}` : '';

  return [
    {
      id: 'input',
      status: upload ? mapApiStatus(upload.status) : source.log_id ? 'complete' : 'complete',
      detail_en: upload?.detail_en || 'Image received',
      detail_km: upload?.detail_km || 'បានទទួលរូបភាព',
    },
    {
      id: 'sign_detect',
      status: signStep
        ? mapApiStatus(signStep.status)
        : signName
          ? 'complete'
          : 'empty',
      detail_en: signStep?.detail_en || (signName ? `${signName} (${signConf.toFixed(1)}%)` : 'No sign detected'),
      detail_km: signStep?.detail_km || (signName ? `${signName} (${signConf.toFixed(1)}%)` : 'រកមិនឃើញស្លាក'),
      confidence: signConf > 0 ? signConf : undefined,
    },
    {
      id: 'vehicle_track',
      status: vehicle ? mapApiStatus(vehicle.status) : source.vehicles?.length ? 'complete' : 'empty',
      detail_en: vehicle?.detail_en || (source.vehicles?.[0]?.label
        ? `${source.vehicles[0].label}${trackSuffixEn}`
        : 'No vehicle in frame'),
      detail_km: vehicle?.detail_km || (source.vehicles?.[0]?.label
        ? `${source.vehicles[0].label}${trackSuffixKm}`
        : 'គ្មានរថយន្តក្នុងរូប'),
      confidence: vehicle?.confidence ?? source.vehicles?.[0]?.confidence,
    },
    {
      id: 'ocr',
      status: plateOcr ? mapApiStatus(plateOcr.status) : source.detected_plate ? 'complete' : 'empty',
      detail_en: plateOcr?.detail_en || source.detected_plate || 'Plate not read',
      detail_km: plateOcr?.detail_km || source.detected_plate || 'មិនអានផ្លាកបាន',
      confidence: plateOcr?.confidence ?? source.plate_confidence,
    },
    {
      id: 'rule_engine',
      status: violation
        ? mapApiStatus(violation.status)
        : source.violation_evaluation?.is_violation
          ? 'complete'
          : source.violation_evaluation
            ? 'empty'
            : 'skipped',
      detail_en: violation?.detail_en
        || source.violation_evaluation?.title
        || (source.violation_evaluation ? 'No violation for this action' : 'Skipped'),
      detail_km: violation?.detail_km
        || source.violation_evaluation?.title
        || (source.violation_evaluation ? 'គ្មានការប្រព្រឹត្តិល្មើស' : 'រំលង'),
    },
    {
      id: 'evidence',
      status: evidence
        ? mapApiStatus(evidence.status)
        : source.vehicle_snapshot || source.plate_snapshot
          ? 'complete'
          : 'pending',
      detail_en: evidence?.detail_en || (source.vehicle_snapshot || source.plate_snapshot
        ? 'Frame + crop snapshots saved'
        : 'Waiting for evidence'),
      detail_km: evidence?.detail_km || (source.vehicle_snapshot || source.plate_snapshot
        ? 'បានរក្សាទុករូបភាពភស្តុតាង'
        : 'រង់ចាំភស្តុតាង'),
    },
    {
      id: 'database',
      status: save ? mapApiStatus(save.status) : source.log_id ? 'complete' : 'pending',
      detail_en: save?.detail_en || (source.log_id ? `Saved as log #${source.log_id}` : 'Waiting to save'),
      detail_km: save?.detail_km || (source.log_id ? `បានរក្សាទុក #${source.log_id}` : 'រង់ចាំរក្សាទុក'),
    },
    {
      id: 'dashboard',
      status: source.log_id ? 'complete' : 'pending',
      detail_en: source.log_id ? 'Ready on dashboard' : 'Pending display',
      detail_km: source.log_id ? 'បង្ហាញលទ្ធផលរួចរាល់' : 'រង់ចាំបង្ហាញ',
    },
  ];
}

export function countCompletedFlowSteps(steps: FlowStepView[]): number {
  return steps.filter((s) => s.status === 'complete').length;
}
