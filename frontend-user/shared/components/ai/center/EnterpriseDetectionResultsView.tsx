import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  Car, Signpost, Hash, Shield, CheckCircle, Download, Save, FileText,
  ImageIcon, Plus, Eye, Target, Camera, Clock, MapPin, Gauge,
} from 'lucide-react';
import { AnnotatedDetectionImage } from '@shared/components/ai/center/AnnotatedDetectionImage';
import { DetectionObjectDetailsDrawer } from '@shared/components/ai/center/DetectionObjectDetailsDrawer';
import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';
import { useLanguage } from '@shared/context/LanguageContext';
import {
  buildDetectionObjectRows,
  type DetectionObjectRow,
} from '@shared/utils/enterpriseDetectionObjects';
import { resolvePipelineVehicle } from '@shared/utils/pipelineVehicle';
import type { OverlayDetectionInput } from '@shared/utils/detectionOverlay';
import { cn } from '@shared/components/ui/utils';
import { toast } from 'sonner';

interface EnterpriseDetectionResultsViewProps {
  result: CenterDetectionResult;
  previewSrc?: string | null;
  sourceLabel?: string;
  accuracyAvg?: number;
  onExport?: () => void;
  onNewDetection: () => void;
}

function plateProvince(result: CenterDetectionResult, locale: string): string | null {
  if (locale === 'km') {
    return result.plate_province_km || result.plate_province_en || null;
  }
  return result.plate_province_en || result.plate_province_km || null;
}

function statusLabel(status: DetectionObjectRow['status'], t: (k: string) => string) {
  if (status === 'ocr_success') return t('aiCenter.statusOk');
  if (status === 'detected') return t('aiCenter.statusOk');
  return t('aiCenter.notDetected');
}

function ResultSectionHead({
  tone,
  icon: Icon,
  title,
  badge,
  end,
}: {
  tone: 'image' | 'summary' | 'ocr' | 'objects' | 'decision' | 'decision-violation';
  icon: typeof ImageIcon;
  title: string;
  badge?: string;
  end?: ReactNode;
}) {
  return (
    <header className={cn('enterprise-ai-results__section-head', `enterprise-ai-results__section-head--${tone}`)}>
      <span className="enterprise-ai-chart-dot" aria-hidden />
      <div className="enterprise-ai-workspace__head-copy">
        <h3 className="enterprise-ai-results__section-title">{title}</h3>
      </div>
      <div className="enterprise-ai-workspace__head-icon">
        <Icon size={16} />
      </div>
      {badge != null && (
        <span className="enterprise-ai-results__section-badge">{badge}</span>
      )}
      {end}
    </header>
  );
}

function toPercentConfidence(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  // Some paths store 0–1; detection API returns 0–100.
  const pct = n <= 1 ? n * 100 : n;
  return Math.min(100, Math.max(0, pct));
}

export function EnterpriseDetectionResultsView({
  result,
  previewSrc,
  sourceLabel,
  accuracyAvg = 0,
  onExport,
  onNewDetection,
}: EnterpriseDetectionResultsViewProps) {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const [selectedObject, setSelectedObject] = useState<DetectionObjectRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const displaySrc = result.annotated_processed_image || result.uploaded_image || previewSrc || '';
  const objects = useMemo(
    () => buildDetectionObjectRows(result, speechLocale),
    [result, speechLocale],
  );

  const signCount = objects.filter((o) => o.kind === 'sign').length;
  const vehicleCount = objects.filter((o) => o.kind === 'vehicle').length || (result.vehicles?.length ?? 0);
  const plateCount = objects.filter((o) => o.kind === 'plate').length || (result.detected_plate ? 1 : 0);
  const pipelineVehicle = resolvePipelineVehicle(result, speechLocale);
  const province = plateProvince(result, locale);
  const hasViolation = Boolean(result.violation_evaluation?.is_violation);
  const violationRecord = result.violation;

  // AI Confidence must reflect THIS scan — not historical page averages (zeros dilute those).
  const scanConfidence = toPercentConfidence(result.display_confidence ?? result.confidence);
  const objectsConfidence = useMemo(() => {
    const scored = objects
      .map((o) => toPercentConfidence(o.confidence))
      .filter((c) => c > 0);
    if (!scored.length) return 0;
    return scored.reduce((sum, c) => sum + c, 0) / scored.length;
  }, [objects]);
  const accuracy = scanConfidence > 0
    ? scanConfidence
    : objectsConfidence > 0
      ? objectsConfidence
      : toPercentConfidence(accuracyAvg);

  const downloadImage = () => {
    if (!displaySrc) return;
    const a = document.createElement('a');
    a.href = displaySrc;
    a.download = `detection-${result.log_id || Date.now()}.jpg`;
    a.click();
  };

  const handleCreateViolation = () => {
    if (violationRecord?.id) {
      navigate('/admin/violations');
      return;
    }
    if (hasViolation) {
      toast.info(t('aiCenter.violationReadyHint'));
      navigate('/admin/violations');
      return;
    }
    toast.info(t('aiCenter.noViolation'));
  };

  const openObject = (row: DetectionObjectRow) => {
    setSelectedObject(row);
    setDrawerOpen(true);
  };

  const plateOcrSuccess = result.detected_plate && (result.plate_confidence ?? 0) > 0;
  const ocrConfidence = Number(result.plate_confidence ?? 0);
  const detectionTime = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const gpsLocation = province || t('aiCenter.defaultLocation');

  const resultKpis = [
    { tone: 'violet', icon: Signpost, value: String(signCount), label: t('aiCenter.kpiTrafficSign') },
    { tone: 'cyan', icon: Car, value: String(vehicleCount), label: t('aiCenter.kpiVehicle') },
    { tone: 'amber', icon: Hash, value: plateOcrSuccess ? t('aiCenter.plateOcrSuccess') : '—', label: t('aiCenter.kpiPlateOcr') },
    { tone: 'emerald', icon: Target, value: `${accuracy.toFixed(1)}%`, label: t('aiCenter.kpiAccuracy') },
  ];

  return (
    <div className="enterprise-ai-results">
      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four enterprise-ai-kpi-grid enterprise-ai-kpi-grid--results">
        {resultKpis.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={cn('enforcement-page__stat-card', `enforcement-page__stat-card--${card.tone}`)}>
              <div className={cn('enforcement-page__stat-icon', `enforcement-page__stat-icon--${card.tone}`)}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value enterprise-ai-kpi-value--sm">{card.value}</p>
                <p className={cn('enforcement-page__stat-label', `enforcement-page__stat-label--${card.tone}`)}>
                  {card.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <header className="enterprise-ai-results__toolbar">
        <span className="enterprise-ai-chart-dot enterprise-ai-chart-dot--summary" aria-hidden />
        <div className="enterprise-ai-workspace__head-copy">
          <p className="enterprise-ai-results__eyebrow">{sourceLabel || t('aiCenter.resultsEyebrow')}</p>
          <h2 className="enterprise-ai-results__title">{t('aiCenter.resultsTitle')}</h2>
        </div>
        <div className="enterprise-ai-workspace__head-icon enterprise-ai-workspace__head-icon--summary">
          <Target size={16} />
        </div>
        <div className="enterprise-ai-results__toolbar-actions">
          <button type="button" className="enterprise-ai-results__toolbar-btn enterprise-ai-results__toolbar-btn--primary" onClick={onNewDetection}>
            <Plus size={15} />
            {t('aiCenter.newDetection')}
          </button>
          <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={onExport}>
            <Save size={15} />
            {t('aiCenter.saveResult')}
          </button>
          {onExport && (
            <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={onExport}>
              <FileText size={15} />
              {t('aiCenter.export')}
            </button>
          )}
          <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={downloadImage}>
            <Download size={15} />
            {t('aiCenter.downloadImage')}
          </button>
        </div>
      </header>

      <div className="enterprise-ai-results__hero-grid">
        <section className="enterprise-ai-results__image-card">
          <ResultSectionHead tone="image" icon={ImageIcon} title={t('aiCenter.detectionResult')} />
          <div className="enterprise-ai-results__image-body">
            {displaySrc ? (
              <AnnotatedDetectionImage
                src={displaySrc}
                alt={t('aiCenter.detectionImage')}
                result={result as OverlayDetectionInput}
                hero
              />
            ) : (
              <div className="enterprise-ai-results__image-empty">{t('aiCenter.noImage')}</div>
            )}
          </div>
        </section>

        <aside className="enterprise-ai-results__summary-card">
          <ResultSectionHead tone="summary" icon={Shield} title={t('aiCenter.aiSummary')} />
          <div className="enterprise-ai-summary-board">
            <div className="enterprise-ai-summary-tiles">
              <div className="enterprise-ai-summary-tile enterprise-ai-summary-tile--violet">
                <div className="enterprise-ai-summary-tile__icon"><Signpost size={16} /></div>
                <div className="enterprise-ai-summary-tile__copy">
                  <span className="enterprise-ai-summary-tile__label">{t('aiCenter.summarySigns')}</span>
                  <strong className="enterprise-ai-summary-tile__value">{signCount}</strong>
                </div>
              </div>
              <div className="enterprise-ai-summary-tile enterprise-ai-summary-tile--cyan">
                <div className="enterprise-ai-summary-tile__icon"><Car size={16} /></div>
                <div className="enterprise-ai-summary-tile__copy">
                  <span className="enterprise-ai-summary-tile__label">{t('aiCenter.summaryVehicles')}</span>
                  <strong className="enterprise-ai-summary-tile__value">{vehicleCount}</strong>
                </div>
              </div>
              <div className="enterprise-ai-summary-tile enterprise-ai-summary-tile--amber">
                <div className="enterprise-ai-summary-tile__icon"><Hash size={16} /></div>
                <div className="enterprise-ai-summary-tile__copy">
                  <span className="enterprise-ai-summary-tile__label">{t('aiCenter.summaryPlates')}</span>
                  <strong className={cn('enterprise-ai-summary-tile__value', result.detected_plate && 'is-mono')}>
                    {result.detected_plate || '—'}
                  </strong>
                </div>
              </div>
              <div className="enterprise-ai-summary-tile enterprise-ai-summary-tile--emerald">
                <div className="enterprise-ai-summary-tile__icon"><Gauge size={16} /></div>
                <div className="enterprise-ai-summary-tile__copy">
                  <span className="enterprise-ai-summary-tile__label">{t('aiCenter.aiConfidence')}</span>
                  <strong className="enterprise-ai-summary-tile__value">{accuracy.toFixed(1)}%</strong>
                </div>
                <div className="enterprise-ai-summary-tile__meter" aria-hidden>
                  <span style={{ width: `${Math.min(100, Math.max(0, accuracy))}%` }} />
                </div>
              </div>
            </div>

            <ul className="enterprise-ai-summary-meta">
              {ocrConfidence > 0 && (
                <li>
                  <span className="enterprise-ai-summary-meta__icon enterprise-ai-summary-meta__icon--amber"><Hash size={14} /></span>
                  <span className="enterprise-ai-summary-meta__label">{t('aiCenter.ocrConfidence')}</span>
                  <strong>{ocrConfidence.toFixed(1)}%</strong>
                </li>
              )}
              {sourceLabel && (
                <li>
                  <span className="enterprise-ai-summary-meta__icon enterprise-ai-summary-meta__icon--blue"><Camera size={14} /></span>
                  <span className="enterprise-ai-summary-meta__label">{t('aiCenter.cameraLabel')}</span>
                  <strong>{sourceLabel}</strong>
                </li>
              )}
              <li>
                <span className="enterprise-ai-summary-meta__icon enterprise-ai-summary-meta__icon--violet"><Clock size={14} /></span>
                <span className="enterprise-ai-summary-meta__label">{t('aiCenter.detectionTime')}</span>
                <strong>{detectionTime}</strong>
              </li>
              <li>
                <span className="enterprise-ai-summary-meta__icon enterprise-ai-summary-meta__icon--rose"><MapPin size={14} /></span>
                <span className="enterprise-ai-summary-meta__label">{t('aiCenter.gpsLocation')}</span>
                <strong>{gpsLocation}</strong>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <section className="enterprise-ai-results__ocr-card">
        <ResultSectionHead tone="ocr" icon={Hash} title={t('aiCenter.ocrSection')} />
        <dl className="enterprise-ai-ocr-grid">
          <div>
            <dt>{t('aiCenter.plateNumber')}</dt>
            <dd>{result.detected_plate || '—'}</dd>
          </div>
          <div>
            <dt>{t('aiCenter.plateProvince')}</dt>
            <dd>{province || '—'}</dd>
          </div>
          <div>
            <dt>{t('aiCenter.vehicleType')}</dt>
            <dd>{pipelineVehicle?.label || result.pipeline_vehicle?.vehicle_label_en || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="enterprise-ai-results__table-card">
        <ResultSectionHead
          tone="objects"
          icon={Eye}
          title={t('aiCenter.detectionObjects')}
          badge={String(objects.length)}
        />
        <div className="enterprise-ai-table-panel">
          <div className="enterprise-ai-table-wrap">
            <table className="enterprise-ai-table">
              <colgroup>
                <col className="enterprise-ai-table__col-idx" />
                <col className="enterprise-ai-table__col-object" />
                <col className="enterprise-ai-table__col-conf" />
                <col className="enterprise-ai-table__col-cat" />
                <col className="enterprise-ai-table__col-status" />
                <col className="enterprise-ai-table__col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">{t('aiCenter.colObject')}</th>
                  <th scope="col">{t('aiCenter.colConfidence')}</th>
                  <th scope="col">{t('aiCenter.colCategory')}</th>
                  <th scope="col">{t('aiCenter.colStatus')}</th>
                  <th scope="col">{t('aiCenter.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {objects.length === 0 ? (
                  <tr className="enterprise-ai-table__empty-row">
                    <td colSpan={6}>
                      <div className="enterprise-ai-table__empty">
                        <Eye size={22} />
                        <p>{t('aiCenter.noObjectsDetected')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  objects.map((row, index) => (
                    <tr key={row.id} className="enterprise-ai-table__row">
                      <td className="enterprise-ai-table__idx">{index + 1}</td>
                      <td>
                        <span className={cn('enterprise-ai-table__object', `enterprise-ai-table__object--${row.kind}`)}>
                          {row.name}
                        </span>
                      </td>
                      <td>
                        <div className="enterprise-ai-table__conf">
                          <span className="enterprise-ai-table__conf-value">
                            {row.confidence > 0 ? `${row.confidence.toFixed(1)}%` : '—'}
                          </span>
                          {row.confidence > 0 && (
                            <span className="enterprise-ai-table__conf-bar" aria-hidden>
                              <span
                                className={cn(
                                  'enterprise-ai-table__conf-fill',
                                  row.confidence >= 90 && 'is-high',
                                  row.confidence >= 75 && row.confidence < 90 && 'is-mid',
                                  row.confidence < 75 && 'is-low',
                                )}
                                style={{ width: `${Math.min(100, row.confidence)}%` }}
                              />
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={cn('enterprise-ai-table__category', `enterprise-ai-table__category--${row.kind}`)}>
                          {row.category}
                        </span>
                      </td>
                      <td>
                        <span className={cn(
                          'enterprise-ai-table__status',
                          row.status === 'ocr_success' && 'is-ocr',
                          row.status === 'detected' && 'is-detected',
                          row.status === 'not_detected' && 'is-miss',
                        )}>
                          {statusLabel(row.status, t)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="enterprise-ai-table__view-btn"
                          onClick={() => openObject(row)}
                        >
                          <Eye size={13} />
                          {t('aiCenter.viewObject')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {objects.length > 0 && (
            <footer className="enterprise-ai-table-footer">
              <span>
                {t('aiCenter.objectsCountShort', { count: objects.length })}
              </span>
              <span>
                {t('aiCenter.objectsBreakdownShort', {
                  signs: signCount,
                  vehicles: vehicleCount,
                  plates: plateCount,
                })}
              </span>
            </footer>
          )}
        </div>
      </section>

      <section className={cn('enterprise-ai-results__decision-card', hasViolation && 'is-violation')}>
        <ResultSectionHead
          tone={hasViolation ? 'decision-violation' : 'decision'}
          icon={Shield}
          title={t('aiCenter.aiDecision')}
        />
        <ul className="enterprise-ai-decision-list">
          {hasViolation ? (
            <>
              <li><CheckCircle size={16} /> {result.violation_evaluation?.title || result.violation_evaluation?.violation_type || t('aiCenter.violationDetected')}</li>
              <li><CheckCircle size={16} /> {t('aiCenter.evidenceGenerated')}</li>
              <li><CheckCircle size={16} /> {t('aiCenter.readyCreateViolation')}</li>
            </>
          ) : (
            <li><CheckCircle size={16} /> {result.violation_evaluation?.reason || t('aiCenter.noViolation')}</li>
          )}
        </ul>
        <div className="enterprise-ai-results__actions">
          <button
            type="button"
            className="enterprise-ai-btn enterprise-ai-btn--danger"
            onClick={handleCreateViolation}
            disabled={!hasViolation && !violationRecord}
          >
            <Shield size={15} />
            {t('aiCenter.createViolation')}
          </button>
          <button type="button" className="enterprise-ai-btn enterprise-ai-btn--secondary" onClick={onExport}>
            <Save size={15} />
            {t('aiCenter.saveResult')}
          </button>
          <button type="button" className="enterprise-ai-btn enterprise-ai-btn--secondary" onClick={onExport}>
            <FileText size={15} />
            {t('aiCenter.exportPdf')}
          </button>
          <button type="button" className="enterprise-ai-btn enterprise-ai-btn--ghost" onClick={downloadImage}>
            <Download size={15} />
            {t('aiCenter.downloadImage')}
          </button>
        </div>
      </section>

      <DetectionObjectDetailsDrawer
        object={selectedObject}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        imageSrc={displaySrc}
        cameraLabel={sourceLabel}
        plateNumber={result.detected_plate}
        vehicleType={pipelineVehicle?.label || result.pipeline_vehicle?.vehicle_label_en}
        gpsLocation={gpsLocation}
      />
    </div>
  );
}
