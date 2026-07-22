/**
 * Webcam frame capture — always uses the raw camera pixels (no horizontal mirror).
 * Preview and detection share the same orientation so signs match real life.
 */
import {
  SIGN_REGION_FRACTION,
  computeSignCropSource,
} from '@shared/utils/webcamSignRegion';
import type { OverlayDetectionInput } from '@shared/utils/detectionOverlay';
import { buildDetectionOverlay } from '@shared/utils/detectionOverlay';
import { enhanceWebcamCapture } from '@shared/utils/webcamCaptureEnhance';

/** Live preview and captures are never mirrored. */
export const WEBCAM_MIRROR_PREVIEW = false;

export type FacingMode = 'user' | 'environment' | 'unknown';

export function getVideoFacingMode(stream: MediaStream | null): FacingMode {
  const track = stream?.getVideoTracks()[0];
  const facing = track?.getSettings?.().facingMode;
  if (facing === 'user' || facing === 'environment') {
    return facing;
  }
  return 'unknown';
}

export function drawVideoRegion(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  options?: { mirror?: boolean },
) {
  const mirror = options?.mirror ?? false;
  if (!mirror) {
    ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
    return;
  }
  ctx.save();
  ctx.translate(dx + dw, dy);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
  ctx.restore();
}

export type CapturedWebcamFrame = {
  file: File;
  previewUrl: string;
  blob: Blob;
};

export async function captureSignRegionFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  options?: { quality?: number; filenamePrefix?: string; enhance?: boolean },
): Promise<CapturedWebcamFrame | null> {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return null;
  }
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) return null;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const { sx, sy, cropSize } = computeSignCropSource(vw, vh, SIGN_REGION_FRACTION);

  canvas.width = cropSize;
  canvas.height = cropSize;
  ctx.imageSmoothingEnabled = false;
  drawVideoRegion(ctx, video, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize, {
    mirror: WEBCAM_MIRROR_PREVIEW,
  });

  const shouldEnhance = options?.enhance !== false;
  if (shouldEnhance) {
    enhanceWebcamCapture(ctx, cropSize, cropSize);
  }

  const quality = options?.quality ?? 0.97;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not encode frame'))),
      'image/jpeg',
      quality,
    );
  });
  const prefix = options?.filenamePrefix ?? 'webcam';
  const file = new File([blob], `${prefix}-${Date.now()}.jpg`, { type: 'image/jpeg' });
  return { file, previewUrl: URL.createObjectURL(blob), blob };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = url;
  });
}

/** Draw detection boxes on a captured (non-mirrored) frame for evidence preview. */
export async function drawAnnotatedDetectionFrame(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  result: OverlayDetectionInput | null | undefined,
  locale: 'en' | 'km',
): Promise<void> {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const img = await loadImage(imageUrl);
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const items = buildDetectionOverlay(result, locale);
  const w = canvas.width;
  const h = canvas.height;

  for (const item of items) {
    const x = item.bbox.x1 * w;
    const y = item.bbox.y1 * h;
    const bw = (item.bbox.x2 - item.bbox.x1) * w;
    const bh = (item.bbox.y2 - item.bbox.y1) * h;

    ctx.strokeStyle = item.color;
    ctx.lineWidth = Math.max(2, Math.round(w / 180));
    ctx.fillStyle = `${item.color}22`;
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeRect(x, y, bw, bh);

    const label = item.confidence > 0
      ? `${item.label} ${item.confidence.toFixed(0)}%`
      : item.label;
    const fontSize = Math.max(11, Math.round(w / 28));
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    const textW = ctx.measureText(label).width;
    const pad = 4;
    const labelH = fontSize + pad * 2;
    const labelY = y >= labelH + 2 ? y - labelH - 2 : y + 2;
    ctx.fillStyle = item.color;
    ctx.fillRect(x, labelY, textW + pad * 2, labelH);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x + pad, labelY + fontSize);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
