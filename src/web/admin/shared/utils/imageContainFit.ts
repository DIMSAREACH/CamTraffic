/** Pixel rect of the painted media inside an element using object-fit: contain. */
export interface ContainFitRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function getObjectFitContainRect(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number,
): ContainFitRect {
  if (!(containerW > 0 && containerH > 0 && naturalW > 0 && naturalH > 0)) {
    return { left: 0, top: 0, width: Math.max(0, containerW), height: Math.max(0, containerH) };
  }
  const scale = Math.min(containerW / naturalW, containerH / naturalH);
  const width = naturalW * scale;
  const height = naturalH * scale;
  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
  };
}

export function mediaNaturalSize(
  el: HTMLImageElement | HTMLVideoElement,
): { width: number; height: number } {
  if (el instanceof HTMLVideoElement) {
    return { width: el.videoWidth || 0, height: el.videoHeight || 0 };
  }
  return { width: el.naturalWidth || 0, height: el.naturalHeight || 0 };
}
