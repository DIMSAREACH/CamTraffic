import { useEffect, useRef } from 'react';

/** Poll a data loader on an interval for near-real-time list pages.
 * Does not run on mount — pair with an initial useEffect load to avoid
 * double-fetching that burns API rate limits under React StrictMode.
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

    const runLoader = () => Promise.resolve(loaderRef.current());

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

    schedule(intervalMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [intervalMs, enabled]);
}
