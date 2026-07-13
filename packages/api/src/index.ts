import axios, { type AxiosInstance } from 'axios';
import type { ApiSuccess } from '@camtraffic/types';

export interface CreateApiClientOptions {
  baseURL: string;
  getAccessToken?: () => string | null;
}

export function createApiClient(options: CreateApiClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL.replace(/\/$/, ''),
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config) => {
    const token = options.getAccessToken?.();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return client;
}

export function unwrap<T>(response: { data: ApiSuccess<T> | T }): T {
  const payload = response.data as ApiSuccess<T> | T;
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as ApiSuccess<T>).data;
  }
  return payload as T;
}
