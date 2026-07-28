/** Prepare profile photo — sharp resize, minimal re-compression. */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.95;

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

export async function prepareProfileImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image (JPG, PNG, or WEBP)');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Image must be 25MB or smaller');
  }

  if (file.type === 'image/gif') {
    return file;
  }

  const img = await loadImage(file);
  const longest = Math.max(img.width, img.height);

  // Skip re-encode when already small and sharp enough for avatars
  if (
    longest <= MAX_EDGE &&
    file.size <= 2 * 1024 * 1024 &&
    (file.type === 'image/jpeg' || file.type === 'image/webp')
  ) {
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / longest);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });
  if (!blob) throw new Error('Could not compress image');

  const base = file.name.replace(/\.[^.]+$/, '') || 'profile';
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}
