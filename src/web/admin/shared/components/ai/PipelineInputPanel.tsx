import { Upload, Camera, ArrowRight, Sparkles } from 'lucide-react';
import { LiveWebcamPanel } from '@shared/components/ai/LiveWebcamPanel';
import { DemoObservedActionSelect } from '@shared/components/ai/DemoObservedActionSelect';
import { DetectionDisplayImage } from '@shared/components/ai/DetectionDisplayImage';
import { DetectionPanelHeader, DetectionPanelBody } from '@shared/components/ai/DetectionPanelHeader';
import { DETECTION_HEADER_GRADIENTS, DETECTION_HEADER_ICON_ACCENTS } from '@shared/components/ai/detectionHeaderGradients';
import { useLanguage } from '@shared/context/LanguageContext';
import type { DetectPipelineOptions } from '@shared/constants/observedActions';
import type { WebcamDetectionResult } from '@shared/hooks/useWebcamDetection';
import { DEFAULT_PAGE_STATS, resolveSampleSignImage } from '@shared/constants/defaultPageStats';
import { signDisplayNames } from '@shared/utils/signDisplayNames';
import type { AIDetectionPageStats, AIDetectionSampleSign } from '@shared/types';

function demoSignTitle(sign: AIDetectionSampleSign): string {
  const { en, km } = signDisplayNames(sign);
  return en || km || sign.sign_code || sign.label;
}

export function PipelineInputPanel({
  inputMode,
  onInputModeChange,
  demoObservedAction,
  onDemoObservedActionChange,
  detecting,
  file,
  preview,
  dragging,
  onDraggingChange,
  onDrop,
  onPickClick,
  onFileInputChange,
  onDetect,
  onResetFile,
  onWebcamResult,
  onSampleSign,
  pageStats,
  loadingStats,
  pipelineOptions,
  disabled,
  inputRef,
  compact = false,
  fillHeight = true,
}: {
  inputMode: 'upload' | 'webcam';
  onInputModeChange: (mode: 'upload' | 'webcam') => void;
  demoObservedAction: string;
  onDemoObservedActionChange: (v: string) => void;
  detecting: boolean;
  progress: number;
  file: File | null;
  preview: string | null;
  dragging: boolean;
  onDraggingChange: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onPickClick: () => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDetect: () => void;
  onResetFile: () => void;
  onWebcamResult: (res: WebcamDetectionResult, opts?: { quiet?: boolean }) => void;
  onSampleSign: (s: AIDetectionSampleSign) => void;
  pageStats: AIDetectionPageStats | null;
  loadingStats: boolean;
  pipelineOptions: DetectPipelineOptions;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  compact?: boolean;
  fillHeight?: boolean;
}) {
  const { t } = useLanguage();
  const demoSigns = (pageStats?.sample_signs?.length
    ? pageStats.sample_signs
    : DEFAULT_PAGE_STATS.sample_signs).slice(0, 10);
  const showDemoSkeleton = loadingStats && demoSigns.length === 0;

  return (
    <div className={`detection-input-panel rounded-2xl border shadow-sm overflow-hidden flex flex-col${compact ? ' detection-input-panel--compact' : ''}${fillHeight ? ' h-full' : ''}`}>
      <DetectionPanelHeader
        gradient={DETECTION_HEADER_GRADIENTS.upload}
        icon={inputMode === 'webcam' ? Camera : Upload}
        iconAccentColor={DETECTION_HEADER_ICON_ACCENTS.upload}
        title={t('aiDetection.inputPanelTitle')}
        subtitle={t('aiDetection.inputPanelSubtitle')}
        footer={
          <div className="ai-detection-panel-header__tabs">
            {(['upload', 'webcam'] as const).map((mode) => {
              const active = inputMode === mode;
              const Icon = mode === 'upload' ? Upload : Camera;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onInputModeChange(mode)}
                  disabled={detecting}
                  className={`ai-detection-panel-header__tab${active ? ' is-active' : ''}`}
                >
                  <Icon size={16} strokeWidth={2.25} />
                  {mode === 'upload' ? t('aiDetection.tabUploadFile') : t('aiDetection.tabLiveWebcam')}
                </button>
              );
            })}
          </div>
        }
      />

      <DetectionPanelBody floating className={fillHeight ? 'flex flex-col flex-1 min-h-0' : 'flex flex-col'}>
        <div className="detection-input-panel__body-inner">
        <DemoObservedActionSelect
          className="detection-input-panel__demo"
          value={demoObservedAction}
          onChange={onDemoObservedActionChange}
          disabled={detecting}
        />

        {inputMode === 'webcam' ? (
          <>
            <div className="detection-input-panel__webcam-wrap">
              <LiveWebcamPanel
                onResult={onWebcamResult}
                disabled={disabled || detecting}
                pipelineOptions={pipelineOptions}
              />
            </div>
          </>
        ) : (
          <>
            <div className={`flex flex-col gap-3${fillHeight ? ' flex-1 min-h-0' : ''}${compact ? ' lg:grid lg:grid-cols-2 lg:items-start' : ''}`}>
              <div
                onDragOver={(e) => {
                  if (!detecting) {
                    e.preventDefault();
                    onDraggingChange(true);
                  }
                }}
                onDragLeave={() => onDraggingChange(false)}
                onDrop={onDrop}
                onClick={() => !detecting && onPickClick()}
                className={[
                  'detection-input-panel__dropzone',
                  dragging ? 'is-dragging' : '',
                  detecting ? 'is-waiting' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {preview ? (
                  <div className="relative ai-detect-preview-stage">
                    <DetectionDisplayImage src={preview} alt="Preview" variant="preview" />
                  </div>
                ) : (
                  <div className="detection-input-panel__dropzone-empty">
                    <div className="detection-input-panel__dropzone-icon">
                      <Upload size={34} strokeWidth={2.25} />
                    </div>
                    <p className="detection-input-panel__dropzone-title">{t('aiDetection.inputPanelDropTitle')}</p>
                    <p className="detection-input-panel__dropzone-hint">{t('aiDetection.dropFormats')}</p>
                    <p className="detection-input-panel__dropzone-browse">{t('aiDetection.inputPanelDropBrowse')}</p>
                  </div>
                )}
              </div>

              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileInputChange} />

              {file && (
                <div className="detection-input-panel__file-bar">
                  <div className="min-w-0">
                    <p className="detection-input-panel__file-name">{file.name}</p>
                    <p className="detection-input-panel__file-meta">
                      {(file.size / 1024).toFixed(1)} KB ·{' '}
                      {detecting
                        ? t('aiDetection.analysingShort')
                        : t('aiDetection.readyToDetect')}
                    </p>
                  </div>
                  {!detecting && (
                    <button
                      type="button"
                      onClick={onResetFile}
                      className="detection-input-panel__file-clear"
                      aria-label={t('a11y.removeFile')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              {!detecting && (
                <div className="detection-input-panel__demo-section">
                  <div className="detection-input-panel__demo-head">
                    <span className="detection-input-panel__demo-head-icon" aria-hidden>
                      <Sparkles size={14} strokeWidth={2.25} />
                    </span>
                    <p className="detection-input-panel__demo-label">{t('aiDetection.quickDemoFiles')}</p>
                  </div>
                  {showDemoSkeleton ? (
                    <div className="detection-input-panel__demo-grid">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="detection-input-panel__demo-chip is-skeleton">
                          <span className="detection-input-panel__demo-chip-thumb animate-pulse" />
                          <span className="detection-input-panel__demo-chip-code animate-pulse">···</span>
                        </div>
                      ))}
                    </div>
                  ) : demoSigns.length > 0 ? (
                    <div className="detection-input-panel__demo-grid">
                      {demoSigns.map((s) => {
                        const thumb = resolveSampleSignImage(s.image, s.sign_code);
                        const accent = s.color || '#3B82F6';
                        return (
                          <button
                            key={s.id}
                            type="button"
                            title={demoSignTitle(s)}
                            onClick={() => onSampleSign(s)}
                            disabled={detecting}
                            className="detection-input-panel__demo-chip"
                            style={{
                              ['--demo-accent' as string]: accent,
                            }}
                          >
                            <span className="detection-input-panel__demo-chip-thumb">
                              {thumb ? (
                                <img src={thumb} alt="" className="detection-input-panel__demo-chip-img" />
                              ) : (
                                <span className="detection-input-panel__demo-chip-fallback">{s.label}</span>
                              )}
                            </span>
                            <span className="detection-input-panel__demo-chip-code">
                              {s.sign_code || s.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="detection-input-panel__empty-hint">{t('aiDetection.catalogEmpty')}</p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onDetect}
                disabled={detecting || !file}
                className={`detection-input-panel__start-btn${fillHeight ? ' mt-auto' : ''}`}
              >
                {detecting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin opacity-70" />
                    {t('aiDetection.analysingShort')}
                  </>
                ) : (
                  <>
                    {t('aiDetection.startPipelineBtn')}
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
        </div>
      </DetectionPanelBody>
    </div>
  );
}
