import type { Camera } from '@shared/types';

/** Bundled demo frames in /public/demo-cameras (reliable offline preview). */
const DEMO_FRAMES_BY_CODE: Record<string, string> = {
  'CAM-PP-001': '/demo-cameras/monivong-intersection.jpg',
  'LAN-PP-001': '/demo-cameras/monivong-intersection.jpg',
  'CAM-PP-002': '/demo-cameras/monivong-ptz.jpg',
  'CAM-KD-001': '/demo-cameras/nr6-highway.jpg',
};

const DEMO_FRAMES_BY_ID: Record<string, string> = {
  '1': '/demo-cameras/monivong-intersection.jpg',
  '2': '/demo-cameras/monivong-ptz.jpg',
  '3': '/demo-cameras/nr6-highway.jpg',
};

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
  const code = camera.code?.trim().toUpperCase();
  if (code && DEMO_FRAMES_BY_CODE[code]) return DEMO_FRAMES_BY_CODE[code];
  return DEMO_FRAMES_BY_ID[String(camera.id)] ?? null;
}

function shouldReplaceFrameUrl(url?: string | null): boolean {
  const u = url?.trim() || '';
  if (!u) return true;
  return u.includes('picsum.photos') || u.includes('placeholder.com');
}

/** Resolve camera snapshot URL — prefers local demo art when API URL is missing or unreliable. */
export function resolveCameraFrameUrl(
  frameUrl?: string | null,
  camera?: Pick<Camera, 'id' | 'code'>,
): string {
  const demo = camera ? demoCameraFramePath(camera) : null;
  const raw = frameUrl?.trim() || '';

  if (shouldReplaceFrameUrl(raw) && demo) {
    return resolvePublicPath(demo);
  }
  if (!raw && demo) {
    return resolvePublicPath(demo);
  }
  if (raw.startsWith('http') || raw.startsWith('blob:') || raw.startsWith('data:')) {
    return raw;
  }
  return resolvePublicPath(raw);
}

export function normalizeCameraFrames(cameras: Camera[]): Camera[] {
  return cameras.map((cam) => {
    const demo = demoCameraFramePath(cam);
    if (!demo || !shouldReplaceFrameUrl(cam.frame_source_url)) return cam;
    return { ...cam, frame_source_url: demo };
  });
}
