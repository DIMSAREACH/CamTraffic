import type { TrafficSign } from '@shared/types';
import khmerOverrides from '@shared/data/sign_khmer_overrides.json';
import { labelsForClassKey } from '@shared/utils/yoloSignLabels';

const KHMER_RE = /[\u1780-\u17FF]/;

export type SignNameFields = Pick<
  TrafficSign,
  'sign_name' | 'sign_name_km' | 'sign_name_en' | 'sign_code' | 'description_en'
>;

type BilingualLabel = { km: string; en: string };

const CODE_OVERRIDES = khmerOverrides as Record<string, BilingualLabel>;

/** Custom catalog codes seeded outside reference_sign_meta.json */
const CUSTOM_SIGN_LABELS: Record<string, BilingualLabel> = {
  'GIVE-WAY': { km: 'ផ្តល់ផ្លូវ', en: 'Yield (Give way)' },
  'KH-YIELD': { km: 'ផ្តល់ផ្លូវ', en: 'Yield (Give way)' },
  STOP: { km: 'ឈប់', en: 'Stop' },
  'KH-STOP': { km: 'ឈប់', en: 'Stop' },
  'KH-ROUND': { km: 'រង្វង់មូលខាងមុខ', en: 'Roundabout ahead' },
  'KH-NO-ENTRY': { km: 'ហាមចូល', en: 'No entry' },
  'NO-ENTRY': { km: 'ហាមចូល', en: 'No entry' },
  'NO-ENTRY-FOR-MOTORCYCLE': { km: 'ហាមចូលម៉ូតូ', en: 'No entry for motorcycles' },
  'KH-ONEWAY': { km: 'ផ្លូវដោយឯកទៅ', en: 'One-way traffic' },
  'KH-SP40': { km: 'កំណត់ល្បឿន ៤០', en: 'Speed limit 40 km/h' },
  'KH-SP60': { km: 'កំណត់ល្បឿន ៦០', en: 'Speed limit 60 km/h' },
  'SCHOOL-ZONE': { km: 'តំបន់សាលា', en: 'School zone' },
  'SPEED-LIMIT-40': { km: 'កំណត់ល្បឿន ៤០', en: 'Speed limit 40 km/h' },
  'R1-01': { km: 'ហាមបត់ឆ្វេង', en: 'No left turn' },
  'KH-NOPARK': { km: 'ហាមឈរចត', en: 'No parking' },
  'KH-NOUT': { km: 'ហាមបត់ក', en: 'No U-turn' },
  'KH-PED': { km: 'ផ្លូវអ្នកថ្មើរជើង', en: 'Pedestrian crossing' },
};

function englishFromDescription(descriptionEn?: string | null): string {
  const text = descriptionEn?.trim() || '';
  if (!text) return '';
  return text.split(/[—(-]/)[0].trim();
}

function needsKhmerFix(km: string, en: string): boolean {
  if (!km) return true;
  if (km && en && km.toLowerCase() === en.toLowerCase()) return true;
  return !KHMER_RE.test(km);
}

/** Khmer + English labels for catalog cards (sign code shown only in detail view). */
export function signDisplayNames(sign: SignNameFields & { class_key?: string }): { km: string; en: string } {
  const classLabels = labelsForClassKey(sign.class_key);
  const signCode = (sign.sign_code || classLabels?.code || '').toUpperCase();

  if (signCode) {
    const fromCustom = CUSTOM_SIGN_LABELS[signCode];
    if (fromCustom) return fromCustom;
    const fromFile = CODE_OVERRIDES[signCode];
    if (fromFile?.km && fromFile?.en) return fromFile;
  }

  if (classLabels) {
    return { km: classLabels.km, en: classLabels.en };
  }

  const raw = sign.sign_name?.trim() || '';
  const kmField = sign.sign_name_km?.trim() || '';
  const enField = sign.sign_name_en?.trim() || '';

  let km = (kmField && KHMER_RE.test(kmField) ? kmField : '') || (KHMER_RE.test(raw) ? raw : '');
  let en =
    enField ||
    (kmField && !KHMER_RE.test(kmField) ? kmField : '') ||
    (!KHMER_RE.test(raw) ? raw : '') ||
    englishFromDescription(sign.description_en);

  if (!km && en && KHMER_RE.test(en)) {
    km = en;
    en = enField || (!KHMER_RE.test(raw) ? raw : '') || englishFromDescription(sign.description_en);
  }

  if (needsKhmerFix(km, en) && signCode && CODE_OVERRIDES[signCode]) {
    return CODE_OVERRIDES[signCode];
  }

  return { km, en };
}
