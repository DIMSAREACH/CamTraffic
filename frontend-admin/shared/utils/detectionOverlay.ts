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
const VEHICLE_COLOR = '#06B6D4';
const PLATE_COLOR = '#F59E0B';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function validBbox(bbox?: NormalizedBbox | null): bbox is NormalizedBbox {
  if (!bbox) return false;
  const { x1, y1, x2, y2 } = bbox;
  return x2 > x1 && y2 > y1 && x1 >= 0 && y1 >= 0 && x2 <= 1.05 && y2 <= 1.05;
}

function plateZoneFromVehicle(vehicle: VehicleDetectionItem): NormalizedBbox | null {
  const bbox = vehicle.bbox;
  if (!validBbox(bbox)) return null;
  const h = bbox.y2 - bbox.y1;
  return {
    x1: clamp01(bbox.x1),
    y1: clamp01(bbox.y1 + h * 0.55),
    x2: clamp01(bbox.x2),
    y2: clamp01(bbox.y2),
  };
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
  const signLabel = signCode ? `${signName} · ${signCode}` : signName;
  const signConfidence = Number(result.display_confidence ?? result.confidence ?? 0);

  if (validBbox(result.sign_bbox) && signConfidence > 0) {
    items.push({
      id: 'sign',
      kind: 'sign',
      label: signLabel,
      confidence: signConfidence,
      bbox: result.sign_bbox,
      color: SIGN_COLOR,
    });
  } else if (signCode && signConfidence > 0) {
    items.push({
      id: 'sign',
      kind: 'sign',
      label: signLabel,
      confidence: signConfidence,
      bbox: { x1: 0.08, y1: 0.08, x2: 0.92, y2: 0.92 },
      color: SIGN_COLOR,
    });
  }

  (result.vehicles ?? []).forEach((vehicle, index) => {
    if (!validBbox(vehicle.bbox)) return;
    const trackLabel = vehicle.track_id != null ? ` #${vehicle.track_id}` : '';
    items.push({
      id: vehicle.track_id != null ? `vehicle-${vehicle.track_id}` : `vehicle-${index}`,
      kind: 'vehicle',
      label: `${vehicle.label || vehicle.vehicle_type}${trackLabel}`,
      confidence: Number(vehicle.confidence ?? 0),
      bbox: vehicle.bbox,
      color: VEHICLE_COLOR,
    });
  });

  const plateText = result.detected_plate?.trim();
  if (plateText) {
    const hostVehicle = result.vehicles?.[0];
    const plateBbox = hostVehicle
      ? plateZoneFromVehicle(hostVehicle)
      : { x1: 0.12, y1: 0.68, x2: 0.88, y2: 0.92 };
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
