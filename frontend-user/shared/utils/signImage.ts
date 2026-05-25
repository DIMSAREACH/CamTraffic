import type { TrafficSign } from '@shared/types';
import { getProfileImageUrl } from '@shared/utils/profileImage';

/** Normalize API image field to a stable /media/... path for URLs and probes. */
export function normalizeTrafficSign(sign: TrafficSign): TrafficSign {
  const image = sign.image?.trim();
  if (!image) return sign;
  if (image.startsWith('http')) {
    try {
      const { pathname } = new URL(image);
      if (pathname.startsWith('/media/')) return { ...sign, image: pathname };
    } catch {
      /* keep original */
    }
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
  const image = sign.image?.trim();
  if (!image) return false;
  return Boolean(signHasResolvableImage(image));
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

/** Resolve traffic-sign media paths from the API (relative or absolute). */
export function resolveSignMediaUrl(image?: string | null): string | null {
  if (!image?.trim()) return null;
  const raw = image.trim();

  if (raw.startsWith('http') || raw.startsWith('blob:') || raw.startsWith('data:')) {
    if (typeof window !== 'undefined') {
      try {
        const parsed = new URL(raw);
        if (parsed.pathname.startsWith('/media/')) {
          return `${window.location.origin}${parsed.pathname}`;
        }
      } catch {
        /* use raw */
      }
    }
    return raw;
  }

  const path = raw.startsWith('/media/')
    ? raw
    : raw.startsWith('media/')
      ? `/${raw}`
      : raw.startsWith('/')
        ? raw.startsWith('/signs/')
          ? `/media${raw}`
          : raw
        : `/media/${raw.replace(/^signs\//, 'signs/')}`;

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }

  const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
  const origin = apiBase.replace(/\/api\/?$/, '') || 'http://127.0.0.1:8000';
  return `${origin}${path}`;
}

export function signHasResolvableImage(image?: string | null): string | null {
  return resolveSignMediaUrl(image) ?? getProfileImageUrl(image);
}

const probeCache = new Map<string, boolean>();
const probeInflight = new Map<string, Promise<boolean>>();

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
