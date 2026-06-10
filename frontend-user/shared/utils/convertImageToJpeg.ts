const NATIVE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp']);

function fileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

/** Convert AVIF/HEIC/GIF/etc. to JPEG using the browser canvas (preview must be decodable). */
export async function convertImageToJpeg(file: File): Promise<File> {
  const ext = fileExtension(file.name);
  if (NATIVE_EXTENSIONS.has(ext) && file.type !== 'image/avif' && file.type !== 'image/heic') {
    return file;
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read this image format in the browser.'));
      el.src = url;
    });

    const maxEdge = 2560;
    let { naturalWidth: w, naturalHeight: h } = img;
    if (w > maxEdge || h > maxEdge) {
      const scale = maxEdge / Math.max(w, h);
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
      canvas.toBlob(resolve, 'image/jpeg', 0.92);
    });
    if (!blob) throw new Error('Could not convert image to JPEG.');

    const base = file.name.replace(/\.[^.]+$/, '') || 'upload';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}
