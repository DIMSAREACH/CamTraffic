import { useEffect, useRef } from 'react';

/** Poll a data loader on an interval for near-real-time list pages. */
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
          nextDelay = Math.min(Math.max(nextDelay * 2, intervalMs), 120_000);
        }
        schedule(nextDelay);
      }, delay);
    };

    void runLoader().catch(() => {
      nextDelay = Math.min(intervalMs * 2, 120_000);
    });
    schedule(intervalMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [intervalMs, enabled]);
}
