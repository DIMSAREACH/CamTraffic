import type { VehicleDetectionItem } from '@shared/hooks/useWebcamDetection';

export type DetectionMode = 'sign' | 'vehicle' | 'plate' | 'unknown_sign' | 'no_sign';

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

export function resolveDetectionMode(result: DetectionDisplayInput): DetectionMode {
  if (result.detection_mode) return result.detection_mode;
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
  tuktuk: 'តូរតូខ',
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
  const mode = resolveDetectionMode(result);
  const isEn = locale === 'en';
  const title = isEn
    ? (result.display_title_en || result.sign_name_en || result.sign_name)
    : (result.display_title_km || result.display_title || result.sign_name_km || result.sign_name);
  const description = isEn ? (result.description_en || result.description) : result.description;
  const guidance = isEn ? (result.guidance_en || result.guidance) : result.guidance;
  const confidence = result.display_confidence ?? result.confidence;
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
  return (
    `បានរកឃើញស្លាកចរាចរណ៍ ${title}។ ` +
    `${description} ` +
    `សូមបញ្ជរកចរាចរតាមស្លាកចរាចរណ៍នេះ៖ ${guidance}`
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
    : `ស្លាកចរាចរណ៍ ${hero.title}`;
}
