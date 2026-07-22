import type { VehicleDetectionItem } from '@shared/hooks/useWebcamDetection';
import { VEHICLE_LABELS_KM } from '@shared/utils/detectionDisplay';

export interface PipelineVehicleSummary {
  vehicle_type: string;
  vehicle_label_en: string;
  vehicle_label_km: string;
  vehicle_confidence: number;
  source?: 'yolo' | 'database';
}

export function resolvePipelineVehicle(result: {
  pipeline_vehicle?: PipelineVehicleSummary;
  vehicles?: VehicleDetectionItem[];
  matched_vehicle?: { vehicle_type: string } | null;
}, locale: 'km' | 'en') {
  if (result.pipeline_vehicle) {
    const pv = result.pipeline_vehicle;
    return {
      label: locale === 'en' ? pv.vehicle_label_en : pv.vehicle_label_km,
      type: pv.vehicle_type,
      confidence: pv.vehicle_confidence,
      source: pv.source,
    };
  }
  const top = result.vehicles?.[0];
  if (top) {
    return {
      label: locale === 'en' ? top.label : (VEHICLE_LABELS_KM[top.vehicle_type] || top.label),
      type: top.vehicle_type,
      confidence: top.confidence,
      source: 'yolo' as const,
    };
  }
  if (result.matched_vehicle?.vehicle_type) {
    const vtype = result.matched_vehicle.vehicle_type;
    return {
      label: locale === 'en' ? vtype.replace('_', ' ') : (VEHICLE_LABELS_KM[vtype] || vtype),
      type: vtype,
      confidence: 0,
      source: 'database' as const,
    };
  }
  return null;
}
