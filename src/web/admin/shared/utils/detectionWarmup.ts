import { aiAPI } from '@shared/services/api';

/** Shared YOLO warmup — one in-flight request, skip when already warm. */
let warmPromise: Promise<void> | null = null;
let warmReady = false;

export function ensureDetectionWarm(): Promise<void> {
  if (warmReady) return Promise.resolve();
  if (!warmPromise) {
    warmPromise = aiAPI
      .warmup()
      .then(() => {
        warmReady = true;
      })
      .catch(() => {
        warmPromise = null;
      })
      .then(() => undefined);
  }
  return warmPromise ?? Promise.resolve();
}

/** Fire-and-forget warm (page idle / parallel with Detect). */
export function kickDetectionWarm(): void {
  void ensureDetectionWarm();
}
