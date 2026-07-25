import type { VehicleDetectionItem } from '@shared/hooks/useWebcamDetection';

export interface NormalizedBbox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface OverlayBox {
  id: string;
  kind: 'sign' | 'vehicle' | 'plate';
  label: string;
  confidence: number;
  bbox: NormalizedBbox;
  color: string;
}

export interface OverlayDetectionInput {
  sign_name?: string;
  sign_name_en?: string;
  sign_name_km?: string;
  sign_code?: string;
  confidence?: number;
  sign_bbox?: NormalizedBbox;
  vehicles?: VehicleDetectionItem[];
  detected_plate?: string;
  plate_confidence?: number;
  plate_bbox?: NormalizedBbox;
  plate_boxes?: Array<{ bbox: NormalizedBbox; confidence?: number }>;
  plate_ocr_details?: Array<{ text?: string; confidence?: number; is_province_line?: boolean }>;
  detection_mode?: 'sign' | 'vehicle' | 'plate' | 'no_sign';
  display_title_en?: string;
  display_title_km?: string;
  display_confidence?: number;
}

const SIGN_COLOR = '#8B5CF6';
const VEHICLE_COLOR = '#22D3EE';
const PLATE_COLOR = '#F59E0B';

/** Skip tiny / sliver boxes that look unprofessional. */
const MIN_BOX_AREA = 0.004;
const MIN_BOX_SIDE = 0.03;
const MIN_VEHICLE_CONF = 28;
const MAX_VEHICLES = 8;
const NMS_IOU = 0.45;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

/**
 * YOLO/OCR often returns a tight text box on stop/prohibitory signs.
 * Expand to a near-square face around the geometric center so the overlay
 * and center marker represent the sign body, not just the glyph.
 */
export function expandSignBboxToFace(bbox: NormalizedBbox): NormalizedBbox {
  const w = Math.max(0, bbox.x2 - bbox.x1);
  const h = Math.max(0, bbox.y2 - bbox.y1);
  if (w <= 0 || h <= 0) return bbox;

  const cx = (bbox.x1 + bbox.x2) / 2;
  const cy = (bbox.y1 + bbox.y2) / 2;
  const ratio = w / h;

  // Already a healthy square/circle-like face — light pad only.
  let side = Math.max(w, h);
  if (ratio >= 0.72 && ratio <= 1.35 && boxArea(bbox) >= 0.02) {
    side *= 1.12;
  } else {
    // Text-tight / elongated → grow into a square around the center.
    side = Math.max(w, h) * 1.65;
    // Keep very small detections from exploding to full-frame.
    side = Math.min(side, Math.max(w, h) * 2.4, 0.92);
  }

  const half = side / 2;
  let x1 = cx - half;
  let y1 = cy - half;
  let x2 = cx + half;
  let y2 = cy + half;

  // Keep centered if we hit image edges.
  if (x1 < 0) {
    x2 = Math.min(1, x2 - x1);
    x1 = 0;
  }
  if (y1 < 0) {
    y2 = Math.min(1, y2 - y1);
    y1 = 0;
  }
  if (x2 > 1) {
    x1 = Math.max(0, x1 - (x2 - 1));
    x2 = 1;
  }
  if (y2 > 1) {
    y1 = Math.max(0, y1 - (y2 - 1));
    y2 = 1;
  }

  return {
    x1: clamp01(x1),
    y1: clamp01(y1),
    x2: clamp01(x2),
    y2: clamp01(y2),
  };
}

function boxArea(bbox: NormalizedBbox): number {
  return Math.max(0, bbox.x2 - bbox.x1) * Math.max(0, bbox.y2 - bbox.y1);
}

function validBbox(bbox?: NormalizedBbox | null, kind: OverlayBox['kind'] = 'vehicle'): bbox is NormalizedBbox {
  if (!bbox) return false;
  const { x1, y1, x2, y2 } = bbox;
  if (!(x2 > x1 && y2 > y1 && x1 >= -0.02 && y1 >= -0.02 && x2 <= 1.05 && y2 <= 1.05)) {
    return false;
  }
  const w = x2 - x1;
  const h = y2 - y1;
  const minSide = kind === 'plate' ? 0.012 : MIN_BOX_SIDE;
  const minArea = kind === 'plate' ? 0.0008 : MIN_BOX_AREA;
  if (w < minSide || h < minSide) return false;
  if (boxArea(bbox) < minArea) return false;
  // Reject extreme aspect ratios (thin vertical/horizontal slivers).
  const ratio = w / h;
  const maxRatio = kind === 'plate' ? 12 : 8;
  const minRatio = kind === 'plate' ? 0.08 : 0.12;
  if (ratio > maxRatio || ratio < minRatio) return false;
  return true;
}

function iou(a: NormalizedBbox, b: NormalizedBbox): number {
  const ix1 = Math.max(a.x1, b.x1);
  const iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2);
  const iy2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  if (inter <= 0) return 0;
  const union = boxArea(a) + boxArea(b) - inter;
  return union > 0 ? inter / union : 0;
}

function nmsVehicles(vehicles: VehicleDetectionItem[]): VehicleDetectionItem[] {
  const ranked = [...vehicles]
    .filter((v) => validBbox(v.bbox) && Number(v.confidence ?? 0) >= MIN_VEHICLE_CONF)
    .sort((a, b) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0));

  const kept: VehicleDetectionItem[] = [];
  for (const candidate of ranked) {
    if (kept.some((k) => iou(k.bbox, candidate.bbox) >= NMS_IOU)) continue;
    kept.push(candidate);
    if (kept.length >= MAX_VEHICLES) break;
  }
  return kept;
}

function isDegenerateVehicleBox(bbox: NormalizedBbox): boolean {
  const w = bbox.x2 - bbox.x1;
  const h = bbox.y2 - bbox.y1;
  const area = w * h;
  if (area < 0.04) return true;
  if (w < 0.12 || h < 0.15) return true;
  const ratio = h > 0 ? w / h : 99;
  // Tall thin side strip (taillight fragment).
  return ratio < 0.45 && area < 0.18;
}

function bboxContains(outer: NormalizedBbox, inner: NormalizedBbox, pad = 0.06): boolean {
  return (
    outer.x1 - pad <= inner.x1
    && outer.y1 - pad <= inner.y1
    && outer.x2 + pad >= inner.x2
    && outer.y2 + pad >= inner.y2
  );
}

/** When YOLO only hits a taillight, expand a rear-car box around the plate. */
export function vehicleBoxFromPlate(plate: NormalizedBbox): NormalizedBbox {
  const pw = Math.max(plate.x2 - plate.x1, 0.02);
  const ph = Math.max(plate.y2 - plate.y1, 0.01);
  let x1 = Math.max(0, plate.x1 - pw * 1.8);
  let x2 = Math.min(1, plate.x2 + pw * 1.8);
  let y2 = Math.min(1, plate.y2 + ph * 2.2);
  let y1 = Math.max(0, plate.y1 - ph * 8.5);
  if (x2 - x1 < 0.35) {
    const cx = (x1 + x2) / 2;
    x1 = Math.max(0, cx - 0.28);
    x2 = Math.min(1, cx + 0.28);
  }
  if (y2 - y1 < 0.35) {
    y1 = Math.max(0, y2 - 0.55);
  }
  return { x1: clamp01(x1), y1: clamp01(y1), x2: clamp01(x2), y2: clamp01(y2) };
}

function primaryPlateBbox(result: OverlayDetectionInput): NormalizedBbox | null {
  const fromBoxes = (result.plate_boxes ?? []).find((p) => validBbox(p.bbox, 'plate'));
  if (fromBoxes?.bbox) return fromBoxes.bbox;
  if (validBbox(result.plate_bbox, 'plate')) return result.plate_bbox;
  return null;
}

function refineOverlayVehicles(
  vehicles: VehicleDetectionItem[],
  plateBbox: NormalizedBbox | null,
): VehicleDetectionItem[] {
  const ranked = nmsVehicles(vehicles).filter((v) => !isDegenerateVehicleBox(v.bbox));
  const fallback = nmsVehicles(vehicles);
  const base = ranked.length ? ranked : fallback;

  if (!plateBbox) return base;

  const covered = base.some((v) => bboxContains(v.bbox, plateBbox));
  const primaryBad = !base.length || isDegenerateVehicleBox(base[0].bbox);
  if (covered && !primaryBad) return base;

  const synth: VehicleDetectionItem = {
    vehicle_type: base[0]?.vehicle_type || 'car',
    label: base[0]?.label || 'Car',
    confidence: Math.max(Number(base[0]?.confidence ?? 0), 55),
    bbox: vehicleBoxFromPlate(plateBbox),
  };
  return [synth, ...base.filter((v) => !isDegenerateVehicleBox(v.bbox))].slice(0, MAX_VEHICLES);
}

function plateZoneFromVehicle(vehicle: VehicleDetectionItem): NormalizedBbox | null {
  const bbox = vehicle.bbox;
  if (!validBbox(bbox)) return null;
  const h = bbox.y2 - bbox.y1;
  return {
    x1: clamp01(bbox.x1 + (bbox.x2 - bbox.x1) * 0.15),
    y1: clamp01(bbox.y1 + h * 0.58),
    x2: clamp01(bbox.x2 - (bbox.x2 - bbox.x1) * 0.15),
    y2: clamp01(bbox.y2 - h * 0.06),
  };
}

function cleanSignLabel(name: string, code: string): string {
  const n = name.trim();
  const c = code.trim();
  if (!c) return n || 'Sign';
  if (!n) return c;
  if (n.toLowerCase() === c.toLowerCase()) return n;
  if (n.toLowerCase().includes(c.toLowerCase())) return n;
  return `${n} · ${c}`;
}

export function buildDetectionOverlay(
  result: OverlayDetectionInput | null | undefined,
  locale: 'en' | 'km' = 'en',
): OverlayBox[] {
  if (!result) return [];
  const items: OverlayBox[] = [];

  const signName = locale === 'km'
    ? (result.sign_name_km || result.sign_name || result.sign_name_en || 'Sign')
    : (result.sign_name_en || result.sign_name || result.sign_name_km || 'Sign');
  const signCode = (result.sign_code || '').trim();
  const signLabel = cleanSignLabel(signName, signCode);
  const signConfidence = Number(result.display_confidence ?? result.confidence ?? 0);
  const mode = result.detection_mode;

  // Only draw a sign box when we have a real localized bbox — never invent a full-frame box.
  if (
    validBbox(result.sign_bbox)
    && signConfidence > 0
    && mode !== 'no_sign'
    && mode !== 'vehicle'
  ) {
    const face = expandSignBboxToFace({
      x1: clamp01(result.sign_bbox.x1),
      y1: clamp01(result.sign_bbox.y1),
      x2: clamp01(result.sign_bbox.x2),
      y2: clamp01(result.sign_bbox.y2),
    });
    items.push({
      id: 'sign',
      kind: 'sign',
      label: signLabel,
      confidence: signConfidence,
      bbox: face,
      color: SIGN_COLOR,
    });
  }

  const plateBbox = primaryPlateBbox(result);
  refineOverlayVehicles(result.vehicles ?? [], plateBbox).forEach((vehicle, index) => {
    const trackLabel = vehicle.track_id != null ? ` #${vehicle.track_id}` : '';
    items.push({
      id: vehicle.track_id != null ? `vehicle-${vehicle.track_id}` : `vehicle-${index}`,
      kind: 'vehicle',
      label: `${vehicle.label || vehicle.vehicle_type || 'Vehicle'}${trackLabel}`,
      confidence: Number(vehicle.confidence ?? 0),
      bbox: {
        x1: clamp01(vehicle.bbox.x1),
        y1: clamp01(vehicle.bbox.y1),
        x2: clamp01(vehicle.bbox.x2),
        y2: clamp01(vehicle.bbox.y2),
      },
      color: VEHICLE_COLOR,
    });
  });

  const plateText = (
    result.detected_plate
    || [...(result.plate_ocr_details ?? [])]
      .filter((r) => r?.text && !r.is_province_line)
      .sort((a, b) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0))[0]?.text
    || ''
  ).trim();
  const plateBoxes = (result.plate_boxes ?? [])
    .filter((p) => validBbox(p.bbox, 'plate'))
    .slice(0, 4);
  if (plateBoxes.length > 0) {
    plateBoxes.forEach((pb, index) => {
      items.push({
        id: `plate-${index}`,
        kind: 'plate',
        label: plateText || 'Plate',
        confidence: Number(pb.confidence ?? result.plate_confidence ?? 0),
        bbox: {
          x1: clamp01(pb.bbox.x1),
          y1: clamp01(pb.bbox.y1),
          x2: clamp01(pb.bbox.x2),
          y2: clamp01(pb.bbox.y2),
        },
        color: PLATE_COLOR,
      });
    });
  } else if (validBbox(result.plate_bbox, 'plate')) {
    items.push({
      id: 'plate',
      kind: 'plate',
      label: plateText || 'Plate',
      confidence: Number(result.plate_confidence ?? 0),
      bbox: {
        x1: clamp01(result.plate_bbox.x1),
        y1: clamp01(result.plate_bbox.y1),
        x2: clamp01(result.plate_bbox.x2),
        y2: clamp01(result.plate_bbox.y2),
      },
      color: PLATE_COLOR,
    });
  } else if (plateText) {
    // Fallback: inferred plate zone on primary vehicle (legacy)
    const hostVehicle = nmsVehicles(result.vehicles ?? [])[0] ?? result.vehicles?.[0];
    const plateBbox = hostVehicle ? plateZoneFromVehicle(hostVehicle) : null;
    if (plateBbox) {
      items.push({
        id: 'plate',
        kind: 'plate',
        label: plateText,
        confidence: Number(result.plate_confidence ?? 0),
        bbox: plateBbox,
        color: PLATE_COLOR,
      });
    }
  }

  return items;
}
