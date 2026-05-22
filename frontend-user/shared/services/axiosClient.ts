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
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.detail ||
      (error.message === 'Network Error'
        ? 'Cannot reach the API. Start the backend (port 8000) and restart the dev server.'
        : error.message) ||
      'Request failed';
    return Promise.reject(new Error(typeof message === 'string' ? message : JSON.stringify(message)));
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
