/**
 * Production Upload Video console — master-prompt layout:
 * header (status/FPS) → annotated player → transport controls → detection panel.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, Download, Film, Loader2, Maximize2, Pause, Play, Square,
  Upload, X, Save, FileJson, FileSpreadsheet, Camera,
} from 'lucide-react';
import { DemoObservedActionSelect } from '@shared/components/ai/DemoObservedActionSelect';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/components/ui/utils';
import { useLanguage } from '@shared/context/LanguageContext';
import { videoLiveAPI, type VideoStreamEvent } from '@shared/services/videoLiveApi';
import { toast } from 'sonner';
import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';

const MAX_VIDEO_MB = 500;

export interface RealtimeVideoDetectionStudioProps {
  demoObservedAction: string;
  onDemoObservedActionChange: (v: string) => void;
  onResult: (result: CenterDetectionResult, previewUrl: string) => void;
  onDetectingChange: (v: boolean) => void;
  onPreviewChange?: (url: string | null) => void;
  onRegisterAbort?: (abort: (() => void) | null) => void;
  disabled?: boolean;
}

type StreamStats = {
  fpsOriginal: number;
  fpsProcess: number;
  progress: number;
  currentFrame: number;
  totalFrames: number;
  processingMs: number;
  detectionCount: number;
  vehicleCount: number;
  signCount: number;
  plateCount: number;
  plateText: string;
  plateConfidence: number;
  confidence: number;
  timestampSec: number;
  violation: Record<string, unknown> | null;
  modelName: string;
  modelVersion: string;
  status: string;
};

const emptyStats: StreamStats = {
  fpsOriginal: 0,
  fpsProcess: 0,
  progress: 0,
  currentFrame: 0,
  totalFrames: 0,
  processingMs: 0,
  detectionCount: 0,
  vehicleCount: 0,
  signCount: 0,
  plateCount: 0,
  plateText: '',
  plateConfidence: 0,
  confidence: 0,
  timestampSec: 0,
  violation: null,
  modelName: 'YOLOv8',
  modelVersion: '',
  status: 'idle',
};

function L(t: (k: string) => string, key: string, fallback: string) {
  const v = t(key);
  return v !== key ? v : fallback;
}

function formatTs(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ai-detect-console__row">
      <span className="ai-detect-console__label">{label}</span>
      <span className="ai-detect-console__value">{value}</span>
    </div>
  );
}

export function RealtimeVideoDetectionStudio({
  demoObservedAction,
  onDemoObservedActionChange,
  onResult,
  onDetectingChange,
  onPreviewChange,
  onRegisterAbort,
  disabled = false,
}: RealtimeVideoDetectionStudioProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewBlobRef = useRef<string | null>(null);
  const frameHistoryRef = useRef<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const theaterRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confidence, setConfidence] = useState(0.35);
  const [enableOcr, setEnableOcr] = useState(true);
  const [maxFrames, setMaxFrames] = useState(24);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [annotatedUrl, setAnnotatedUrl] = useState('');
  const [detectionJson, setDetectionJson] = useState<Record<string, unknown> | null>(null);
  const [reviewStatus, setReviewStatus] = useState('pending');
  const [stats, setStats] = useState<StreamStats>(emptyStats);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const revokePreview = () => {
    if (previewBlobRef.current) {
      const doomed = previewBlobRef.current;
      previewBlobRef.current = null;
      window.setTimeout(() => URL.revokeObjectURL(doomed), 250);
    }
  };

  const handleFile = (f: File | null) => {
    revokePreview();
    setFile(f);
    setFrameSrc(null);
    setVideoId(null);
    setAnnotatedUrl('');
    setDetectionJson(null);
    setReviewStatus('pending');
    setStats(emptyStats);
    frameHistoryRef.current = [];
    setPlaybackIndex(0);
    const url = f ? URL.createObjectURL(f) : null;
    previewBlobRef.current = url;
    setPreview(url);
    // Parent must not keep blob URLs (this studio owns revoke lifecycle).
    onPreviewChange?.(null);
  };

  const applyFrameEvent = useCallback((ev: VideoStreamEvent) => {
    if (ev.type === 'ping' || ev.type === 'hello' || ev.type === 'queued' || ev.type === 'status') {
      if (ev.status) setStats((s) => ({ ...s, status: String(ev.status) }));
      return;
    }
    if (ev.type === 'frame' && ev.image_b64) {
      const src = `data:image/jpeg;base64,${ev.image_b64}`;
      frameHistoryRef.current.push(src);
      if (frameHistoryRef.current.length > 120) frameHistoryRef.current.shift();
      const plate = String(ev.plate_text || '');
      setStats((s) => ({
        ...s,
        status: 'streaming',
        fpsOriginal: Number(ev.fps_original ?? s.fpsOriginal),
        fpsProcess: Number(ev.fps_process ?? s.fpsProcess),
        progress: Number(ev.progress_pct ?? s.progress),
        currentFrame: Number(ev.frame_index ?? s.currentFrame),
        totalFrames: Number(ev.total_frames ?? s.totalFrames),
        processingMs: Number(ev.processing_ms ?? s.processingMs),
        detectionCount: Number(ev.detection_count ?? s.detectionCount),
        vehicleCount: Number(ev.vehicle_count ?? s.vehicleCount),
        signCount: Number(ev.sign_count ?? s.signCount),
        plateCount: plate ? Math.max(s.plateCount, 1) : s.plateCount,
        plateText: plate || s.plateText,
        plateConfidence: Number(ev.plate_confidence ?? s.plateConfidence),
        confidence: Number(ev.confidence ?? s.confidence),
        timestampSec: Number(ev.timestamp_sec ?? s.timestampSec),
        violation: (ev.violation_suggestion as Record<string, unknown>) || s.violation,
      }));
      if (ev.detections) setDetectionJson(ev.detections as Record<string, unknown>);
      setPaused((isPaused) => {
        if (!isPaused) {
          setFrameSrc(src);
          setPlaybackIndex(frameHistoryRef.current.length - 1);
        }
        return isPaused;
      });
    }
    if (ev.type === 'completed') {
      setStats((s) => ({
        ...s,
        status: 'completed',
        progress: 100,
        fpsProcess: Number(ev.fps_process ?? s.fpsProcess),
        confidence: Number(ev.avg_confidence ?? s.confidence),
        plateText: String((ev.result as any)?.plate_text || s.plateText),
      }));
      if (ev.annotated_video_url) setAnnotatedUrl(String(ev.annotated_video_url));
      if (ev.result) setDetectionJson(ev.result as Record<string, unknown>);
    }
    if (ev.type === 'error') {
      setStats((s) => ({ ...s, status: 'failed' }));
      toast.error(ev.message || L(t, 'aiCenter.detectFailed', 'Video detection failed'));
    }
  }, [t]);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    onRegisterAbort?.(null);
    setDetecting(false);
    onDetectingChange(false);
  }, [onDetectingChange, onRegisterAbort]);

  const runStreamingDetection = async () => {
    if (!file) {
      toast.error(L(t, 'aiCenter.videoRequired', 'Select a video file'));
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(L(t, 'aiCenter.videoTooLarge', `Video too large (max ${MAX_VIDEO_MB} MB)`).replace('{mb}', String(MAX_VIDEO_MB)));
      return;
    }
    stopStream();
    const controller = new AbortController();
    abortRef.current = controller;
    onRegisterAbort?.(() => controller.abort());
    setDetecting(true);
    onDetectingChange(true);
    setPaused(false);
    setStats({ ...emptyStats, status: 'uploading', modelName: 'YOLOv8' });
    frameHistoryRef.current = [];

    try {
      const uploaded = await videoLiveAPI.uploadVideo(file, {
        observed_action: demoObservedAction || undefined,
        confidence,
        enable_ocr: enableOcr,
        max_frames: maxFrames,
      });
      if (controller.signal.aborted) return;
      setVideoId(uploaded.video_id);
      setStats((s) => ({ ...s, status: 'processing' }));

      await videoLiveAPI.streamVideo(uploaded.video_id, applyFrameEvent, controller.signal);
      if (controller.signal.aborted) return;

      const result = await videoLiveAPI.getResult(uploaded.video_id);
      const previewUrl =
        frameHistoryRef.current[frameHistoryRef.current.length - 1]
        || String(result.annotated_video_url || preview || '');
      if (result.annotated_video_url) setAnnotatedUrl(String(result.annotated_video_url));
      setReviewStatus(String(result.review_status || 'pending'));
      setDetectionJson((result.detection_json as Record<string, unknown>) || result);
      setStats((s) => ({
        ...s,
        status: 'completed',
        progress: 100,
        plateCount: Number(result.plate_count || s.plateCount),
        vehicleCount: Number(result.vehicle_count || s.vehicleCount),
        signCount: Number(result.sign_count || s.signCount),
        detectionCount: Number(result.detection_count || s.detectionCount),
        confidence: Number(result.avg_confidence || s.confidence),
        plateText: String(result.plate_text || s.plateText),
        plateConfidence: Number(result.plate_confidence || s.plateConfidence),
        modelName: String(result.model_name || 'YOLOv8'),
        modelVersion: String(result.model_version || ''),
        violation: (result.violation_suggestion as Record<string, unknown>) || s.violation,
        fpsOriginal: Number(result.fps_original || s.fpsOriginal),
        fpsProcess: Number(result.fps_process || s.fpsProcess),
      }));

      const mapped: CenterDetectionResult = {
        ...(result.detection_json as any)?.best,
        detected_plate: String(result.plate_text || ''),
        plate_confidence: Number(result.plate_confidence || 0),
        confidence: Number(result.avg_confidence || 0),
        annotated_processed_image: previewUrl,
        processed_image: previewUrl,
        violation_evaluation: (result.violation_suggestion as any) || undefined,
        video_ui_settings: {
          model: 'YOLOv8',
          confidence,
          ocr: enableOcr,
          tracking: false,
          violation: Boolean(demoObservedAction),
          max_frames: maxFrames,
          video_detection_id: uploaded.video_id,
        },
      } as CenterDetectionResult;
      onResult(mapped, previewUrl);
      toast.success(L(t, 'aiCenter.detectSuccess', 'Detection complete'));
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        toast.message(L(t, 'aiCenter.detectCancelled', 'Video detection cancelled'));
      } else {
        console.error(err);
        toast.error(L(t, 'aiCenter.detectFailed', 'Video detection failed'));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      onRegisterAbort?.(null);
      setDetecting(false);
      onDetectingChange(false);
    }
  };

  useEffect(() => () => {
    // Unmount only — do NOT depend on stopStream (identity changes revoke the live preview blob).
    abortRef.current?.abort();
    abortRef.current = null;
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = playbackRate;
    el.volume = volume;
  }, [playbackRate, volume, annotatedUrl, preview]);

  // Show first frame for local file preview (browsers often leave <video> black until seek/play).
  useEffect(() => {
    if (!preview || frameSrc) return;
    const el = videoRef.current;
    if (!el) return;
    const reveal = () => {
      try {
        if (el.currentTime < 0.05) el.currentTime = 0.05;
      } catch {
        /* ignore seek errors before metadata */
      }
    };
    if (el.readyState >= 2) reveal();
    else el.addEventListener('loadeddata', reveal, { once: true });
    return () => el.removeEventListener('loadeddata', reveal);
  }, [preview, frameSrc]);

  const downloadJson = () => {
    const payload = { video_id: videoId, stats, detection: detectionJson };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-detection-${videoId || Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    const rows = [
      ['metric', 'value'],
      ['video_id', videoId || ''],
      ['signs', String(stats.signCount)],
      ['vehicles', String(stats.vehicleCount)],
      ['plates', String(stats.plateCount)],
      ['plate_text', stats.plateText],
      ['ocr_confidence', String(stats.plateConfidence)],
      ['detection_confidence', String(stats.confidence)],
      ['fps_original', String(stats.fpsOriginal)],
      ['fps_process', String(stats.fpsProcess)],
      ['processing_ms', String(stats.processingMs)],
      ['violation', stats.violation ? JSON.stringify(stats.violation) : ''],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-detection-${videoId || Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadVideo = () => {
    if (!annotatedUrl) {
      toast.message(L(t, 'aiCenter.annotatedVideoPending', 'Annotated video not ready yet'));
      return;
    }
    const a = document.createElement('a');
    a.href = annotatedUrl;
    a.download = `annotated-${videoId || 'video'}.mp4`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  const downloadFrame = () => {
    if (!frameSrc) {
      toast.message(L(t, 'aiCenter.noFrame', 'No annotated frame yet'));
      return;
    }
    const a = document.createElement('a');
    a.href = frameSrc;
    a.download = `evidence-frame-${videoId || Date.now()}.jpg`;
    a.click();
    toast.success(L(t, 'aiCenter.evidenceSaved', 'Evidence frame downloaded'));
  };

  const review = async (action: 'approve' | 'reject') => {
    if (!videoId) return;
    try {
      const res = await videoLiveAPI.review(videoId, action);
      setReviewStatus(String((res as any)?.review_status || action));
      toast.success(action === 'approve'
        ? L(t, 'aiCenter.approved', 'Detection approved')
        : L(t, 'aiCenter.rejected', 'Detection rejected'));
    } catch {
      toast.error(L(t, 'aiCenter.reviewFailed', 'Review failed'));
    }
  };

  const seekFrame = (delta: number) => {
    const hist = frameHistoryRef.current;
    if (!hist.length) return;
    const next = Math.max(0, Math.min(hist.length - 1, playbackIndex + delta));
    setPlaybackIndex(next);
    setFrameSrc(hist[next]);
    setPaused(true);
  };

  const seekProgress = (pct: number) => {
    const hist = frameHistoryRef.current;
    if (!hist.length) return;
    const idx = Math.round((pct / 100) * (hist.length - 1));
    setPlaybackIndex(idx);
    setFrameSrc(hist[idx]);
    setPaused(true);
  };

  const displaySrc = frameSrc || annotatedUrl || preview;
  const isLive = stats.status === 'streaming' || detecting;
  /** Local upload preview — playable video before / after detection frames. */
  const showVideoPlayer = Boolean(displaySrc) && !frameSrc;
  const violationTitle = useMemo(() => {
    const v = stats.violation;
    if (!v || !(v as any).is_violation) return 'None';
    return String((v as any).title || (v as any).violation_type || (v as any).rule_name || 'Violation');
  }, [stats.violation]);
  const fineHint = useMemo(() => {
    const v = stats.violation as any;
    if (!v?.is_violation) return '—';
    const amt = v.fine_amount ?? v.amount_usd ?? v.fine_usd;
    if (amt == null) return 'See rule';
    return typeof amt === 'number' ? `$${Number(amt).toFixed(2)}` : String(amt);
  }, [stats.violation]);

  const toggleMediaPlayback = () => {
    if (detecting || frameSrc) {
      setPaused((p) => !p);
      return;
    }
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(() => setPaused(false)).catch(() => setPaused(true));
    } else {
      el.pause();
      setPaused(true);
    }
  };

  return (
    <div className="ai-detect-console ai-detect-console--video">
      <header className="ai-detect-console__topbar">
        <div className="ai-detect-console__brand">
          <Film size={16} />
          <strong>{L(t, 'aiCenter.uploadVideo', 'AI Detection')}</strong>
          <span className="ai-detect-console__muted">Upload Video</span>
        </div>
        <div className="ai-detect-console__topmeta">
          <span className={cn('ai-detect-console__live', isLive && 'is-on')}>
            <i /> {isLive ? 'STREAM' : stats.status.toUpperCase()}
          </span>
          <span>FPS: {stats.fpsProcess ? stats.fpsProcess.toFixed(1) : '—'}</span>
          <span>{clock.toLocaleTimeString()}</span>
        </div>
      </header>

      <div className="ai-detect-console__settings">
        <DemoObservedActionSelect
          value={demoObservedAction}
          onChange={onDemoObservedActionChange}
          disabled={detecting || disabled}
        />
        <label className="ai-detect-console__slider">
          <span>Conf {confidence.toFixed(2)}</span>
          <input type="range" min={0.25} max={0.9} step={0.05} value={confidence}
            disabled={detecting || disabled}
            onChange={(e) => setConfidence(Number(e.target.value))} />
        </label>
        <label className="ai-detect-console__slider">
          <span>Frames {maxFrames}</span>
          <input type="range" min={4} max={48} step={2} value={maxFrames}
            disabled={detecting || disabled}
            onChange={(e) => setMaxFrames(Number(e.target.value))} />
        </label>
        <label className="ai-detect-console__check">
          <input type="checkbox" checked={enableOcr} disabled={detecting || disabled}
            onChange={(e) => setEnableOcr(e.target.checked)} />
          OCR
        </label>
      </div>

      <div ref={theaterRef} className={cn('ai-detect-console__theater', isLive && 'is-live')}>
        <div className="ai-detect-console__hud">
          <span>Frame {Math.min(stats.currentFrame + 1, Math.max(stats.totalFrames, 1))}/{Math.max(stats.totalFrames, 1)}</span>
          <span>{stats.progress.toFixed(0)}%</span>
          <span>Src {stats.fpsOriginal.toFixed(0)} fps</span>
          <span>{formatTs(stats.timestampSec)}</span>
          <span>{stats.detectionCount} det</span>
        </div>

        {displaySrc ? (
          frameSrc ? (
            <img src={displaySrc} alt="Annotated detection frame" className="ai-detect-console__media" />
          ) : (
            <video
              key={preview || annotatedUrl || 'video-preview'}
              ref={videoRef}
              src={displaySrc}
              className="ai-detect-console__media ai-detect-console__media--playable"
              controls
              playsInline
              preload="auto"
              muted={volume === 0}
              onLoadedData={(e) => {
                const el = e.currentTarget;
                el.playbackRate = playbackRate;
                el.volume = volume;
                try {
                  if (el.currentTime < 0.05) el.currentTime = 0.05;
                } catch {
                  /* ignore */
                }
              }}
              onPlay={() => setPaused(false)}
              onPause={() => setPaused(true)}
            />
          )
        ) : (
          <button
            type="button"
            className={cn('ai-detect-console__drop', dragging && 'is-drag')}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f?.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(f?.name || '')) {
                handleFile(f);
              }
            }}
            disabled={detecting || disabled}
          >
            <Upload size={28} />
            <strong>{L(t, 'aiCenter.uploadVideo', 'Upload Video')}</strong>
            <span>MP4 · AVI · MOV · MKV · WEBM — then play preview</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.webm,.mov,.avi,.mkv"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />

        {(detecting || frameHistoryRef.current.length > 1) && (
          <div className="ai-detect-console__seek">
            <input
              type="range"
              min={0}
              max={100}
              value={frameHistoryRef.current.length > 1
                ? Math.round((playbackIndex / Math.max(frameHistoryRef.current.length - 1, 1)) * 100)
                : stats.progress}
              onChange={(e) => seekProgress(Number(e.target.value))}
            />
          </div>
        )}
      </div>

      {file ? (
        <p className="ai-detect-console__filename" title={file.name}>
          {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
          {showVideoPlayer ? ' · Use player controls to preview' : ''}
        </p>
      ) : null}

      <div className="ai-detect-console__transport">
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={detecting || disabled}>
          <Upload size={14} /> Select
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={toggleMediaPlayback} disabled={!preview && !frameSrc}>
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? 'Play preview' : 'Pause'}
        </Button>
        <Button type="button" size="sm" onClick={() => void runStreamingDetection()} disabled={!file || detecting || disabled}>
          {detecting ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
          {detecting ? 'Processing' : L(t, 'aiCenter.runDetection', 'Detect')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={stopStream} disabled={!detecting}>
          <Square size={14} /> Stop
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => seekFrame(-1)} disabled={!frameHistoryRef.current.length}>
          ‹
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => seekFrame(1)} disabled={!frameHistoryRef.current.length}>
          ›
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={downloadFrame} disabled={!frameSrc}>
          <Camera size={14} /> Snapshot
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => theaterRef.current?.requestFullscreen?.()} disabled={!displaySrc}>
          <Maximize2 size={14} /> Fullscreen
        </Button>
        <label className="ai-detect-console__slider ai-detect-console__slider--inline">
          <span>Vol</span>
          <input type="range" min={0} max={1} step={0.05} value={volume}
            onChange={(e) => setVolume(Number(e.target.value))} />
        </label>
        <label className="ai-detect-console__slider ai-detect-console__slider--inline">
          <span>Speed</span>
          <select value={playbackRate} onChange={(e) => setPlaybackRate(Number(e.target.value))}>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
              <option key={r} value={r}>{r}x</option>
            ))}
          </select>
        </label>
      </div>

      <section className="ai-detect-console__panel">
        <div className="ai-detect-console__panel-head">
          <h3>{L(t, 'aiCenter.detectionResults', 'Detection Results')}</h3>
          <span className="ai-detect-console__muted">Review {reviewStatus}</span>
        </div>
        <div className="ai-detect-console__grid">
          <StatRow label="Signs Detected" value={String(stats.signCount)} />
          <StatRow label="Vehicles" value={String(stats.vehicleCount)} />
          <StatRow label="Plates" value={String(stats.plateCount)} />
          <StatRow label="OCR Result" value={stats.plateText || '—'} />
          <StatRow label="OCR Confidence" value={stats.plateConfidence ? `${stats.plateConfidence.toFixed(0)}%` : '—'} />
          <StatRow label="Detection Confidence" value={stats.confidence ? `${stats.confidence.toFixed(1)}%` : '—'} />
          <StatRow label="Violation" value={violationTitle} />
          <StatRow label="Fine" value={fineHint} />
          <StatRow label="Processing Time" value={stats.processingMs ? `${stats.processingMs.toFixed(0)} ms` : '—'} />
          <StatRow label="Original FPS" value={stats.fpsOriginal ? stats.fpsOriginal.toFixed(1) : '—'} />
          <StatRow label="Current FPS" value={stats.fpsProcess ? stats.fpsProcess.toFixed(1) : '—'} />
          <StatRow label="Progress" value={`${stats.progress.toFixed(0)}%`} />
          <StatRow label="Model" value={stats.modelName} />
          <StatRow label="Model Version" value={stats.modelVersion ? stats.modelVersion.slice(-24) : '—'} />
        </div>
        <div className="ai-detect-console__legend">
          <span><i className="is-sign" /> Sign</span>
          <span><i className="is-vehicle" /> Vehicle</span>
          <span><i className="is-plate" /> Plate</span>
          <span><i className="is-violation" /> Violation</span>
        </div>
        <div className="ai-detect-console__actions">
          <Button type="button" size="sm" onClick={() => void review('approve')} disabled={!videoId || reviewStatus === 'approved'}>
            <Check size={14} /> Approve
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void review('reject')} disabled={!videoId || reviewStatus === 'rejected'}>
            <X size={14} /> Reject
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={downloadFrame} disabled={!frameSrc}>
            <Save size={14} /> Save Evidence
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={downloadVideo} disabled={!annotatedUrl}>
            <Download size={14} /> Download Video
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={downloadJson} disabled={!videoId && !detectionJson}>
            <FileJson size={14} /> Download JSON
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={downloadCsv} disabled={!videoId && !detectionJson}>
            <FileSpreadsheet size={14} /> CSV Report
          </Button>
        </div>
      </section>
    </div>
  );
}
