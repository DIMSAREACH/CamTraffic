import type { Camera } from '@shared/types';

const VIDEO_URL_RE = /\.(webm|mp4|mov|avi|mkv|m4v)(\?|#|$)/i;

/** True when the frame URL is a playable video stream (not a still snapshot). */
export function isCameraVideoUrl(url?: string | null): boolean {
  return VIDEO_URL_RE.test((url || '').trim());
}

/**
 * Thesis/demo CCTV stills → looping traffic video under MEDIA.
 * Only used when VITE_ALLOW_DEMO_ASSETS=true in development.
 */
const CCTV_STILL_TO_VIDEO: Record<string, string> = {
  '/media/cctv/monivong-intersection.jpg': '/media/demo-cameras/pp-chaktomuk-traffic.webm',
  '/media/cctv/monivong-ptz.jpg': '/media/demo-cameras/pp-riverside-traffic.webm',
  '/media/cctv/nr6-highway.jpg': '/media/demo-cameras/pp-riverside-traffic.webm',
  '/media/demo-cameras/monivong-intersection.jpg': '/media/demo-cameras/pp-chaktomuk-traffic.webm',
  '/media/demo-cameras/monivong-ptz.jpg': '/media/demo-cameras/pp-riverside-traffic.webm',
  '/media/demo-cameras/nr6-highway.jpg': '/media/demo-cameras/pp-riverside-traffic.webm',
};

/** Bundled CCTV snapshots in /public/demo-cameras — DEV + VITE_ALLOW_DEMO_ASSETS only. */
const DEMO_FRAMES_BY_CODE: Record<string, string> = {
  'CAM-PP-001': '/demo-cameras/pp-chaktomuk-traffic.webm',
  'LAN-PP-001': '/demo-cameras/pp-chaktomuk-traffic.webm',
  'CAM-PP-002': '/demo-cameras/pp-riverside-traffic.webm',
  'CAM-KD-001': '/demo-cameras/nr6-highway.jpg',
};

const DEMO_FRAMES_BY_ID: Record<string, string> = {
  '1': '/demo-cameras/pp-chaktomuk-traffic.webm',
  '2': '/demo-cameras/pp-riverside-traffic.webm',
  '3': '/demo-cameras/nr6-highway.jpg',
};

const ALLOW_DEMO_ASSETS =
  import.meta.env.DEV === true && import.meta.env.VITE_ALLOW_DEMO_ASSETS === 'true';

function upgradeStillToVideo(url: string): string {
  if (!ALLOW_DEMO_ASSETS) return url;
  const raw = url.trim();
  if (!raw || isCameraVideoUrl(raw)) return raw;
  if (CCTV_STILL_TO_VIDEO[raw]) return CCTV_STILL_TO_VIDEO[raw];
  for (const [still, video] of Object.entries(CCTV_STILL_TO_VIDEO)) {
    if (raw.endsWith(still) || raw.endsWith(still.split('/').pop() || '')) return video;
  }
  return raw;
}

function resolvePublicPath(path: string): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${prefix}${normalized}`;
  }
  return normalized;
}

export function demoCameraFramePath(camera: Pick<Camera, 'id' | 'code'>): string | null {
  if (!ALLOW_DEMO_ASSETS) return null;
  const code = camera.code?.trim().toUpperCase();
  if (code && DEMO_FRAMES_BY_CODE[code]) return DEMO_FRAMES_BY_CODE[code];
  return DEMO_FRAMES_BY_ID[String(camera.id)] ?? null;
}

function shouldReplaceFrameUrl(url?: string | null): boolean {
  const u = url?.trim() || '';
  if (!u) return true;
  return u.includes('picsum.photos') || u.includes('placeholder.com');
}

/** Resolve camera snapshot/video URL from API/media. Demo art only when explicitly allowed. */
export function resolveCameraFrameUrl(
  frameUrl?: string | null,
  camera?: Pick<Camera, 'id' | 'code'>,
): string {
  const demo = camera ? demoCameraFramePath(camera) : null;
  const raw = upgradeStillToVideo(frameUrl?.trim() || '');

  if (ALLOW_DEMO_ASSETS && shouldReplaceFrameUrl(raw) && demo) {
    return resolvePublicPath(demo);
  }
  if (ALLOW_DEMO_ASSETS && !raw && demo) {
    return resolvePublicPath(demo);
  }
  // Bundled thesis streams — blocked in production builds.
  if (raw.includes('/demo-cameras/') || raw.includes('demo-cameras/')) {
    if (!ALLOW_DEMO_ASSETS) return '';
    if (raw.startsWith('/media/') || raw.startsWith('media/')) {
      return resolvePublicPath(raw.startsWith('/') ? raw : `/${raw}`);
    }
    return resolvePublicPath(raw.startsWith('/') ? raw : `/${raw}`);
  }
  if (raw.startsWith('http') || raw.startsWith('blob:') || raw.startsWith('data:') || raw.startsWith('rtsp:')) {
    return raw;
  }
  return resolvePublicPath(raw);
}

/** True when the visible frame is bundled demo art (not a live RTSP/HTTP snapshot). */
export function isDemoCameraFrame(
  frameUrl?: string | null,
  camera?: Pick<Camera, 'id' | 'code'>,
): boolean {
  const raw = frameUrl?.trim() || '';
  const resolved = resolveCameraFrameUrl(frameUrl, camera);
  if (raw.includes('/demo-cameras/') || resolved.includes('/demo-cameras/')) return true;
  if (raw.includes('/media/demo-cameras/') || resolved.includes('/media/demo-cameras/')) return true;
  if (!ALLOW_DEMO_ASSETS) return false;
  if (shouldReplaceFrameUrl(raw) && camera && demoCameraFramePath(camera)) return true;
  if (!raw && camera && demoCameraFramePath(camera)) return true;
  return false;
}

export function normalizeCameraFrames(cameras: Camera[]): Camera[] {
  if (!ALLOW_DEMO_ASSETS) return cameras;
  return cameras.map((cam) => {
    const demo = demoCameraFramePath(cam);
    if (!demo || !shouldReplaceFrameUrl(cam.frame_source_url)) return cam;
    return { ...cam, frame_source_url: demo };
  });
}
