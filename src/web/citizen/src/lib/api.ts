import type {
  ApiEnvelope,
  Appeal,
  DriverDashboardStats,
  Fine,
  Paginated,
  User,
  Vehicle,
  Violation,
} from './types';
import { clearSession, getAccessToken, getRefreshToken, saveSession } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch<T>(path, init);
    clearSession();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed (${response.status})`);
  }

  return payload as T;
}

function unwrapList<T>(payload: ApiEnvelope<Paginated<T> | T[]>): T[] {
  const data = payload.data;
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

function unwrap<T>(payload: ApiEnvelope<T>): T {
  return payload.data;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const payload = (await res.json()) as ApiEnvelope<{ access: string }>;
    localStorage.setItem('camtraffic_citizen_access', payload.data.access);
    return true;
  } catch {
    return false;
  }
}

export const citizenApi = {
  async login(email: string, password: string) {
    const payload = await apiFetch<ApiEnvelope<{ access: string; refresh: string; user: User }>>(
      '/auth/login/',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    saveSession(payload.data.access, payload.data.refresh, payload.data.user);
    return payload.data.user;
  },

  async logout() {
    const refresh = getRefreshToken();
    try {
      await apiFetch('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      });
    } finally {
      clearSession();
    }
  },

  async getProfile() {
    return unwrap<User>(await apiFetch('/auth/profile/'));
  },

  async getDashboard() {
    return unwrap<DriverDashboardStats>(await apiFetch('/dashboard/driver/'));
  },

  async getFines() {
    return unwrapList<Fine>(await apiFetch('/fines/?page_size=100'));
  },

  async getFine(id: string) {
    return unwrap<Fine>(await apiFetch(`/fines/${id}/`));
  },

  async payFine(id: string, paymentMethod: string, reference?: string) {
    const form = new FormData();
    form.append('payment_method', paymentMethod);
    if (reference) form.append('payment_reference', reference);
    return unwrap<Fine>(
      await apiFetch(`/fines/${id}/pay/`, { method: 'POST', body: form }),
    );
  },

  async getViolations() {
    return unwrapList<Violation>(await apiFetch('/violations/?page_size=100'));
  },

  async getAppeals() {
    return unwrapList<Appeal>(await apiFetch('/appeals/?page_size=100'));
  },

  async submitAppeal(fineId: string, reason: string, files: File[] = []) {
    const form = new FormData();
    form.append('fine_id', fineId);
    form.append('reason', reason);
    files.forEach((file) => form.append('attachments', file));
    return unwrap<Appeal>(await apiFetch('/appeals/', { method: 'POST', body: form }));
  },

  async getVehicles() {
    return unwrapList<Vehicle>(await apiFetch('/vehicles/?page_size=100'));
  },
};
