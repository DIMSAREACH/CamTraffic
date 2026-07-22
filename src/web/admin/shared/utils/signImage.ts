import type { TrafficSign } from '@shared/types';
import { getProfileImageUrl } from '@shared/utils/profileImage';
import catalog from '@shared/data/traffic_sign_catalog_10.json';

/** Static demo images in /public/demo-signs (works without backend media). */
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

const DEMO_IMAGE_BY_SIGN_CODE: Record<string, string> = Object.fromEntries(
  catalog.signs.map((sign) => [
    normalizeSignCodeKey(sign.sign_code),
    DEMO_IMAGE_BY_CLASS[sign.class_key] ?? '',
  ]),
);

function normalizeSignCodeKey(code: string): string {
  return code.toUpperCase().replace(/\s+/g, '').replace(/_/g, '-');
}

function resolvePublicAssetPath(path: string): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
  if (path.startsWith('/demo-signs/')) {
    const base = import.meta.env.BASE_URL || '/';
    const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${prefix}${path}`;
    }
  }
  return path;
}

/** Catalog demo art keyed by sign code (R1-04, M-032, …). */
export function resolveCatalogDemoImage(signCode?: string | null): string | null {
  if (!signCode?.trim()) return null;
  const key = normalizeSignCodeKey(signCode);
  const path = DEMO_IMAGE_BY_SIGN_CODE[key] ?? DEMO_IMAGE_BY_SIGN_CODE[key.replace(/-/g, '')];
  if (!path) return null;
  return resolvePublicAssetPath(path);
}

/** Ordered image URLs: API media first, then bundled demo art. */
export function trafficSignImageCandidates(
  sign: Pick<TrafficSign, 'image' | 'sign_code'>,
): string[] {
  const urls: string[] = [];
  const primary = signImageSrc(sign.image);
  if (primary) urls.push(primary);
  const demo = resolveCatalogDemoImage(sign.sign_code);
  if (demo && !urls.includes(demo)) urls.push(demo);
  return urls;
}

export function resolveTrafficSignImageUrl(
  sign: Pick<TrafficSign, 'image' | 'sign_code'>,
): string | null {
  return trafficSignImageCandidates(sign)[0] ?? null;
}

/** Normalize API image field to a stable path/URL for URLs and probes. */
export function normalizeTrafficSign(sign: TrafficSign): TrafficSign {
  const image = sign.image?.trim();
  if (!image) return sign;
  // Keep absolute CDN / R2 URLs intact — never rewrite onto the SPA origin.
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return sign;
  }
  if (image.startsWith('/media/')) return sign;
  if (image.startsWith('media/')) return { ...sign, image: `/${image}` };
  if (image.startsWith('/signs/')) return { ...sign, image: `/media${image}` };
  return { ...sign, image: `/media/${image.replace(/^\/?/, '')}` };
}

/** User catalog: needs a loadable image. Admin catalog: show every sign from the API. */
export function catalogIncludesSign(sign: TrafficSign, adminCatalog: boolean): boolean {
  if (adminCatalog) return true;
  return trafficSignImageCandidates(sign).length > 0;
}

/** Clear cached probe result so a newly uploaded image is not treated as broken. */
export function resetSignMediaProbeForSign(sign: TrafficSign): void {
  const raw = sign.image?.trim();
  if (!raw) return;
  const candidates = new Set<string>();
  const resolved = signHasResolvableImage(raw);
  if (resolved) candidates.add(resolved);
  if (typeof window !== 'undefined' && raw.startsWith('http')) {
    try {
      const { pathname } = new URL(raw);
      candidates.add(`${window.location.origin}${pathname}`);
    } catch {
      /* ignore */
    }
  }
  for (const src of candidates) probeCache.delete(src);
}

function encodeMediaPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized
    .split('/')
    .map((part, index) => {
      if (index === 0 || !part) return part;
      try {
        return encodeURIComponent(decodeURIComponent(part));
      } catch {
        return encodeURIComponent(part);
      }
    })
    .join('/');
}

/** Resolve traffic-sign media paths from the API (relative or absolute). */
export function resolveSignMediaUrl(image?: string | null): string | null {
  if (!image?.trim()) return null;
  const raw = image.trim();

  if (raw.startsWith('blob:') || raw.startsWith('data:')) {
    return raw;
  }

  // Absolute URLs (API host or Cloudflare R2 / S3) — never rewrite onto the SPA origin.
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  const path = encodeMediaPath(
    raw.startsWith('/media/')
      ? raw
      : raw.startsWith('media/')
        ? `/${raw}`
        : raw.startsWith('/')
          ? raw.startsWith('/signs/')
            ? `/media${raw}`
            : raw
          : `/media/${raw.replace(/^signs\//, 'signs/')}`,
  );

  return getProfileImageUrl(path);
}

export function signHasResolvableImage(image?: string | null): string | null {
  return resolveSignMediaUrl(image) ?? getProfileImageUrl(image);
}

/** Cache-busted URL — filename changes when sign art is re-uploaded. */
export function signImageSrc(image?: string | null): string | null {
  const base = signHasResolvableImage(image);
  if (!base || !image?.trim() || image.startsWith('blob:') || image.startsWith('data:')) {
    return base;
  }
  const raw = image.trim();
  let token = raw;
  try {
    token = raw.includes('/') ? raw.split('/').pop() || raw : raw;
  } catch {
    /* keep */
  }
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}v=${encodeURIComponent(token)}`;
}

const probeCache = new Map<string, boolean>();
const probeInflight = new Map<string, Promise<boolean>>();

/** Clear all cached probe results (call on page mount to flush stale state). */
export function clearSignMediaCache(): void {
  probeCache.clear();
}

export function isSignMediaKnownInvalid(src: string): boolean {
  return probeCache.get(src) === false;
}

export function markSignMediaInvalid(src: string): void {
  probeCache.set(src, false);
}

export function markSignMediaValid(src: string): void {
  probeCache.set(src, true);
}

/**
 * Detect generic green-circle placeholder PNGs (no real sign artwork).
 * Used sparingly after the image has loaded in the browser.
 */
export function isPlaceholderSignGraphic(img: HTMLImageElement): boolean {
  const src = img.currentSrc || img.src;
  if (src && probeCache.has(src)) {
    return probeCache.get(src) === false;
  }

  const w = 32;
  const h = 32;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  try {
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let green = 0;
    let black = 0;
    let accent = 0;
    let total = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 24) continue;
      total++;
      if (g > 90 && g > r * 1.25 && g > b * 1.1) green++;
      else if (r < 48 && g < 48 && b < 48) black++;
      else if (r > 160 || b > 160 || (r > 110 && g < 90)) accent++;
    }

    if (total < 40) return true;
    const greenRatio = green / total;
    const blackRatio = black / total;
    const accentRatio = accent / total;
    const isPlaceholder =
      (greenRatio > 0.55 && accentRatio < 0.08)
      || (accentRatio < 0.07 && greenRatio > 0.12 && blackRatio > 0.18);
    if (src) probeCache.set(src, !isPlaceholder);
    return isPlaceholder;
  } catch {
    return false;
  }
}

export function probeSignMediaUrl(src: string): Promise<boolean> {
  if (probeCache.has(src)) {
    return Promise.resolve(probeCache.get(src)!);
  }
  const pending = probeInflight.get(src);
  if (pending) return pending;

  const promise = new Promise<boolean>(resolve => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < 48 || img.naturalHeight < 48) {
        probeCache.set(src, false);
        resolve(false);
        return;
      }
      const ok = !isPlaceholderSignGraphic(img);
      probeCache.set(src, ok);
      resolve(ok);
    };
    img.onerror = () => {
      probeCache.set(src, false);
      resolve(false);
    };
    img.src = src;
  }).finally(() => {
    probeInflight.delete(src);
  });

  probeInflight.set(src, promise);
  return promise;
}

/** Probe many URLs with limited parallelism (optional; prefer lazy img + cache). */
export async function probeSignMediaUrls(
  srcs: string[],
  concurrency = 16,
): Promise<Set<string>> {
  const valid = new Set<string>();
  const queue = [...new Set(srcs.filter(Boolean))];

  async function worker() {
    while (queue.length > 0) {
      const src = queue.shift();
      if (!src) break;
      if (await probeSignMediaUrl(src)) valid.add(src);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length || 1) }, () => worker()),
  );
  return valid;
}
