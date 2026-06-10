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

const SIGN_COLOR = '#F59E0B';
const VEHICLE_COLOR = '#3B82F6';
const PLATE_COLOR = '#0EA5E9';

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

  const signLabel = locale === 'km'
    ? (result.sign_name_km || result.sign_name || result.sign_code || 'Sign')
    : (result.sign_name_en || result.sign_name || result.sign_code || 'Sign');

  if (validBbox(result.sign_bbox) && (result.confidence ?? 0) > 0) {
    items.push({
      id: 'sign',
      kind: 'sign',
      label: signLabel,
      confidence: Number(result.confidence ?? 0),
      bbox: result.sign_bbox,
      color: SIGN_COLOR,
    });
  }

  (result.vehicles ?? []).forEach((vehicle, index) => {
    if (!validBbox(vehicle.bbox)) return;
    items.push({
      id: `vehicle-${index}`,
      kind: 'vehicle',
      label: vehicle.label || vehicle.vehicle_type,
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
