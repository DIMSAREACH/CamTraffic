import { useCallback, useEffect, useState, type RefObject } from 'react';
import {
  SIGN_REGION_FRACTION,
  computeSignRegionRect,
  type SignRegionRect,
} from '@shared/utils/webcamSignRegion';

export function useWebcamSignRegionGuide(
  videoRef: RefObject<HTMLVideoElement | null>,
  stageRef: RefObject<HTMLElement | null>,
  streaming: boolean,
) {
  const [regionRect, setRegionRect] = useState<SignRegionRect | null>(null);

  const updateRegion = useCallback(() => {
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !stage || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setRegionRect(null);
      return;
    }
    setRegionRect(
      computeSignRegionRect(
        video.videoWidth,
        video.videoHeight,
        stage.clientWidth,
        stage.clientHeight,
        SIGN_REGION_FRACTION,
      ),
    );
  }, [stageRef, videoRef]);

  useEffect(() => {
    if (!streaming) {
      setRegionRect(null);
      return;
    }
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !stage) return;

    const onVideoChange = () => updateRegion();
    const ro = new ResizeObserver(onVideoChange);
    ro.observe(stage);
    video.addEventListener('loadedmetadata', onVideoChange);
    video.addEventListener('loadeddata', onVideoChange);
    video.addEventListener('resize', onVideoChange);
    window.addEventListener('orientationchange', onVideoChange);
    onVideoChange();

    return () => {
      ro.disconnect();
      video.removeEventListener('loadedmetadata', onVideoChange);
      video.removeEventListener('loadeddata', onVideoChange);
      video.removeEventListener('resize', onVideoChange);
      window.removeEventListener('orientationchange', onVideoChange);
    };
  }, [streaming, stageRef, updateRegion, videoRef]);

  return regionRect;
}
