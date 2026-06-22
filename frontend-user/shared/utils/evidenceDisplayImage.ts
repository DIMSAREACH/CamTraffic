import catalog from '@shared/data/traffic_sign_catalog_10.json';
import { resolveCatalogDemoImage } from '@shared/utils/signImage';
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
 * Prefer clean catalog demo art for sign detections (API uploads often have black matte).
 * Falls back to the stored evidence URL for photos and non-sign records.
 */
export function resolveEvidenceDisplayImage(
  item: Pick<EvidenceArchiveItem, 'image_url' | 'title' | 'source_type'>,
): string | null {
  const original = item.image_url ?? null;
  const signCode = inferSignCodeFromEvidenceTitle(item.title);
  if (!signCode) return original;

  const demo = resolveCatalogDemoImage(signCode);
  if (!demo) return original;

  if (item.source_type === 'detection' && demo) return appendDisplayCacheBust(demo);

  if (EMBEDDED_SIGN_CODE.test(item.title) || TITLE_MATCHERS.some(
    (matcher) => matcher.signCode === signCode && matcher.test(item.title),
  )) {
    return appendDisplayCacheBust(demo);
  }

  return original;
}

const DEMO_SIGN_CACHE_VERSION = '3';

function appendDisplayCacheBust(url: string): string {
  if (!url.includes('/demo-signs/')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${DEMO_SIGN_CACHE_VERSION}`;
}
