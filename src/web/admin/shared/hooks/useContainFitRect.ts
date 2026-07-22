import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import {
  getObjectFitContainRect,
  mediaNaturalSize,
  type ContainFitRect,
} from '@shared/utils/imageContainFit';

/** Track object-fit:contain content rect for an <img> or <video>. */
export function useContainFitRect(
  mediaRef: RefObject<HTMLImageElement | HTMLVideoElement | null>,
  active = true,
): ContainFitRect | null {
  const [fit, setFit] = useState<ContainFitRect | null>(null);

  const update = useCallback(() => {
    const el = mediaRef.current;
    if (!el || !active) {
      setFit(null);
      return;
    }
    const { width: nw, height: nh } = mediaNaturalSize(el);
    setFit(getObjectFitContainRect(el.clientWidth, el.clientHeight, nw, nh));
  }, [mediaRef, active]);

  useLayoutEffect(() => {
    if (!active) {
      setFit(null);
      return undefined;
    }
    const el = mediaRef.current;
    if (!el) return undefined;

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    el.addEventListener('load', update);
    el.addEventListener('loadedmetadata', update);
    el.addEventListener('loadeddata', update);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      el.removeEventListener('load', update);
      el.removeEventListener('loadedmetadata', update);
      el.removeEventListener('loadeddata', update);
      window.removeEventListener('resize', update);
    };
  }, [active, mediaRef, update]);

  return fit;
}
