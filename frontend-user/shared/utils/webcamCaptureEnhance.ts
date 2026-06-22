function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** Optional mild contrast for saved uploads only — live scans skip this for sharpness. */
export function enhanceWebcamCaptureLight(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minL = 255;
  let maxL = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    if (lum < minL) minL = lum;
    if (lum > maxL) maxL = lum;
  }

  const range = Math.max(48, maxL - minL);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const stretched = ((data[i + c] - minL) / range) * 255;
      data[i + c] = clampByte((stretched - 128) * 1.04 + 128);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function sharpenWebcamCapture(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;
  const out = new Uint8ClampedArray(src);
  const w = width;
  const h = height;
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const idx = ((y + ky) * w + (x + kx)) * 4 + c;
            sum += src[idx] * kernel[ki];
            ki += 1;
          }
        }
        out[(y * w + x) * 4 + c] = clampByte(sum);
      }
    }
  }

  imageData.data.set(out);
  ctx.putImageData(imageData, 0, 0);
}

/** Contrast + brightness normalization + light sharpen for webcam ROI captures. */
export function enhanceWebcamCapture(ctx: CanvasRenderingContext2D, width: number, height: number) {
  enhanceWebcamCaptureLight(ctx, width, height);
  sharpenWebcamCapture(ctx, width, height);
}
