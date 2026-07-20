import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';
import {
  buildDetectionOverlay,
  type NormalizedBbox,
  type OverlayBox,
  type OverlayDetectionInput,
} from '@shared/utils/detectionOverlay';
import { signDisplayNames } from '@shared/utils/signDisplayNames';

export interface DetectionObjectRow {
  id: string;
  name: string;
  confidence: number;
  status: 'detected' | 'ocr_success' | 'not_detected';
  category: string;
  kind: 'sign' | 'vehicle' | 'plate';
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

function kindCategory(kind: OverlayBox['kind'], result: CenterDetectionResult): string {
  if (kind === 'vehicle') return 'Vehicle';
  if (kind === 'plate') return 'License Plate';
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

export function buildDetectionObjectRows(
  result: CenterDetectionResult | null,
  locale: 'en' | 'km' = 'en',
): DetectionObjectRow[] {
  if (!result) return [];

  const overlays = buildDetectionOverlay(result as OverlayDetectionInput, locale);
  const rows: DetectionObjectRow[] = overlays.map((box) => ({
    id: box.id,
    name: box.kind === 'sign' ? signLabel(result, locale) : box.label,
    confidence: box.confidence,
    status: objectStatus(box.kind, box.confidence),
    category: kindCategory(box.kind, result),
    kind: box.kind,
    bbox: box.bbox,
    snapshot:
      box.kind === 'vehicle'
        ? result.vehicle_snapshot
        : box.kind === 'plate'
          ? result.plate_snapshot
          : undefined,
  }));

  if (rows.length === 0 && result.sign_code) {
    rows.push({
      id: 'sign-fallback',
      name: signLabel(result, locale),
      confidence: Number(result.display_confidence ?? result.confidence ?? 0),
      status: 'detected',
      category: kindCategory('sign', result),
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
