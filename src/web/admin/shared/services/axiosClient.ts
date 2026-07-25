import axios from 'axios';
import { notifyAuthSessionExpired } from '@shared/utils/authEvents';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
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

/** Single-flight refresh so ROTATE_REFRESH_TOKENS doesn't blacklist parallel retries. */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    try {
      const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
      const payload = data?.data && typeof data.data === 'object' ? data.data : data;
      const newAccess = payload?.access as string | undefined;
      const newRefresh = payload?.refresh as string | undefined;
      if (!newAccess) return null;
      setAccessToken(newAccess);
      if (newRefresh) setRefreshToken(newRefresh);
      return newAccess;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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

function isCredentialAuthRequest(config?: { url?: string }): boolean {
  const url = config?.url ?? '';
  return (
    url.includes('/auth/login/')
    || url.includes('/auth/register/')
    || url.includes('/auth/password-reset')
    || url.includes('/auth/oauth/')
  );
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isLoginFlow = isCredentialAuthRequest(original);

    // Never try token refresh on login/register failures — that masks the real 401 message.
    if (error.response?.status === 401 && original && !original._retry && !isLoginFlow) {
      original._retry = true;
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(original);
      }
      invalidateAuthSession();
    }

    const body = error.response?.data;
    let message = parseApiErrorBody(body);

    if (!message) {
      const status = error.response?.status;
      if (status === 401) {
        if (isLoginFlow) {
          message = 'Invalid email or password. Please try again.';
        } else {
          if (!getAccessToken()) {
            invalidateAuthSession();
          }
          message = 'Session expired. Please log in again.';
        }
      } else if (status === 429) {
        const retryAfter = error.response?.headers?.['retry-after'];
        const waitHint = retryAfter ? ` Try again in about ${retryAfter}s.` : ' Please wait a moment and try again.';
        message = `Too many requests.${waitHint}`;
      } else if (status === 503) {
        message = 'Service unavailable. Start Django if it is down, or use email/password if OAuth is not configured.';
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

type ListParams = Record<string, string | number | boolean | undefined | null>;

/**
 * Fetch every page from a DRF/CamTraffic list endpoint so module tables match dashboard totals.
 * Handles both `{ results, next, count }` and `{ success, data: [...] }` shapes.
 */
export async function fetchAllPages<T>(
  path: string,
  params: ListParams = {},
  opts?: { pageSize?: number; maxPages?: number },
): Promise<T[]> {
  const pageSize = opts?.pageSize ?? 500;
  const maxPages = opts?.maxPages ?? 100;
  const all: T[] = [];
  const baseParams = { ...params };
  delete baseParams.page;
  delete baseParams.page_size;

  for (let page = 1; page <= maxPages; page += 1) {
    const res = await apiClient.get(path, {
      params: { ...baseParams, page, page_size: pageSize },
    });
    const body = res.data as Record<string, unknown> | unknown[];

    // Unpaginated envelope: { success, data: [...] }
    if (body && typeof body === 'object' && !Array.isArray(body) && Array.isArray(body.data)) {
      return body.data as T[];
    }

    // Top-level or nested DRF page
    const pageObj = (
      body && typeof body === 'object' && !Array.isArray(body) && Array.isArray(body.results)
        ? body
        : body && typeof body === 'object' && !Array.isArray(body) && body.data
          && typeof body.data === 'object' && !Array.isArray(body.data)
          && Array.isArray((body.data as { results?: unknown }).results)
          ? (body.data as Record<string, unknown>)
          : null
    );

    if (pageObj) {
      const results = pageObj.results as T[];
      all.push(...results);
      const count = typeof pageObj.count === 'number' ? pageObj.count : undefined;
      const hasNext = Boolean(pageObj.next);
      if (!hasNext || results.length === 0 || (count !== undefined && all.length >= count)) {
        break;
      }
      continue;
    }

    // Plain array body
    if (Array.isArray(body)) return body as T[];
    const fallback = unwrapList<T>(res);
    all.push(...fallback);
    break;
  }

  return all;
}
