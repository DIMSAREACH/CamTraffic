import { useEffect, useState, type RefObject } from 'react';

/** Track live video FPS and native resolution (non-mirrored stream). */
export function useVideoStreamStats(
  videoRef: RefObject<HTMLVideoElement | null>,
  active: boolean,
) {
  const [fps, setFps] = useState(0);
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    if (!active) {
      setFps(0);
      setResolution('');
      return undefined;
    }

    let raf = 0;
    let frames = 0;
    let lastFpsUpdate = performance.now();

    const tick = (now: number) => {
      const video = videoRef.current;
      frames += 1;
      if (video?.videoWidth && video.videoHeight) {
        setResolution(`${video.videoWidth}×${video.videoHeight}`);
      }
      if (now - lastFpsUpdate >= 500) {
        setFps(Math.round((frames * 1000) / (now - lastFpsUpdate)));
        frames = 0;
        lastFpsUpdate = now;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, videoRef]);

  return { fps, resolution };
}
