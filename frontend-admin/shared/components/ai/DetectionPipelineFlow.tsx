import { CheckCircle, Circle, AlertCircle, Minus, Loader2 } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';

export type PipelineStepStatus = 'complete' | 'empty' | 'failed' | 'skipped' | 'pending' | 'active';

export interface PipelineStep {
  id: string;
  status: PipelineStepStatus;
  detail_en?: string;
  detail_km?: string;
  confidence?: number;
}

const STEP_LABEL_KEYS: Record<string, string> = {
  upload: 'aiDetection.pipeline.upload',
  vehicle_detect: 'aiDetection.pipeline.vehicleDetect',
  plate_detect: 'aiDetection.pipeline.plateDetect',
  plate_ocr: 'aiDetection.pipeline.plateOcr',
  show_vehicle: 'aiDetection.pipeline.showVehicle',
  show_plate: 'aiDetection.pipeline.showPlate',
  save_record: 'aiDetection.pipeline.saveRecord',
};

function stepIcon(status: PipelineStepStatus) {
  if (status === 'active') return <Loader2 size={14} className="animate-spin text-violet-500" />;
  if (status === 'complete') return <CheckCircle size={14} className="text-emerald-500" />;
  if (status === 'failed') return <AlertCircle size={14} className="text-red-500" />;
  if (status === 'skipped' || status === 'empty') return <Minus size={14} className="text-muted-foreground" />;
  return <Circle size={14} className="text-muted-foreground" />;
}

export function DetectionPipelineFlow({
  steps,
  activeStepId,
  compact = false,
}: {
  steps: PipelineStep[];
  activeStepId?: string | null;
  compact?: boolean;
}) {
  const { t, locale } = useLanguage();
  const isEn = locale === 'en';

  return (
    <div className={`rounded-2xl border border-border/70 bg-muted/20 ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
        {t('aiDetection.pipeline.title')}
      </p>
      <ol className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {steps.map((step, index) => {
          const status: PipelineStepStatus =
            activeStepId === step.id ? 'active' : step.status;
          const labelKey = STEP_LABEL_KEYS[step.id];
          const detail = isEn ? step.detail_en : (step.detail_km || step.detail_en);
          return (
            <li
              key={step.id}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-background border border-border/60"
            >
              <span className="mt-0.5 flex-shrink-0">{stepIcon(status)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-muted-foreground">
                  {index + 1}. {labelKey ? t(labelKey) : step.id}
                </p>
                {detail && (
                  <p className="text-[12px] font-semibold leading-snug mt-0.5 truncate" title={detail}>
                    {detail}
                    {step.confidence != null && step.confidence > 0 && (
                      <span className="text-emerald-600 ml-1">({step.confidence.toFixed(1)}%)</span>
                    )}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export const PIPELINE_STEP_ORDER = [
  'upload',
  'vehicle_detect',
  'plate_detect',
  'plate_ocr',
  'show_vehicle',
  'show_plate',
  'save_record',
] as const;

export function buildLoadingPipeline(activeIndex: number): PipelineStep[] {
  return PIPELINE_STEP_ORDER.map((id, index) => ({
    id,
    status: index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'pending',
    detail_en: index < activeIndex ? 'Done' : index === activeIndex ? 'Running...' : '',
    detail_km: index < activeIndex ? 'រួចរាល់' : index === activeIndex ? 'កំពុងដំណើរការ...' : '',
  }));
}
