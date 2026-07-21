import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Car, Signpost, Hash, Shield, Cpu, Clock, CheckCircle, AlertTriangle,
  Download, Save, ThumbsUp, ImageIcon, ScanLine, Upload, FileJson, Loader2, Sparkles,
} from 'lucide-react';
import {
  DETECTION_PROCESS_STEPS,
  DetectionProcessFlow,
} from '@shared/components/ai/center/DetectionProcessFlow';
import { SignNameLabels } from '@shared/components/signs/SignNameLabels';
import { SpeakButton } from '@shared/components/SpeakButton';
import { AnnotatedDetectionImage } from '@shared/components/ai/center/AnnotatedDetectionImage';
import { useLanguage } from '@shared/context/LanguageContext';
import { detectionSpeechText, useSpeech } from '@shared/hooks/useSpeech';
import type { WebcamDetectionResult } from '@shared/hooks/useWebcamDetection';
import type { OverlayDetectionInput } from '@shared/utils/detectionOverlay';
import { signDisplayNames } from '@shared/utils/signDisplayNames';
import { resolveDetectionMode } from '@shared/utils/detectionDisplay';
import { downloadMediaUrl } from '@shared/utils/downloadMedia';
import { cn } from '@shared/components/ui/utils';
import { toast } from 'sonner';

type DetectionCategory = 'all' | 'sign' | 'vehicle' | 'plate';

export type CenterDetectionResult = WebcamDetectionResult & {
  log_id?: string | number | null;
  model_version?: string;
  plate_province_code?: string;
  plate_province_en?: string;
  plate_province_km?: string;
  plate_type?: string;
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
  violation?: {
    id?: string | number;
    violation_type?: string;
    vehicle_plate?: string;
  };
  violation_error?: string;
  vehicle_snapshot?: string;
  plate_snapshot?: string;
  video_analysis?: {
    source_filename?: string;
    frames_analyzed?: number;
    best_frame_timestamp_sec?: number;
    frame_summaries?: Array<{
      timestamp_sec: number;
      confidence: number;
      sign_name_en?: string;
      detected_plate?: string;
      vehicle_count?: number;
    }>;
  };
  annotated_preview_video?: string;
};

function confTier(c: number) {
  if (c >= 95) return { color: '#059669', bg: 'rgba(16,185,129,0.12)', label: 'high' as const };
  if (c >= 80) return { color: '#D97706', bg: 'rgba(245,158,11,0.12)', label: 'medium' as const };
  return { color: '#DC2626', bg: 'rgba(239,68,68,0.1)', label: 'low' as const };
}

function DetectionCategoryCard({
  tone,
  icon: Icon,
  title,
  subtitle,
  status,
  confidence,
  confidenceLabel,
  children,
  className,
  isPrimary = false,
  isFocused = false,
  onFocus,
}: {
  tone: 'violet' | 'cyan' | 'amber';
  icon: typeof Signpost;
  title: string;
  subtitle: string;
  status: 'hit' | 'miss';
  confidence?: number | null;
  confidenceLabel?: string;
  children: ReactNode;
  className?: string;
  isPrimary?: boolean;
  isFocused?: boolean;
  onFocus?: () => void;
}) {
  const { t } = useLanguage();
  const tier = confidence != null && confidence > 0 ? confTier(confidence) : null;

  return (
    <article
      className={cn(
        'ai-center-detect-card',
        `ai-center-detect-card--${tone}`,
        isPrimary && 'is-primary',
        isFocused && 'is-focused',
        status === 'miss' && 'is-miss',
        onFocus && 'is-clickable',
        className,
      )}
      onClick={onFocus}
      onKeyDown={onFocus ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFocus(); } } : undefined}
      role={onFocus ? 'button' : undefined}
      tabIndex={onFocus ? 0 : undefined}
    >
      <header className={cn('ai-center-detect-card__head', `ai-center-detect-card__head--${tone}`)}>
        <span className="ai-center-detect-card__head-glow" aria-hidden />
        <div className="ai-center-detect-card__head-icon">
          <Icon size={18} strokeWidth={2.1} />
        </div>
        <div className="ai-center-detect-card__head-copy">
          <h3 className="ai-center-detect-card__title">{title}</h3>
          <p className="ai-center-detect-card__subtitle">{subtitle}</p>
        </div>
        <div className="ai-center-detect-card__badges">
          {isPrimary ? (
            <span className="ai-center-detect-card__primary-badge">{t('aiCenter.primaryDetection', 'Primary')}</span>
          ) : null}
          <span className={cn('ai-center-detect-card__status', status === 'hit' ? 'is-hit' : 'is-miss')}>
            {status === 'hit' ? t('aiCenter.detected', 'Detected') : t('aiCenter.notDetected', 'Not detected')}
          </span>
        </div>
      </header>
      <div className="ai-center-detect-card__body">
        {tier && confidence != null ? (
          <div className="ai-center-detect-card__conf" style={{ borderColor: `${tier.color}33`, background: tier.bg }}>
            <span className="ai-center-detect-card__conf-value" style={{ color: tier.color }}>
              {confidence.toFixed(1)}%
            </span>
            <span className="ai-center-detect-card__conf-label">{confidenceLabel || t('aiCenter.confidence')}</span>
          </div>
        ) : null}
        {children}
      </div>
    </article>
  );
}

function DetectionLoadingPanel({ hint }: { hint: string }) {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);
  const stepCount = DETECTION_PROCESS_STEPS.length;
  const progressPct = Math.round(((activeStep + 1) / stepCount) * 100);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveStep((prev) => (prev + 1) % stepCount);
    }, 1500);
    return () => window.clearInterval(id);
  }, [stepCount]);

  return (
    <div className="ai-center-loading">
      <header className="ai-center-loading__hero">
        <span className="ai-center-loading__hero-glow" aria-hidden />
        <div className="ai-center-loading__hero-top">
          <div className="ai-center-loading__hero-icon-wrap" aria-hidden>
            <span className="ai-center-loading__icon-ring" />
            <span className="ai-center-loading__icon-ring ai-center-loading__icon-ring--delay" />
            <div className="ai-center-loading__hero-icon">
              <Loader2 size={24} strokeWidth={2.2} className="ai-center-loading__spinner-icon" />
            </div>
          </div>
          <div className="ai-center-loading__hero-copy">
            <span className="ai-center-loading__live">
              <Sparkles size={11} strokeWidth={2.2} />
              {t('aiCenter.liveBadge')}
            </span>
            <h3 className="ai-center-loading__title">{t('aiCenter.analyzing')}</h3>
            <p className="ai-center-loading__hint">{hint}</p>
          </div>
          <div className="ai-center-loading__pct" aria-hidden>
            <span className="ai-center-loading__pct-value">{progressPct}</span>
            <span className="ai-center-loading__pct-unit">%</span>
          </div>
        </div>
        <div
          className="ai-center-loading__progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          aria-label={t('aiCenter.analyzing')}
        >
          <div className="ai-center-loading__progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      <section className="ai-center-loading__pipeline" aria-label={t('aiCenter.pipeline.label')}>
        <DetectionProcessFlow
          variant="loading"
          activeStep={activeStep}
          animated
          showConnectors={false}
        />
      </section>

      <section className="ai-center-loading__outputs" aria-label={t('aiCenter.compareImages')}>
        <article className="ai-center-loading__output ai-center-loading__output--source">
          <header className="ai-center-loading__output-head">
            <span className="ai-center-loading__output-badge ai-center-loading__output-badge--violet">
              <ImageIcon size={12} strokeWidth={2.2} />
            </span>
            <span className="ai-center-loading__output-label">{t('aiCenter.originalImage')}</span>
          </header>
          <div className="ai-center-loading__stage">
            <span className="ai-center-loading__stage-icon" aria-hidden>
              <ImageIcon size={28} strokeWidth={1.5} />
            </span>
            <span className="ai-center-loading__scan-line" aria-hidden />
            <span className="ai-center-loading__shimmer" aria-hidden />
          </div>
        </article>

        <article className="ai-center-loading__output ai-center-loading__output--detect">
          <header className="ai-center-loading__output-head">
            <span className="ai-center-loading__output-badge ai-center-loading__output-badge--cyan">
              <ScanLine size={12} strokeWidth={2.2} />
            </span>
            <span className="ai-center-loading__output-label">{t('aiCenter.detectionImage')}</span>
          </header>
          <div className="ai-center-loading__stage ai-center-loading__stage--detect">
            <span className="ai-center-loading__viewfinder" aria-hidden />
            <span className="ai-center-loading__stage-icon" aria-hidden>
              <ScanLine size={28} strokeWidth={1.5} />
            </span>
            <span className="ai-center-loading__scan-line ai-center-loading__scan-line--delay" aria-hidden />
            <span className="ai-center-loading__shimmer" aria-hidden />
          </div>
        </article>
      </section>
    </div>
  );
}

const EMPTY_STEPS = [
  { icon: Upload, tone: 'violet', titleKey: 'aiCenter.emptyStep1Title', descKey: 'aiCenter.tipUpload' },
  { icon: ScanLine, tone: 'cyan', titleKey: 'aiCenter.emptyStep2Title', descKey: 'aiCenter.tipDetect' },
  { icon: FileJson, tone: 'emerald', titleKey: 'aiCenter.emptyStep3Title', descKey: 'aiCenter.tipReview' },
] as const;

interface DetectionCenterResultsPanelProps {
  result: CenterDetectionResult | null;
  originalSrc?: string | null;
  detecting?: boolean;
  sourceLabel?: string;
  onSave?: () => void;
  onExport?: () => void;
  saving?: boolean;
}

export function DetectionCenterResultsPanel({
  result,
  originalSrc,
  detecting = false,
  sourceLabel,
  onSave,
  onExport,
  saving = false,
}: DetectionCenterResultsPanelProps) {
  const { t, locale } = useLanguage();
  const { speak, speakingId } = useSpeech(locale);
  const [activeCategory, setActiveCategory] = useState<DetectionCategory>('all');
  const [mediaDownloading, setMediaDownloading] = useState<'frame' | 'video' | null>(null);

  const downloadVideoArtifact = async (kind: 'frame' | 'video') => {
    if (!result) return;
    const url = kind === 'frame'
      ? result.annotated_processed_image || result.processed_image || result.uploaded_image
      : result.annotated_preview_video;
    if (!url) {
      toast.error(t('aiCenter.downloadUnavailable'));
      return;
    }
    const base = result.video_analysis?.source_filename?.replace(/\.[^.]+$/, '') || 'video-detect';
    const filename = kind === 'frame'
      ? `${base}-best-frame.jpg`
      : `${base}-annotated-preview.mp4`;
    setMediaDownloading(kind);
    try {
      await downloadMediaUrl(url, filename);
      toast.success(t('aiCenter.downloadStarted'));
    } catch {
      toast.error(t('aiCenter.downloadFailed'));
    } finally {
      setMediaDownloading(null);
    }
  };

  const primaryCategory = useMemo((): Exclude<DetectionCategory, 'all'> => {
    if (!result) return 'vehicle';
    const mode = resolveDetectionMode(result);
    const vehicles = result.vehicles ?? [];
    const signConf = Number(result.display_confidence ?? result.confidence ?? 0);
    const signHit = mode === 'sign' || mode === 'unknown_sign'
      || (result.sign_present !== false && signConf > 0 && !!(result.sign_code || result.class_key || result.sign_name_en));
    const vehicleHit = mode === 'vehicle' || vehicles.length > 0 || !!result.pipeline_vehicle;
    const plateHit = mode === 'plate' || !!(result.detected_plate && result.detected_plate.trim());
    if (mode === 'vehicle') return 'vehicle';
    if (mode === 'plate') return 'plate';
    if (mode === 'sign' || mode === 'unknown_sign') return 'sign';
    if (plateHit) return 'plate';
    if (vehicleHit) return 'vehicle';
    if (signHit) return 'sign';
    return 'vehicle';
  }, [result]);

  useEffect(() => {
    if (result) setActiveCategory(primaryCategory);
  }, [result, primaryCategory]);

  if (detecting) {
    return (
      <div className="ai-center-results ai-center-results--loading">
        <DetectionLoadingPanel hint={t('aiCenter.analyzingHint')} />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="ai-center-results ai-center-results--empty">
        <div className="ai-center-empty">
          <header className="ai-center-empty__head">
            <div className="ai-center-empty__icon">
              <Signpost size={28} strokeWidth={1.75} />
            </div>
            <div className="ai-center-empty__copy">
              <h3 className="ai-center-empty__title">{t('aiCenter.awaitingTitle')}</h3>
              <p className="ai-center-empty__hint">{t('aiCenter.awaitingHint')}</p>
            </div>
          </header>

          <div className="ai-center-empty__preview" aria-hidden>
            <div className="ai-center-empty__preview-slot ai-center-empty__preview-slot--original">
              <ImageIcon size={22} strokeWidth={1.5} />
              <span>{t('aiCenter.originalImage')}</span>
            </div>
            <div className="ai-center-empty__preview-slot ai-center-empty__preview-slot--detection">
              <ScanLine size={22} strokeWidth={1.5} />
              <span>{t('aiCenter.detectionImage')}</span>
            </div>
          </div>

          <div className="ai-center-empty__legend" aria-label={t('aiCenter.legendTitle')}>
            <span className="ai-center-empty__legend-label">{t('aiCenter.legendTitle')}</span>
            <div className="ai-center-empty__legend-items">
              <span className="ai-center-empty__legend-item ai-center-empty__legend-item--violet">
                <span className="ai-center-empty__legend-swatch" />
                {t('aiCenter.legendSign')}
              </span>
              <span className="ai-center-empty__legend-item ai-center-empty__legend-item--cyan">
                <span className="ai-center-empty__legend-swatch" />
                {t('aiCenter.legendVehicle')}
              </span>
              <span className="ai-center-empty__legend-item ai-center-empty__legend-item--amber">
                <span className="ai-center-empty__legend-swatch" />
                {t('aiCenter.legendPlate')}
              </span>
            </div>
          </div>

          <ol className="ai-center-empty__steps">
            {EMPTY_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.titleKey} className="ai-center-empty__step">
                  <article className={cn('ai-center-empty__step-card', `ai-center-empty__step-card--${step.tone}`)}>
                    <span className="ai-center-empty__step-num">{String(i + 1).padStart(2, '0')}</span>
                    <div className={cn('ai-center-empty__step-icon', `ai-center-empty__step-icon--${step.tone}`)}>
                      <Icon size={18} strokeWidth={2.1} />
                    </div>
                    <div className="ai-center-empty__step-copy">
                      <p className="ai-center-empty__step-title">{t(step.titleKey)}</p>
                      <p className="ai-center-empty__step-desc">{t(step.descKey)}</p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }

  const displaySrc = result.annotated_processed_image || result.uploaded_image || originalSrc || '';
  const originalImage = originalSrc || result.uploaded_image || '';
  const speechText = detectionSpeechText(result as Parameters<typeof detectionSpeechText>[0], locale);
  const { km, en } = signDisplayNames(result as Parameters<typeof signDisplayNames>[0]);
  const signLabel = locale === 'km' ? (km || en) : (en || km);
  const vehicles = result.vehicles ?? [];
  const ocrReads = (result as CenterDetectionResult & { plate_ocr_details?: Array<{ text: string; confidence: number }> }).plate_ocr_details ?? [];
  const detectionMode = resolveDetectionMode(result);
  const signConfidence = Number(result.display_confidence ?? result.confidence ?? 0);
  const vehicleConfidence = vehicles.length > 0
    ? Number(vehicles[0].confidence)
    : result.pipeline_vehicle?.vehicle_confidence ?? 0;
  const plateConfidence = Number(result.plate_confidence ?? 0);

  const hasSignHit = detectionMode === 'sign'
    || detectionMode === 'unknown_sign'
    || (result.sign_present !== false && signConfidence > 0 && !!(result.sign_code || result.class_key || result.sign_name_en));
  const hasVehicleHit = detectionMode === 'vehicle'
    || vehicles.length > 0
    || !!result.pipeline_vehicle;
  const hasPlateHit = detectionMode === 'plate'
    || !!(result.detected_plate && result.detected_plate.trim());

  const primaryCategoryResolved = primaryCategory;

  const overlayFilter: DetectionCategory = activeCategory;
  const categoryTabs: { id: DetectionCategory; label: string; tone: string; icon: typeof Signpost; hit: boolean }[] = [
    { id: 'all', label: t('aiCenter.filterAll', 'All objects'), tone: 'slate', icon: ScanLine, hit: hasSignHit || hasVehicleHit || hasPlateHit },
    { id: 'sign', label: t('aiCenter.legendSign'), tone: 'violet', icon: Signpost, hit: hasSignHit },
    { id: 'vehicle', label: t('aiCenter.legendVehicle'), tone: 'cyan', icon: Car, hit: hasVehicleHit },
    { id: 'plate', label: t('aiCenter.legendPlate'), tone: 'amber', icon: Hash, hit: hasPlateHit },
  ];

  return (
    <div className={cn('ai-center-results', `ai-center-results--mode-${detectionMode}`)}>
      <div className="ai-center-results__hero">
        <div className="ai-center-results__hero-glow" aria-hidden />
        <div className="ai-center-results__hero-inner">
          <div className="ai-center-results__hero-copy">
            <p className="ai-center-results__eyebrow">{sourceLabel || t('aiCenter.resultsEyebrow')}</p>
            <h2 className="ai-center-results__title">{t('aiCenter.resultsTitle')}</h2>
          </div>
          <div className="ai-center-results__hero-actions">
            {onExport && (
              <button type="button" className="ai-center-results__export-btn" onClick={onExport}>
                <Download size={15} />
                {t('aiCenter.export')}
              </button>
            )}
            {onSave && (
              <button
                type="button"
                className="ai-center-results__save-btn"
                onClick={onSave}
                disabled={saving || !!result.log_id}
              >
                <Save size={15} />
                {result.log_id ? t('aiCenter.saved') : t('aiCenter.save')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="ai-center-results__metrics ai-center-results__metrics--categories">
        <article className={cn('ai-center-results__cat-metric', 'ai-center-results__cat-metric--sign', hasSignHit && 'is-hit', activeCategory === 'sign' && 'is-active')}>
          <span className="ai-center-results__cat-metric-icon"><Signpost size={16} /></span>
          <div>
            <p className="ai-center-results__cat-metric-value">{hasSignHit ? `${signConfidence.toFixed(1)}%` : '—'}</p>
            <p className="ai-center-results__cat-metric-label">{t('aiCenter.legendSign')}</p>
          </div>
        </article>
        <article className={cn('ai-center-results__cat-metric', 'ai-center-results__cat-metric--vehicle', hasVehicleHit && 'is-hit', activeCategory === 'vehicle' && 'is-active')}>
          <span className="ai-center-results__cat-metric-icon"><Car size={16} /></span>
          <div>
            <p className="ai-center-results__cat-metric-value">{hasVehicleHit && vehicleConfidence > 0 ? `${vehicleConfidence.toFixed(1)}%` : '—'}</p>
            <p className="ai-center-results__cat-metric-label">{t('aiCenter.legendVehicle')}</p>
          </div>
        </article>
        <article className={cn('ai-center-results__cat-metric', 'ai-center-results__cat-metric--plate', hasPlateHit && 'is-hit', activeCategory === 'plate' && 'is-active')}>
          <span className="ai-center-results__cat-metric-icon"><Hash size={16} /></span>
          <div>
            <p className="ai-center-results__cat-metric-value">{hasPlateHit ? (plateConfidence > 0 ? `${plateConfidence.toFixed(1)}%` : result.detected_plate) : '—'}</p>
            <p className="ai-center-results__cat-metric-label">{t('aiCenter.legendPlate')}</p>
          </div>
        </article>
        {result.processing_time != null && result.processing_time > 0 && (
          <article className="ai-center-results__metric ai-center-results__metric--slate">
            <span className="ai-center-results__metric-icon"><Clock size={16} /></span>
            <div>
              <p className="ai-center-results__metric-value">{result.processing_time.toFixed(2)}s</p>
              <p className="ai-center-results__metric-label">{t('aiCenter.processingTime')}</p>
            </div>
          </article>
        )}
      </div>

      <div className="ai-center-results__meta-row">
        {result.log_id && (
          <article className="ai-center-results__metric ai-center-results__metric--emerald ai-center-results__metric--compact">
            <span className="ai-center-results__metric-icon"><CheckCircle size={16} /></span>
            <div>
              <p className="ai-center-results__metric-value">ID {String(result.log_id).slice(0, 8)}</p>
              <p className="ai-center-results__metric-label">{t('aiCenter.logSaved')}</p>
            </div>
          </article>
        )}
        {(result.model_version || result.detection_engine) && (
          <article className="ai-center-results__metric ai-center-results__metric--violet ai-center-results__metric--compact">
            <span className="ai-center-results__metric-icon"><Cpu size={16} /></span>
            <div>
              <p className="ai-center-results__metric-value ai-center-results__metric-value--sm">
                {result.model_version || result.detection_engine || 'YOLOv11'}
              </p>
              <p className="ai-center-results__metric-label">{t('aiCenter.kpiModel')}</p>
            </div>
          </article>
        )}
        <span className={cn('ai-center-results__mode-pill', `ai-center-results__mode-pill--${primaryCategoryResolved}`)}>
          {t(`aiCenter.mode.${detectionMode}`, detectionMode.replace('_', ' '))}
        </span>
      </div>

      {(originalImage || displaySrc) && (
        <section className="ai-center-results__compare" aria-label={t('aiCenter.compareImages')}>
          <div className="ai-center-results__filter-tabs" role="tablist" aria-label={t('aiCenter.filterDetections', 'Filter detections')}>
            {categoryTabs.map(({ id, label, tone, icon: TabIcon, hit }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeCategory === id}
                className={cn(
                  'ai-center-results__filter-tab',
                  `ai-center-results__filter-tab--${tone}`,
                  activeCategory === id && 'is-active',
                  !hit && id !== 'all' && 'is-disabled',
                )}
                onClick={() => setActiveCategory(id)}
              >
                <TabIcon size={14} strokeWidth={2.1} />
                <span>{label}</span>
                {hit && id !== 'all' ? <span className="ai-center-results__filter-dot" /> : null}
              </button>
            ))}
          </div>
          {originalImage && (
            <article className="ai-center-results__image-card ai-center-results__image-card--original">
              <header className="ai-center-results__image-head">
                <ImageIcon size={14} />
                <span>{t('aiCenter.originalImage')}</span>
              </header>
              <div className="ai-center-results__image-body">
                <AnnotatedDetectionImage src={originalImage} alt={t('aiCenter.originalImage')} hero />
              </div>
            </article>
          )}
          {displaySrc && (
            <article className={cn(
              'ai-center-results__image-card ai-center-results__image-card--detection',
              activeCategory !== 'all' && `ai-center-results__image-card--focus-${activeCategory}`,
            )}>
              <header className="ai-center-results__image-head">
                <ScanLine size={14} />
                <span>
                  {activeCategory === 'all'
                    ? t('aiCenter.detectionImage')
                    : t('aiCenter.detectionImageFiltered', {
                        category: activeCategory === 'sign'
                          ? t('aiCenter.legendSign')
                          : activeCategory === 'vehicle'
                            ? t('aiCenter.legendVehicle')
                            : t('aiCenter.legendPlate'),
                      })}
                </span>
              </header>
              <div className="ai-center-results__image-body">
                <AnnotatedDetectionImage
                  src={displaySrc}
                  alt={t('aiCenter.detectionImage')}
                  result={result as OverlayDetectionInput}
                  hero
                  filterKind={overlayFilter}
                />
              </div>
            </article>
          )}
        </section>
      )}

      {result.video_analysis && (
        <div className="ai-center-results__video-banner">
          <p className="ai-center-results__section-title">{t('aiCenter.videoSummary')}</p>
          <p className="ai-center-results__video-meta">
            {t('aiCenter.videoFrames', {
              count: result.video_analysis.frames_analyzed ?? 0,
              time: result.video_analysis.best_frame_timestamp_sec ?? 0,
            })}
          </p>
          <div className="ai-center-results__video-actions">
            {(result.annotated_processed_image || result.processed_image || result.uploaded_image) && (
              <button
                type="button"
                className="ai-center-results__export-btn"
                disabled={mediaDownloading !== null}
                onClick={() => void downloadVideoArtifact('frame')}
              >
                {mediaDownloading === 'frame' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                {t('aiCenter.downloadAnnotatedFrame')}
              </button>
            )}
            {result.annotated_preview_video && (
              <button
                type="button"
                className="ai-center-results__export-btn"
                disabled={mediaDownloading !== null}
                onClick={() => void downloadVideoArtifact('video')}
              >
                {mediaDownloading === 'video' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                {t('aiCenter.downloadAnnotatedPreview')}
              </button>
            )}
          </div>
        </div>
      )}

      <section className="ai-center-detect-output" aria-label={t('aiCenter.detectionOutput')}>
        <header className="ai-center-detect-output__banner">
          <div className="ai-center-detect-output__banner-icon">
            <ScanLine size={18} strokeWidth={2.1} />
          </div>
          <div>
            <h3 className="ai-center-detect-output__banner-title">{t('aiCenter.detectionOutput')}</h3>
            <p className="ai-center-detect-output__banner-hint">{t('aiCenter.detectionOutputHint')}</p>
          </div>
          <div className="ai-center-detect-output__legend" aria-label={t('aiCenter.legendTitle')}>
            <span className="ai-center-detect-output__legend-item ai-center-detect-output__legend-item--violet">
              <span className="ai-center-detect-output__legend-dot" />
              {t('aiCenter.legendSign')}
            </span>
            <span className="ai-center-detect-output__legend-item ai-center-detect-output__legend-item--cyan">
              <span className="ai-center-detect-output__legend-dot" />
              {t('aiCenter.legendVehicle')}
            </span>
            <span className="ai-center-detect-output__legend-item ai-center-detect-output__legend-item--amber">
              <span className="ai-center-detect-output__legend-dot" />
              {t('aiCenter.legendPlate')}
            </span>
          </div>
        </header>

        <div className="ai-center-detect-grid">
          <DetectionCategoryCard
            tone="violet"
            icon={Signpost}
            title={t('aiCenter.signInfo')}
            subtitle={t('aiCenter.categorySignHint')}
            status={hasSignHit ? 'hit' : 'miss'}
            confidence={hasSignHit && signConfidence > 0 ? signConfidence : null}
            isPrimary={primaryCategoryResolved === 'sign'}
            isFocused={activeCategory === 'sign'}
            onFocus={() => setActiveCategory('sign')}
          >
            <div className="ai-center-detect-card__content">
              {hasSignHit ? (
                <>
                  <SignNameLabels sign={result} size="md" />
                  <p className="ai-center-detect-card__meta">
                    {result.sign_code || '—'} · {signLabel || t('aiCenter.noSign')}
                  </p>
                  {result.description && (
                    <p className="ai-center-detect-card__desc">
                      {locale === 'en' ? (result.description_en || result.description) : result.description}
                    </p>
                  )}
                </>
              ) : (
                <p className="ai-center-detect-card__empty">{t('aiCenter.noSign')}</p>
              )}
            </div>
            <div className="ai-center-detect-card__footer" onClick={(e) => e.stopPropagation()}>
              <SpeakButton
                isActive={speakingId === 'center-sign'}
                onClick={() => speak(speechText, 'center-sign', locale)}
                label={t('aiCenter.listen')}
              />
            </div>
          </DetectionCategoryCard>

          <DetectionCategoryCard
            tone="cyan"
            icon={Car}
            title={t('aiCenter.vehicleInfo')}
            subtitle={t('aiCenter.categoryVehicleHint')}
            status={hasVehicleHit ? 'hit' : 'miss'}
            confidence={hasVehicleHit && vehicleConfidence > 0 ? vehicleConfidence : null}
            isPrimary={primaryCategoryResolved === 'vehicle'}
            isFocused={activeCategory === 'vehicle'}
            onFocus={() => setActiveCategory('vehicle')}
          >
            <div className="ai-center-detect-card__content">
              {hasVehicleHit ? (
                <>
                  {vehicles.length > 0 ? (
                    <ul className="ai-center-detect-card__list">
                      {vehicles.map((v, i) => (
                        <li key={v.track_id ?? i}>
                          <span className="ai-center-detect-card__list-label">{v.label || v.vehicle_type}</span>
                          <span className="ai-center-detect-card__list-val">{Number(v.confidence).toFixed(1)}%</span>
                        </li>
                      ))}
                    </ul>
                  ) : result.pipeline_vehicle ? (
                    <p className="ai-center-detect-card__primary">
                      {locale === 'km'
                        ? result.pipeline_vehicle.vehicle_label_km
                        : result.pipeline_vehicle.vehicle_label_en}
                    </p>
                  ) : null}
                  {result.pipeline_vehicle && vehicles.length > 0 && (
                    <p className="ai-center-detect-card__meta">
                      {locale === 'km'
                        ? result.pipeline_vehicle.vehicle_label_km
                        : result.pipeline_vehicle.vehicle_label_en}
                      {' · '}
                      {result.pipeline_vehicle.vehicle_confidence.toFixed(1)}%
                    </p>
                  )}
                </>
              ) : (
                <p className="ai-center-detect-card__empty">{t('aiCenter.noVehicle')}</p>
              )}
            </div>
            {result.vehicle_snapshot ? (
              <div className="ai-center-detect-card__snapshot-wrap">
                <img src={result.vehicle_snapshot} alt="" className="ai-center-detect-card__snapshot" loading="lazy" />
              </div>
            ) : null}
          </DetectionCategoryCard>

          <DetectionCategoryCard
            tone="amber"
            icon={Hash}
            title={t('aiCenter.plateOcr')}
            subtitle={t('aiCenter.categoryPlateHint')}
            status={hasPlateHit ? 'hit' : 'miss'}
            confidence={hasPlateHit && plateConfidence > 0 ? plateConfidence : null}
            confidenceLabel="OCR"
            isPrimary={primaryCategoryResolved === 'plate'}
            isFocused={activeCategory === 'plate'}
            onFocus={() => setActiveCategory('plate')}
          >
            <div className="ai-center-detect-card__content">
              {hasPlateHit ? (
                <>
                  <p className="ai-center-detect-card__plate">{result.detected_plate}</p>
                  {ocrReads.length > 0 && (
                    <ul className="ai-center-detect-card__list">
                      {ocrReads.map((read, i) => (
                        <li key={i}>
                          <span className="ai-center-detect-card__list-label">{read.text}</span>
                          <span className="ai-center-detect-card__list-val">{read.confidence.toFixed(1)}%</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="ai-center-detect-card__empty">{t('aiCenter.noPlate')}</p>
              )}
            </div>
            {result.plate_snapshot ? (
              <div className="ai-center-detect-card__snapshot-wrap">
                <img src={result.plate_snapshot} alt="" className="ai-center-detect-card__snapshot" loading="lazy" />
              </div>
            ) : null}
          </DetectionCategoryCard>
        </div>
      </section>

      {(result.violation_evaluation || result.violation_error) && (
        <div className="ai-center-results__insight-grid ai-center-results__insight-grid--secondary">
          {result.violation_evaluation && (
            <section className={cn('ai-center-results__insight ai-center-results__insight--violation', result.violation_evaluation.is_violation && 'is-hit')}>
              <header className="ai-center-results__insight-head">
                <span className="ai-center-results__insight-icon ai-center-results__insight-icon--rose">
                  <Shield size={17} />
                </span>
                <h3>{t('aiCenter.violationEngine')}</h3>
              </header>
              <div className="ai-center-results__insight-body">
                {result.violation_evaluation.is_violation ? (
                  <>
                    <p className="ai-center-results__violation-type">{result.violation_evaluation.violation_type}</p>
                    <p className="ai-center-results__insight-desc">{result.violation_evaluation.description}</p>
                  </>
                ) : (
                  <p className="ai-center-results__insight-empty">
                    <CheckCircle size={14} className="inline mr-1" />
                    {result.violation_evaluation.reason || t('aiCenter.noViolation')}
                  </p>
                )}
              </div>
            </section>
          )}

          {result.violation_error && (
            <section className="ai-center-results__insight ai-center-results__insight--warn">
              <header className="ai-center-results__insight-head">
                <AlertTriangle size={17} />
                <h3>{t('aiCenter.violationError')}</h3>
              </header>
              <div className="ai-center-results__insight-body">
                <p className="ai-center-results__insight-desc">{result.violation_error}</p>
              </div>
            </section>
          )}
        </div>
      )}

      {result.matched_vehicle && (
        <div className="ai-center-results__matched">
          <ThumbsUp size={16} />
          <span>
            {result.matched_vehicle.plate_number} — {result.matched_vehicle.owner_name} ({result.matched_vehicle.vehicle_type})
          </span>
        </div>
      )}
    </div>
  );
}
