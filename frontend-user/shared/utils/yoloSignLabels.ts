/** YOLOv8 10-class thesis model → Cambodia catalog labels (matches traffic_sign_catalog_10.json). */
export const YOLO_CLASS_SIGN_LABELS: Record<string, { code: string; km: string; en: string }> = {
  no_entry: { code: 'R1-04', km: 'ហាមចូល', en: 'No Entry' },
  no_left_turn: { code: 'R1-01', km: 'ហាមបត់ឆ្វេង', en: 'No Left Turn' },
  no_right_turn: { code: 'R1-02', km: 'ហាមបត់ស្តាំ', en: 'No Right Turn' },
  no_u_turn: { code: 'R1-03', km: 'ហាមបត់ត្រឡប់ក្រោយ', en: 'No U-Turn' },
  no_parking: { code: 'R2-10', km: 'ហាមចត', en: 'No Parking' },
  m_stop: { code: 'M-032', km: 'ឈប់', en: 'Stop' },
  p_speed_limit_20_km_h: { code: 'P-029', km: 'កំណត់ល្បឿន ២០ គ.ម/ម៉', en: 'Speed Limit 20 km/h' },
  p_speed_limit_50_km_h: { code: 'P-030', km: 'កំណត់ល្បឿន ៥០ គ.ម/ម៉', en: 'Speed Limit 50 km/h' },
  w_pedestrian_crossing: { code: 'W-040', km: 'ផ្លូវឆ្លងកាត់ថ្មើរជើង', en: 'Pedestrian Crossing' },
  i_one_way_traffic: { code: 'I-064', km: 'ផ្លូវឯកទិស', en: 'One-Way Traffic' },
};

export function canonicalClassKey(value?: string | null): string {
  return (value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function labelsForClassKey(classKey?: string | null) {
  const key = canonicalClassKey(classKey);
  return key ? YOLO_CLASS_SIGN_LABELS[key] : undefined;
}
