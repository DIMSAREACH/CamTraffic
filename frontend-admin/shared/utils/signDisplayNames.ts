import type { TrafficSign } from '@shared/types';

const KHMER_RE = /[\u1780-\u17FF]/;

/** Khmer + English labels for catalog cards (sign code shown only in detail view). */
export function signDisplayNames(sign: TrafficSign): { km: string; en: string } {
  const raw = sign.sign_name?.trim() || '';
  const km =
    sign.sign_name_km?.trim() ||
    (KHMER_RE.test(raw) ? raw : '');
  const en =
    sign.sign_name_en?.trim() ||
    (!KHMER_RE.test(raw) ? raw : '');
  return { km, en };
}
