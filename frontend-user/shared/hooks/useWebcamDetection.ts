import { useCallback, useEffect, useRef, useState } from 'react';
import { aiAPI } from '@shared/services/api';
import { SIGN_REGION_FRACTION } from '@shared/utils/webcamSignRegion';
import {
  captureSignRegionFrame,
  downloadBlob,
  getVideoFacingMode,
  type FacingMode,
} from '@shared/utils/webcamFrame';
import { normalizeDetectionSign } from '@shared/utils/detectionDisplay';
import type { DetectPipelineOptions } from '@shared/constants/observedActions';

export { SIGN_REGION_FRACTION };

export interface VehicleDetectionItem {
  vehicle_type: string;
  label: string;
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  track_id?: number;
}

export interface LocalizationDebug {
  found?: boolean;
  method?: string;
  guide_size?: string;
  crop_size?: string;
  bbox?: { x1: number; y1: number; x2: number; y2: number };
  red_ratio?: number;
  circle_score?: number;
  sign_code?: string;
  yolo_class_key?: string;
  yolo_class_id?: number | null;
  yolo_class_name?: string;
  yolo_confidence?: number;
  confidence?: number;
}

export interface WebcamDetectionResult {
  sign_name: string;
  sign_name_km?: string;
  sign_name_en?: string;
  sign_code?: string;
  class_key?: string;
  category?: string;
  confidence: number;
  description: string;
  description_en?: string;
  guidance: string;
  guidance_en?: string;
  processing_time: number;
  log_id?: number;
  uploaded_image?: string;
  vehicles?: VehicleDetectionItem[];
  vehicle_count?: number;
  detected_plate?: string;
  plate_confidence?: number;
  display_title_en?: string;
  display_title_km?: string;
  display_confidence?: number;
  sign_present?: boolean;
  detection_mode?: 'sign' | 'vehicle' | 'plate' | 'unknown_sign' | 'no_sign';
  detection_engine?: string;
  sign_bbox?: { x1: number; y1: number; x2: number; y2: number };
  crop_size?: string;
  localization_debug?: LocalizationDebug;
  guide_frame_image?: string;
  sign_crop_image?: string;
  processed_image?: string;
  annotated_processed_image?: string;
  pipeline_trace?: LocalizationDebug;
  live_preview?: boolean;
  track_session?: string;
  vehicle_tracking_enabled?: boolean;
}

export const LIVE_VOTE_WINDOW = 5;
export const LIVE_VOTE_MIN_AGREE = 3;

const LOOP_GAP_MS = 40;
const LOOP_GAP_NO_SIGN_MS = 180;
const SCAN_RETRIES = 1;
const SCAN_RETRY_DELAY_MS = 200;
const VOTE_WINDOW = LIVE_VOTE_WINDOW;
const VOTE_MIN_AGREE = LIVE_VOTE_MIN_AGREE;
const SOFT_VOTE_WINDOW = 5;
const SOFT_VOTE_MIN_AGREE = 3;
const SOFT_VOTE_MIN_CONF = 42;
const CLEAR_MISS_STREAK = 8;
const LOCKED_CLEAR_MISS_STREAK = 12;
const SIGN_SWITCH_STREAK = 2;
const STABLE_MIN_CONF = 50;
const FAST_STABLE_CONF = 55;
const INSTANT_LOCK_CONF = 62;
const PREVIEW_MIN_CONF = 48;
const DISPLAY_MIN_CONF = 48;
/** Manual Scan Frame — show on one click when backend returns a named sign. */
const MANUAL_SCAN_MIN_CONF = 45;
const SCAN_ONCE_BURST = 5;
const SCAN_ONCE_BURST_GAP_MS = 140;
const SCAN_ONCE_BURST_MIN = 3;

/** Always capture 1:1 native pixels — no upscale (upscale = blur). */
const LIVE_JPEG_QUALITY = 0.97;
const SAVE_JPEG_QUALITY = 0.97;

type PipelineStageId = 'webcam' | 'opencv' | 'vote' | 'yolo' | 'result';

type VoteSlot = {
  signKey: string;
  result: WebcamDetectionResult;
  previewUrl: string;
};

type CapturedFrame = {
  file: File;
  previewUrl: string;
  blob: Blob;
};

async function captureSignRegion(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  saveLog = false,
): Promise<CapturedFrame | null> {
  const quality = saveLog ? SAVE_JPEG_QUALITY : LIVE_JPEG_QUALITY;
  const captured = await captureSignRegionFrame(video, canvas, {
    quality,
    filenamePrefix: saveLog ? 'webcam-evidence' : 'webcam',
  });
  if (!captured) return null;
  return captured;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableScanError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ECONNRESET|network error|cannot reach|busy|timeout|503|502|504|failed to fetch/i.test(msg);
}

async function detectWithRetry(
  file: File,
  liveScan: boolean,
  trackSession?: string,
  saveLog = false,
  pipelineOptions?: DetectPipelineOptions,
  debugMode = false,
): Promise<WebcamDetectionResult> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < SCAN_RETRIES; attempt += 1) {
    try {
      const raw = await aiAPI.detect(file, {
        live_scan: liveScan && !saveLog,
        live_fast: false,
        sign_only: !saveLog,
        track_session: saveLog ? undefined : trackSession,
        debug_mode: debugMode,
        observed_action: pipelineOptions?.observedAction,
        demo_violation: pipelineOptions?.observedAction
          ? undefined
          : (pipelineOptions?.demoViolation !== false ? true : undefined),
        auto_create_violation: pipelineOptions?.autoCreateViolation ? true : undefined,
      });
      return normalizeDetectionSign(raw) as WebcamDetectionResult;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (!isRetryableScanError(err) || attempt >= SCAN_RETRIES - 1) {
        throw lastError;
      }
      await sleep(SCAN_RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastError ?? new Error('Scan failed');
}

export function signKeyFromResult(res: WebcamDetectionResult): string {
  const conf = res.display_confidence ?? res.confidence ?? 0;
  const mode = res.detection_mode ?? 'sign';
  if (res.sign_present === false || mode === 'no_sign' || mode === 'unknown_sign' || conf < STABLE_MIN_CONF) {
    return 'none';
  }
  const code = (res.sign_code || res.class_key || '').trim().toUpperCase();
  return code || 'none';
}

export function isUsefulSignResult(res: WebcamDetectionResult): boolean {
  return signKeyFromResult(res) !== 'none';
}

export function isPreviewSignResult(res: WebcamDetectionResult): boolean {
  const conf = res.display_confidence ?? res.confidence ?? 0;
  return isUsefulSignResult(res) && conf >= PREVIEW_MIN_CONF;
}

export function isDisplayableSignResult(res: WebcamDetectionResult): boolean {
  const conf = res.display_confidence ?? res.confidence ?? 0;
  return isUsefulSignResult(res) && conf >= DISPLAY_MIN_CONF;
}

/** True when Scan Frame / Scan & Save should show sign name on one click. */
export function isManualScanResult(res: WebcamDetectionResult): boolean {
  const conf = res.display_confidence ?? res.confidence ?? 0;
  const mode = res.detection_mode ?? 'sign';
  if (res.sign_present === false || mode === 'no_sign' || mode === 'unknown_sign') {
    return false;
  }
  const hasName = Boolean(
    (res.sign_code || res.class_key || res.sign_name_en || res.sign_name || res.display_title_en || '').trim(),
  );
  return hasName && conf >= MANUAL_SCAN_MIN_CONF;
}

function resultConfidence(res: WebcamDetectionResult): number {
  return res.display_confidence ?? res.confidence ?? 0;
}

function burstSignKey(res: WebcamDetectionResult): string {
  const code = (res.sign_code || res.class_key || '').trim().toUpperCase();
  if (!code || res.sign_present === false || res.detection_mode === 'no_sign') {
    return 'none';
  }
  return code;
}

function aggregateBurstResults(
  items: Array<{ result: WebcamDetectionResult; previewUrl: string }>,
): WebcamDetectionResult | null {
  if (!items.length) return null;
  const tallies = new Map<string, { count: number; confSum: number; best: typeof items[0] }>();
  for (const item of items) {
    const key = burstSignKey(item.result);
    const conf = resultConfidence(item.result);
    const slot = tallies.get(key) ?? { count: 0, confSum: 0, best: item };
    slot.count += 1;
    slot.confSum += conf;
    if (conf > resultConfidence(slot.best.result)) {
      slot.best = item;
    }
    tallies.set(key, slot);
  }
  const ranked = [...tallies.entries()].sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    return (b[1].confSum / b[1].count) - (a[1].confSum / a[1].count);
  });
  const [winnerKey, winner] = ranked[0];
  if (winnerKey === 'none' || winner.count < SCAN_ONCE_BURST_MIN) {
    return null;
  }
  const avgConf = winner.confSum / winner.count;
  return {
    ...winner.best.result,
    confidence: avgConf,
    display_confidence: avgConf,
    uploaded_image: winner.best.previewUrl,
  };
}

async function captureBurstDetections(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  opts: {
    saveLog: boolean;
    trackSession?: string;
    pipelineOptions?: DetectPipelineOptions;
    debugMode: boolean;
  },
): Promise<{
  aggregated: WebcamDetectionResult | null;
  frames: Array<{ result: WebcamDetectionResult; previewUrl: string; file: File }>;
}> {
  const frames: Array<{ result: WebcamDetectionResult; previewUrl: string; file: File }> = [];
  let lastPreview = '';
  for (let i = 0; i < SCAN_ONCE_BURST; i += 1) {
    const captured = await captureSignRegion(video, canvas, opts.saveLog);
    if (!captured) continue;
    lastPreview = captured.previewUrl;
    const res = normalizeDetectionSign(
      await detectWithRetry(
        captured.file,
        !opts.saveLog,
        opts.trackSession,
        opts.saveLog,
        opts.pipelineOptions,
        opts.debugMode,
      ),
    ) as WebcamDetectionResult;
    frames.push({
      result: {
        ...res,
        uploaded_image: res.uploaded_image || captured.previewUrl,
      },
      previewUrl: captured.previewUrl,
      file: captured.file,
    });
    if (i < SCAN_ONCE_BURST - 1) {
      await sleep(SCAN_ONCE_BURST_GAP_MS);
    }
  }
  const burstItems = frames.map((frame) => ({
    result: frame.result,
    previewUrl: frame.previewUrl,
  }));
  return {
    aggregated: aggregateBurstResults(burstItems),
    frames,
  };
}

function pickMajorityFromResults(
  items: Array<{ signKey: string; result: WebcamDetectionResult; previewUrl: string; file?: File }>,
  minAgree: number,
): { signKey: string; result: WebcamDetectionResult; previewUrl: string; file?: File; avgConfidence: number } | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.signKey === 'none') continue;
    counts.set(item.signKey, (counts.get(item.signKey) || 0) + 1);
  }

  let bestKey = '';
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }

  if (!bestKey || bestCount < minAgree) return null;

  const matches = items.filter((item) => item.signKey === bestKey);
  const avgConfidence = matches.reduce((sum, item) => sum + resultConfidence(item.result), 0) / matches.length;
  matches.sort((a, b) => resultConfidence(b.result) - resultConfidence(a.result));
  const best = matches[0];
  if (!best) return null;
  return { ...best, avgConfidence };
}

function leadingVoteProgress(slots: VoteSlot[]): { agree: number; total: number; key: string } {
  const counts = new Map<string, number>();
  for (const slot of slots) {
    if (slot.signKey === 'none') continue;
    counts.set(slot.signKey, (counts.get(slot.signKey) || 0) + 1);
  }
  let bestKey = '';
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }
  return { agree: bestCount, total: VOTE_WINDOW, key: bestKey };
}

function pickWinningSlot(slots: VoteSlot[], lockedKey: string | null): VoteSlot | null {
  const winner = pickMajorityFromResults(slots, VOTE_MIN_AGREE)
    ?? pickMajorityFromResults(
      slots.slice(-SOFT_VOTE_WINDOW),
      SOFT_VOTE_MIN_AGREE,
    );
  if (!winner) return null;

  const winnerConf = resultConfidence(winner.result);
  const voteConf = winner.avgConfidence ?? winnerConf;
  if (
    voteConf < SOFT_VOTE_MIN_CONF
    && voteConf < FAST_STABLE_CONF
  ) {
    return null;
  }

  if (lockedKey && winner.signKey !== lockedKey) {
    const recent = slots.slice(-SIGN_SWITCH_STREAK);
    if (
      recent.length < SIGN_SWITCH_STREAK
      || !recent.every((slot) => slot.signKey === winner.signKey)
    ) {
      return null;
    }
  }

  for (let i = slots.length - 1; i >= 0; i -= 1) {
    if (slots[i].signKey === winner.signKey) return slots[i];
  }
  return null;
}

export type { PipelineStageId };

export function useWebcamDetection(pipelineOptions?: DetectPipelineOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopActiveRef = useRef(false);
  const loopRunIdRef = useRef(0);
  const voteBufferRef = useRef<VoteSlot[]>([]);
  const missStreakRef = useRef(0);
  const lockedSignKeyRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const stablePreviewUrlRef = useRef<string | null>(null);
  const trackSessionRef = useRef<string>('');
  const pauseLoopRef = useRef<(() => void) | null>(null);
  const scanInFlightRef = useRef(false); // processing lock — drop frames while backend is busy

  const ensureTrackSession = useCallback(() => {
    if (!trackSessionRef.current) {
      trackSessionRef.current = crypto.randomUUID();
    }
    return trackSessionRef.current;
  }, []);
  const [streaming, setStreaming] = useState(false);
  const [loopActive, setLoopActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [frameResult, setFrameResult] = useState<WebcamDetectionResult | null>(null);
  const [stableResult, setStableResult] = useState<WebcamDetectionResult | null>(null);
  const [lastScanAt, setLastScanAt] = useState<Date | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [loopError, setLoopError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('unknown');
  const [debugMode, setDebugMode] = useState(false);
  const [voteProgress, setVoteProgress] = useState({ agree: 0, total: VOTE_WINDOW, key: '' });
  const [voteSlots, setVoteSlots] = useState<string[]>([]);
  const [pipelineStage, setPipelineStage] = useState<PipelineStageId>('webcam');
  const debugModeRef = useRef(debugMode);
  debugModeRef.current = debugMode;

  const resetVoting = useCallback(() => {
    voteBufferRef.current = [];
    missStreakRef.current = 0;
    lockedSignKeyRef.current = null;
    setVoteProgress({ agree: 0, total: VOTE_WINDOW, key: '' });
    setVoteSlots([]);
    setPipelineStage('webcam');
  }, []);

  const protectedPreviewUrls = useCallback((): Set<string> => {
    const keep = new Set<string>();
    if (stablePreviewUrlRef.current) {
      keep.add(stablePreviewUrlRef.current);
    }
    for (const slot of voteBufferRef.current) {
      keep.add(slot.previewUrl);
    }
    return keep;
  }, []);

  const setPreviewUrl = useCallback((previewUrl: string) => {
    const keep = protectedPreviewUrls();
    if (
      previewUrlRef.current
      && previewUrlRef.current !== previewUrl
      && !keep.has(previewUrlRef.current)
    ) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = previewUrl;
  }, [protectedPreviewUrls]);

  const rememberStablePreview = useCallback((previewUrl: string) => {
    if (
      stablePreviewUrlRef.current
      && stablePreviewUrlRef.current !== previewUrl
    ) {
      URL.revokeObjectURL(stablePreviewUrlRef.current);
    }
    stablePreviewUrlRef.current = previewUrl;
  }, []);

  const pauseLoopOnStableLock = useCallback((signKey: string) => {
    if (!signKey || signKey === 'none') return;
    pauseLoopRef.current?.();
  }, []);

  const applyVote = useCallback((res: WebcamDetectionResult, previewUrl: string) => {
    const signKey = signKeyFromResult(res);

    voteBufferRef.current.push({ signKey, result: res, previewUrl });
    if (voteBufferRef.current.length > VOTE_WINDOW) {
      voteBufferRef.current.shift();
    }
    const progress = leadingVoteProgress(voteBufferRef.current);
    setVoteProgress(progress);
    setVoteSlots(voteBufferRef.current.map((slot) => slot.signKey));
    setPipelineStage('vote');

    if (signKey === 'none') {
      missStreakRef.current += 1;
    } else {
      missStreakRef.current = 0;
    }

    const locked = lockedSignKeyRef.current;
    const clearAfter = locked ? LOCKED_CLEAR_MISS_STREAK : CLEAR_MISS_STREAK;

    if (locked && missStreakRef.current >= clearAfter) {
      lockedSignKeyRef.current = null;
      setStableResult(null);
      setPipelineStage(loopActiveRef.current ? 'opencv' : 'webcam');
      return null;
    }

    const winner = pickWinningSlot(voteBufferRef.current, locked);
    if (!winner) {
      return null;
    }

    const voteMatches = voteBufferRef.current.filter((slot) => slot.signKey === winner.signKey);
    const voteConf = voteMatches.length
      ? voteMatches.reduce((sum, slot) => sum + resultConfidence(slot.result), 0) / voteMatches.length
      : resultConfidence(winner.result);

    const bestMatch = [...voteMatches].sort(
      (a, b) => resultConfidence(b.result) - resultConfidence(a.result),
    )[0] ?? winner;

    const next = {
      ...bestMatch.result,
      confidence: voteConf,
      display_confidence: voteConf,
      uploaded_image: bestMatch.previewUrl,
    };
    rememberStablePreview(bestMatch.previewUrl);
    const changed = locked !== winner.signKey;
    lockedSignKeyRef.current = winner.signKey;
    setStableResult(next);
    setPipelineStage('result');
    if (changed) {
      pauseLoopOnStableLock(winner.signKey);
    }
    return changed ? next : null;
  }, [pauseLoopOnStableLock, rememberStablePreview]);

  const stopStream = useCallback(() => {
    loopRunIdRef.current += 1;
    loopActiveRef.current = false;
    setLoopActive(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (stablePreviewUrlRef.current) {
      URL.revokeObjectURL(stablePreviewUrlRef.current);
      stablePreviewUrlRef.current = null;
    }
    resetVoting();
    trackSessionRef.current = '';
    setFacingMode('unknown');
    setStreaming(false);
    setScanning(false);
  }, [resetVoting]);

  const runLoopScan = useCallback(async (opts?: { instant?: boolean }) => {
    if (scanInFlightRef.current) return null; // drop frame if previous scan still in flight
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    scanInFlightRef.current = true;
    try {
      setPipelineStage('opencv');
      const captured = await captureSignRegion(video, canvas, false);
      if (!captured) return null;

      setPreviewUrl(captured.previewUrl);
      setPipelineStage('yolo');
      const res = await detectWithRetry(captured.file, true, ensureTrackSession(), false, undefined, debugModeRef.current);
      const withPreview = { ...res, uploaded_image: res.uploaded_image || captured.previewUrl };
      setFrameResult(withPreview);
      setLastScanAt(new Date());
      setScanCount((n) => n + 1);
      if (opts?.instant && isManualScanResult(withPreview)) {
        rememberStablePreview(captured.previewUrl);
        lockedSignKeyRef.current = signKeyFromResult(withPreview) !== 'none'
          ? signKeyFromResult(withPreview)
          : (withPreview.sign_code || withPreview.class_key || '').trim().toUpperCase();
        setStableResult(withPreview);
        setLoopError(null);
        return withPreview;
      }
      if (opts?.instant) {
        setLoopError(
          withPreview.detection_mode === 'no_sign' || withPreview.sign_present === false
            ? 'No traffic sign in frame — fill the guide box'
            : 'Sign not clear enough — hold steady and scan again',
        );
      }
      applyVote(withPreview, captured.previewUrl);
      return withPreview;
    } finally {
      scanInFlightRef.current = false;
    }
  }, [applyVote, ensureTrackSession, rememberStablePreview, setPreviewUrl]);

  const runConfirmedScan = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    setScanning(true);
    setLoopError(null);
    try {
      const burst = await captureBurstDetections(video, canvas, {
        saveLog: false,
        trackSession: ensureTrackSession(),
        pipelineOptions,
        debugMode: debugModeRef.current,
      });
      if (!burst.frames.length) {
        setLoopError('Could not capture frame — hold the sign in the guide box');
        return null;
      }

      const previewUrl = burst.frames[burst.frames.length - 1].previewUrl;
      setPreviewUrl(previewUrl);
      setFrameResult({ uploaded_image: previewUrl } as WebcamDetectionResult);

      if (!burst.aggregated) {
        const last = burst.frames[burst.frames.length - 1].result;
        setStableResult(null);
        lockedSignKeyRef.current = null;
        setFrameResult(last);
        setLoopError(
          last.detection_mode === 'no_sign' || last.sign_present === false
            ? 'No traffic sign in frame — fill the guide box (trim white paper edges if printed)'
            : `Hold steady — need ${SCAN_ONCE_BURST_MIN}/${SCAN_ONCE_BURST} agreeing frames`,
        );
        return last;
      }

      const winnerKey = burstSignKey(burst.aggregated);
      const bestFrame = burst.frames.find((f) => burstSignKey(f.result) === winnerKey) ?? burst.frames[0];
      const saved = await detectWithRetry(
        bestFrame.file,
        false,
        ensureTrackSession(),
        true,
        pipelineOptions,
        debugModeRef.current,
      );
      const confirmed = normalizeDetectionSign({
        ...burst.aggregated,
        ...saved,
        confidence: burst.aggregated.confidence,
        display_confidence: burst.aggregated.display_confidence ?? burst.aggregated.confidence,
        uploaded_image: saved.uploaded_image || bestFrame.previewUrl,
      }) as WebcamDetectionResult;

      setScanCount((n) => n + burst.frames.length);
      setLastScanAt(new Date());

      lockedSignKeyRef.current = signKeyFromResult(confirmed) !== 'none'
        ? signKeyFromResult(confirmed)
        : (confirmed.sign_code || confirmed.class_key || '').trim().toUpperCase();
      voteBufferRef.current = [{
        signKey: lockedSignKeyRef.current || signKeyFromResult(confirmed),
        result: confirmed,
        previewUrl: bestFrame.previewUrl,
      }];
      missStreakRef.current = 0;
      setStableResult(confirmed);
      setFrameResult(confirmed);
      setLoopError(null);
      return confirmed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scan failed';
      setLoopError(isRetryableScanError(err)
        ? 'Server busy — try again in a moment'
        : msg);
      return null;
    } finally {
      setScanning(false);
    }
  }, [ensureTrackSession, pipelineOptions, setPreviewUrl]);

  const runSingleScan = useCallback(async (opts?: { saveLog?: boolean }) => {
    setLoopError(null);
    if (opts?.saveLog) {
      return runConfirmedScan();
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    setScanning(true);
    try {
      const burst = await captureBurstDetections(video, canvas, {
        saveLog: false,
        trackSession: ensureTrackSession(),
        pipelineOptions,
        debugMode: debugModeRef.current,
      });
      if (!burst.frames.length) {
        setLoopError('Could not capture frame — hold the sign in the guide box');
        return null;
      }
      setScanCount((n) => n + burst.frames.length);
      setLastScanAt(new Date());
      const preview = burst.aggregated ?? burst.frames[burst.frames.length - 1].result;
      const previewUrl = burst.frames[burst.frames.length - 1].previewUrl;
      const withPreview = { ...preview, uploaded_image: preview.uploaded_image || previewUrl };
      setPreviewUrl(previewUrl);
      setFrameResult(withPreview);
      if (burst.aggregated && isManualScanResult(withPreview)) {
        rememberStablePreview(previewUrl);
        lockedSignKeyRef.current = signKeyFromResult(withPreview);
        setStableResult(withPreview);
        setLoopError(null);
        return withPreview;
      }
      setLoopError(
        withPreview.detection_mode === 'no_sign' || withPreview.sign_present === false
          ? 'No traffic sign in frame — fill the guide box'
          : `Hold steady — need ${SCAN_ONCE_BURST_MIN}/${SCAN_ONCE_BURST} agreeing frames`,
      );
      return withPreview;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scan failed';
      setLoopError(isRetryableScanError(err)
        ? 'Server busy — try again in a moment'
        : msg);
      return null;
    } finally {
      setScanning(false);
    }
  }, [ensureTrackSession, pipelineOptions, rememberStablePreview, runConfirmedScan, setPreviewUrl]);

  const runLoop = useCallback(async (runId: number) => {
    while (loopActiveRef.current && runId === loopRunIdRef.current) {
      let gapMs = LOOP_GAP_MS;
      try {
        const frame = await runLoopScan();
        setLoopError(null);
        if (frame && signKeyFromResult(frame) === 'none') {
          gapMs = LOOP_GAP_NO_SIGN_MS;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Scan failed';
        setLoopError(isRetryableScanError(err)
          ? 'Server busy — try again in a moment'
          : msg);
        gapMs = LOOP_GAP_NO_SIGN_MS;
      }
      if (!loopActiveRef.current || runId !== loopRunIdRef.current) break;
      await sleep(gapMs);
    }
  }, [runLoopScan]);

  const startScanLoop = useCallback(() => {
    if (loopActiveRef.current) return;
    lockedSignKeyRef.current = null;
    missStreakRef.current = 0;
    voteBufferRef.current = [];
    setStableResult(null);
    setFrameResult(null);
    setLoopError(null);
    loopActiveRef.current = true;
    setLoopActive(true);
    setPipelineStage('opencv');
    const runId = loopRunIdRef.current + 1;
    loopRunIdRef.current = runId;
    void runLoop(runId);
  }, [runLoop]);

  const stopScanLoop = useCallback(() => {
    loopActiveRef.current = false;
    loopRunIdRef.current += 1;
    setLoopActive(false);
  }, []);

  pauseLoopRef.current = stopScanLoop;

  const captureEvidenceFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    return captureSignRegion(video, canvas, true);
  }, []);

  const saveEvidenceFrame = useCallback(async () => {
    const captured = await captureEvidenceFrame();
    if (!captured) {
      setLoopError('Could not capture frame — hold the sign in the guide box');
      return null;
    }
    downloadBlob(captured.blob, captured.file.name);
    setPreviewUrl(captured.previewUrl);
    return captured;
  }, [captureEvidenceFrame, setPreviewUrl]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setFrameResult(null);
    setStableResult(null);
    setLastScanAt(null);
    setScanCount(0);
    setLoopError(null);
    resetVoting();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('CAMERA_UNSUPPORTED');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16 / 9 },
          // @ts-expect-error — focusMode not in all TS dom lib versions
          focusMode: { ideal: 'continuous' },
        },
        audio: false,
      });
      streamRef.current = stream;
      setFacingMode(getVideoFacingMode(stream));
      const track = stream.getVideoTracks()[0];
      if (track?.applyConstraints) {
        const caps = track.getCapabilities?.();
        const maxW = caps?.width?.max;
        const maxH = caps?.height?.max;
        if (maxW && maxH) {
          const targetW = Math.min(maxW, 1920);
          const targetH = Math.min(maxH, 1080);
          try {
            await track.applyConstraints({
              width: { ideal: targetW },
              height: { ideal: targetH },
              // @ts-expect-error — focusMode not in all TS dom lib versions
              focusMode: { ideal: 'continuous' },
            });
          } catch {
            /* use default stream resolution */
          }
        }
      }
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();
      }
      setStreaming(true);
      loopActiveRef.current = false;
      setLoopActive(false);
    } catch (err) {
      const name = err instanceof Error ? err.message : '';
      if (name === 'CAMERA_UNSUPPORTED' || name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('permission');
      } else {
        setCameraError('unavailable');
      }
      stopStream();
    }
  }, [resetVoting, stopStream]);

  useEffect(() => () => stopStream(), [stopStream]);

  return {
    videoRef,
    canvasRef,
    streaming,
    loopActive,
    scanning,
    cameraError,
    loopError,
    facingMode,
    frameResult,
    stableResult,
    lastResult: stableResult ?? frameResult,
    lastScanAt,
    scanCount,
    debugMode,
    setDebugMode,
    voteProgress,
    voteSlots,
    pipelineStage,
    startCamera,
    stopStream,
    runSingleScan,
    runConfirmedScan,
    captureEvidenceFrame,
    saveEvidenceFrame,
    startScanLoop,
    stopScanLoop,
  };
}

/** Fetch a remote/snapshot image URL and run detection (for camera feed pages). */
export async function detectFromImageUrl(url: string): Promise<WebcamDetectionResult> {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}_detect=${Date.now()}`);
  const blob = await res.blob();
  const type = blob.type || 'image/jpeg';
  const ext = type.includes('png') ? 'png' : 'jpg';
  const file = new File([blob], `camera-frame.${ext}`, { type });
  return aiAPI.detect(file);
}
