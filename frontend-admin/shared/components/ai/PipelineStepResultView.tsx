import { Car, Hash, Shield, FileText, Database, LayoutDashboard, Signpost, ExternalLink } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { DetectionDisplayImage } from '@shared/components/ai/DetectionDisplayImage';
import { detectionHero } from '@shared/utils/detectionDisplay';
import { resolvePipelineVehicle } from '@shared/utils/pipelineVehicle';
import type { FlowStepId } from '@shared/utils/detectionPipelineFlow';
import type { PipelineStep } from '@shared/components/ai/DetectionPipelineFlow';
import type { AIDetectionLog } from '@shared/types';

interface ResultLike {
  sign_name?: string;
  sign_name_en?: string;
  sign_name_km?: string;
  sign_code?: string;
  confidence?: number;
  processing_time?: number;
  uploaded_image?: string;
  log_id?: number;
  vehicles?: Array<{ track_id?: number; label?: string; confidence?: number }>;
  detected_plate?: string;
  plate_confidence?: number;
  plate_province_en?: string;
  plate_province_km?: string;
  violation_evaluation?: { is_violation?: boolean; title?: string; violation_type?: string };
  violation?: { id?: number; vehicle_plate?: string };
  vehicle_snapshot?: string;
  plate_snapshot?: string;
}

function LightCard({ children, className = '', accent }: { children: React.ReactNode; className?: string; accent?: string }) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 shadow-sm ${className}`}
      style={accent ? { borderColor: `${accent}30`, background: `${accent}06` } : undefined}
    >
      {children}
    </div>
  );
}

export function PipelineStepResultView({
  stepId,
  result,
  preview,
  step,
  recentLogs,
  onViewLogs,
}: {
  stepId: FlowStepId;
  result: ResultLike | null;
  preview: string | null;
  step?: PipelineStep;
  recentLogs?: AIDetectionLog[];
  onViewLogs?: () => void;
}) {
  const { t, locale } = useLanguage();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const isEn = locale === 'en';
  const detail = isEn ? step?.detail_en : (step?.detail_km || step?.detail_en);

  if (!result && stepId !== 'input') {
    return (
      <LightCard>
        <p className="text-sm text-muted-foreground">{t('aiDetection.flow.waiting')}</p>
      </LightCard>
    );
  }

  const hero = result ? detectionHero(result, speechLocale) : null;
  const imageSrc = preview || result?.uploaded_image || null;
  const pipelineVehicle = result ? resolvePipelineVehicle(result, speechLocale) : null;

  switch (stepId) {
    case 'sign_detect':
      return (
        <div className="space-y-4">
          {imageSrc && (
            <div className="rounded-xl overflow-hidden border border-border shadow-sm">
              <DetectionDisplayImage src={imageSrc} alt="" variant="result" />
            </div>
          )}
          <LightCard accent="#8B5CF6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(139,92,246,0.15)' }}>
                <Signpost size={20} color="#8B5CF6" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-foreground">{hero?.title}</p>
                {result?.sign_code && <p className="text-xs text-muted-foreground mt-1">{result.sign_code}</p>}
                <p className="text-2xl font-black mt-2" style={{ color: '#8B5CF6' }}>
                  {hero?.confidence.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">{t('aiDetection.confidenceLabel')}</p>
                {detail && <p className="text-sm text-muted-foreground mt-2">{detail}</p>}
              </div>
            </div>
          </LightCard>
        </div>
      );

    case 'vehicle_track':
      return (
        <LightCard accent="#6366F1">
          <div className="flex items-center gap-2 mb-3">
            <Car size={18} color="#6366F1" />
            <span className="text-sm font-bold text-foreground">{t('aiDetection.pipeline.showVehicle')}</span>
          </div>
          <p className="text-2xl font-extrabold text-foreground">
            {pipelineVehicle?.label ?? t('aiDetection.pipeline.vehicleUnknown')}
          </p>
          {result?.vehicles?.[0]?.track_id != null && (
            <p className="text-sm font-semibold text-indigo-600 mt-2">Track #{result.vehicles[0].track_id}</p>
          )}
          {(pipelineVehicle?.confidence ?? 0) > 0 && (
            <p className="text-sm text-emerald-600 font-semibold mt-1">{pipelineVehicle?.confidence.toFixed(1)}%</p>
          )}
        </LightCard>
      );

    case 'ocr':
      return (
        <LightCard accent="#A855F7">
          <div className="flex items-center gap-2 mb-3">
            <Hash size={18} color="#A855F7" />
            <span className="text-sm font-bold text-foreground">{t('aiDetection.pipeline.showPlate')}</span>
          </div>
          <p className="text-3xl font-extrabold tracking-widest text-foreground">
            {result?.detected_plate || t('aiDetection.pipeline.plateUnknown')}
          </p>
          {(result?.plate_confidence ?? 0) > 0 && (
            <p className="text-sm text-emerald-600 font-semibold mt-2">{result?.plate_confidence?.toFixed(1)}%</p>
          )}
          {(result?.plate_province_en || result?.plate_province_km) && (
            <p className="text-sm text-muted-foreground mt-1">
              {t('aiDetection.plateProvince')}: {isEn ? result?.plate_province_en : result?.plate_province_km}
            </p>
          )}
        </LightCard>
      );

    case 'rule_engine':
      return (
        <LightCard accent={result?.violation_evaluation?.is_violation ? '#EF4444' : '#F59E0B'}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} color={result?.violation_evaluation?.is_violation ? '#EF4444' : '#F59E0B'} />
            <span className="text-sm font-bold text-foreground">{t('aiDetection.violationTitle')}</span>
          </div>
          {result?.violation_evaluation?.is_violation ? (
            <>
              <p className="text-lg font-extrabold text-red-600">
                {result.violation_evaluation.title || result.violation_evaluation.violation_type}
              </p>
              {result.violation?.id != null && (
                <p className="text-sm text-emerald-600 font-semibold mt-2">
                  {t('aiDetection.violationSaved').replace('{id}', String(result.violation.id))}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">{t('aiDetection.violationNone')}</p>
          )}
        </LightCard>
      );

    case 'evidence':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {result?.vehicle_snapshot && (
            <LightCard accent="#F97316">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{t('aiDetection.vehicleEvidence')}</p>
              <img src={result.vehicle_snapshot} alt="" className="w-full rounded-lg max-h-36 object-contain bg-muted" />
            </LightCard>
          )}
          {result?.plate_snapshot && (
            <LightCard accent="#F97316">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{t('aiDetection.plateEvidence')}</p>
              <img src={result.plate_snapshot} alt="" className="w-full rounded-lg max-h-36 object-contain bg-muted" />
            </LightCard>
          )}
          {!result?.vehicle_snapshot && !result?.plate_snapshot && (
            <LightCard className="sm:col-span-2">
              <FileText size={18} className="text-orange-500 mb-2" />
              <p className="text-sm text-muted-foreground">{detail || t('aiDetection.flow.waiting')}</p>
            </LightCard>
          )}
        </div>
      );

    case 'database':
      return (
        <LightCard accent="#10B981">
          <Database size={22} color="#10B981" className="mb-3" />
          {result?.log_id ? (
            <>
              <p className="text-3xl font-extrabold text-foreground">#{result.log_id}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('aiDetection.logNum').replace('{id}', String(result.log_id))}</p>
              {result.processing_time != null && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t('aiDetection.processTime')}: {result.processing_time}s
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">{t('aiDetection.flow.waiting')}</p>
          )}
        </LightCard>
      );

    case 'dashboard':
      return (
        <div className="space-y-4">
          <LightCard accent="#0EA5E9">
            <LayoutDashboard size={22} color="#0EA5E9" className="mb-3" />
            <p className="text-xl font-extrabold text-foreground">{hero?.title ?? '—'}</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl p-3 bg-muted/60 border border-border">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{t('aiDetection.pipeline.showVehicle')}</p>
                <p className="text-sm font-bold mt-1 truncate">{pipelineVehicle?.label ?? '—'}</p>
              </div>
              <div className="rounded-xl p-3 bg-muted/60 border border-border">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{t('aiDetection.pipeline.showPlate')}</p>
                <p className="text-sm font-bold mt-1 truncate">{result?.detected_plate ?? '—'}</p>
              </div>
            </div>
          </LightCard>
          {recentLogs && recentLogs.length > 0 && (
            <LightCard>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{t('aiDetection.recentDetections')}</p>
              <div className="space-y-2">
                {recentLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                    <span className="text-foreground truncate pr-2">{log.detected_sign}</span>
                    <span className="text-emerald-600 font-bold shrink-0">{log.confidence.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              {onViewLogs && (
                <button type="button" onClick={onViewLogs}
                  className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700">
                  <ExternalLink size={14} />
                  {t('aiDetection.viewAll')}
                </button>
              )}
            </LightCard>
          )}
        </div>
      );

    default:
      return null;
  }
}
