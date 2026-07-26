/** Capture the currently displayed <video> or <img> frame as a JPEG File for AI detect. */

export interface CaptureMediaFrameOptions {
  maxEdge?: number;
  quality?: number;
  filenamePrefix?: string;
}

export async function captureMediaFrame(
  el: HTMLVideoElement | HTMLImageElement | null | undefined,
  options: CaptureMediaFrameOptions = {},
): Promise<File | null> {
  const maxEdge = options.maxEdge ?? 960;
  const quality = options.quality ?? 0.85;
  const filenamePrefix = options.filenamePrefix ?? 'live-frame';

  if (!el) return null;

  let srcW = 0;
  let srcH = 0;
  if (el instanceof HTMLVideoElement) {
    srcW = el.videoWidth;
    srcH = el.videoHeight;
    if (!srcW || !srcH || el.readyState < 2) return null;
  } else {
    srcW = el.naturalWidth;
    srcH = el.naturalHeight;
    if (!srcW || !srcH) return null;
  }

  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(srcW * scale));
  canvas.height = Math.max(1, Math.round(srcH * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(el, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
  });
  if (!blob) return null;

  const ts = el instanceof HTMLVideoElement
    ? `t${el.currentTime.toFixed(2)}`
    : 'img';
  return new File([blob], `${filenamePrefix}-${ts}-${Date.now()}.jpg`, { type: 'image/jpeg' });
}
