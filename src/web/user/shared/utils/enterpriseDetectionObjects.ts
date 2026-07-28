import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';
import {
  buildDetectionOverlay,
  type NormalizedBbox,
  type OverlayBox,
  type OverlayDetectionInput,
} from '@shared/utils/detectionOverlay';
import { signDisplayNames } from '@shared/utils/signDisplayNames';
import { classKeyFromSignLabel, labelsForClassKey } from '@shared/utils/yoloSignLabels';

export interface DetectionObjectRow {
  id: string;
  name: string;
  confidence: number;
  status: 'detected' | 'ocr_success' | 'not_detected';
  category: string;
  kind: OverlayBox['kind'];
  bbox?: NormalizedBbox;
  snapshot?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  prohibitory: 'Prohibitory',
  warning: 'Warning',
  mandatory: 'Regulatory',
  informative: 'Informative',
  regulatory: 'Regulatory',
};

/** Infer category from class_key / label when multi-sign rows differ. */
function categoryForSign(classKey = '', label = '', fallback?: string): string {
  const key = classKey.toLowerCase();
  const lab = label.toLowerCase();
  if (
    key.includes('no_entry')
    || key.includes('no_parking')
    || key.includes('no_u_turn')
    || key.includes('no_left')
    || key.includes('no_right')
    || lab.includes('no entry')
    || lab.includes('no parking')
    || lab.includes('no u-turn')
  ) {
    return 'Prohibitory';
  }
  if (
    key.includes('keep_right')
    || key.includes('keep_left')
    || key.includes('mandatory')
    || lab.includes('keep right')
    || lab.includes('keep left')
  ) {
    return 'Regulatory';
  }
  if (key.includes('warning') || key.includes('bend') || key.includes('crossing') || key.includes('children')) {
    return 'Warning';
  }
  return CATEGORY_LABEL[fallback || ''] || 'Traffic Sign';
}

function kindCategory(
  kind: OverlayBox['kind'],
  result: CenterDetectionResult,
  classKey = '',
  label = '',
): string {
  if (kind === 'vehicle') return 'Vehicle';
  if (kind === 'plate') return 'License Plate';
  if (kind === 'violation') return 'Helmet Violation';
  if (kind === 'helmet') return 'Helmet';
  if (kind === 'sign') {
    const cat = (result as CenterDetectionResult & { category?: string }).category;
    return categoryForSign(classKey, label, cat);
  }
  const cat = (result as CenterDetectionResult & { category?: string }).category;
  return CATEGORY_LABEL[cat || ''] || 'Traffic Sign';
}

function objectStatus(kind: OverlayBox['kind'], confidence: number): DetectionObjectRow['status'] {
  if (kind === 'plate' && confidence > 0) return 'ocr_success';
  if (confidence > 0) return 'detected';
  return 'not_detected';
}

function signLabel(result: CenterDetectionResult, locale: 'en' | 'km'): string {
  const { km, en } = signDisplayNames(result as Parameters<typeof signDisplayNames>[0]);
  return locale === 'km' ? (km || en || 'Traffic Sign') : (en || km || 'Traffic Sign');
}

/** Turn "Traffic Sign keep-right" / KEEP_RIGHT / "No U Turn · NO U TURN" into a clean display name. */
function cleanObjectName(raw: string, classKey = '', locale: 'en' | 'km' = 'en'): string {
  let name = (raw || '').trim();
  if (/^traffic\s+sign\s+/i.test(name)) {
    name = name.replace(/^traffic\s+sign\s+/i, '').trim();
  }
  if (/^សញ្ញា(?:ព្រមាន|ហាមឃាត់|បញ្ជា|ផ្តល់ព័ត៌មាន)\s+/u.test(name)) {
    name = name.replace(/^សញ្ញា(?:ព្រមាន|ហាមឃាត់|បញ្ជា|ផ្តល់ព័ត៌មាន)\s+/u, '').trim();
  }
  // Strip duplicate "Human Name · CLASS_KEY" / "No U Turn · NO U TURN".
  if (name.includes('·')) {
    const [left, right] = name.split('·').map((p) => p.trim());
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (left && right && (norm(left) === norm(right) || norm(left).includes(norm(right)) || norm(right).includes(norm(left)))) {
      name = left;
    } else if (left) {
      name = left;
    }
  }

  const fromClass = labelsForClassKey(classKey) || labelsForClassKey(name);
  // Resolve keep-left/right from the box label itself so a wrong primary class_key
  // cannot rename "Keep Right" → "No Entry".
  const inferredKey = classKeyFromSignLabel(name);
  if (inferredKey && (/keep\s*right/i.test(name) || /keep\s*left/i.test(name))) {
    const inferred = labelsForClassKey(inferredKey);
    if (inferred) return locale === 'km' ? inferred.km : inferred.en;
  }
  if (fromClass) {
    const preferred = locale === 'km' ? fromClass.km : fromClass.en;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const slugOrCode = !name
      || /^sign$/i.test(name)
      || /^pw\d/i.test(name)
      || /^r1[-\s]?\d/i.test(name)
      || norm(name) === norm(classKey)
      || norm(name) === norm(fromClass.en);
    if (slugOrCode && preferred) return preferred;
  }
  if (fromClass && (!name || /^sign$/i.test(name))) {
    return locale === 'km' ? fromClass.km : fromClass.en;
  }
  name = name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  name = name.replace(/\bno\s*u\s*turn\b/gi, 'No U-Turn');
  if (name && name === name.toLowerCase()) {
    name = name.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if ((!name || /^sign$/i.test(name)) && classKey) {
    if (fromClass?.en) return locale === 'km' ? fromClass.km : fromClass.en;
    name = classKey.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    name = name.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name || 'Sign';
}

function classKeyForBox(
  box: OverlayBox,
  result: CenterDetectionResult,
): string {
  if (box.kind !== 'sign') return '';
  const detections = result.sign_detections || [];
  // Match by id index: sign-0, sign-1, …
  const m = /^sign-(\d+)$/.exec(box.id);
  if (m) {
    const idx = Number(m[1]);
    const det = detections[idx];
    if (det?.class_key) return det.class_key;
  }
  const byLabel = detections.find((d) => {
    const lab = (d.label || d.class_key || '').toLowerCase();
    return lab && box.label.toLowerCase().includes(lab.replace(/_/g, ' '));
  });
  if (byLabel?.class_key) return byLabel.class_key;
  // Infer from this box's own label — never inherit the primary result.class_key
  // (that collapses "Keep Right" into "No Entry" when both appear in one frame).
  const fromLabel = classKeyFromSignLabel(box.label);
  if (fromLabel) return fromLabel;
  return '';
}

export function buildDetectionObjectRows(
  result: CenterDetectionResult | null,
  locale: 'en' | 'km' = 'en',
): DetectionObjectRow[] {
  if (!result) return [];

  const overlays = buildDetectionOverlay(result as OverlayDetectionInput, locale);
  const rows: DetectionObjectRow[] = overlays.map((box) => {
    const classKey = classKeyForBox(box, result);
    // Use EACH box's own label — never force the primary sign name onto every row.
    const rawName = box.kind === 'sign'
      ? (box.label || signLabel(result, locale))
      : box.label;
    const name = box.kind === 'sign' ? cleanObjectName(rawName, classKey, locale) : rawName;

    return {
      id: box.id,
      name,
      confidence: box.confidence,
      status: objectStatus(box.kind, box.confidence),
      category: kindCategory(box.kind, result, classKey, name),
      kind: box.kind,
      bbox: box.bbox,
      snapshot:
        box.kind === 'vehicle'
          ? result.vehicle_snapshot
          : box.kind === 'plate'
            ? result.plate_snapshot
            : undefined,
    };
  });

  if (rows.length === 0 && result.sign_code) {
    rows.push({
      id: 'sign-fallback',
      name: cleanObjectName(signLabel(result, locale), result.class_key || '', locale),
      confidence: Number(result.display_confidence ?? result.confidence ?? 0),
      status: 'detected',
      category: kindCategory('sign', result, result.class_key || '', ''),
      kind: 'sign',
      bbox: result.sign_bbox,
    });
  }

  return rows;
}

export function bboxToPixels(
  bbox: NormalizedBbox | undefined,
  width = 640,
  height = 480,
): { x: number; y: number; width: number; height: number } | null {
  if (!bbox) return null;
  const x = Math.round(bbox.x1 * width);
  const y = Math.round(bbox.y1 * height);
  const w = Math.round((bbox.x2 - bbox.x1) * width);
  const h = Math.round((bbox.y2 - bbox.y1) * height);
  return { x, y, width: w, height: h };
}
