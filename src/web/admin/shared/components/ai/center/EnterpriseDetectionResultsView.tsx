import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  Shield, Download, Save, FileText,
  ImageIcon, Plus, Eye, Printer, FileSpreadsheet,
} from 'lucide-react';
import { AnnotatedDetectionImage } from '@shared/components/ai/center/AnnotatedDetectionImage';
import { DetectionObjectDetailsDrawer } from '@shared/components/ai/center/DetectionObjectDetailsDrawer';
import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { violationsAPI, unknownVehiclesAPI } from '@shared/services/api';
import { useLanguage } from '@shared/context/LanguageContext';
import { usePagination } from '@shared/hooks/usePagination';
import {
  buildDetectionObjectRows,
  type DetectionObjectRow,
} from '@shared/utils/enterpriseDetectionObjects';
import { labelsForClassKey } from '@shared/utils/yoloSignLabels';
import {
  downloadDetectionJson,
  exportDetectionCsv,
  exportDetectionExcelTsv,
  printDetectionReport,
} from '@shared/utils/detectionExport';
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
  violationsBasePath?: string;
}

function plateProvince(result: CenterDetectionResult, locale: string): string | null {
  const direct = locale === 'km'
    ? (result.plate_province_km || result.plate_province_en || null)
    : (result.plate_province_en || result.plate_province_km || null);
  if (direct) return direct;

  // Fallback: province line stored in OCR details (visual / EasyOCR).
  const details = (result as CenterDetectionResult & {
    plate_ocr_details?: Array<{ text?: string; raw_text?: string; is_province_line?: boolean }>;
  }).plate_ocr_details;
  if (Array.isArray(details)) {
    for (const row of details) {
      if (!row?.is_province_line) continue;
      const text = String(row.text || row.raw_text || '').trim();
      if (!text) continue;
      const compact = text.replace(/[^A-Za-z]/g, '').toUpperCase();
      if (
        compact.includes('PHNOMPENH')
        || compact === 'PHNOMPENH'
        || /^PHNOM/.test(compact)
        || text.includes('ភ្នំពេញ')
        || text === 'Phnom Penh'
      ) {
        return locale === 'km' ? 'ភ្នំពេញ' : 'Phnom Penh';
      }
      // Already-normalized English province names from backend visual match.
      if (text === 'Phnom Penh' || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(text)) {
        return text;
      }
    }
  }

  // Fallback: parse description lines written by the backend composer.
  const blob = `${result.description_en || ''} ${result.description || ''}`;
  const en = blob.match(/Province:\s*([A-Za-z][A-Za-z\s]+?)(?:\.|$)/i);
  if (en?.[1]) {
    const name = en[1].trim();
    if (locale === 'km' && /phnom\s*penh/i.test(name)) return 'ភ្នំពេញ';
    return name;
  }
  if (blob.includes('ភ្នំពេញ')) {
    return locale === 'km' ? 'ភ្នំពេញ' : 'Phnom Penh';
  }
  return null;
}

/** Prefer primary OCR plate; fall back to best raw EasyOCR read. */
function resolveDetectedPlate(result: CenterDetectionResult): string {
  const primary = String(result.detected_plate || '').trim();
  if (primary) return primary;
  const details = (result as CenterDetectionResult & {
    plate_ocr_details?: Array<{ text?: string; confidence?: number; is_province_line?: boolean }>;
  }).plate_ocr_details;
  if (!Array.isArray(details) || !details.length) return '';
  const ranked = [...details]
    .filter((r) => r?.text && !r.is_province_line)
    .sort((a, b) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0));
  return String(ranked[0]?.text || '').trim();
}

function statusLabel(status: DetectionObjectRow['status'], t: (k: string) => string) {
  if (status === 'ocr_success') {
    const label = t('aiCenter.statusOcrSuccess');
    return label !== 'aiCenter.statusOcrSuccess' ? label : 'OCR Success';
  }
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
      <div className="enterprise-ai-workspace__head-copy">
        <h3 className="enterprise-ai-results__section-title">{title}</h3>
      </div>
      <div className="enterprise-ai-results__section-meta">
        {badge != null && (
          <span className="enterprise-ai-results__section-badge">{badge}</span>
        )}
        {end}
        <div className="enterprise-ai-workspace__head-icon" aria-hidden>
          <Icon size={15} />
        </div>
      </div>
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
  violationsBasePath = '/admin',
}: EnterpriseDetectionResultsViewProps) {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const speechLocale = locale === 'en' ? 'en' : 'km';
  const [selectedObject, setSelectedObject] = useState<DetectionObjectRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savingViolation, setSavingViolation] = useState(false);

  // Prefer the original photo + CSS overlays so ALL signs/vehicles get labels
  // (baked annotated images previously only kept the single best sign).
  const hasGeometry = Boolean(
    result.sign_bbox
    || (result.sign_detections && result.sign_detections.length > 0)
    || (result.vehicles && result.vehicles.length > 0)
    || result.plate_bbox
    || (result.plate_boxes && result.plate_boxes.length > 0),
  );
  const displaySrc = (
    (hasGeometry ? (result.uploaded_image || previewSrc || result.annotated_processed_image) : null)
    || result.annotated_processed_image
    || result.uploaded_image
    || previewSrc
    || ''
  );
  const showCssOverlay = hasGeometry;
  const objects = useMemo(
    () => buildDetectionObjectRows(result, speechLocale),
    [result, speechLocale],
  );
  const objectsPagination = usePagination(objects, 10);

  const signCount = objects.filter((o) => o.kind === 'sign').length;
  const vehicleCount = objects.filter((o) => o.kind === 'vehicle').length || (result.vehicles?.length ?? 0);
  const detectedPlate = resolveDetectedPlate(result);
  const plateCount = objects.filter((o) => o.kind === 'plate').length || (detectedPlate ? 1 : 0);
  const pipelineVehicle = resolvePipelineVehicle(result, speechLocale);
  const province = plateProvince(result, locale);
  const hasViolation = Boolean(result.violation_evaluation?.is_violation);
  const violationRecord = result.violation;

  // AI Confidence must reflect THIS scan — prefer the strongest detection score.
  const scanConfidence = toPercentConfidence(result.display_confidence ?? result.confidence);
  const objectsConfidence = useMemo(() => {
    const scored = objects
      .map((o) => toPercentConfidence(o.confidence))
      .filter((c) => c > 0);
    if (!scored.length) return 0;
    return Math.max(...scored);
  }, [objects]);
  const accuracy = Math.max(
    scanConfidence,
    objectsConfidence,
    scanConfidence <= 0 && objectsConfidence <= 0 ? toPercentConfidence(accuracyAvg) : 0,
  );

  const downloadImage = () => {
    if (!displaySrc) return;
    const a = document.createElement('a');
    a.href = displaySrc;
    a.download = `detection-${result.log_id || Date.now()}.jpg`;
    a.click();
  };

  const speechLocaleKey = speechLocale === 'en' ? 'en' : 'km';

  const handleSaveJson = () => {
    downloadDetectionJson(result);
    toast.success(t('aiCenter.saveResultDone') !== 'aiCenter.saveResultDone'
      ? t('aiCenter.saveResultDone')
      : 'Detection result saved (JSON)');
    onExport?.();
  };

  const handleExportPdf = () => {
    try {
      printDetectionReport(result, {
        locale: speechLocaleKey,
        imageSrc: displaySrc,
        sourceLabel,
        title: t('aiCenter.resultsTitle'),
      });
      toast.success(t('aiCenter.exportPdfStarted') !== 'aiCenter.exportPdfStarted'
        ? t('aiCenter.exportPdfStarted')
        : 'Print dialog opened — choose Save as PDF');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('aiCenter.exportFailed'));
    }
  };

  const handleExportCsv = () => {
    exportDetectionCsv(result, speechLocaleKey);
    toast.success(t('aiCenter.exportCsvSuccess') !== 'aiCenter.exportCsvSuccess'
      ? t('aiCenter.exportCsvSuccess')
      : 'CSV download started');
  };

  const handleExportExcel = () => {
    exportDetectionExcelTsv(result, speechLocaleKey);
    toast.success(t('aiCenter.exportExcelSuccess') !== 'aiCenter.exportExcelSuccess'
      ? t('aiCenter.exportExcelSuccess')
      : 'Excel download started');
  };

  const handleCreateViolation = async () => {
    if (savingViolation) return;
    if (violationRecord?.id) {
      navigate(`${violationsBasePath}/violations`);
      return;
    }
    if (!hasViolation) {
      toast.info(t('aiCenter.noViolation'));
      return;
    }

    const classKey = String(result.class_key || result.sign_code || '').trim();
    const observedAction = String(result.violation_evaluation?.observed_action || '').trim();
    if (!classKey || !observedAction) {
      toast.error(
        !observedAction
          ? 'Select an Observed Action (e.g. ENTER for No Entry) before creating a violation'
          : (t('aiCenter.violationSaveFailed') || 'Unable to save violation: missing sign or action'),
      );
      return;
    }

    const matchedDriverId = String(result.matched_vehicle?.driver_id || '').trim();
    const plate = detectedPlate || String(result.detected_plate || '').trim();
    const unknownPath = violationsBasePath?.startsWith('/admin')
      ? '/admin/unknown-vehicles'
      : '/officer/unknown-vehicles';

    setSavingViolation(true);
    try {
      // No registered driver → Unknown User queue (never invent demo driver / 2A-1234).
      if (!matchedDriverId) {
        const unknown = await unknownVehiclesAPI.queueFromDetection({
          plate_detected: plate || 'UNKNOWN',
          ai_detection_log_id: result.log_id != null ? String(result.log_id) : undefined,
          class_key: classKey.trim(),
          detected_class_key: classKey.trim(),
          observed_action: observedAction.trim(),
          violation_type: String(result.violation_evaluation?.violation_type || '').trim() || undefined,
          ai_confidence_score: result.plate_confidence || result.confidence || undefined,
        });
        toast.success(
          plate
            ? `Queued unmatched plate ${unknown.plate_detected} as Unknown User`
            : 'Queued as Unknown User (no plate) — link a vehicle in Unknown Vehicles',
        );
        navigate(unknownPath);
        return;
      }

      const violation = await violationsAPI.create({
        class_key: classKey.trim(),
        observed_action: observedAction.trim(),
        sign_code: result.sign_code || undefined,
        ai_detection_log_id: result.log_id != null ? String(result.log_id) : undefined,
        plate_number: plate || undefined,
        driver_id: matchedDriverId,
      });
      toast.success(t('aiCenter.violationSaved').replace('{id}', String(violation.id)));
      navigate(`${violationsBasePath}/violations`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/driver is required/i.test(message)) {
        toast.error(
          'No registered driver for this plate. Open Unknown Vehicles to link a vehicle, then create the violation.',
        );
      } else if (/no violation rule matched/i.test(message)) {
        toast.error(
          t('aiCenter.noViolationRule') !== 'aiCenter.noViolationRule'
            ? t('aiCenter.noViolationRule')
            : 'No violation rule matches this sign and observed action',
        );
      } else {
        toast.error(
          t('aiCenter.violationSaveFailed') || `Failed to save violation: ${message}`,
        );
      }
    } finally {
      setSavingViolation(false);
    }
  };

  const openObject = (row: DetectionObjectRow) => {
    setSelectedObject(row);
    setDrawerOpen(true);
    // Scroll the Detection Result image into view so View follows Detect.
    requestAnimationFrame(() => {
      document
        .querySelector('.enterprise-ai-results__image-card')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const plateOcrSuccess = Boolean(detectedPlate) && (result.plate_confidence ?? 0) > 0;
  const ocrConfidence = Number(result.plate_confidence ?? 0);
  const detectionTime = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  /** All unique traffic-sign labels from this scan (matches Detection Result boxes). */
  const signTitles = useMemo(() => {
    const mode = result.detection_mode;
    const reason = String(result.violation_evaluation?.reason || '');
    const hasSignClass = Boolean(String(result.class_key || result.sign_code || '').trim());
    const noTrafficSign =
      result.sign_present === false
      || mode === 'vehicle'
      || mode === 'plate'
      || mode === 'no_sign'
      || reason === 'no_sign_class'
      || (!hasSignClass && signCount === 0);
    if (noTrafficSign) return [] as string[];

    const fromObjects = objects
      .filter((o) => o.kind === 'sign')
      .map((o) => {
        let name = String(o.name || '').trim();
        if (name.includes('·')) name = name.split('·')[0].trim();
        // Strip trailing confidence like "Keep Right 0.98"
        name = name.replace(/\s+\d+(?:\.\d+)?\s*%?\s*$/, '').trim();
        return name;
      })
      .filter((name) => {
        if (!name) return false;
        return !/^(car|motorcycle|motorbike|bus|truck|tuk-?tuk|vehicle|bicycle|van|pickup|auto)$/i.test(name);
      });

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const name of fromObjects) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(name);
    }
    if (unique.length) return unique;

    // Fallback: primary sign only when overlay rows are missing.
    const fromClass = labelsForClassKey(result.class_key);
    let raw = (result.sign_name_en || result.sign_name || fromClass?.en || '').trim();
    if (raw.includes('·')) raw = raw.split('·')[0].trim();
    if (!raw || /^(car|motorcycle|motorbike|bus|truck|tuk-?tuk|vehicle|bicycle|van|pickup|auto)$/i.test(raw)) {
      return fromClass?.en ? [fromClass.en] : [];
    }
    if (fromClass?.en) {
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (
        norm(raw) === norm(result.class_key || '')
        || norm(raw) === norm(result.sign_code || '')
        || /^pw\d/i.test(raw)
        || /^r1[-\s]?\d/i.test(raw)
      ) {
        return [fromClass.en];
      }
    }
    return [raw];
  }, [objects, result, signCount]);
  const signTitleLabel = signTitles.length > 1
    ? t('aiCenter.summarySigns')
    : t('aiCenter.kpiTrafficSign');
  const vehicleLabel = pipelineVehicle?.label || result.pipeline_vehicle?.vehicle_label_en || '—';

  return (
    <div className="enterprise-ai-results enterprise-ai-results--clean">
      <header className="enterprise-ai-results__toolbar enterprise-ai-results__toolbar--clean">
        <div className="enterprise-ai-results__toolbar-lead">
          <p className="enterprise-ai-results__eyebrow">{sourceLabel || t('aiCenter.resultsEyebrow')}</p>
          <div className="enterprise-ai-results__title-row">
            <h2 className="enterprise-ai-results__title">{t('aiCenter.resultsTitle')}</h2>
            <span className={cn(
              'enterprise-ai-results__status-pill',
              hasViolation ? 'is-violation' : 'is-ok',
            )}>
              {hasViolation
                ? (result.violation_evaluation?.title || t('aiCenter.violationDetected'))
                : t('aiCenter.statusOk')}
            </span>
          </div>
          <p className="enterprise-ai-results__subtitle">
            {signCount} {t('aiCenter.summarySigns').toLowerCase()}
            {' · '}
            {vehicleCount} {t('aiCenter.summaryVehicles').toLowerCase()}
            {' · '}
            {accuracy.toFixed(0)}% {t('aiCenter.aiConfidence').toLowerCase()}
          </p>
        </div>
        <div className="enterprise-ai-results__toolbar-actions">
          <button type="button" className="enterprise-ai-results__toolbar-btn enterprise-ai-results__toolbar-btn--primary" onClick={onNewDetection}>
            <Plus size={15} />
            {t('aiCenter.newDetection')}
          </button>
          <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={handleSaveJson}>
            <Save size={15} />
            {t('aiCenter.saveResult')}
          </button>
          <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={handleExportPdf}>
            <Printer size={15} />
            {t('aiCenter.exportPdf')}
          </button>
          <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={downloadImage}>
            <Download size={15} />
            {t('aiCenter.downloadImage')}
          </button>
        </div>
      </header>

      <div className="enterprise-ai-results__hero-grid enterprise-ai-results__hero-grid--clean">
        <section className="enterprise-ai-results__image-card enterprise-ai-results__image-card--clean">
          <ResultSectionHead
            tone="image"
            icon={ImageIcon}
            title={t('aiCenter.detectionResult')}
            badge={`${accuracy.toFixed(0)}%`}
          />
          <div className="enterprise-ai-results__image-body">
            {displaySrc ? (
              <AnnotatedDetectionImage
                src={displaySrc}
                alt={t('aiCenter.detectionImage')}
                result={result as OverlayDetectionInput}
                hero
                showOverlay={showCssOverlay}
                filterKind={
                  drawerOpen && selectedObject
                    ? (selectedObject.kind === 'sign'
                      || selectedObject.kind === 'vehicle'
                      || selectedObject.kind === 'plate'
                      ? selectedObject.kind
                      : 'all')
                    : 'all'
                }
                highlightId={drawerOpen ? selectedObject?.id : undefined}
              />
            ) : (
              <div className="enterprise-ai-results__image-empty">{t('aiCenter.noImage')}</div>
            )}
          </div>
        </section>

        <aside className="enterprise-ai-results__summary-card enterprise-ai-results__summary-card--clean">
          <ResultSectionHead tone="summary" icon={Shield} title={t('aiCenter.aiSummary')} />
          <div className="enterprise-ai-results__facts">
            <div className="enterprise-ai-results__fact">
              <span className="enterprise-ai-results__fact-label">{signTitleLabel}</span>
              <strong className={cn(
                'enterprise-ai-results__fact-value',
                signTitles.length > 1 && 'enterprise-ai-results__fact-value--multi',
              )}>
                {signTitles.length === 0
                  ? t('aiCenter.noSign')
                  : signTitles.length === 1
                    ? signTitles[0]
                    : (
                      <span className="enterprise-ai-results__sign-list">
                        {signTitles.map((name) => (
                          <span key={name} className="enterprise-ai-results__sign-list-item">{name}</span>
                        ))}
                      </span>
                    )}
              </strong>
            </div>
            <div className="enterprise-ai-results__fact">
              <span className="enterprise-ai-results__fact-label">{t('aiCenter.vehicleType')}</span>
              <strong className="enterprise-ai-results__fact-value">{vehicleLabel}</strong>
            </div>
            <div className="enterprise-ai-results__fact">
              <span className="enterprise-ai-results__fact-label">{t('aiCenter.plateNumber')}</span>
              <strong className={cn('enterprise-ai-results__fact-value', detectedPlate && 'is-mono')}>
                {detectedPlate || '—'}
              </strong>
            </div>
            <div className="enterprise-ai-results__fact">
              <span className="enterprise-ai-results__fact-label">{t('aiCenter.plateProvince')}</span>
              <strong className="enterprise-ai-results__fact-value">{province || '—'}</strong>
            </div>
            <div className="enterprise-ai-results__fact">
              <span className="enterprise-ai-results__fact-label">{t('aiCenter.aiConfidence')}</span>
              <strong className="enterprise-ai-results__fact-value">{accuracy.toFixed(1)}%</strong>
              <div className="enterprise-ai-results__fact-meter" aria-hidden>
                <span style={{ width: `${Math.min(100, Math.max(0, accuracy))}%` }} />
              </div>
            </div>
            {ocrConfidence > 0 && (
              <div className="enterprise-ai-results__fact">
                <span className="enterprise-ai-results__fact-label">{t('aiCenter.ocrConfidence')}</span>
                <strong className="enterprise-ai-results__fact-value">
                  {plateOcrSuccess ? `${ocrConfidence.toFixed(1)}%` : '—'}
                </strong>
              </div>
            )}
            <div className="enterprise-ai-results__fact enterprise-ai-results__fact--meta">
              <span className="enterprise-ai-results__fact-label">{t('aiCenter.detectionTime')}</span>
              <strong className="enterprise-ai-results__fact-value">{detectionTime}</strong>
            </div>
          </div>

          <div className={cn('enterprise-ai-results__decision-mini', hasViolation && 'is-violation')}>
            <p className="enterprise-ai-results__decision-mini-label">{t('aiCenter.aiDecision')}</p>
            <p className="enterprise-ai-results__decision-mini-text">
              {hasViolation
                ? (result.violation_evaluation?.title
                  || result.violation_evaluation?.violation_type
                  || t('aiCenter.violationDetected'))
                : (result.violation_evaluation?.reason || t('aiCenter.noViolation'))}
            </p>
            <button
              type="button"
              className={cn(
                'enterprise-ai-btn',
                hasViolation || violationRecord ? 'enterprise-ai-btn--danger' : 'enterprise-ai-btn--secondary',
              )}
              onClick={handleCreateViolation}
              disabled={savingViolation || (!hasViolation && !violationRecord)}
            >
              <Shield size={15} />
              {savingViolation ? t('common.saving') : t('aiCenter.createViolation')}
            </button>
          </div>
        </aside>
      </div>

      <section className="enterprise-ai-results__table-card enterprise-ai-results__table-card--clean enforcement-page__panel">
        <ResultSectionHead
          tone="objects"
          icon={Eye}
          title={t('aiCenter.detectionObjects')}
          badge={String(objects.length)}
          end={(
            <div className="enterprise-ai-results__export-mini">
              <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={handleExportCsv}>
                <FileText size={14} />
                {t('aiCenter.exportCsv')}
              </button>
              <button type="button" className="enterprise-ai-results__toolbar-btn" onClick={handleExportExcel}>
                <FileSpreadsheet size={14} />
                {t('aiCenter.exportExcel')}
              </button>
            </div>
          )}
        />
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid enforcement-page__table--ai-objects">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                <TableHead className="enforcement-page__th text-left ai-objects-table__col--idx">#</TableHead>
                <TableHead className="enforcement-page__th text-left ai-objects-table__col--object">{t('aiCenter.colObject')}</TableHead>
                <TableHead className="enforcement-page__th text-left ai-objects-table__col--conf">{t('aiCenter.colConfidence')}</TableHead>
                <TableHead className="enforcement-page__th text-left ai-objects-table__col--cat">{t('aiCenter.colCategory')}</TableHead>
                <TableHead className="enforcement-page__th text-left ai-objects-table__col--status">{t('aiCenter.colStatus')}</TableHead>
                <TableHead className="enforcement-page__th text-right ai-objects-table__col--actions">{t('aiCenter.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {objects.length === 0 ? (
                <TableEmptyState
                  colSpan={6}
                  tone="violet"
                  icon={<Eye size={28} />}
                  title={t('aiCenter.noObjectsDetected')}
                />
              ) : (
                objectsPagination.pageItems.map((row, index) => {
                  const confColor =
                    row.confidence >= 90 ? '#0F766E' : row.confidence >= 75 ? '#A16207' : '#B91C1C';
                  const rowIndex = objectsPagination.from + index;
                  return (
                    <TableRow key={row.id} className="enforcement-page__table-row">
                      <TableCell className="py-3.5 ai-objects-table__col--idx">
                        <span className="enforcement-page__cell-secondary">{rowIndex}</span>
                      </TableCell>
                      <TableCell className="py-3.5 ai-objects-table__col--object">
                        <span className="enforcement-page__cell-primary">{row.name}</span>
                      </TableCell>
                      <TableCell className="py-3.5 ai-objects-table__col--conf">
                        {row.confidence > 0 ? (
                          <span
                            className="enforcement-page__badge"
                            style={{ background: `${confColor}14`, color: confColor }}
                          >
                            {row.confidence.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="enforcement-page__cell-secondary">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 ai-objects-table__col--cat">
                        <span className="enforcement-page__cell-secondary">{row.category}</span>
                      </TableCell>
                      <TableCell className="py-3.5 ai-objects-table__col--status">
                        <span className={cn(
                          'enterprise-ai-results__status-chip',
                          row.status === 'ocr_success' && 'is-ocr',
                          row.status === 'detected' && 'is-ok',
                          row.status === 'not_detected' && 'is-miss',
                        )}>
                          {statusLabel(row.status, t)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 ai-objects-table__col--actions">
                        <div className="enforcement-page__table-actions justify-end">
                          <button
                            type="button"
                            className="ai-center-history-table__action-btn ai-center-history-table__action-btn--view"
                            onClick={() => openObject(row)}
                            title={t('aiCenter.viewObject')}
                            aria-label={t('aiCenter.viewObject')}
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {objects.length > 0 ? (
          <TablePagination
            pagination={objectsPagination}
            labelKey="pagination.label.records"
          />
        ) : null}
      </section>

      <DetectionObjectDetailsDrawer
        object={selectedObject}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        imageSrc={displaySrc}
        cameraLabel={sourceLabel}
        plateNumber={detectedPlate || result.detected_plate}
        vehicleType={pipelineVehicle?.label || result.pipeline_vehicle?.vehicle_label_en}
      />
    </div>
  );
}
