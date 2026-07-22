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

function boxArea(bbox: NormalizedBbox): number {
  return Math.max(0, bbox.x2 - bbox.x1) * Math.max(0, bbox.y2 - bbox.y1);
}

function validBbox(bbox?: NormalizedBbox | null): bbox is NormalizedBbox {
  if (!bbox) return false;
  const { x1, y1, x2, y2 } = bbox;
  if (!(x2 > x1 && y2 > y1 && x1 >= -0.02 && y1 >= -0.02 && x2 <= 1.05 && y2 <= 1.05)) {
    return false;
  }
  const w = x2 - x1;
  const h = y2 - y1;
  if (w < MIN_BOX_SIDE || h < MIN_BOX_SIDE) return false;
  if (boxArea(bbox) < MIN_BOX_AREA) return false;
  // Reject extreme aspect ratios (thin vertical/horizontal slivers).
  const ratio = w / h;
  if (ratio > 8 || ratio < 0.12) return false;
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
    items.push({
      id: 'sign',
      kind: 'sign',
      label: signLabel,
      confidence: signConfidence,
      bbox: {
        x1: clamp01(result.sign_bbox.x1),
        y1: clamp01(result.sign_bbox.y1),
        x2: clamp01(result.sign_bbox.x2),
        y2: clamp01(result.sign_bbox.y2),
      },
      color: SIGN_COLOR,
    });
  }

  nmsVehicles(result.vehicles ?? []).forEach((vehicle, index) => {
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

  const plateText = result.detected_plate?.trim();
  if (plateText) {
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
