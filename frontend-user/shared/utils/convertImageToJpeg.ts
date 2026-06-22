const NATIVE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp']);
const MAX_UPLOAD_EDGE = 1280;
const RESIZE_BYTE_THRESHOLD = 500_000;

function fileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read this image format in the browser.'));
      el.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToJpegFile(
  img: HTMLImageElement,
  fileName: string,
  maxEdge = MAX_UPLOAD_EDGE,
): Promise<File> {
  let { naturalWidth: w, naturalHeight: h } = img;
  const longest = Math.max(w, h);
  if (longest > maxEdge) {
    const scale = maxEdge / longest;
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.9);
  });
  if (!blob) throw new Error('Could not convert image to JPEG.');

  const base = fileName.replace(/\.[^.]+$/, '') || 'upload';
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

/** Normalize uploads for faster AI detection (JPEG, capped resolution). */
export async function convertImageToJpeg(file: File): Promise<File> {
  const ext = fileExtension(file.name);
  const needsConversion = !NATIVE_EXTENSIONS.has(ext)
    || file.type === 'image/avif'
    || file.type === 'image/heic';

  if (needsConversion) {
    const img = await loadImage(file);
    return canvasToJpegFile(img, file.name);
  }

  if (file.size <= RESIZE_BYTE_THRESHOLD) {
    return file;
  }

  const img = await loadImage(file);
  if (Math.max(img.naturalWidth, img.naturalHeight) <= MAX_UPLOAD_EDGE) {
    return file;
  }

  return canvasToJpegFile(img, file.name);
}
