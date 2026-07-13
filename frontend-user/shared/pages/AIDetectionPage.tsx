import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router';
import {
  Upload, Camera, CheckCircle, AlertCircle, Clock, RefreshCw, Zap,
  Info, BarChart2, ChevronRight, Cpu, Layers, Target, Activity,
  Eye, Shield, TrendingUp, MapPin, Sparkles, Volume2, Square,
  Image as ImageIcon, Package, Check, Signpost, Car, Hash,
} from 'lucide-react';
import { SpeakButton } from '@shared/components/SpeakButton';
import { SignNameLabels } from '@shared/components/signs/SignNameLabels';
import { LiveWebcamPanel } from '@shared/components/ai/LiveWebcamPanel';
import { DemoObservedActionSelect } from '@shared/components/ai/DemoObservedActionSelect';
import type { DetectPipelineOptions } from '@shared/constants/observedActions';
import {
  getStoredUserDetectionInputMode,
  setStoredUserDetectionInputMode,
} from '@shared/constants/detectionInputMode';
import { signDisplayNames } from '@shared/utils/signDisplayNames';
import {
  isDisplayableSignResult,
  isManualScanResult,
  isUsefulSignResult,
  type VehicleDetectionItem,
  type WebcamDetectionResult,
} from '@shared/hooks/useWebcamDetection';
import { useAIDetectionCopy, modelStatusLabel } from '@shared/hooks/useAIDetectionCopy';
import { detectionDisplayText, useSpeech } from '@shared/hooks/useSpeech';
import { useAuth } from '@shared/context/AuthContext';
import { isAuthenticated } from '@shared/utils/authStorage';
import { useLanguage } from '@shared/context/LanguageContext';
import { aiAPI } from '@shared/services/api';
import { convertImageToJpeg } from '@shared/utils/convertImageToJpeg';
import { DetectionDisplayImage } from '@shared/components/ai/DetectionDisplayImage';
import { PipelineInputPanel } from '@shared/components/ai/PipelineInputPanel';
import { PIPELINE_ANIM } from '@shared/components/ai/DetectionPipelineFlow';
import { DetectionPanelHeader, DetectionPanelBody } from '@shared/components/ai/DetectionPanelHeader';
import { DETECTION_HEADER_GRADIENTS, DETECTION_HEADER_ICON_ACCENTS } from '@shared/components/ai/detectionHeaderGradients';
import { PipelineStepProcessingPanel } from '@shared/components/ai/PipelineStepProcessingPanel';
import { STEP_META } from '@shared/components/ai/DetectionPipelineFlow';
import { stepProgressWithinActive } from '@shared/utils/detectionPipelineFlow';
import type { FlowStepView } from '@shared/utils/detectionPipelineFlow';
import {
  buildLoadingFlowSteps,
  animatePipelineToComplete,
  resolveFlowStepsFromResult,
  progressFromPipeline,
} from '@shared/utils/detectionPipelineFlow';
import type { DetectionFlowSource } from '@shared/utils/detectionPipelineFlow';
import { detectionHero, heroSpeechText, heroTitleSpeech, logDisplay, logDisplayColor, isUsefulDetectionResult, normalizeDetectionSign } from '@shared/utils/detectionDisplay';
import { resolvePipelineVehicle } from '@shared/utils/pipelineVehicle';
import { getProfileImageUrl, normalizeDetectionMedia } from '@shared/utils/profileImage';
import { toast } from 'sonner';
import {
  DEFAULT_PAGE_STATS,
  mergePageStatsWithDefaults,
  resolveSampleSignImage,
} from '@shared/constants/defaultPageStats';
import type { AIDetectionLog, AIDetectionPageStats, AIDetectionSampleSign, TrafficViolation } from '@shared/types';

interface DetectionResult {
  sign_name: string;
  sign_name_km?: string;
  sign_name_en?: string;
  sign_code?: string;
  category?: string;
  confidence: number;
  description: string;
  description_en?: string;
  guidance: string;
  guidance_en?: string;
  processing_time: number;
  uploaded_image?: string;
  log_id?: number;
  vehicles?: VehicleDetectionItem[];
  vehicle_count?: number;
  detected_plate?: string;
  plate_confidence?: number;
  plate_type?: string;
  plate_province_code?: string;
  plate_province_en?: string;
  plate_province_km?: string;
  matched_vehicle?: {
    id: number;
    plate_number: string;
    owner_name: string;
    vehicle_type: string;
  } | null;
  detection_mode?: 'sign' | 'vehicle' | 'plate' | 'unknown_sign' | 'no_sign';
  detection_engine?: string;
  display_title?: string;
  display_title_en?: string;
  display_title_km?: string;
  display_confidence?: number;
  pipeline_vehicle?: {
    vehicle_type: string;
    vehicle_label_en: string;
    vehicle_label_km: string;
    vehicle_confidence: number;
    source?: 'yolo' | 'database';
  };
  violation_evaluation?: {
    is_violation: boolean;
    violation_type?: string;
    title?: string;
    description?: string;
    observed_action?: string;
    default_fine_amount?: number;
    reason?: string;
  };
  violation?: TrafficViolation;
  violation_error?: string;
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

const SIGN_COLORS: Record<string, string> = {
  stop: '#EF4444', no: '#EF4444', speed: '#3B82F6', pedestrian: '#F59E0B',
  school: '#F59E0B', give: '#F59E0B', yield: '#F59E0B', one: '#3B82F6',
  helmet: '#3B82F6', hospital: '#06B6D4', slippery: '#F59E0B',
};
function getSignColor(name: string) {
  return SIGN_COLORS[name.toLowerCase().split(' ')[0]] ?? '#8B5CF6';
}

const confColor = (c: number) => c >= 95 ? '#10B981' : c >= 80 ? '#F59E0B' : '#EF4444';
const confGrad  = (c: number) =>
  c >= 95 ? 'linear-gradient(90deg,#10B981,#06B6D4)' :
  c >= 80 ? 'linear-gradient(90deg,#F59E0B,#F97316)' :
            'linear-gradient(90deg,#EF4444,#EC4899)';

function plateProvinceLabel(
  result: { plate_province_en?: string; plate_province_km?: string },
  locale: string,
): string | null {
  if (locale === 'km') {
    return result.plate_province_km || result.plate_province_en || null;
  }
  return result.plate_province_en || result.plate_province_km || null;
}

function sampleSignLabel(s: AIDetectionSampleSign) {
  const { km, en } = signDisplayNames(s);
  return km || en;
}
function sampleSignSubtitle(s: AIDetectionSampleSign) {
  return signDisplayNames(s).en;
}

function formatPct(n: number) {
  return n > 0 ? `${n.toFixed(1)}%` : '—';
}
function formatSpeed(n: number) {
  return n > 0 ? `${n.toFixed(1)}s` : '—';
}
function formatScans(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function isAuthApiError(message: string): boolean {
  return /session expired|log in again|unauthorized/i.test(message);
}

function isBackendConnectivityError(message: string): boolean {
  return /backend unavailable|cannot reach|network error|503|502|504|busy|econnreset/i.test(message);
}
/* ─────────────────────────────────────────────────────────
   Small reusable sub-components
───────────────────────────────────────────────────────── */
function CardWrap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl shadow-sm border border-border overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <DetectionPanelBody floating className={className}>{children}</DetectionPanelBody>
  );
}

/* ═══════════════════════════════════════════════════════
   Awaiting card — shown before any detection
═══════════════════════════════════════════════════════ */
function AwaitingCard({
  pageStats,
  onSampleClick,
}: {
  pageStats: AIDetectionPageStats;
  onSampleClick: (s: AIDetectionSampleSign) => void;
}) {
  const { t, AWAIT_STEPS } = useAIDetectionCopy();
  const awaitStats = [
    { v: formatPct(pageStats.stats.accuracy_avg), l: t('aiDetection.avgConfidenceShort'), c: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', Icon: Target },
    { v: formatSpeed(pageStats.stats.avg_speed_sec), l: t('aiDetection.avgSpeedShort'), c: '#06B6D4', bg: 'rgba(6,182,212,0.10)', Icon: Clock },
    { v: String(pageStats.model.sign_classes), l: t('aiDetection.signCatalog'), c: '#10B981', bg: 'rgba(16,185,129,0.10)', Icon: Signpost },
    {
      v: pageStats.model.training_images > 0 ? formatScans(pageStats.model.training_images) : '—',
      l: t('aiDetection.datasetImages'),
      c: '#F59E0B',
      bg: 'rgba(245,158,11,0.10)',
      Icon: ImageIcon,
    },
  ];

  return (
    <CardWrap className="overflow-hidden flex flex-col h-full ai-detection-awaiting-card">
      <DetectionPanelHeader
        gradient={DETECTION_HEADER_GRADIENTS.awaiting}
        icon={Eye}
        iconAccentColor={DETECTION_HEADER_ICON_ACCENTS.awaiting}
        title={t('aiDetection.awaitingTitle')}
        subtitle={t('aiDetection.awaitingDesc')}
      />

      <CardBody className="flex-1 min-h-0 flex flex-col">
        <div className="p-4 sm:px-5 sm:pb-5 flex flex-col gap-4 flex-1 min-h-0 ai-detection-awaiting-card__body">
            <div className="space-y-2.5">
              {AWAIT_STEPS.map((s, i) => (
                <div key={s.label}
                  className="ai-detection-await-step flex items-center gap-3 p-3.5 rounded-xl border transition-colors hover:bg-muted/40"
                  style={{ background: `${s.color}08`, borderColor: `${s.color}28` }}>
                  <div className="ai-detection-await-step__icon w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${s.color}18`, border: `1px solid ${s.color}35` }}>
                    <s.icon size={16} strokeWidth={2.25} style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="ai-detection-await-step__title dashboard-text__title leading-tight">{s.label}</p>
                    <p className="ai-detection-await-step__desc dashboard-text__caption mt-0.5 leading-snug">{s.desc}</p>
                  </div>
                  <span className="ai-detection-await-step__num w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-black text-white"
                    style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}CC)` }}>
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {awaitStats.map(s => (
                <div key={s.l}
                  className="ai-detection-await-stat rounded-xl px-3.5 py-3 border"
                  style={{ background: s.bg, borderColor: `${s.c}30` }}>
                  <div className="ai-detection-await-stat__icon-wrap"
                    style={{ background: `${s.c}18`, border: `1px solid ${s.c}35` }}>
                    <s.Icon size={15} strokeWidth={2.25} style={{ color: s.c }} />
                  </div>
                  <p className="ai-detection-await-stat__value dashboard-text__metric"
                    style={{ color: s.c }}>{s.v}</p>
                  <p className="ai-detection-await-stat__label text-[11px] font-semibold text-muted-foreground mt-1 leading-tight">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-border/60 pt-4 mt-auto">
              <p className="dashboard-kpi__label text-muted-foreground mb-3">
                {t('aiDetection.exampleSigns')}
              </p>
              <div className="flex flex-wrap justify-center items-center gap-2 min-h-[4.5rem]">
                {pageStats.sample_signs.slice(0, 10).map(s => (
                  <button
                    key={s.id}
                    type="button"
                    title={sampleSignSubtitle(s)}
                    onClick={() => onSampleClick(s)}
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-[11px] font-black cursor-pointer transition-all hover:scale-110 hover:shadow-md overflow-hidden"
                    style={{
                      background: `${s.color}12`,
                      border: `1.5px solid ${s.color}35`,
                      color: s.color,
                    }}>
                    {resolveSampleSignImage(s.image, s.sign_code) ? (
                      <img
                        src={resolveSampleSignImage(s.image, s.sign_code)}
                        alt={sampleSignSubtitle(s)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      s.label
                    )}
                  </button>
                ))}
              </div>
            </div>
        </div>
      </CardBody>
    </CardWrap>
  );
}

/* ═══════════════════════════════════════════════════════
   Result card — full premium analysis display
═══════════════════════════════════════════════════════ */
const CATEGORY_COLORS: Record<string, string> = {
  prohibitory: '#EF4444',
  warning: '#F59E0B',
  mandatory: '#3B82F6',
  informative: '#10B981',
};

function ResultCard({
  result,
  preview,
  onReset,
}: {
  result: DetectionResult;
  preview: string | null;
  onReset: () => void;
}) {
  const { t, locale } = useLanguage();
  const { categoryName } = useAIDetectionCopy();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const { speak, speakingId } = useSpeech(speechLocale);
  const hero = detectionHero(result, speechLocale);
  const voice = detectionDisplayText(result, speechLocale);
  const displayName = hero.title;
  const sc = logDisplayColor(hero.mode);
  const cc = confColor(hero.confidence);
  const cg = confGrad(hero.confidence);
  const imageSrc = preview || result.uploaded_image || null;
  const autoSpeakTimerRef = useRef<number | null>(null);
  const userSpokeRef = useRef(false);
  const speakLine = (text: string, id: string, voiceLang: 'km' | 'en' = speechLocale) => {
    userSpokeRef.current = true;
    if (autoSpeakTimerRef.current != null) {
      window.clearTimeout(autoSpeakTimerRef.current);
      autoSpeakTimerRef.current = null;
    }
    void speak(text, id, voiceLang);
  };

  const fullSpeechKm = heroSpeechText(result, 'km');
  const fullSpeechEn = heroSpeechText(result, 'en');
  const fullSpeech = speechLocale === 'en' ? fullSpeechEn : fullSpeechKm;
  const titleSpeech = heroTitleSpeech(result, speechLocale);
  const pipelineVehicle = resolvePipelineVehicle(result, speechLocale);
  const violationEval = result.violation_evaluation;
  const violationRecord = result.violation;
  const hasViolation = Boolean(violationEval?.is_violation);

  const autoSpokenRef = useRef<string | null>(null);
  useEffect(() => {
    userSpokeRef.current = false;
    const key =
      result.log_id != null
        ? `log-${result.log_id}`
        : `${hero.mode}-${result.sign_code || result.sign_name}-${hero.confidence}`;
    if (autoSpokenRef.current === key) return;
    autoSpokenRef.current = key;
    if (autoSpeakTimerRef.current != null) {
      window.clearTimeout(autoSpeakTimerRef.current);
    }
    autoSpeakTimerRef.current = window.setTimeout(() => {
      autoSpeakTimerRef.current = null;
      if (userSpokeRef.current) return;
      void speak(fullSpeech, 'auto', speechLocale, { auto: true });
    }, 400);
    return () => {
      if (autoSpeakTimerRef.current != null) {
        window.clearTimeout(autoSpeakTimerRef.current);
        autoSpeakTimerRef.current = null;
      }
    };
  }, [result, speechLocale, speak, fullSpeech, hero.mode, hero.confidence]);

  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const dash = (hero.confidence / 100) * CIRC;

  return (
    <CardWrap className="overflow-hidden flex flex-col h-full ai-detection-result-card">
      <DetectionPanelHeader
        gradient={DETECTION_HEADER_GRADIENTS.result}
        icon={CheckCircle}
        iconAccentColor={DETECTION_HEADER_ICON_ACCENTS.result}
        title={t('aiDetection.resultTitle')}
        end={
          <>
            <span className="ai-detection-header-chip text-muted-foreground">
              <Clock size={10} />{result.processing_time}s
            </span>
            <span className="ai-detection-header-chip is-accent">{t('aiDetection.aiVerified')}</span>
          </>
        }
      />

      <CardBody className="flex flex-col flex-1 min-h-0">
        <div className="p-4 sm:px-5 sm:pb-5 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">

        {/* ── Analyzed image (full width) ── */}
        {imageSrc && (
          <div className="rounded-2xl overflow-hidden border border-border bg-muted/40">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/80">
              <span className="dashboard-kpi__label text-muted-foreground flex items-center gap-1.5">
                <Camera size={12} /> {t('aiDetection.analyzedImage')}
              </span>
              {result.log_id != null && (
                <span className="text-[10px] text-muted-foreground">{t('aiDetection.logNum').replace('{id}', String(result.log_id))}</span>
              )}
            </div>
            <div className="ai-detect-result-stage relative flex items-center justify-center w-full">
              <DetectionDisplayImage
                src={imageSrc}
                alt={`Detected: ${displayName}`}
                variant="result"
              />
              <div
                className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl backdrop-blur-md"
                style={{ background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 truncate">
                    {hero.mode === 'vehicle'
                      ? t('aiDetection.pipeline.showVehicle')
                      : hero.mode === 'plate'
                        ? t('aiDetection.pipeline.showPlate')
                        : hero.mode === 'sign'
                          ? t('aiDetection.signDetected')
                          : t('aiDetection.resultTitle')}
                  </p>
                  <span className="text-[14px] font-bold text-white truncate block">{displayName}</span>
                </div>
                {hero.confidence > 0 && (
                  <span className="text-[12px] font-black flex-shrink-0" style={{ color: cc }}>
                    {hero.confidence.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 border border-border/70 bg-muted/30">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Car size={12} /> {t('aiDetection.pipeline.showVehicle')}
              </span>
              <p className="text-[16px] font-extrabold mt-2">
                {pipelineVehicle?.label ?? t('aiDetection.pipeline.vehicleUnknown')}
              </p>
              {pipelineVehicle && pipelineVehicle.confidence > 0 && (
                <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                  {pipelineVehicle.confidence.toFixed(1)}%
                </p>
              )}
            </div>
            <div className="rounded-2xl p-4 border border-border/70 bg-muted/30">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Hash size={12} /> {t('aiDetection.pipeline.showPlate')}
              </span>
              <p className="text-[16px] font-extrabold mt-2 tracking-wide">
                {result.detected_plate || t('aiDetection.pipeline.plateUnknown')}
              </p>
              {plateProvinceLabel(result, locale) && (
                <p className="text-[11px] font-semibold text-violet-600 mt-1">
                  {t('aiDetection.plateProvince')}: {plateProvinceLabel(result, locale)}
                </p>
              )}
              {(result.plate_confidence ?? 0) > 0 && (
                <p className="text-[11px] font-semibold text-sky-600 mt-1">
                  {(result.plate_confidence ?? 0).toFixed(1)}%
                </p>
              )}
            </div>
          </div>

        {(result.plate_snapshot || result.vehicle_snapshot) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.vehicle_snapshot && (
              <div className="rounded-2xl p-3 border border-border/70 bg-muted/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {t('aiDetection.vehicleEvidence')}
                </p>
                <img src={getProfileImageUrl(result.vehicle_snapshot) || result.vehicle_snapshot} alt={t('aiDetection.vehicleEvidence')} className="w-full rounded-xl object-contain max-h-28 bg-muted" />
              </div>
            )}
            {result.plate_snapshot && (
              <div className="rounded-2xl p-3 border border-border/70 bg-muted/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {t('aiDetection.plateEvidence')}
                </p>
                <img src={getProfileImageUrl(result.plate_snapshot) || result.plate_snapshot} alt={t('aiDetection.plateEvidence')} className="w-full rounded-xl object-contain max-h-28 bg-muted" />
              </div>
            )}
          </div>
        )}

        {(hasViolation || violationRecord || result.violation_error) && (
          <div
            className="rounded-2xl p-4 border"
            style={{
              background: hasViolation ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
              borderColor: hasViolation ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)',
            }}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shield size={12} style={{ color: hasViolation ? '#EF4444' : '#F59E0B' }} />
              {t('aiDetection.violationTitle')}
            </span>
            {hasViolation ? (
              <div className="mt-2 space-y-1">
                <p className="text-[16px] font-extrabold text-foreground">
                  {violationEval?.title || violationRecord?.violation_type}
                </p>
                {violationRecord?.vehicle_plate && (
                  <p className="text-[12px] text-muted-foreground">
                    {t('aiDetection.violationPlate')}: <span className="font-semibold">{violationRecord.vehicle_plate}</span>
                  </p>
                )}
                {violationRecord?.id != null && (
                  <p className="text-[11px] font-semibold text-emerald-600">
                    {t('aiDetection.violationSaved').replace('{id}', String(violationRecord.id))}
                  </p>
                )}
                {result.violation_error && (
                  <p className="text-[11px] text-amber-600">{result.violation_error}</p>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground mt-2">{t('aiDetection.violationNone')}</p>
            )}
          </div>
        )}

        {/* ── Hero: circle meter + sign name ── */}
        <div className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: `${sc}0D`, border: `1px solid ${sc}25` }}>
          {/* subtle glow */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
            style={{ background: `radial-gradient(circle,${sc}20 0%,transparent 70%)` }} />

          <div className="relative flex items-center gap-4">
            {/* SVG Circular confidence meter */}
            <div className="relative flex-shrink-0" style={{ width: 88, height: 88 }}>
              <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
                {/* track */}
                <circle cx="44" cy="44" r={R} fill="none"
                  stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
                {/* progress */}
                <circle cx="44" cy="44" r={R} fill="none"
                  stroke="url(#confGradResult)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${CIRC}`}
                  style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }} />
                <defs>
                  <linearGradient id="confGradResult" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={cc} />
                    <stop offset="100%" stopColor={sc} />
                  </linearGradient>
                </defs>
              </svg>
              {/* centre label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="dashboard-text__metric-lg" style={{ color: cc }}>
                  {hero.confidence.toFixed(0)}%
                </span>
                <span className="text-[8.5px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">{t('aiDetection.confShort')}</span>
              </div>
            </div>

            {/* Sign name + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={12} style={{ color: sc }} />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {hero.mode === 'vehicle'
                    ? t('aiDetection.identifiedVehicle')
                    : hero.mode === 'plate'
                      ? t('aiDetection.identifiedPlate')
                      : hero.mode === 'unknown_sign'
                        ? t('aiDetection.unknownSignFound')
                        : hero.mode === 'no_sign'
                          ? t('aiDetection.noSignFound')
                          : t('aiDetection.identifiedSign')}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 mb-1">
                {hero.mode === 'sign' ? (
                  <div className="flex-1 min-w-0">
                    <SignNameLabels sign={result} size="hero" />
                  </div>
                ) : (
                  <p className="dashboard-stat__value leading-snug flex-1"
                    style={{ letterSpacing: '-0.02em' }}>
                    {displayName}
                  </p>
                )}
                <SpeakButton
                  size="md"
                  label={
                    hero.mode === 'vehicle'
                      ? t('aiDetection.listenVehicle')
                      : hero.mode === 'plate'
                        ? t('aiDetection.listenPlate')
                        : hero.mode === 'no_sign'
                          ? t('aiDetection.listenResult')
                          : t('aiDetection.listenSign')
                  }
                  isActive={speakingId === 'sign-name'}
                  onClick={() => speakLine(titleSpeech, 'sign-name', speechLocale)}
                />
              </div>
              {hero.mode === 'vehicle' && result.display_title_en && speechLocale === 'km' && (
                <p className="dashboard-text__caption mb-2">{result.display_title_en}</p>
              )}
              {hero.mode === 'plate' && result.matched_vehicle && (
                <p className="dashboard-text__caption mb-2">
                  {t('aiDetection.plateLinked')}: {result.matched_vehicle.owner_name}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                  style={{ background: `${sc}20`, color: sc, border: `1px solid ${sc}40` }}>
                  <Check size={10} strokeWidth={3} />
                  {hero.mode === 'vehicle'
                    ? t('aiDetection.vehicleDetected')
                    : hero.mode === 'plate'
                      ? t('aiDetection.plateBadge')
                      : hero.mode === 'unknown_sign'
                        ? t('aiDetection.unknownSignBadge')
                        : hero.mode === 'no_sign'
                          ? t('aiDetection.noSignBadge')
                          : t('aiDetection.detected')}
                </span>
                {hero.mode === 'plate' && result.plate_type && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: 'rgba(14,165,233,0.12)', color: '#0284C7', border: '1px solid rgba(14,165,233,0.28)' }}>
                    {result.plate_type}
                  </span>
                )}
                {result.detected_plate && plateProvinceLabel(result, locale) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(139,92,246,0.12)', color: '#7C3AED', border: '1px solid rgba(139,92,246,0.28)' }}>
                    {plateProvinceLabel(result, locale)}
                  </span>
                )}
                {hero.mode === 'sign' && result.sign_code && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono"
                    style={{ background: 'rgba(15,23,42,0.06)', color: '#475569', border: '1px solid rgba(15,23,42,0.12)' }}>
                    {result.sign_code}
                  </span>
                )}
                {hero.mode === 'sign' && result.category && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                    style={{
                      background: `${CATEGORY_COLORS[result.category] ?? '#8B5CF6'}18`,
                      color: CATEGORY_COLORS[result.category] ?? '#8B5CF6',
                      border: `1px solid ${CATEGORY_COLORS[result.category] ?? '#8B5CF6'}35`,
                    }}>
                    {categoryName(result.category, result.category)}
                  </span>
                )}
                {hero.mode === 'sign' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {t('aiDetection.cambodiaSign')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── License plate OCR ── */}
        {result.detected_plate && hero.mode !== 'plate' && (
          <div className="rounded-2xl p-4 border border-border/70 bg-muted/30">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Hash size={12} /> {t('aiDetection.plateDetected')}
              </span>
              {result.plate_type && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/25 capitalize">
                  {result.plate_type}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-background border border-border/60">
              <div className="min-w-0">
                <p className="text-[15px] font-extrabold tracking-wide">{result.detected_plate}</p>
                {plateProvinceLabel(result, locale) && (
                  <p className="text-[11px] text-violet-600 font-semibold mt-0.5">
                    {t('aiDetection.plateProvince')}: {plateProvinceLabel(result, locale)}
                  </p>
                )}
              </div>
              <span className="text-[12px] font-bold flex-shrink-0" style={{ color: confColor(result.plate_confidence ?? 0) }}>
                {(result.plate_confidence ?? 0).toFixed(1)}%
              </span>
            </div>
            {result.matched_vehicle && (
              <p className="text-[11px] text-muted-foreground mt-2">
                {t('aiDetection.plateLinked')}: <strong>{result.matched_vehicle.owner_name}</strong>
              </p>
            )}
          </div>
        )}

        {/* ── Vehicles detected ── */}
        {(result.vehicle_count ?? result.vehicles?.length ?? 0) > 0 && (
          <div className="rounded-2xl p-4 border border-border/70 bg-muted/30">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Car size={12} /> {t('aiDetection.vehiclesDetected')}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
                {result.vehicle_count ?? result.vehicles?.length ?? 0}
              </span>
            </div>
            <div className="space-y-2">
              {(result.vehicles ?? []).map((v, i) => (
                <div key={`${v.vehicle_type}-${i}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-background border border-border/60">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-tight">{v.label}</p>
                    <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{v.vehicle_type}</p>
                  </div>
                  <span className="text-[12px] font-bold flex-shrink-0" style={{ color: confColor(v.confidence) }}>
                    {v.confidence.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Confidence bar ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <TrendingUp size={12} /> {t('aiDetection.confidenceLabel')}
            </span>
            <span className="text-[13px] font-bold" style={{ color: cc }}>{hero.confidence.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${hero.confidence}%`, background: cg }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">0%</span>
            <span className="text-[10px] text-muted-foreground">▲ {t('aiDetection.threshold')}</span>
            <span className="text-[10px] text-muted-foreground">100%</span>
          </div>
        </div>

        {/* ── Listen: Khmer + English neural voices ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => speakLine(fullSpeechKm, 'full-km', 'km')}
            className={`py-3 px-3 rounded-xl flex flex-col items-center justify-center gap-1 text-[12px] font-bold transition-all cursor-pointer border ${
              speakingId === 'full-km'
                ? 'bg-violet-500/15 border-violet-400/50 text-violet-700 dark:text-violet-200'
                : 'bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-violet-300/30 text-foreground hover:from-violet-500/15'
            }`}
          >
            <span className="flex items-center gap-2">
              {speakingId === 'full-km' ? (
                <Square size={14} fill="currentColor" />
              ) : (
                <Volume2 size={14} />
              )}
              <span>{speakingId === 'full-km' ? t('aiDetection.stopSpeaking') : t('aiDetection.listenFullKm')}</span>
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground">{t('aiDetection.listenVoiceKhmer')}</span>
          </button>
          <button
            type="button"
            onClick={() => speakLine(fullSpeechEn, 'full-en', 'en')}
            className={`py-3 px-3 rounded-xl flex flex-col items-center justify-center gap-1 text-[12px] font-bold transition-all cursor-pointer border ${
              speakingId === 'full-en'
                ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-700 dark:text-cyan-200'
                : 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-300/30 text-foreground hover:from-cyan-500/15'
            }`}
          >
            <span className="flex items-center gap-2">
              {speakingId === 'full-en' ? (
                <Square size={14} fill="currentColor" />
              ) : (
                <Volume2 size={14} />
              )}
              <span>{speakingId === 'full-en' ? t('aiDetection.stopSpeaking') : t('aiDetection.listenFullEn')}</span>
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground">{t('aiDetection.listenVoiceEnglish')}</span>
          </button>
        </div>

        {/* ── Description + Guidance ── */}
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl overflow-hidden border border-blue-200/60 dark:border-blue-500/25">
            <div className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0.06) 100%)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.28)' }}>
                  <Info size={16} style={{ color: '#3B82F6' }} />
                </div>
                <p className="dashboard-card__title text-foreground leading-tight">{t('aiDetection.description')}</p>
              </div>
              <SpeakButton
                label={t('aiDetection.readDescription')}
                isActive={speakingId === 'desc'}
                onClick={() => speakLine(hero.description, 'desc', speechLocale)}
              />
            </div>
            <div className="px-4 py-4 bg-blue-50/50 dark:bg-blue-950/20">
              <p className="text-[15px] sm:text-[16px] text-foreground leading-[1.75]">{hero.description}</p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-amber-200/70 dark:border-amber-500/25">
            <div className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(245,158,11,0.06) 100%)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.28)' }}>
                  <AlertCircle size={16} style={{ color: '#D97706' }} />
                </div>
                <p className="dashboard-card__title text-foreground leading-tight">{t('aiDetection.guidance')}</p>
              </div>
              <SpeakButton
                label={t('aiDetection.readGuidance')}
                isActive={speakingId === 'guide'}
                onClick={() => speakLine(hero.guidance, 'guide', speechLocale)}
              />
            </div>
            <div className="px-4 py-4 bg-amber-50/60 dark:bg-amber-950/20">
              <p className="text-[15px] sm:text-[16px] text-foreground leading-[1.75]">{hero.guidance}</p>
            </div>
          </div>
        </div>

        {/* ── Processing stats row ── */}
        <div className="grid grid-cols-3 gap-3 border-t border-border/70 pt-4">
          {[
            { label: t('aiDetection.processTime'), value: `${result.processing_time}s`, Icon: Clock, color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
            { label: t('aiDetection.model'), value: 'YOLOv8', Icon: Cpu, color: '#06B6D4', bg: 'rgba(6,182,212,0.10)' },
            { label: t('aiDetection.region'), value: t('aiDetection.cambodia'), Icon: MapPin, color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-3 py-3 text-center border border-border/60"
              style={{ background: s.bg }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>
                <s.Icon size={15} style={{ color: s.color }} />
              </div>
              <p className="text-[14px] font-bold text-foreground leading-tight">{s.value}</p>
              <p className="text-[11.5px] text-muted-foreground mt-1 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>


        {/* ── Reset button ── */}
        <button onClick={onReset}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 cursor-pointer">
          <RefreshCw size={13} /> {t('aiDetection.detectAnother')}
        </button>
        </div>
      </CardBody>
    </CardWrap>
  );
}

/* ═══════════════════════════════════════════════════════
   Recent detections
═══════════════════════════════════════════════════════ */
function RecentDetectionThumb({
  log,
  accent,
  mode,
}: {
  log: AIDetectionLog;
  accent: string;
  mode: 'sign' | 'vehicle' | 'plate' | 'unknown_sign' | 'no_sign';
}) {
  const { locale } = useLanguage();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const hero = logDisplay(log, speechLocale);
  const [imgFailed, setImgFailed] = useState(false);
  const src = getProfileImageUrl(log.uploaded_image);
  const FallbackIcon = mode === 'vehicle' ? Car : mode === 'plate' ? Hash : (mode === 'no_sign' || mode === 'unknown_sign') ? AlertCircle : Camera;

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={hero.title}
        title={hero.title}
        className="ai-detection-recent-thumb ai-detection-recent-thumb--photo"
        style={{ boxShadow: `0 0 0 1.5px ${accent}30` }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className="ai-detection-recent-thumb ai-detection-recent-thumb--fallback"
      style={{ background: `${accent}18`, borderColor: `${accent}35` }}
    >
      <FallbackIcon size={18} strokeWidth={2.25} className="ai-detection-recent-thumb__icon" style={{ color: accent }} />
    </div>
  );
}

function RecentDetectionsCard({
  logs,
  loading,
  onViewAll,
  layout = 'sidebar',
}: {
  logs: AIDetectionLog[];
  loading: boolean;
  onViewAll: () => void;
  layout?: 'sidebar' | 'full';
}) {
  const { t, locale } = useLanguage();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const isSidebar = layout === 'sidebar';
  const itemLimit = 5;
  const items = logs.slice(0, itemLimit);
  const listClass = isSidebar ? 'flex-1 min-h-0 flex flex-col gap-2' : 'space-y-2';
  const rowClass = isSidebar
    ? 'flex-1 min-h-[52px] flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/60 transition-colors'
    : 'flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/60 transition-colors';

  return (
    <CardWrap className={`overflow-hidden flex flex-col h-full ${isSidebar ? 'flex-1 min-h-0 ai-detection-recent-sidebar' : ''}`}>
      <DetectionPanelHeader
        gradient={DETECTION_HEADER_GRADIENTS.recent}
        icon={BarChart2}
        iconAccentColor={DETECTION_HEADER_ICON_ACCENTS.recent}
        title={t('aiDetection.recentTitle')}
        subtitle={t('aiDetection.recentSubtitle')}
        end={
          <button type="button" className="ai-detection-header-action" onClick={onViewAll}>
            {t('aiDetection.viewAll')} <ChevronRight size={11} />
          </button>
        }
      />

      <CardBody className={isSidebar ? 'flex-1 min-h-0 flex flex-col' : ''}>
        <div className={`p-4 sm:px-5 sm:pb-5 ${isSidebar ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
          {loading ? (
            <div className={listClass}>
              {[...Array(itemLimit)].map((_, i) => (
                <div key={i} className={`rounded-xl bg-muted animate-pulse ${isSidebar ? 'flex-1 min-h-[52px]' : 'h-[52px]'}`} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Activity size={26} className="mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-[13px] font-semibold text-muted-foreground">{t('aiDetection.noDetections')}</p>
              <p className="text-[12px] text-muted-foreground mt-1">{t('aiDetection.noDetectionsHint')}</p>
            </div>
          ) : (
            <div className={listClass}>
              {items.map(log => {
                const hero = logDisplay(log, speechLocale);
                const sc = logDisplayColor(hero.mode);
                const cc = confColor(hero.confidence);
                return (
                  <div key={log.id} className={rowClass}>
                    <RecentDetectionThumb log={log} accent={sc} mode={hero.mode} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="dashboard-text__title truncate">{hero.title}</p>
                        <span className="text-[12px] font-black flex-shrink-0" style={{ color: cc }}>
                          {hero.confidence.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${hero.confidence}%`, background: confGrad(hero.confidence) }} />
                        </div>
                        <span className="text-[10.5px] text-muted-foreground flex-shrink-0 truncate max-w-[72px]">
                          {log.user_name}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10.5px] text-muted-foreground flex-shrink-0 hidden sm:block">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardBody>
    </CardWrap>
  );
}

function ProcessingStageCard({
  progress,
  liveSource,
}: {
  progress: number;
  liveSource?: DetectionFlowSource | null;
}) {
  const { t } = useLanguage();
  const { activeIndex, overallPct } = stepProgressWithinActive(progress);
  const meta = STEP_META[activeIndex];
  if (!meta) return null;
  const StepIcon = meta.icon;

  return (
    <CardWrap className="overflow-hidden flex flex-col h-full min-h-0 flex-1 ai-detection-processing-card">
      <DetectionPanelHeader
        gradient={meta.grad}
        icon={StepIcon}
        iconAccentColor={meta.color}
        eyebrow={t('aiDetection.flow.stepOf')
          .replace('{current}', String(activeIndex + 1))
          .replace('{total}', String(STEP_META.length))}
        title={t(meta.labelKey)}
        subtitle={t(meta.descKey)}
        end={
          <>
            <span className="ai-detection-status-pill is-live">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-current" />
              {t('aiDetection.analysingShort')}
            </span>
            <span className="ai-detection-header-chip is-accent">{overallPct}%</span>
          </>
        }
      />
      <CardBody floating className="flex flex-col flex-1 min-h-0 ai-detection-processing-body">
        <PipelineStepProcessingPanel progress={progress} liveSource={liveSource} />
      </CardBody>
    </CardWrap>
  );
}

function ModelInfoCard({ pageStats }: { pageStats: AIDetectionPageStats }) {
  const { t } = useAIDetectionCopy();
  const status = modelStatusLabel(pageStats.model.mode, t);
  const rows = [
    { label: t('aiDetection.model'), value: pageStats.model.name, Icon: Cpu },
    { label: t('aiDetection.signCatalog'), value: String(pageStats.model.sign_classes), Icon: Layers },
    {
      label: t('aiDetection.datasetImages'),
      value: pageStats.model.training_images > 0 ? formatScans(pageStats.model.training_images) : '—',
      Icon: ImageIcon,
    },
  ];

  return (
    <CardWrap>
      <DetectionPanelHeader
        gradient={DETECTION_HEADER_GRADIENTS.model}
        icon={Cpu}
        iconAccentColor={DETECTION_HEADER_ICON_ACCENTS.model}
        eyebrow={t('aiDetection.model')}
        highlight={pageStats.model.name}
        subtitle={
          <>
            {pageStats.model.version} · <span style={{ color: status.color }}>{status.text}</span>
          </>
        }
      />
      <CardBody>
        <div className="divide-y divide-border px-4 sm:px-5 pb-1">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                <span className="ai-detection-model-row__icon">
                  <r.Icon size={14} strokeWidth={2.25} />
                </span>
                {r.label}
              </span>
              <span className="text-xs font-bold text-foreground">{r.value}</span>
            </div>
          ))}
        </div>
      </CardBody>
    </CardWrap>
  );
}

function CategoryStatsCard({ categories }: { categories: AIDetectionPageStats['categories'] }) {
  const { t } = useAIDetectionCopy();
  const total = categories.reduce((a, c) => a + c.count, 0);
  const max = Math.max(...categories.map((c) => c.count), 1);

  return (
    <CardWrap>
      <DetectionPanelHeader
        gradient={DETECTION_HEADER_GRADIENTS.catalog}
        icon={Shield}
        iconAccentColor={DETECTION_HEADER_ICON_ACCENTS.catalog}
        eyebrow={t('aiDetection.signCatalog')}
        highlight={String(total)}
        subtitle={t('aiDetection.detected')}
      />
      <CardBody>
        <div className="p-4 sm:px-5 sm:pb-5 space-y-4">
          {categories.slice(0, 4).map((v) => (
            <div key={v.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: v.color }} />
                  <span className="text-xs font-semibold text-foreground">{v.name}</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${v.color}20`, color: v.color }}>{v.count}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(v.count / max) * 100}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ background: v.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </CardWrap>
  );
}

function HowItWorksCard() {
  const { STEPS, t } = useAIDetectionCopy();

  return (
    <CardWrap>
      <DetectionPanelHeader
        gradient={DETECTION_HEADER_GRADIENTS.flow}
        icon={Zap}
        iconAccentColor={DETECTION_HEADER_ICON_ACCENTS.flow}
        eyebrow={t('aiDetection.flow.title')}
        highlight={`${STEPS.length} Stages`}
        subtitle={t('aiDetection.heroSubtitle')}
      />
      <CardBody>
        <div className="divide-y divide-border px-4 sm:px-5 pb-1">
          {STEPS.slice(0, 5).map((s) => (
            <div key={s.n} className="flex items-center gap-3 px-4 py-3">
              <div className="ai-detection-flow-step__icon flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}18`, border: `1.5px solid ${s.color}35` }}>
                <s.icon size={16} strokeWidth={2.25} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight text-foreground">{s.title}</p>
                <p className="text-[10px] mt-0.5 text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </CardWrap>
  );
}

/* ═══════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════ */
export function AIDetectionPage() {
  const { t, modelStatus } = useAIDetectionCopy();
  const { locale } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const aiLogsPath = location.pathname.startsWith('/admin') ? '/admin/ai-logs' : '/dashboard/ai-logs';

  const [inputMode, setInputMode] = useState<'upload' | 'webcam'>(getStoredUserDetectionInputMode);
  const [demoObservedAction, setDemoObservedAction] = useState('');
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [result, setResult]       = useState<DetectionResult | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [recentLogs, setRecentLogs]   = useState<AIDetectionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [pageStats, setPageStats] = useState<AIDetectionPageStats>(DEFAULT_PAGE_STATS);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [pipelineLive, setPipelineLive] = useState<DetectionFlowSource | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTrainedAtRef = useRef<number | null>(null);
  const lastWebcamToastRef = useRef('');
  const lastRefreshAtRef = useRef(0);
  const detectRunRef = useRef(0);
  const progressIvRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);

  const stopProgressAnimation = useCallback(() => {
    if (progressIvRef.current) {
      clearInterval(progressIvRef.current);
      progressIvRef.current = null;
    }
  }, []);

  const startProgressAnimation = useCallback(() => {
    stopProgressAnimation();
    setProgress(0);
    progressIvRef.current = setInterval(() => {
      setProgress((p) => (p >= 16 ? 16 : p + 0.4 + Math.random() * 0.8));
    }, 550);
  }, [stopProgressAnimation]);

  useEffect(() => () => stopProgressAnimation(), [stopProgressAnimation]);

  useEffect(() => {
    setInputMode(getStoredUserDetectionInputMode());
  }, [location.pathname]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const refreshPageData = useCallback(async () => {
    setLoadingLogs(true);
    setLoadingStats(true);
    const [logsResult, statsResult] = await Promise.allSettled([
      aiAPI.getLogs(),
      aiAPI.getPageStats(),
    ]);

    let statsFailed = false;
    let logsFailed = false;

    if (logsResult.status === 'fulfilled') {
      setRecentLogs(logsResult.value.slice(0, 7));
    } else {
      setRecentLogs([]);
      logsFailed = true;
    }

    if (statsResult.status === 'fulfilled') {
      setPageStats(mergePageStatsWithDefaults(statsResult.value));
      setStatsError(null);
    } else {
      statsFailed = true;
      const msg = statsResult.reason instanceof Error
        ? statsResult.reason.message
        : 'Backend unavailable';

      if (isAuthApiError(msg)) {
        setStatsError(null);
      } else if (statsResult.status === 'rejected') {
        setPageStats(DEFAULT_PAGE_STATS);
        if (isBackendConnectivityError(msg)) {
          setStatsError(msg);
          toast.error(t('aiDetection.toast.statsUnavailable') || 'Cannot load AI stats — is the backend running on port 8000?');
        } else {
          setStatsError(msg);
        }
      } else {
        setStatsError(null);
      }
    }

    if (!statsFailed && logsFailed) {
      const msg = logsResult.status === 'rejected' && logsResult.reason instanceof Error
        ? logsResult.reason.message
        : '';
      if (msg && isBackendConnectivityError(msg) && !isAuthApiError(msg)) {
        setStatsError(msg);
      }
    }

    setLoadingLogs(false);
    setLoadingStats(false);
  }, [t]);

  const refreshPageDataDebounced = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastRefreshAtRef.current < 5000) return;
    lastRefreshAtRef.current = now;
    try {
      await refreshPageData();
    } catch {
      /* avoid breaking webcam loop when stats/logs are temporarily unavailable */
    }
  }, [refreshPageData]);

  useEffect(() => {
    refreshPageData();
  }, [refreshPageData]);

  useEffect(() => {
    const poll = async () => {
      try {
        const stats = await aiAPI.getPageStats();
        const trainedAt = stats.model.last_trained_at ?? null;
        if (
          trainedAt &&
          lastTrainedAtRef.current &&
          trainedAt > lastTrainedAtRef.current
        ) {
          toast.success('AI model updated — new trained signs are ready.');
        }
        if (trainedAt) lastTrainedAtRef.current = trainedAt;
        setPageStats(mergePageStatsWithDefaults(stats));
        setLoadingStats(false);
      } catch {
        /* ignore polling errors */
      }
    };
    const pollMs = inputMode === 'webcam' ? 30000 : 12000;
    const intervalId = window.setInterval(poll, pollMs);
    window.addEventListener('focus', poll);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', poll);
    };
  }, [inputMode]);

  const detectPipelineOptions = useCallback((): DetectPipelineOptions => ({
    observedAction: demoObservedAction || undefined,
    demoViolation: !demoObservedAction,
  }), [demoObservedAction]);

  const runDetection = useCallback(async (targetFile?: File, catalogSignCode?: string) => {
    const f = targetFile ?? file;
    if (!f) {
      toast.error(t('aiDetection.toast.uploadFirst'));
      inputRef.current?.click();
      return;
    }
    if (!user || !isAuthenticated()) {
      toast.error(t('aiDetection.toast.loginRequired'));
      return;
    }

    const runId = detectRunRef.current + 1;
    detectRunRef.current = runId;
    setDetecting(true);
    setResult(null);
    setPipelineLive(null);
    startProgressAnimation();

    try {
      const uploadFile = await convertImageToJpeg(f);
      if (runId !== detectRunRef.current) return;

      const pipelineOpts = detectPipelineOptions();
      const res = await aiAPI.detect(uploadFile, {
        sign_only: false,
        catalog_sign_code: catalogSignCode,
        observed_action: pipelineOpts.observedAction,
        demo_violation: pipelineOpts.demoViolation ? true : undefined,
      });
      if (runId !== detectRunRef.current) return;

      const normalized = normalizeDetectionMedia(res);
      setPipelineLive(normalized);
      const jump = progressFromPipeline(normalized.pipeline);
      setProgress((p) => Math.max(p, jump));
      progressRef.current = Math.max(progressRef.current, jump);

      stopProgressAnimation();
      await animatePipelineToComplete(
        setProgress,
        progressRef.current,
        PIPELINE_ANIM.stepFinishDwell,
        () => runId !== detectRunRef.current,
      );
      if (runId !== detectRunRef.current) return;

      setDetecting(false);
      setProgress(100);
      setResult(normalizeDetectionSign(normalized));
      setPipelineLive(null);

      const heroToast = detectionHero(res, locale === 'en' ? 'en' : 'km');
      if (res.violation?.id) {
        toast.success(t('aiDetection.toast.violationSaved').replace('{id}', String(res.violation.id)));
      } else if (!isUsefulDetectionResult(res)) {
        toast.info(
          heroToast.mode === 'no_sign'
            ? t('aiDetection.toast.noSignInFrame')
            : t('aiDetection.toast.detectFailed'),
        );
      } else {
        toast.success(
          t('aiDetection.toast.detected')
            .replace('{name}', heroToast.title)
            .replace('{confidence}', heroToast.confidence.toFixed(1)),
        );
      }
      void refreshPageDataDebounced(true);
    } catch (err) {
      if (runId !== detectRunRef.current) return;
      stopProgressAnimation();
      setProgress(0);
      setDetecting(false);
      setPipelineLive(null);
      const msg = err instanceof Error ? err.message : t('aiDetection.toast.detectFailed');
      toast.error(msg || t('aiDetection.toast.detectFailed'));
    } finally {
      if (runId === detectRunRef.current) {
        stopProgressAnimation();
      }
    }
  }, [demoObservedAction, detectPipelineOptions, file, locale, refreshPageDataDebounced, startProgressAnimation, stopProgressAnimation, t, user]);

  const handleFile = useCallback(async (f: File, autoDetect = false) => {
    if (!f.type.startsWith('image/')) { toast.error(t('aiDetection.toast.imageOnly')); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error(t('aiDetection.toast.imageTooBig')); return; }
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setFile(f);
    setResult(null);
    setProgress(0);
    setDetecting(false);
    setPreview(URL.createObjectURL(f));
    if (autoDetect) await runDetection(f);
  }, [preview, runDetection, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSampleSign = async (sample: AIDetectionSampleSign) => {
    const imgUrl = resolveSampleSignImage(sample.image, sample.sign_code);
    if (imgUrl) {
      try {
        const fetchUrl = imgUrl.includes('?')
          ? `${imgUrl}&_=${Date.now()}`
          : `${imgUrl}?_=${Date.now()}`;
        const res = await fetch(fetchUrl, { cache: 'no-store' });
        const blob = await res.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        const signFile = new File(
          [blob],
          `${sample.sign_code || 'sign'}.${ext}`,
          { type: blob.type || 'image/jpeg' },
        );
        if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
        setFile(signFile);
        setPreview(URL.createObjectURL(signFile));
        setResult(null);
        setProgress(0);
        setDetecting(false);
        toast.success(t('aiDetection.toast.sampleLoaded').replace('{name}', sampleSignLabel(sample)));
      } catch {
        toast.error(t('aiDetection.toast.loadImageFail'));
        inputRef.current?.click();
      }
    } else {
      toast.info(t('aiDetection.toast.uploadOwnPhoto').replace('{name}', sampleSignLabel(sample)));
      inputRef.current?.click();
    }
  };

  const handleDetect = () => runDetection();

  const reset = () => {
    detectRunRef.current += 1;
    stopProgressAnimation();
    setDetecting(false);
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setResult(null); setProgress(0); setPipelineLive(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleWebcamResult = useCallback((res: WebcamDetectionResult, opts?: { quiet?: boolean }) => {
    if (!isManualScanResult(res) && !isDisplayableSignResult(res)) {
      if (!opts?.quiet) {
        toast.info(t('aiDetection.toast.noSignInFrame'));
      }
      return;
    }

    const heroToast = detectionHero(res, locale === 'en' ? 'en' : 'km');
    const toastKey = `${heroToast.title}-${heroToast.confidence.toFixed(0)}`;
    const skipToast = opts?.quiet || toastKey === lastWebcamToastRef.current;

    setResult(normalizeDetectionSign(normalizeDetectionMedia(res)));
    if (res.uploaded_image) {
      if (preview?.startsWith('blob:') && preview !== res.uploaded_image) {
        URL.revokeObjectURL(preview);
      }
      setPreview(res.uploaded_image);
    }
    if (skipToast) return;

    lastWebcamToastRef.current = toastKey;
    toast.success(
      t('aiDetection.toast.detected')
        .replace('{name}', heroToast.title)
        .replace('{confidence}', heroToast.confidence.toFixed(1)),
    );
    void refreshPageDataDebounced(true);
  }, [locale, preview, refreshPageDataDebounced, t]);

  const speechLocale = locale === 'en' ? 'en' : 'km';
  const flowSteps = detecting
    ? buildLoadingFlowSteps(progress)
    : result
      ? resolveFlowStepsFromResult(result, speechLocale)
      : buildLoadingFlowSteps(0);
  const pipelineDone = !!result && !detecting;
  const displayStats = mergePageStatsWithDefaults(pageStats);

  const pipelineInputPanel = (
    <PipelineInputPanel
      fillHeight={!pipelineDone}
      inputMode={inputMode}
      onInputModeChange={(mode) => {
        if (mode === inputMode) return;
        lastWebcamToastRef.current = '';
        if (mode === 'webcam') {
          if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
          setFile(null);
          setPreview(null);
          setResult(null);
          setProgress(0);
        }
        setStoredUserDetectionInputMode(mode);
        setInputMode(mode);
      }}
      demoObservedAction={demoObservedAction}
      onDemoObservedActionChange={setDemoObservedAction}
      detecting={detecting}
      progress={progress}
      file={file}
      preview={preview}
      dragging={dragging}
      onDraggingChange={setDragging}
      onDrop={handleDrop}
      onPickClick={() => inputRef.current?.click()}
      onFileInputChange={(e) => {
        const picked = e.target.files?.[0];
        if (picked) handleFile(picked);
        e.target.value = '';
      }}
      onDetect={handleDetect}
      onResetFile={reset}
      onWebcamResult={handleWebcamResult}
      onSampleSign={handleSampleSign}
      pageStats={displayStats}
      loadingStats={loadingStats}
      pipelineOptions={detectPipelineOptions()}
      disabled={!user || !isAuthenticated()}
      inputRef={inputRef}
    />
  );

  const kpiCards = [
        {
          label: t('aiDetection.accuracy'),
          value: formatPct(displayStats.stats.accuracy_avg),
          sub: t('aiDetection.scans').replace('{count}', formatScans(displayStats.stats.total_scans)),
          Icon: Target,
        },
        {
          label: t('aiDetection.scansLabel'),
          value: formatScans(displayStats.stats.total_scans),
          sub: t('aiDetection.avgConfidence').replace('Avg ', '') + ` ${formatPct(displayStats.stats.accuracy_avg)}`,
          Icon: Activity,
        },
        {
          label: t('aiDetection.signCatalog'),
          value: String(displayStats.model.sign_classes),
          sub: `${displayStats.model.name} · ${displayStats.model.version}`,
          Icon: Layers,
        },
        {
          label: t('aiDetection.avgSpeed'),
          value: formatSpeed(displayStats.stats.avg_speed_sec),
          sub: t('aiDetection.perDetection'),
          Icon: Cpu,
        },
      ];

  const kpiKeys = ['accuracy', 'scans', 'catalog', 'speed'] as const;

  return (
    <div className="dashboard-home dashboard-page--ai ai-detection-page w-full min-h-full space-y-5">
        {statsError && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900">
            <div className="flex items-center gap-3 min-w-0">
              <AlertCircle size={20} className="flex-shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t('aiDetection.backendNotConnected')}</p>
                <p className="text-xs mt-0.5 text-amber-800/80 truncate">
                  {t('aiDetection.backendNotConnectedHint')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoadingStats(true);
                refreshPageData();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-amber-400 bg-white hover:bg-amber-100 flex-shrink-0 cursor-pointer"
            >
              <RefreshCw size={14} /> {t('dashboard.retry')}
            </button>
          </div>
        )}
        {/* Hero */}
        <div className="ai-detection-page-hero ai-detection-page-hero--banner rounded-2xl border shadow-lg overflow-hidden">
          <DetectionPanelHeader
            gradient={DETECTION_HEADER_GRADIENTS.hero}
            size="hero"
            icon={Camera}
            iconAccentColor={DETECTION_HEADER_ICON_ACCENTS.hero}
            eyebrow={t('aiDetection.heroEyebrow')}
            title={t('aiDetection.heroTitle')}
            subtitle={t('aiDetection.heroSubtitle')}
            end={
              displayStats ? (
                <span
                  className={`ai-detection-status-pill${detecting ? ' is-live' : pipelineDone ? ' is-complete' : ''}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-current" />
                  {detecting
                    ? t('aiDetection.analysingShort')
                    : pipelineDone
                      ? t('aiDetection.flow.pipelineComplete')
                      : modelStatus(displayStats.model.mode).text}
                </span>
              ) : null
            }
          />
        </div>

        {/* KPI cards */}
        {loadingStats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl h-[108px] animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 ai-detection-kpi-grid">
            {kpiCards.map((s, i) => (
              <div
                key={s.label}
                className={`ai-detection-kpi ai-detection-kpi--${kpiKeys[i]}`}
              >
                <div className="ai-detection-kpi__glow" aria-hidden />
                <div className="ai-detection-kpi__head">
                  <p className="ai-detection-kpi__label">{s.label}</p>
                  <div className="ai-detection-kpi__icon">
                    <s.Icon size={18} color="white" strokeWidth={2.25} />
                  </div>
                </div>
                <div className="ai-detection-kpi__body">
                  <p className="ai-detection-kpi__value">{s.value}</p>
                  <p className="ai-detection-kpi__sub">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {pipelineDone ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch ai-detection-result-pair">
            <div className="flex flex-col gap-5 min-h-0 h-full ai-detection-result-left-col">
              {pipelineInputPanel}
              <RecentDetectionsCard
                logs={recentLogs}
                loading={loadingLogs}
                onViewAll={() => navigate(aiLogsPath)}
                layout="sidebar"
              />
            </div>
            <ResultCard result={result!} preview={preview} onReset={reset} />
          </div>
        ) : (
          <>
            <div className={`grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch ai-detection-main-grid${detecting ? ' ai-detection-processing-grid' : ''}`}>
              {pipelineInputPanel}
              <div className="min-h-0 flex flex-col h-full flex-1">
                {detecting ? (
                  <ProcessingStageCard progress={progress} liveSource={pipelineLive} />
                ) : (
                  <AwaitingCard pageStats={displayStats} onSampleClick={handleSampleSign} />
                )}
              </div>
            </div>

            <RecentDetectionsCard
              logs={recentLogs}
              loading={loadingLogs}
              onViewAll={() => navigate(aiLogsPath)}
              layout="full"
            />
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ModelInfoCard pageStats={displayStats} />
            <CategoryStatsCard categories={displayStats.categories} />
            <HowItWorksCard />
          </div>
    </div>
  );
}
