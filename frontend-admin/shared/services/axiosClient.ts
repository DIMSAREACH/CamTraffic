import axios from 'axios';
import { notifyAuthSessionExpired } from '@shared/utils/authEvents';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from '@shared/utils/authStorage';
import { humanizeApiError, parseApiErrorBody } from '@shared/utils/apiErrors';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

function invalidateAuthSession(): void {
  clearAuthSession();
  notifyAuthSessionExpired();
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
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
          invalidateAuthSession();
        }
      } else {
        invalidateAuthSession();
      }
    }

    const body = error.response?.data;
    let message = parseApiErrorBody(body);

    if (!message) {
      const status = error.response?.status;
      if (status === 401) {
        if (!getAccessToken()) {
          invalidateAuthSession();
        }
        message = 'Session expired. Please log in again.';
      } else if (status === 503) {
        message = 'Backend unavailable. Start Django: cd backend && python manage.py runserver';
      } else if (error.message === 'Network Error' || error.code === 'ECONNRESET') {
        message = 'Cannot reach the API. The server may be busy — wait a moment and try again.';
      } else {
        message = error.message || 'Request failed';
      }
    }

    message = humanizeApiError(message);

    if (error.response?.status === 401 && message === 'Session expired. Please log in again.') {
      invalidateAuthSession();
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
