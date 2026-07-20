/** API origin for /media paths when admin/user static sites call a separate API host. */
function apiMediaOrigin(): string {
  const apiBase = import.meta.env.VITE_API_URL || '/api';
  if (typeof apiBase === 'string' && apiBase.startsWith('http')) {
    return apiBase.replace(/\/api\/?$/, '') || apiBase;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://127.0.0.1:8000';
}

/** Browser-loadable URL for Django /media paths (cross-origin API + static SPA). */
function resolveMediaPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized.startsWith('/media/')) {
    return `${apiMediaOrigin()}${normalized}`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${normalized}`;
  }
  return normalized;
}

/** Resolve profile_image or API media fields to a browser-loadable URL. */
export function getProfileImageUrl(profileImage?: string | null): string | null {
  if (!profileImage) return null;
  if (profileImage.startsWith('blob:') || profileImage.startsWith('data:')) {
    return profileImage;
  }

  if (/^https?:\/\//i.test(profileImage)) {
    return profileImage;
  }

  return resolveMediaPath(profileImage);
}

const DETECTION_MEDIA_FIELDS = [
  'uploaded_image',
  'vehicle_snapshot',
  'plate_snapshot',
  'sign_crop_image',
  'processed_image',
  'annotated_processed_image',
  'guide_frame_image',
] as const;

/** Rewrite Django media URLs on detection API payloads for the SPA origin. */
export function normalizeDetectionMedia<T extends Record<string, unknown>>(result: T): T {
  const next = { ...result } as T & Record<string, unknown>;
  for (const key of DETECTION_MEDIA_FIELDS) {
    const value = next[key];
    if (typeof value === 'string' && value) {
      next[key] = getProfileImageUrl(value) || value;
    }
  }
  return next as T;
}

/** URL with cache-bust query from stored path (filename changes on re-upload). */
export function getProfileImageSrc(profileImage?: string | null): string | null {
  const base = getProfileImageUrl(profileImage);
  if (!base || !profileImage || profileImage.startsWith('blob:') || profileImage.startsWith('data:')) {
    return base;
  }
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}v=${encodeURIComponent(profileImage)}`;
}
