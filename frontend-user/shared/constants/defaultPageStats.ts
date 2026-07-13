import catalog from '@shared/data/traffic_sign_catalog_10.json';
import { USE_SAMPLE_FALLBACK } from '@shared/config/dataMode';
import type {
  AIDetectionCategoryStat,
  AIDetectionPageStats,
  AIDetectionSampleSign,
  SignCategory,
} from '@shared/types';
import { getProfileImageUrl } from '@shared/utils/profileImage';

const CATEGORY_UI: Record<
  SignCategory,
  { name: string; color: string }
> = {
  prohibitory: { name: 'Prohibitory', color: '#EF4444' },
  warning: { name: 'Warning', color: '#F59E0B' },
  mandatory: { name: 'Mandatory', color: '#3B82F6' },
  informative: { name: 'Informative', color: '#10B981' },
};

const CATALOG_CATEGORY: Record<string, SignCategory> = {
  'Prohibitory Sign': 'prohibitory',
  'Mandatory Sign': 'mandatory',
  'Regulatory Sign': 'mandatory',
  'Warning Sign': 'warning',
  'Information Sign': 'informative',
};

/** Static demo images served from /public/demo-signs (works without backend). */
const DEMO_IMAGE_BY_CLASS: Record<string, string> = {
  NO_ENTRY: '/demo-signs/no-entry.png',
  NO_LEFT_TURN: '/demo-signs/no-left-turn.png',
  NO_RIGHT_TURN: '/demo-signs/no-right-turn.png',
  NO_U_TURN: '/demo-signs/no-u-turn.png',
  NO_PARKING: '/demo-signs/no-parking.png',
  M_STOP: '/demo-signs/stop.png',
  P_SPEED_LIMIT_20_KM_H: '/demo-signs/speed-limit-20.png',
  P_SPEED_LIMIT_50_KM_H: '/demo-signs/speed-limit-50.png',
  W_PEDESTRIAN_CROSSING: '/demo-signs/pedestrian-crossing.png',
  I_ONE_WAY_TRAFFIC: '/demo-signs/one-way-traffic.png',
};

function shortLabel(signNameEn: string, signNameKm: string): string {
  for (const text of [signNameEn, signNameKm]) {
    if (!text) continue;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length) return words[0].slice(0, 6).toUpperCase();
  }
  return '?';
}

function buildSampleSigns(): AIDetectionSampleSign[] {
  return catalog.signs.map((sign) => {
    const category = CATALOG_CATEGORY[sign.category] ?? 'warning';
    const meta = CATEGORY_UI[category];
    return {
      id: sign.id + 1,
      sign_name: sign.sign_name_en,
      sign_name_km: sign.sign_name_km,
      sign_name_en: sign.sign_name_en,
      sign_code: sign.sign_code,
      category,
      image: DEMO_IMAGE_BY_CLASS[sign.class_key] ?? '',
      label: shortLabel(sign.sign_name_en, sign.sign_name_km),
      color: meta.color,
    };
  });
}

function buildCategories(sampleSigns: AIDetectionSampleSign[]): AIDetectionCategoryStat[] {
  const buckets = new Map<SignCategory, { count: number; names: string[] }>();

  for (const sign of sampleSigns) {
    const row = buckets.get(sign.category) ?? { count: 0, names: [] };
    row.count += 1;
    if (row.names.length < 3) {
      row.names.push(sign.sign_name_en || sign.sign_name);
    }
    buckets.set(sign.category, row);
  }

  return (['prohibitory', 'warning', 'mandatory', 'informative'] as const)
    .filter((key) => buckets.has(key))
    .map((key) => {
      const row = buckets.get(key)!;
      const meta = CATEGORY_UI[key];
      return {
        key,
        name: meta.name,
        count: row.count,
        color: meta.color,
        desc: row.names.join(', ') || meta.name,
      };
    });
}

const sampleSigns = buildSampleSigns();

const DEMO_IMAGE_BY_SIGN_CODE = Object.fromEntries(
  catalog.signs.map((sign) => [
    sign.sign_code.toUpperCase().replace(/\s+/g, ''),
    DEMO_IMAGE_BY_CLASS[sign.class_key] ?? '',
  ]),
) as Record<string, string>;

/** Resolve demo or API image URL for sample-sign thumbnails and quick-load buttons. */
export function resolveSampleSignImage(image?: string, signCode?: string): string {
  const raw = image?.trim()
    || (signCode ? DEMO_IMAGE_BY_SIGN_CODE[signCode.toUpperCase().replace(/\s+/g, '')] : '')
    || '';
  if (!raw) return '';
  if (raw.startsWith('blob:') || raw.startsWith('data:')) return raw;
  if (raw.startsWith('http')) {
    return getProfileImageUrl(raw) || raw;
  }
  if (raw.startsWith('/demo-signs/')) {
    const base = import.meta.env.BASE_URL || '/';
    const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${prefix}${raw}`;
    }
    return raw;
  }
  return getProfileImageUrl(raw) || raw;
}

function patchSampleSignImages(signs: AIDetectionSampleSign[]): AIDetectionSampleSign[] {
  return signs.map((sign) => ({
    ...sign,
    image: resolveSampleSignImage(sign.image, sign.sign_code)
      || DEMO_IMAGE_BY_SIGN_CODE[sign.sign_code?.toUpperCase().replace(/\s+/g, '') ?? '']
      || sign.image,
  }));
}

/** Shown when /api/ai/stats/ is unreachable so the page still has demo data. */
export const DEFAULT_PAGE_STATS: AIDetectionPageStats = {
  model: {
    name: 'YOLOv8-Cambodia',
    version: 'v2.1',
    mode: 'mock_fallback',
    detection_mode: 'local',
    weights_loaded: false,
    sign_classes: catalog.total_classes,
    catalog_sign_count: catalog.total_classes,
    yolo_trained_classes: catalog.total_classes,
    training_images: 120,
    vehicle_detection_enabled: true,
    vehicle_model: 'yolov8n.pt',
    vehicle_classes: ['car', 'motorcycle', 'bus', 'truck'],
    plate_ocr_enabled: true,
    plate_ocr_engine: 'EasyOCR',
    trained_sign_codes: catalog.signs.map((s) => s.sign_code),
  },
  stats: {
    total_scans: 24,
    accuracy_avg: 94.2,
    avg_speed_sec: 1.8,
    sign_count: catalog.total_classes,
    vehicles_detected_total: 15,
  },
  categories: buildCategories(sampleSigns),
  sample_signs: patchSampleSignImages(sampleSigns),
};

/** Merge live /api/ai/stats/ with catalog demo data so the UI is never empty. */
export function mergePageStatsWithDefaults(
  api: AIDetectionPageStats | null | undefined,
): AIDetectionPageStats {
  if (!api) return DEFAULT_PAGE_STATS;

  if (!USE_SAMPLE_FALLBACK) {
    return {
      ...api,
      categories: api.categories ?? [],
      sample_signs: patchSampleSignImages(api.sample_signs ?? []),
    };
  }

  const apiSamples = api.sample_signs?.length ? patchSampleSignImages(api.sample_signs) : [];
  const hasUsableSamples = apiSamples.some((s) => Boolean(resolveSampleSignImage(s.image, s.sign_code)));
  const sample_signs = hasUsableSamples
    ? apiSamples
    : DEFAULT_PAGE_STATS.sample_signs;

  const categories = api.categories?.length
    ? api.categories
    : DEFAULT_PAGE_STATS.categories;

  const liveScans = api.stats?.total_scans ?? 0;
  const liveAccuracy = api.stats?.accuracy_avg ?? 0;
  const liveSpeed = api.stats?.avg_speed_sec ?? 0;

  return {
    model: {
      ...DEFAULT_PAGE_STATS.model,
      ...api.model,
      sign_classes: Math.max(api.model?.sign_classes ?? 0, DEFAULT_PAGE_STATS.model.sign_classes),
      catalog_sign_count: Math.max(
        api.model?.catalog_sign_count ?? api.model?.sign_classes ?? 0,
        DEFAULT_PAGE_STATS.model.sign_classes,
      ),
      training_images: (api.model?.training_images ?? 0) > 0
        ? api.model!.training_images
        : DEFAULT_PAGE_STATS.model.training_images,
      trained_sign_codes: api.model?.trained_sign_codes?.length
        ? api.model.trained_sign_codes
        : DEFAULT_PAGE_STATS.model.trained_sign_codes,
    },
    stats: {
      ...DEFAULT_PAGE_STATS.stats,
      ...api.stats,
      total_scans: liveScans > 0 ? liveScans : DEFAULT_PAGE_STATS.stats.total_scans,
      accuracy_avg: liveAccuracy > 0 ? liveAccuracy : DEFAULT_PAGE_STATS.stats.accuracy_avg,
      avg_speed_sec: liveSpeed > 0 ? liveSpeed : DEFAULT_PAGE_STATS.stats.avg_speed_sec,
      sign_count: Math.max(api.stats?.sign_count ?? 0, DEFAULT_PAGE_STATS.stats.sign_count),
    },
    categories,
    sample_signs: patchSampleSignImages(sample_signs),
  };
}
