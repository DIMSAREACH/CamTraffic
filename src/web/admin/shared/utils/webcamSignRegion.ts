/** Fraction of the min(video width, height) used for sign capture — keep in sync with UI guide. */
export const SIGN_REGION_FRACTION = 0.78;

export type SignRegionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type VideoContainLayout = {
  scale: number;
  displayWidth: number;
  displayHeight: number;
  offsetX: number;
  offsetY: number;
};

/** How object-contain lays out the video inside its container. */
export function computeVideoObjectContainLayout(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
): VideoContainLayout {
  const scale = Math.min(containerWidth / videoWidth, containerHeight / videoHeight);
  const displayWidth = videoWidth * scale;
  const displayHeight = videoHeight * scale;
  return {
    scale,
    displayWidth,
    displayHeight,
    offsetX: (containerWidth - displayWidth) / 2,
    offsetY: (containerHeight - displayHeight) / 2,
  };
}

/** Source crop in native video pixels (matches canvas capture). */
export function computeSignCropSource(
  videoWidth: number,
  videoHeight: number,
  fraction = SIGN_REGION_FRACTION,
) {
  const cropSize = Math.round(Math.min(videoWidth, videoHeight) * fraction);
  return {
    sx: Math.round((videoWidth - cropSize) / 2),
    sy: Math.round((videoHeight - cropSize) / 2),
    cropSize,
  };
}

/** Guide box rect in container pixels — aligned with captureSignRegion(). */
export function computeSignRegionRect(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
  fraction = SIGN_REGION_FRACTION,
): SignRegionRect | null {
  if (!videoWidth || !videoHeight || !containerWidth || !containerHeight) {
    return null;
  }
  const { sx, sy, cropSize } = computeSignCropSource(videoWidth, videoHeight, fraction);
  const layout = computeVideoObjectContainLayout(
    videoWidth,
    videoHeight,
    containerWidth,
    containerHeight,
  );
  return {
    left: layout.offsetX + sx * layout.scale,
    top: layout.offsetY + sy * layout.scale,
    width: cropSize * layout.scale,
    height: cropSize * layout.scale,
  };
}
