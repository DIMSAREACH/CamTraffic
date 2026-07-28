import { useEffect, useRef } from 'react';

/** Poll a data loader on an interval for near-real-time list pages.
 * Does not run on mount — pair with an initial useEffect load to avoid
 * double-fetching that burns API rate limits under React StrictMode.
 * Skips ticks while the browser tab is hidden.
 */
export function useLiveData(
  loader: () => void | Promise<void>,
  intervalMs = 30_000,
  enabled = true,
) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) return undefined;

    let timeoutId = 0;
    let cancelled = false;
    let nextDelay = intervalMs;

    const runLoader = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return Promise.resolve();
      }
      return Promise.resolve(loaderRef.current());
    };

    const schedule = (delay: number) => {
      timeoutId = window.setTimeout(async () => {
        if (cancelled) return;
        try {
          await runLoader();
          nextDelay = intervalMs;
        } catch {
          // Back off harder on failures (including 429 throttle).
          nextDelay = Math.min(Math.max(nextDelay * 2, intervalMs), 300_000);
        }
        schedule(nextDelay);
      }, delay);
    };

    const onVisibility = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      void runLoader();
    };

    document.addEventListener('visibilitychange', onVisibility);
    schedule(intervalMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
