import catalog from '@shared/data/traffic_sign_catalog_10.json';
import type { EvidenceArchiveItem } from '@shared/types';

const EMBEDDED_SIGN_CODE = /\b([A-Z]\d{1,2}-\d{2,3})\b/i;

const TITLE_MATCHERS: Array<{ signCode: string; test: (title: string) => boolean }> = (() => {
  const entries: Array<{ text: string; signCode: string }> = [];
  for (const sign of catalog.signs) {
    const code = sign.sign_code;
    entries.push({ text: sign.sign_code, signCode: code });
    entries.push({ text: sign.sign_name_en, signCode: code });
    entries.push({ text: sign.sign_name_km, signCode: code });
    entries.push({ text: sign.class_key.replace(/_/g, ' '), signCode: code });
  }
  entries.sort((a, b) => b.text.length - a.text.length);
  return entries
    .filter((entry) => entry.text.trim().length > 0)
    .map(({ text, signCode }) => ({
      signCode,
      test: (title: string) => title.toLowerCase().includes(text.toLowerCase()),
    }));
})();

/** Map evidence titles (Khmer/English/sign codes) to catalog sign codes. */
export function inferSignCodeFromEvidenceTitle(title: string): string | null {
  const trimmed = title?.trim();
  if (!trimmed) return null;

  const embedded = trimmed.match(EMBEDDED_SIGN_CODE);
  if (embedded) {
    return embedded[1].toUpperCase().replace(/\s/g, '');
  }

  for (const matcher of TITLE_MATCHERS) {
    if (matcher.test(trimmed)) return matcher.signCode;
  }
  return null;
}

/**
 * Production: always show the stored evidence image from the API.
 * Demo-sign substitution is intentionally disabled (no sample art overlay).
 */
export function resolveEvidenceDisplayImage(
  item: Pick<EvidenceArchiveItem, 'image_url' | 'title' | 'source_type'>,
): string | null {
  return item.image_url ?? null;
}
