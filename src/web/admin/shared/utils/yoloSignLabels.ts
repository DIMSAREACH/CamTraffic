/** YOLOv8 / B2 class keys → Cambodia catalog labels. */
export const YOLO_CLASS_SIGN_LABELS: Record<string, { code: string; km: string; en: string }> = {
  no_entry: { code: 'R1-04', km: 'ហាមចូល', en: 'No Entry' },
  i_no_entry: { code: 'I-001', km: 'ហាមចូល', en: 'No Entry' },
  no_left_turn: { code: 'R1-01', km: 'ហាមបត់ឆ្វេង', en: 'No Left Turn' },
  no_right_turn: { code: 'R1-02', km: 'ហាមបត់ស្តាំ', en: 'No Right Turn' },
  no_u_turn: { code: 'R1-03', km: 'ហាមបត់ត្រឡប់ក្រោយ', en: 'No U-Turn' },
  no_parking: { code: 'R2-10', km: 'ហាមចត', en: 'No Parking' },
  m_stop: { code: 'M-032', km: 'ឈប់', en: 'Stop' },
  i_stop: { code: 'I-032', km: 'ឈប់', en: 'Stop' },
  p_speed_limit_20_km_h: { code: 'P-029', km: 'កំណត់ល្បឿន ២០ គ.ម/ម៉', en: 'Speed Limit 20 km/h' },
  p_speed_limit_50_km_h: { code: 'P-030', km: 'កំណត់ល្បឿន ៥០ គ.ម/ម៉', en: 'Speed Limit 50 km/h' },
  w_pedestrian_crossing: { code: 'W-040', km: 'ផ្លូវឆ្លងកាត់ថ្មើរជើង', en: 'Pedestrian Crossing' },
  i_one_way_traffic: { code: 'I-064', km: 'ផ្លូវឯកទិស', en: 'One-Way Traffic' },
  // Mandatory keep / direction (B2 KEEP_RIGHT → I_KEEP_RIGHT)
  keep_right: { code: 'I-211', km: 'រក្សាខាងស្តាំ', en: 'Keep Right' },
  i_keep_right: { code: 'I-211', km: 'រក្សាខាងស្តាំ', en: 'Keep Right' },
  m_keep_right: { code: 'I-211', km: 'រក្សាខាងស្តាំ', en: 'Keep Right' },
  keep_left: { code: 'I-210', km: 'រក្សាខាងឆ្វេង', en: 'Keep Left' },
  i_keep_left: { code: 'I-210', km: 'រក្សាខាងឆ្វេង', en: 'Keep Left' },
  m_keep_left: { code: 'I-210', km: 'រក្សាខាងឆ្វេង', en: 'Keep Left' },
  height_limit: { code: 'I-008', km: 'កំណត់កំពស់', en: 'Height Limit' },
  i_height_limit: { code: 'I-008', km: 'កំណត់កំពស់', en: 'Height Limit' },
  height_limit_5_5m: { code: 'I-008', km: 'កំណត់កំពស់ ៥,៥ ម', en: 'Height Limit 5.5m' },
};

/** YOLO / legacy tokens → catalog keys used in YOLO_CLASS_SIGN_LABELS. */
const CLASS_ALIASES: Record<string, string> = {
  keep_right: 'i_keep_right',
  m_keep_right: 'i_keep_right',
  keep_left: 'i_keep_left',
  m_keep_left: 'i_keep_left',
  no_entry: 'no_entry',
  i_no_entry: 'i_no_entry',
};

export function canonicalClassKey(value?: string | null): string {
  const key = (value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return CLASS_ALIASES[key] || key;
}

export function labelsForClassKey(classKey?: string | null) {
  const key = canonicalClassKey(classKey);
  return key ? YOLO_CLASS_SIGN_LABELS[key] : undefined;
}

/** Infer class key from a garbled stored label like "សញ្ញាព្រមាន keep-right". */
export function classKeyFromSignLabel(label?: string | null): string | undefined {
  const text = (label || '').trim().toLowerCase();
  if (!text) return undefined;
  if (/keep[_\s-]*right/.test(text)) return 'i_keep_right';
  if (/keep[_\s-]*left/.test(text)) return 'i_keep_left';
  if (/height[_\s-]*limit|កំណត់កំពស់|5[,.]5\s*m/.test(text)) return 'height_limit_5_5m';
  if (/no[_\s-]*entry|ហាមចូល/.test(text)) return 'no_entry';
  if (/no[_\s-]*u[_\s-]*turn|ហាមបត់ត្រឡប់/.test(text)) return 'no_u_turn';
  if (/no[_\s-]*parking|ហាមចត/.test(text)) return 'no_parking';
  return undefined;
}
