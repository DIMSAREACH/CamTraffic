import type { VehicleDetectionItem } from '@shared/hooks/useWebcamDetection';
import { labelsForClassKey } from '@shared/utils/yoloSignLabels';

export interface NormalizedBbox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface OverlayBox {
  id: string;
  kind: 'sign' | 'vehicle' | 'plate' | 'helmet' | 'violation';
  label: string;
  confidence: number;
  bbox: NormalizedBbox;
  color: string;
}

export interface HelmetOverlayItem {
  class_key?: string;
  label?: string;
  confidence?: number;
  bbox?: NormalizedBbox;
  is_violation?: boolean;
}

export interface OverlayDetectionInput {
  class_key?: string;
  sign_name?: string;
  sign_name_en?: string;
  sign_name_km?: string;
  sign_code?: string;
  confidence?: number;
  sign_bbox?: NormalizedBbox;
  /** Multi-sign detections from YOLO (No Entry + Keep Right, etc.). */
  sign_detections?: Array<{
    class_key?: string;
    label?: string;
    confidence?: number;
    sign_bbox?: NormalizedBbox;
    bbox?: NormalizedBbox;
  }>;
  vehicles?: VehicleDetectionItem[];
  detected_plate?: string;
  plate_confidence?: number;
  plate_bbox?: NormalizedBbox;
  plate_boxes?: Array<{ bbox: NormalizedBbox; confidence?: number }>;
  plate_ocr_details?: Array<{ text?: string; confidence?: number; is_province_line?: boolean }>;
  helmets?: HelmetOverlayItem[];
  detection_mode?: 'sign' | 'vehicle' | 'plate' | 'no_sign';
  /** Verified thesis sample overlays — keep exact bboxes (no face expansion). */
  manual_gt?: boolean;
  display_title_en?: string;
  display_title_km?: string;
  display_confidence?: number;
}

// YOLO-style green for all detection types
const SIGN_COLOR = '#00FF00';
const VEHICLE_COLOR = '#00FF00';
const PLATE_COLOR = '#00FF00';
// Helmet compliance: green when worn, red when the rider is unhelmeted.
export const HELMET_OK_COLOR = '#00FF00';
export const NO_HELMET_COLOR = '#FF2D2D';

/** Skip tiny / sliver boxes that look unprofessional. */
const MIN_BOX_AREA = 0.0012;
const MIN_BOX_SIDE = 0.015;
const MIN_VEHICLE_CONF = 18;
const MAX_VEHICLES = 12;
const NMS_IOU = 0.45;
/**
 * Plate YOLO on moto rears often scores 20–45%. Close-up bikes make a real plate
 * >2.8% of the frame — keep those, still reject bumper-sized false boxes.
 */
const MIN_PLATE_CONF = 22;
const MAX_PLATE_AREA = 0.09;
const MAX_PLATE_AREA_WITH_TEXT = 0.14;

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
  // Rider heads are small near-square boxes; plates are small wide strips.
  const isHead = kind === 'helmet' || kind === 'violation';
  const minSide = kind === 'plate' ? 0.012 : isHead ? 0.008 : MIN_BOX_SIDE;
  const minArea = kind === 'plate' ? 0.0008 : isHead ? 0.0004 : MIN_BOX_AREA;
  if (w < minSide || h < minSide) return false;
  if (boxArea(bbox) < minArea) return false;
  // Reject extreme aspect ratios (thin vertical/horizontal slivers).
  const ratio = w / h;
  const maxRatio = kind === 'plate' ? 12 : isHead ? 3 : 8;
  const minRatio = kind === 'plate' ? 0.08 : isHead ? 0.33 : 0.12;
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
  // Only drop tiny noise / edge fragments — keep motorcycles & distant vehicles.
  if (area < 0.001) return true;
  if (w < 0.012 || h < 0.012) return true;
  const ratio = h > 0 ? w / h : 99;
  // Tall thin side strip (taillight fragment).
  return ratio < 0.35 && area < 0.02;
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

function plateConf01(value: number | undefined | null): number {
  const n = Number(value ?? 0);
  return n > 0 && n <= 1.5 ? n * 100 : n;
}

function isReliablePlateBox(
  bbox: NormalizedBbox | undefined | null,
  confidence?: number | null,
  opts?: { hasText?: boolean },
): boolean {
  if (!bbox || !validBbox(bbox, 'plate')) return false;
  const hasText = Boolean(opts?.hasText);
  const conf = plateConf01(confidence);
  // OCR-confirmed plates: draw even if YOLO/OCR conf is weak or missing.
  if (!hasText && conf < MIN_PLATE_CONF) return false;
  if (hasText && conf > 0 && conf < 8) return false;
  const area = Math.max(0, bbox.x2 - bbox.x1) * Math.max(0, bbox.y2 - bbox.y1);
  const maxArea = hasText ? MAX_PLATE_AREA_WITH_TEXT : MAX_PLATE_AREA;
  if (area > maxArea) return false;
  return true;
}

function isMotorcycle(vehicle?: VehicleDetectionItem | null): boolean {
  const type = String(vehicle?.vehicle_type || vehicle?.label || '').toLowerCase();
  return /motor|bike|scooter|moped/.test(type);
}

function primaryPlateBbox(result: OverlayDetectionInput): NormalizedBbox | null {
  const hasText = Boolean(String(result.detected_plate || '').trim());
  const fromBoxes = (result.plate_boxes ?? []).find((p) =>
    isReliablePlateBox(p.bbox, p.confidence ?? result.plate_confidence, { hasText }),
  );
  if (fromBoxes?.bbox) return fromBoxes.bbox;
  if (isReliablePlateBox(result.plate_bbox, result.plate_confidence, { hasText })) {
    return result.plate_bbox!;
  }
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
  const w = bbox.x2 - bbox.x1;
  const h = bbox.y2 - bbox.y1;
  // Cambodia moto plates sit mid-rear (not full bumper band).
  if (isMotorcycle(vehicle)) {
    return {
      x1: clamp01(bbox.x1 + w * 0.28),
      y1: clamp01(bbox.y1 + h * 0.48),
      x2: clamp01(bbox.x1 + w * 0.72),
      y2: clamp01(bbox.y1 + h * 0.72),
    };
  }
  return {
    x1: clamp01(bbox.x1 + w * 0.18),
    y1: clamp01(bbox.y1 + h * 0.62),
    x2: clamp01(bbox.x2 - w * 0.18),
    y2: clamp01(bbox.y2 - h * 0.05),
  };
}

function cleanSignLabel(name: string, code: string): string {
  let n = name.trim();
  if (/^traffic\s+sign\s+/i.test(n)) {
    n = n.replace(/^traffic\s+sign\s+/i, '').trim();
  }
  n = n.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (n && n === n.toLowerCase()) {
    n = n.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // Prefer hyphenated U-Turn spelling for display.
  n = n.replace(/\bno\s*u\s*turn\b/gi, 'No U-Turn');

  const c = code.trim();
  if (!c) return n || 'Sign';
  if (!n) {
    // Don't surface raw class keys / slug codes as the only label.
    const fromKey = labelsForClassKey(c);
    if (fromKey?.en) return fromKey.en;
    return c.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Sign';
  }

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const nn = norm(n);
  const cn = norm(c);
  // "No U Turn" vs "NO_U_TURN" / "NO-U-TURN" / "NO U TURN" → keep human name only.
  if (nn === cn || nn.includes(cn) || cn.includes(nn)) return n;
  // Official road codes (R1-03, PW03-R1-03) may still be shown with the name.
  if (/^[A-Z]{1,4}\d/i.test(c) || /^PW\d/i.test(c) || /^PROH-/i.test(c) || /^I-\d/i.test(c)) {
    return `${n} · ${c.toUpperCase()}`;
  }
  return n;
}

function cleanVehicleLabel(raw: string, vehicleType = ''): string {
  const map: Record<string, string> = {
    car: 'Car',
    motorcycle: 'Motorcycle',
    motorbike: 'Motorcycle',
    moto: 'Motorcycle',
    bus: 'Bus',
    truck: 'Truck',
    tuk_tuk: 'Tuk Tuk',
    'tuk-tuk': 'Tuk Tuk',
    tuktuk: 'Tuk Tuk',
    bicycle: 'Bicycle',
    van: 'Van',
    pickup: 'Pickup',
    vehicle: 'Vehicle',
  };
  const fromType = map[(vehicleType || '').toLowerCase().replace(/[\s-]+/g, '_')];
  if (fromType) return fromType;
  const fromRaw = map[(raw || '').toLowerCase().replace(/[\s-]+/g, '_')];
  if (fromRaw) return fromRaw;
  let n = (raw || vehicleType || 'Vehicle').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (n && n === n.toLowerCase()) {
    n = n.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return n || 'Vehicle';
}

function cleanObjectLabel(raw: string, classKey = ''): string {
  let n = (raw || '').trim();
  if (/^traffic\s+sign\s+/i.test(n)) {
    n = n.replace(/^traffic\s+sign\s+/i, '').trim();
  }
  // Drop duplicated "Name · NAME" / "Name · NO_U_TURN" tails.
  if (n.includes('·')) {
    const [left, right] = n.split('·').map((p) => p.trim());
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (left && right && (norm(left) === norm(right) || norm(left).includes(norm(right)) || norm(right).includes(norm(left)))) {
      n = left;
    } else if (left) {
      n = left;
    }
  }
  const fromClass = labelsForClassKey(classKey) || labelsForClassKey(n);
  if (fromClass?.en) {
    // Prefer catalog English when raw looks like a slug / duplicate class key.
    const slugLike = !n || /^[a-z0-9_\-\s]+$/i.test(n) && /_/.test(n.replace(/\s/g, '_'));
    const sameAsKey = normTokens(n) === normTokens(classKey) || normTokens(n) === normTokens(fromClass.en);
    if (slugLike || sameAsKey || /^sign$/i.test(n) || /^pw\d/i.test(n) || /^r1[-\s]?\d/i.test(n)) {
      return fromClass.en;
    }
  }
  n = n.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  n = n.replace(/\bno\s*u\s*turn\b/gi, 'No U-Turn');
  if (n && n === n.toLowerCase()) {
    n = n.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return n || fromClass?.en || 'Sign';
}

function normTokens(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function buildDetectionOverlay(
  result: OverlayDetectionInput | null | undefined,
  locale: 'en' | 'km' = 'en',
): OverlayBox[] {
  if (!result) return [];
  const items: OverlayBox[] = [];

  const fromClass = labelsForClassKey(result.class_key);
  const signNameRaw = locale === 'km'
    ? (result.sign_name_km || result.sign_name || result.sign_name_en || fromClass?.km || 'Sign')
    : (result.sign_name_en || result.sign_name || result.sign_name_km || fromClass?.en || 'Sign');
  // Prefer catalog label when API returns a slug / code-like name (e.g. "pw03 r1 03", "NO_U_TURN").
  const signNameLooksLikeCode = /^(pw\d|r1|proh|i-\d|no[_ ]?[a-z]+)/i.test(signNameRaw.trim())
    || normTokens(signNameRaw) === normTokens(result.class_key || '')
    || normTokens(signNameRaw) === normTokens(result.sign_code || '');
  const signName = (signNameLooksLikeCode && fromClass)
    ? (locale === 'km' ? fromClass.km : fromClass.en)
    : signNameRaw;
  const signCode = (result.sign_code || fromClass?.code || '').trim();
  const signLabel = cleanSignLabel(signName, signCode);
  const signConfidence = Number(result.display_confidence ?? result.confidence ?? 0);
  const mode = result.detection_mode;

  const signColorFor = (classKey = '', label = '') => {
    const key = classKey.toUpperCase();
    const lab = label.toLowerCase();
    if (key.includes('NO_ENTRY') || lab.includes('no entry')) return '#FF2D2D';
    if (key.includes('KEEP_RIGHT') || lab.includes('keep right')) return '#2563EB';
    if (key.includes('HEIGHT') || lab.includes('height limit')) return '#DC2626';
    return SIGN_COLOR;
  };

  const useExactBoxes = Boolean(result.manual_gt);

  // Prefer multi-sign detections when the backend returns them.
  // NMS: YOLO + catalog often emit two overlapping No Entry boxes.
  const multiSignsRaw = (result.sign_detections ?? []).filter((d) => {
    const bb = d.sign_bbox || d.bbox;
    return validBbox(bb) && Number(d.confidence ?? 0) > 0;
  });
  const multiSigns = (() => {
    const ranked = [...multiSignsRaw].sort(
      (a, b) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0),
    );
    const kept: typeof multiSignsRaw = [];
    for (const candidate of ranked) {
      const bb = (candidate.sign_bbox || candidate.bbox)!;
      if (kept.some((k) => {
        const kb = (k.sign_bbox || k.bbox)!;
        return iou(kb, bb) >= NMS_IOU;
      })) continue;
      kept.push(candidate);
      if (kept.length >= 6) break;
    }
    return kept;
  })();
  if (multiSigns.length > 0 && mode !== 'no_sign' && mode !== 'vehicle') {
    multiSigns.forEach((det, index) => {
      const bb = (det.sign_bbox || det.bbox)!;
      const raw = {
        x1: clamp01(bb.x1),
        y1: clamp01(bb.y1),
        x2: clamp01(bb.x2),
        y2: clamp01(bb.y2),
      };
      const face = useExactBoxes ? raw : expandSignBboxToFace(raw);
      const fromDet = labelsForClassKey(det.class_key);
      const detCode = (fromDet?.code || '').trim();
      const detName = locale === 'km'
        ? (fromDet?.km || det.label || det.class_key || 'Sign')
        : (fromDet?.en || det.label || det.class_key || 'Sign');
      const label = cleanSignLabel(
        String(detName).replace(/_/g, ' '),
        detCode,
      );
      items.push({
        id: `sign-${index}`,
        kind: 'sign',
        label,
        confidence: Number(det.confidence ?? 0),
        bbox: face,
        color: signColorFor(det.class_key, label),
      });
    });
  } else if (
    validBbox(result.sign_bbox)
    && signConfidence > 0
    && mode !== 'no_sign'
    && mode !== 'vehicle'
  ) {
    const raw = {
      x1: clamp01(result.sign_bbox.x1),
      y1: clamp01(result.sign_bbox.y1),
      x2: clamp01(result.sign_bbox.x2),
      y2: clamp01(result.sign_bbox.y2),
    };
    const face = useExactBoxes ? raw : expandSignBboxToFace(raw);
    items.push({
      id: 'sign',
      kind: 'sign',
      label: signLabel,
      confidence: signConfidence,
      bbox: face,
      color: signColorFor(result.sign_code || '', signLabel),
    });
  }

  const plateBbox = primaryPlateBbox(result);
  refineOverlayVehicles(result.vehicles ?? [], plateBbox).forEach((vehicle, index) => {
    const trackLabel = vehicle.track_id != null ? ` #${vehicle.track_id}` : '';
    items.push({
      id: vehicle.track_id != null ? `vehicle-${vehicle.track_id}` : `vehicle-${index}`,
      kind: 'vehicle',
      label: `${cleanVehicleLabel(vehicle.label || '', vehicle.vehicle_type)}${trackLabel}`,
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
  const hasPlateText = Boolean(plateText);
  // Prefer YOLO / API plate boxes; loosen gates when OCR already read the number.
  const plateBoxes = (result.plate_boxes ?? [])
    .filter((p) =>
      isReliablePlateBox(p.bbox, p.confidence ?? result.plate_confidence, { hasText: hasPlateText }),
    )
    .slice(0, 4);
  if (plateBoxes.length > 0) {
    plateBoxes.forEach((pb, index) => {
      items.push({
        id: `plate-${index}`,
        kind: 'plate',
        label: plateText || 'Plate',
        confidence: plateConf01(pb.confidence ?? result.plate_confidence),
        bbox: {
          x1: clamp01(pb.bbox.x1),
          y1: clamp01(pb.bbox.y1),
          x2: clamp01(pb.bbox.x2),
          y2: clamp01(pb.bbox.y2),
        },
        color: PLATE_COLOR,
      });
    });
  } else if (isReliablePlateBox(result.plate_bbox, result.plate_confidence, { hasText: hasPlateText })) {
    items.push({
      id: 'plate',
      kind: 'plate',
      label: plateText || 'Plate',
      confidence: plateConf01(result.plate_confidence),
      bbox: {
        x1: clamp01(result.plate_bbox!.x1),
        y1: clamp01(result.plate_bbox!.y1),
        x2: clamp01(result.plate_bbox!.x2),
        y2: clamp01(result.plate_bbox!.y2),
      },
      color: PLATE_COLOR,
    });
  } else {
    // Fallback: plate zone on primary vehicle when OCR has text, or always for motos
    // (plate YOLO often misses Cambodia motorcycle rears).
    const hostVehicle = nmsVehicles(result.vehicles ?? [])[0] ?? result.vehicles?.[0];
    const shouldInfer = hasPlateText || isMotorcycle(hostVehicle);
    const plateBbox = shouldInfer && hostVehicle ? plateZoneFromVehicle(hostVehicle) : null;
    if (
      plateBbox
      && isReliablePlateBox(
        plateBbox,
        result.plate_confidence || (hasPlateText ? 60 : 35),
        { hasText: hasPlateText || isMotorcycle(hostVehicle) },
      )
    ) {
      items.push({
        id: 'plate',
        kind: 'plate',
        label: plateText || 'Plate',
        confidence: plateConf01(result.plate_confidence) || (hasPlateText ? 60 : 35),
        bbox: plateBbox,
        color: PLATE_COLOR,
      });
    }
  }

  // Helmet / no-helmet boxes are intentionally omitted from live preview annotations.
  // Keep vehicle, plate, and traffic-sign labels only.

  return items;
}
