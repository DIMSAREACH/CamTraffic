import axios from 'axios';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from '@shared/utils/authStorage';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart boundary (do not force application/json on FormData)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      const refresh = getRefreshToken();
      if (refresh) {
        original._retry = true;
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
          const newAccess = data.access ?? data.data?.access;
          if (newAccess) {
            setAccessToken(newAccess);
            original.headers.Authorization = `Bearer ${newAccess}`;
            return apiClient(original);
          }
        } catch {
          clearAuthSession();
        }
      }
    }
    const body = error.response?.data;
    let message: string | undefined;
    if (body && typeof body === 'object') {
      const errors = (body as { errors?: Record<string, unknown> }).errors;
      if (errors && typeof errors === 'object') {
        const parts: string[] = [];
        for (const [field, val] of Object.entries(errors)) {
          const text = Array.isArray(val) ? val.map(String).join(', ') : String(val);
          if (text) parts.push(`${field}: ${text}`);
        }
        if (parts.length) message = parts.join(' · ');
      }
      const envelopeMsg = (body as { message?: string }).message;
      if (!message && typeof envelopeMsg === 'string' && envelopeMsg.trim()) {
        message = envelopeMsg;
      }
    }
    if (!message) {
      const status = error.response?.status;
      if (status === 503) {
        message = 'Backend unavailable. Start Django: cd backend && python manage.py runserver';
      } else if (error.message === 'Network Error') {
        message = 'Cannot reach the API. Start the backend (port 8000) and refresh the page.';
      } else {
        message = error.message || 'Request failed';
      }
    }
    return Promise.reject(new Error(message));
  },
);

/** Unwrap CamTraffic API envelope { success, data } */
export function unwrap<T>(response: { data: { success?: boolean; data?: T; message?: string } & T }): T {
  const body = response.data;
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data as T;
  }
  return body as T;
}

/** Unwrap list endpoints (plain array or DRF pagination { results: [] }) */
export function unwrapList<T>(response: Parameters<typeof unwrap>[0]): T[] {
  const payload = unwrap<unknown>(response);
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results: T[] }).results;
  }
  return [];
}
