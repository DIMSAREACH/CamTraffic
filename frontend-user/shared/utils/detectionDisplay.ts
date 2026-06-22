import type { VehicleDetectionItem } from '@shared/hooks/useWebcamDetection';
import { signDisplayNames, type SignNameFields } from '@shared/utils/signDisplayNames';
import { canonicalClassKey, labelsForClassKey } from '@shared/utils/yoloSignLabels';

export type DetectionMode = 'sign' | 'vehicle' | 'plate' | 'unknown_sign' | 'no_sign';

const KHMER_RE = /[\u1780-\u17FF]/;

function hasKhmer(text?: string | null): boolean {
  return Boolean(text && KHMER_RE.test(text));
}

function khmerCategoryLabel(code?: string): string {
  const upper = (code || '').toUpperCase();
  const prefix = upper[0];
  if (prefix === 'R' || upper.startsWith('PW')) return 'សញ្ញាហាមឃាត់';
  if (prefix === 'W') return 'សញ្ញាព្រមាន';
  if (prefix === 'S') return 'សញ្ញាបញ្ជា';
  if (prefix === 'G' || prefix === 'P' || prefix === 'I') return 'សញ្ញាផ្តល់ព័ត៌មាន';
  return 'ស្លាកចរាចរណ៍';
}

function isGenericKhmerSignLabel(text: string, code?: string): boolean {
  const value = text.trim();
  if (!value || !hasKhmer(value)) return false;
  const upperCode = (code || '').toUpperCase();
  if (upperCode && value.toUpperCase().includes(upperCode)) {
    if (value.startsWith('សញ្ញា') || value.startsWith('ស្លាក')) return true;
    const categories = ['សញ្ញាហាមឃាត់', 'សញ្ញាព្រមាន', 'សញ្ញាបញ្ជា', 'សញ្ញាផ្តល់ព័ត៌មាន', 'ស្លាកចរាចរណ៍'];
    if (categories.some((label) => value.startsWith(label))) return true;
  }
  return /^សញ្ញា\s+[A-Z]+-\d+/.test(value);
}

function resolveKhmerTitle(
  result: DetectionDisplayInput,
  labels: { km: string; en: string },
): string {
  const candidates = [
    labels.km,
    result.display_title_km,
    result.sign_name_km,
    result.sign_name,
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (hasKhmer(candidate) && !isGenericKhmerSignLabel(candidate, result.sign_code)) {
      return candidate;
    }
  }
  return labels.km || candidates[0] || '';
}

function kmDescriptionFallback(title: string, code?: string): string {
  const subject = title.trim() || (code ? `${khmerCategoryLabel(code)} ${code}` : khmerCategoryLabel(code));
  return `${subject}។ សូមគោរពច្បាប់ចរាចរណ៍កម្ពុជា និងបញ្ជរកចរាចរតាមស្លាកដែលបានរកឃើញ។`;
}

function kmGuidanceFallback(title: string): string {
  return `សូមបញ្ជរកចរាចរតាមស្លាក ${title}។ រក្សាសុវត្ថិភាពចរាចរណ៍។`;
}

/** Normalize Khmer TTS text (fix Latin letters mixed into Khmer labels). */
export function prepareKhmerTtsText(text: string): string {
  let out = text.trim();
  out = out.replace(/([\u1780-\u17FF]+)Y\b/g, '$1យ');
  out = out.replace(/([\u1780-\u17FF]+)y\b/g, '$1យ');
  out = out.replace(/\bY-junction\b/gi, 'ផ្លូវបំបែករូបយ');
  return out.replace(/\s{2,}/g, ' ').trim();
}

export interface DetectionDisplayInput {
  sign_name: string;
  sign_name_km?: string;
  sign_name_en?: string;
  sign_code?: string;
  class_key?: string;
  confidence: number;
  description: string;
  description_en?: string;
  guidance: string;
  guidance_en?: string;
  detection_mode?: DetectionMode;
  sign_present?: boolean;
  display_title?: string;
  display_title_en?: string;
  display_title_km?: string;
  display_confidence?: number;
  vehicles?: VehicleDetectionItem[];
  vehicle_count?: number;
  detected_plate?: string;
  plate_confidence?: number;
  plate_type?: string;
  matched_vehicle?: {
    id: number;
    plate_number: string;
    owner_name: string;
    vehicle_type: string;
  } | null;
}

function isPlaceholderSignName(name?: string | null): boolean {
  const value = (name || '').trim();
  if (!value) return true;
  if (/^Traffic Sign\b/i.test(value)) return true;
  if (/^សញ្ញា\s+[A-Z0-9-]+/.test(value)) return true;
  if (/^ស្លាក\s+[A-Z0-9-]+/.test(value)) return true;
  return false;
}

/** Ensure webcam/API results use official Cambodia catalog sign names. */
export function normalizeDetectionSign<T extends SignNameFields & { class_key?: string; display_title?: string; display_title_en?: string; display_title_km?: string }>(
  result: T,
): T {
  const classLabels = labelsForClassKey(result.class_key);
  const signCode = (result.sign_code || classLabels?.code || '').toUpperCase();
  const merged: SignNameFields = {
    sign_code: signCode || result.sign_code,
    sign_name: result.sign_name,
    sign_name_km: result.sign_name_km,
    sign_name_en: result.sign_name_en,
    description_en: result.description_en,
  };

  if (classLabels) {
    if (isPlaceholderSignName(merged.sign_name_km) || isPlaceholderSignName(merged.sign_name)) {
      merged.sign_name_km = classLabels.km;
      merged.sign_name = classLabels.km;
    }
    if (isPlaceholderSignName(merged.sign_name_en) || !merged.sign_name_en) {
      merged.sign_name_en = classLabels.en;
    }
    if (!merged.sign_code) merged.sign_code = classLabels.code;
  }

  const labels = signDisplayNames(merged);
  const next = {
    ...result,
    sign_code: merged.sign_code || result.sign_code,
    sign_name_km: labels.km || result.sign_name_km || result.sign_name,
    sign_name_en: labels.en || result.sign_name_en,
    sign_name: labels.km || result.sign_name_km || result.sign_name,
  };

  if (labels.km) {
    next.display_title_km = labels.km;
    next.display_title = labels.km;
  }
  if (labels.en) {
    next.display_title_en = labels.en;
  }

  return next;
}

export function isUsefulDetectionResult(result: DetectionDisplayInput): boolean {
  const mode = resolveDetectionMode(result);
  const conf = result.display_confidence ?? result.confidence ?? 0;
  if (result.sign_present === false || mode === 'no_sign' || mode === 'unknown_sign') {
    return false;
  }
  return conf >= 35;
}

export function resolveDetectionMode(result: DetectionDisplayInput): DetectionMode {
  if (result.detection_mode) return result.detection_mode;
  if (result.sign_present === false) return 'no_sign';
  if (result.class_key || result.sign_code) return 'sign';
  const signEn = (result.sign_name_en || '').trim().toLowerCase();
  const signKm = result.sign_name_km || result.sign_name || '';
  if (signEn === 'unknown sign' || signKm === 'ស្លាកមិនស្គាល់') return 'unknown_sign';
  if (result.confidence >= 10 && signEn !== 'unknown sign') {
    return 'sign';
  }
  if ((result.vehicle_count ?? result.vehicles?.length ?? 0) > 0) return 'vehicle';
  if (result.detected_plate) return 'plate';
  return 'no_sign';
}

export const VEHICLE_LABELS_KM: Record<string, string> = {
  car: 'រថយន្ត',
  motorcycle: 'ម៉ូតូ',
  bus: 'ឡានក្រុង',
  truck: 'ឡានដឹកទំនិញ',
};

export interface LogDisplayInput {
  detected_sign: string;
  confidence: number;
  description: string;
  guidance?: string;
  vehicle_count?: number;
  detected_vehicles?: VehicleDetectionItem[];
  detection_mode?: DetectionMode;
  display_label?: string;
  display_label_en?: string;
  display_label_km?: string;
  display_confidence?: number;
  display_description?: string;
  display_description_en?: string;
  detected_plate?: string;
  plate_confidence?: number;
  plate_type?: string;
  matched_vehicle?: {
    id: number;
    plate_number: string;
    owner_name: string;
    vehicle_type: string;
  } | null;
}

function enrichLogInput(log: LogDisplayInput): DetectionDisplayInput {
  if (log.display_label || log.display_confidence != null) {
    return {
      sign_name: log.detected_sign,
      confidence: log.confidence,
      description: log.display_description || log.description,
      description_en: log.display_description_en,
      guidance: log.guidance || '',
      detection_mode: log.detection_mode,
      display_title: log.display_label,
      display_title_en: log.display_label_en,
      display_title_km: log.display_label_km || log.display_label,
      display_confidence: log.display_confidence,
      vehicles: log.detected_vehicles,
      vehicle_count: log.vehicle_count,
      detected_plate: log.detected_plate,
      plate_confidence: log.plate_confidence,
      plate_type: log.plate_type,
      matched_vehicle: log.matched_vehicle,
    };
  }

  const vehicles = log.detected_vehicles ?? [];
  const input: DetectionDisplayInput = {
    sign_name: log.detected_sign,
    sign_name_km: log.detected_sign,
    sign_name_en: log.detected_sign === 'ស្លាកមិនស្គាល់' ? 'Unknown sign' : log.detected_sign,
    confidence: log.confidence,
    description: log.description,
    guidance: log.guidance || '',
    vehicles,
    vehicle_count: log.vehicle_count ?? vehicles.length,
  };
  const mode = resolveDetectionMode(input);
  if (mode === 'vehicle' && vehicles[0]) {
    const top = vehicles[0];
    input.detection_mode = 'vehicle';
    input.display_title_en = top.label;
    input.display_title_km = VEHICLE_LABELS_KM[top.vehicle_type] || top.label;
    input.display_confidence = top.confidence;
  } else if (log.detected_plate) {
    input.detection_mode = 'plate';
    input.display_title_en = log.detected_plate;
    input.display_title_km = log.detected_plate;
    input.display_confidence = log.plate_confidence ?? 0;
    input.detected_plate = log.detected_plate;
    input.plate_confidence = log.plate_confidence;
    input.plate_type = log.plate_type;
    input.matched_vehicle = log.matched_vehicle;
  } else if (mode === 'unknown_sign') {
    input.detection_mode = 'unknown_sign';
    input.display_title_en = 'Unknown sign';
    input.display_title_km = 'ស្លាកមិនស្គាល់';
    input.display_confidence = 0;
  } else if (mode === 'no_sign') {
    input.detection_mode = 'no_sign';
    input.display_title_en = 'No traffic sign found';
    input.display_title_km = 'មិនមានស្លាកចរាចរណ៍';
    input.display_confidence = 0;
  }
  return input;
}

export function logDisplay(log: LogDisplayInput, locale: 'km' | 'en') {
  return detectionHero(enrichLogInput(log), locale);
}

export function logDisplayColor(mode: DetectionMode): string {
  if (mode === 'vehicle') return '#3B82F6';
  if (mode === 'plate') return '#0EA5E9';
  if (mode === 'unknown_sign') return '#F97316';
  if (mode === 'no_sign') return '#F59E0B';
  return '#8B5CF6';
}

export function detectionHero(result: DetectionDisplayInput, locale: 'km' | 'en') {
  const normalized = normalizeDetectionSign(result);
  const mode = resolveDetectionMode(normalized);
  const isEn = locale === 'en';
  const labels = signDisplayNames({
    sign_code: normalized.sign_code,
    sign_name: normalized.sign_name,
    sign_name_km: normalized.sign_name_km,
    sign_name_en: normalized.sign_name_en,
    description_en: normalized.description_en,
  });
  const title = isEn
    ? (normalized.display_title_en || labels.en || normalized.sign_name_en || normalized.sign_name)
    : resolveKhmerTitle(normalized, labels);
  const description = isEn
    ? (normalized.description_en || normalized.description)
    : (
      hasKhmer(normalized.description) && !isGenericKhmerSignLabel(normalized.description, normalized.sign_code)
        ? normalized.description
        : kmDescriptionFallback(title, normalized.sign_code)
    );
  const guidance = isEn
    ? (normalized.guidance_en || normalized.guidance)
    : (
      hasKhmer(normalized.guidance) && !isGenericKhmerSignLabel(normalized.guidance, normalized.sign_code)
        ? normalized.guidance
        : kmGuidanceFallback(title)
    );
  const confidence = normalized.display_confidence ?? normalized.confidence;
  return { mode, title, description, guidance, confidence };
}

function buildSignSpeech(title: string, description: string, guidance: string, locale: 'km' | 'en') {
  if (locale === 'en') {
    return (
      `Traffic sign detected: ${title}. ` +
      `${description} ` +
      `Please follow this traffic sign guidance: ${guidance}`
    );
  }
  return prepareKhmerTtsText(
    `បានរកឃើញស្លាកចរាចរណ៍ ${title}។ ` +
    `${description} ` +
    `សូមបញ្ជរកចរាចរតាមស្លាកចរាចរណ៍នេះ៖ ${guidance}`,
  );
}

/** Full TTS line for live detection results or log records. */
export function heroSpeechText(input: DetectionDisplayInput | LogDisplayInput, locale: 'km' | 'en') {
  const hero = 'detected_sign' in input
    ? logDisplay(input, locale)
    : detectionHero(input, locale);

  const plate = 'detected_plate' in input ? input.detected_plate : (input as DetectionDisplayInput).detected_plate;
  const plateConf = 'plate_confidence' in input ? input.plate_confidence : (input as DetectionDisplayInput).plate_confidence;

  if (hero.mode === 'plate') {
    if (locale === 'en') {
      return (
        `License plate detected: ${hero.title}, ${hero.confidence.toFixed(1)} percent confidence. ` +
        `${hero.description} ${hero.guidance}`
      );
    }
    return (
      `បានរកឃើញផ្លាកលេខ ${hero.title} ភាពជឿជាក់ ${hero.confidence.toFixed(1)} ភាគរយ។ ` +
      `${hero.description} ${hero.guidance}`
    );
  }

  if (hero.mode === 'vehicle') {
    const plateSpeech = plate
      ? (locale === 'en'
        ? ` License plate ${plate}${plateConf ? `, ${plateConf.toFixed(1)} percent confidence` : ''}.`
        : ` ផ្លាកលេខ ${plate}${plateConf ? ` ភាពជឿជាក់ ${plateConf.toFixed(1)} ភាគរយ` : ''}។`)
      : '';
    if (locale === 'en') {
      return (
        `Vehicle detected: ${hero.title}, ${hero.confidence.toFixed(1)} percent confidence.` +
        `${plateSpeech} ${hero.description} ${hero.guidance}`
      );
    }
    return (
      `បានរកឃើញ${hero.title} ភាពជឿជាក់ ${hero.confidence.toFixed(1)} ភាគរយ។` +
      `${plateSpeech} ${hero.description} ${hero.guidance}`
    );
  }

  if (hero.mode === 'unknown_sign') {
    if (locale === 'en') {
      return `Unknown traffic sign. ${hero.description} ${hero.guidance}`;
    }
    return `ស្លាកមិនស្គាល់។ ${hero.description} ${hero.guidance}`;
  }

  if (hero.mode === 'no_sign') {
    if (locale === 'en') {
      return `No traffic sign found in this image. ${hero.description} ${hero.guidance}`;
    }
    return `មិនរកឃើញស្លាកចរាចរណ៍ក្នុងរូបនេះ។ ${hero.description} ${hero.guidance}`;
  }

  return buildSignSpeech(hero.title, hero.description, hero.guidance, locale);
}

/** Short TTS label for title-only buttons (sign name / vehicle type). */
export function heroTitleSpeech(input: DetectionDisplayInput | LogDisplayInput, locale: 'km' | 'en') {
  const hero = 'detected_sign' in input
    ? logDisplay(input, locale)
    : detectionHero(input, locale);

  if (hero.mode === 'plate') {
    return locale === 'en'
      ? `License plate: ${hero.title}`
      : `ផ្លាកលេខ ${hero.title}`;
  }
  if (hero.mode === 'vehicle') {
    return locale === 'en'
      ? `Vehicle detected: ${hero.title}`
      : `រកឃើញ${hero.title}`;
  }
  if (hero.mode === 'unknown_sign') {
    return locale === 'en'
      ? 'Unknown sign'
      : 'ស្លាកមិនស្គាល់';
  }
  if (hero.mode === 'no_sign') {
    return locale === 'en'
      ? 'No traffic sign found'
      : 'មិនមានស្លាកចរាចរណ៍';
  }
  return locale === 'en'
    ? `Traffic sign: ${hero.title}`
    : prepareKhmerTtsText(`ស្លាកចរាចរណ៍ ${hero.title}`);
}
