import { useCallback, useEffect, useRef, useState } from 'react';
import { aiAPI } from '@shared/services/api';

export interface VehicleDetectionItem {
  vehicle_type: string;
  label: string;
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
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
  detection_mode?: 'sign' | 'vehicle' | 'plate' | 'unknown_sign' | 'no_sign';
  detection_engine?: string;
  sign_bbox?: { x1: number; y1: number; x2: number; y2: number };
  display_title_en?: string;
  display_title_km?: string;
  display_confidence?: number;
}

const DEFAULT_INTERVAL_MS = 4000;

/** Center square crop — matches the on-screen guide box in LiveWebcamPanel. */
export const SIGN_REGION_FRACTION = 0.72;
const MIN_SIGN_OUTPUT_PX = 960;

function captureSignRegion(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<File | null> {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return Promise.resolve(null);
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cropSize = Math.round(Math.min(vw, vh) * SIGN_REGION_FRACTION);
  const sx = Math.round((vw - cropSize) / 2);
  const sy = Math.round((vh - cropSize) / 2);
  const outputSize = Math.max(MIN_SIGN_OUTPUT_PX, cropSize);

  canvas.width = outputSize;
  canvas.height = outputSize;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.95);
  });
}

export function useWebcamDetection(intervalMs = DEFAULT_INTERVAL_MS) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const loopRef = useRef<number | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WebcamDetectionResult | null>(null);
  const [lastScanAt, setLastScanAt] = useState<Date | null>(null);
  const [scanCount, setScanCount] = useState(0);

  const stopStream = useCallback(() => {
    if (loopRef.current) {
      window.clearInterval(loopRef.current);
      loopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
    setScanning(false);
    busyRef.current = false;
  }, []);

  const runSingleScan = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || busyRef.current) return null;
    const file = await captureSignRegion(video, canvas);
    if (!file) return null;

    busyRef.current = true;
    setScanning(true);
    try {
      const res = await aiAPI.detect(file);
      setLastResult(res);
      setLastScanAt(new Date());
      setScanCount((n) => n + 1);
      return res;
    } finally {
      busyRef.current = false;
      setScanning(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setLastResult(null);
    setLastScanAt(null);
    setScanCount(0);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('CAMERA_UNSUPPORTED');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setStreaming(true);
    } catch (err) {
      const name = err instanceof Error ? err.message : '';
      if (name === 'CAMERA_UNSUPPORTED' || name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('permission');
      } else {
        setCameraError('unavailable');
      }
      stopStream();
    }
  }, [stopStream]);

  const startScanLoop = useCallback(() => {
    if (loopRef.current) return;
    void runSingleScan();
    loopRef.current = window.setInterval(() => {
      void runSingleScan();
    }, intervalMs);
  }, [intervalMs, runSingleScan]);

  const stopScanLoop = useCallback(() => {
    if (loopRef.current) {
      window.clearInterval(loopRef.current);
      loopRef.current = null;
    }
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  return {
    videoRef,
    canvasRef,
    streaming,
    scanning,
    cameraError,
    lastResult,
    lastScanAt,
    scanCount,
    startCamera,
    stopStream,
    runSingleScan,
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
