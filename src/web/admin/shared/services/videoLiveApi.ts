/**
 * Realtime Upload Video + Live Camera APIs (SSE / session frame stream).
 * Backend: /api/ai/video/* and /api/ai/live/*
 */
import { apiClient } from '@shared/services/axiosClient';
import { getAccessToken } from '@shared/utils/authStorage';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function unwrap<T>(data: any): T {
  if (data && typeof data === 'object' && 'data' in data && data.success !== false) {
    return data.data as T;
  }
  return data as T;
}

export type VideoStreamEvent = {
  type: string;
  frame_index?: number;
  timestamp_sec?: number;
  total_frames?: number;
  processed_frames?: number;
  progress_pct?: number;
  fps_original?: number;
  fps_process?: number;
  detection_count?: number;
  vehicle_count?: number;
  sign_count?: number;
  plate_text?: string;
  plate_confidence?: number;
  confidence?: number;
  processing_ms?: number;
  image_b64?: string;
  detections?: Record<string, unknown>;
  violation_suggestion?: Record<string, unknown>;
  message?: string;
  status?: string;
  video_id?: string;
  annotated_video_url?: string;
  processing_time_sec?: number;
  avg_confidence?: number;
  result?: Record<string, unknown>;
};

export const videoLiveAPI = {
  async uploadVideo(file: File, options?: {
    observed_action?: string;
    confidence?: number;
    enable_ocr?: boolean;
    max_frames?: number;
  }) {
    const form = new FormData();
    form.append('video', file);
    if (options?.observed_action) form.append('observed_action', options.observed_action);
    if (options?.confidence != null) form.append('confidence', String(options.confidence));
    if (options?.enable_ocr != null) form.append('enable_ocr', String(options.enable_ocr));
    if (options?.max_frames != null) form.append('max_frames', String(options.max_frames));
    const { data } = await apiClient.post('/ai/video/upload/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    });
    return unwrap<{
      video_id: string;
      status: string;
      stream_url: string;
      result_url: string;
    }>(data);
  },

  async getResult(videoId: string) {
    const { data } = await apiClient.get(`/ai/video/result/${videoId}/`);
    return unwrap<Record<string, unknown>>(data);
  },

  async review(videoId: string, action: 'approve' | 'reject') {
    const { data } = await apiClient.post(`/ai/video/${videoId}/review/`, { action });
    return unwrap(data);
  },

  /**
   * Consume SSE frame stream with JWT (fetch — EventSource cannot set Authorization).
   */
  async streamVideo(
    videoId: string,
    onEvent: (ev: VideoStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}/ai/video/${videoId}/stream/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`Video stream failed (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        const line = part.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        try {
          const ev = JSON.parse(line.slice(6)) as VideoStreamEvent;
          onEvent(ev);
          if (ev.type === 'completed' || ev.type === 'error') return;
        } catch {
          /* ignore partial JSON */
        }
      }
    }
  },

  async liveStart(payload: { camera_id?: string; source?: string; observed_action?: string }) {
    const { data } = await apiClient.post('/ai/live/start/', payload);
    return unwrap<{ session_id: string; video_detection_id: string; status: string }>(data);
  },

  async liveStop(sessionId: string) {
    const { data } = await apiClient.post('/ai/live/stop/', { session_id: sessionId });
    return unwrap(data);
  },

  async liveStatus(sessionId?: string) {
    const { data } = await apiClient.get('/ai/live/status/', {
      params: sessionId ? { session_id: sessionId } : undefined,
    });
    return unwrap(data);
  },

  async liveFrame(sessionId: string, opts?: { camera_id?: string; image?: Blob }) {
    if (opts?.image) {
      const form = new FormData();
      form.append('session_id', sessionId);
      form.append('image', opts.image, 'frame.jpg');
      if (opts.camera_id) form.append('camera_id', opts.camera_id);
      const { data } = await apiClient.post('/ai/live/frame/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60_000,
      });
      return unwrap<Record<string, unknown>>(data);
    }
    const form = new FormData();
    form.append('session_id', sessionId);
    if (opts?.camera_id) form.append('camera_id', opts.camera_id);
    const { data } = await apiClient.post('/ai/live/frame/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    });
    return unwrap<Record<string, unknown>>(data);
  },

  async liveSnapshot(sessionId: string, cameraId?: string) {
    const form = new FormData();
    form.append('session_id', sessionId);
    if (cameraId) form.append('camera_id', cameraId);
    const { data } = await apiClient.post('/ai/live/snapshot/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(data);
  },

  async recordStart(sessionId: string) {
    const { data } = await apiClient.post('/ai/live/record/start/', { session_id: sessionId });
    return unwrap(data);
  },

  async recordStop(sessionId: string) {
    const { data } = await apiClient.post('/ai/live/record/stop/', { session_id: sessionId });
    return unwrap(data);
  },
};
