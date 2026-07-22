/** Square crop for circular profile avatars (pan + zoom in viewport). */

export const CROP_VIEW_SIZE = 280;
export const CROP_OUTPUT_SIZE = 512;
const JPEG_QUALITY = 0.92;

export type CropTransform = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

export function getCropScale(imgW: number, imgH: number, zoom: number) {
  const baseScale = Math.max(CROP_VIEW_SIZE / imgW, CROP_VIEW_SIZE / imgH);
  return baseScale * zoom;
}

export function getDisplaySize(imgW: number, imgH: number, zoom: number) {
  const scale = getCropScale(imgW, imgH, zoom);
  return { width: imgW * scale, height: imgH * scale, scale };
}

export function clampCropOffset(
  offsetX: number,
  offsetY: number,
  imgW: number,
  imgH: number,
  zoom: number,
) {
  const { width, height } = getDisplaySize(imgW, imgH, zoom);
  const minX = CROP_VIEW_SIZE - width;
  const minY = CROP_VIEW_SIZE - height;
  return {
    offsetX: Math.min(0, Math.max(minX, offsetX)),
    offsetY: Math.min(0, Math.max(minY, offsetY)),
  };
}

export function getInitialCropOffset(imgW: number, imgH: number, zoom = 1) {
  const { width, height } = getDisplaySize(imgW, imgH, zoom);
  return clampCropOffset((CROP_VIEW_SIZE - width) / 2, (CROP_VIEW_SIZE - height) / 2, imgW, imgH, zoom);
}

function getCropRect(imgW: number, imgH: number, transform: CropTransform) {
  const { scale } = getDisplaySize(imgW, imgH, transform.zoom);
  const centerX = (CROP_VIEW_SIZE / 2 - transform.offsetX) / scale;
  const centerY = (CROP_VIEW_SIZE / 2 - transform.offsetY) / scale;
  const side = CROP_VIEW_SIZE / scale;

  let x = centerX - side / 2;
  let y = centerY - side / 2;

  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + side > imgW) x = Math.max(0, imgW - side);
  if (y + side > imgH) y = Math.max(0, imgH - side);

  const cropW = Math.min(side, imgW - x);
  const cropH = Math.min(side, imgH - y);
  const cropSide = Math.min(cropW, cropH);

  return { x, y, size: cropSide };
}

export async function cropProfileImageFile(file: File, transform: CropTransform): Promise<File> {
  const img = await loadImage(file);
  const { x, y, size } = getCropRect(img.naturalWidth, img.naturalHeight, transform);

  const canvas = document.createElement('canvas');
  canvas.width = CROP_OUTPUT_SIZE;
  canvas.height = CROP_OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, size, size, 0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });
  if (!blob) throw new Error('Could not crop image');

  const base = file.name.replace(/\.[^.]+$/, '') || 'profile';
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}
