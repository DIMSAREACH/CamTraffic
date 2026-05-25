/**
 * API layer — routes to Django REST backend or in-memory mock.
 * Set VITE_USE_MOCK=true in .env to run without backend.
 */
import type {
  User, Vehicle, Fine, TrafficSign, AIDetectionLog, AIDetectionPageStats, Notification,
  DashboardStats, AuthResponse, RegisterResponse, LoginOptions,
} from '../types';
import { getRefreshToken } from '@shared/utils/authStorage';
import { apiClient, unwrap, unwrapList } from './axiosClient';
import * as mockApi from './mockApi';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ── AUTH ──────────────────────────────────────────────────────────
export const authAPI = USE_MOCK ? mockApi.authAPI : {
  async login(email: string, password: string, options?: LoginOptions): Promise<AuthResponse> {
    const res = await apiClient.post('/auth/login/', { email, password, ...options });
    const data = unwrap<{ access: string; refresh: string; user: User }>(res);
    return { access: data.access, refresh: data.refresh, user: data.user };
  },
  async register(data: Partial<User> & { password: string; password_confirm?: string }): Promise<RegisterResponse> {
    const res = await apiClient.post('/auth/register/', {
      ...data,
      password_confirm: data.password_confirm ?? data.password,
    });
    return unwrap<RegisterResponse>(res);
  },
  async logout(): Promise<void> {
    const refresh = getRefreshToken();
    try {
      await apiClient.post('/auth/logout/', { refresh });
    } catch { /* ignore */ }
  },
  async changePassword(old_password: string, new_password: string): Promise<{ message?: string }> {
    return unwrap(await apiClient.post('/auth/change-password/', { old_password, new_password }));
  },
};

// ── USERS ────────────────────────────────────────────────────────
export const usersAPI = USE_MOCK ? mockApi.usersAPI : {
  async getAll(): Promise<User[]> {
    return unwrapList<User>(await apiClient.get('/users/', { params: { page_size: 100 } }));
  },
  async getById(id: number): Promise<User> {
    return unwrap<User>(await apiClient.get(`/users/${id}/`));
  },
  async update(id: number, data: Partial<User>): Promise<User> {
    return unwrap<User>(await apiClient.patch(`/users/${id}/`, data));
  },
  async uploadProfileImage(id: number, file: File): Promise<User> {
    const form = new FormData();
    form.append('profile_image', file);
    return unwrap<User>(await apiClient.patch(`/users/${id}/`, form));
  },
  async create(data: Partial<User> & { password: string }): Promise<User> {
    return unwrap<User>(await apiClient.post('/users/', data));
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/users/${id}/`);
  },
  async toggleActive(id: number): Promise<User> {
    return unwrap<User>(await apiClient.post(`/users/${id}/toggle-active/`));
  },
};

// ── VEHICLES ─────────────────────────────────────────────────────
export const vehiclesAPI = USE_MOCK ? mockApi.vehiclesAPI : {
  async getAll(): Promise<Vehicle[]> {
    return unwrapList<Vehicle>(await apiClient.get('/vehicles/', { params: { page_size: 100 } }));
  },
  async getByOwner(ownerId: number): Promise<Vehicle[]> {
    const all = await vehiclesAPI.getAll();
    return all.filter((v) => v.owner_id === ownerId);
  },
  async create(data: Partial<Vehicle>): Promise<Vehicle> {
    return unwrap<Vehicle>(await apiClient.post('/vehicles/', data));
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/vehicles/${id}/`);
  },
  async searchByPlate(plate: string): Promise<Vehicle | null> {
    try {
      return unwrap<Vehicle>(await apiClient.get('/vehicles/search/', { params: { plate } }));
    } catch {
      return null;
    }
  },
};

// ── FINES ────────────────────────────────────────────────────────
export const finesAPI = USE_MOCK ? mockApi.finesAPI : {
  async getAll(): Promise<Fine[]> {
    return unwrapList<Fine>(await apiClient.get('/fines/', { params: { page_size: 100 } }));
  },
  async getByDriver(driverId: number): Promise<Fine[]> {
    const all = await finesAPI.getAll();
    return all.filter((f) => f.driver_id === driverId);
  },
  async getByPolice(policeId: number): Promise<Fine[]> {
    const all = await finesAPI.getAll();
    return all.filter((f) => f.police_id === policeId);
  },
  async create(data: Partial<Fine> & { driver_id?: number }): Promise<Fine> {
    return unwrap<Fine>(await apiClient.post('/fines/', {
      driver_id: data.driver_id,
      amount: data.amount,
      reason: data.reason,
      location: data.location,
      vehicle_plate: data.vehicle_plate,
    }));
  },
  async createWithEvidence(formData: FormData): Promise<Fine> {
    return unwrap<Fine>(await apiClient.post('/fines/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  },
  async updateStatus(id: number, status: Fine['status']): Promise<Fine> {
    return unwrap<Fine>(await apiClient.patch(`/fines/${id}/`, { status }));
  },
  async searchByLicense(license: string) {
    return unwrap<{ driver: User | null; fines: Fine[]; vehicles: Vehicle[] }>(
      await apiClient.get('/fines/lookup/', { params: { license } }),
    );
  },
  getPdfUrl(fineId: number): string {
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
    return `${base}/fines/${fineId}/pdf/`;
  },
};

// ── TRAFFIC SIGNS ────────────────────────────────────────────────
export const signsAPI = USE_MOCK ? mockApi.signsAPI : {
  async getAll(): Promise<TrafficSign[]> {
    return unwrapList<TrafficSign>(await apiClient.get('/signs/', { params: { page_size: 500 } }));
  },
  async getById(id: number): Promise<TrafficSign> {
    return unwrap<TrafficSign>(await apiClient.get(`/signs/${id}/`));
  },
  async create(data: FormData): Promise<TrafficSign> {
    return unwrap<TrafficSign>(await apiClient.post('/signs/', data));
  },
  async update(id: number, data: FormData | Record<string, unknown>): Promise<TrafficSign> {
    return unwrap<TrafficSign>(await apiClient.patch(`/signs/${id}/`, data));
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/signs/${id}/`);
  },
  async chatbot(question: string) {
    return unwrap<{ answer: string; sign: TrafficSign | null }>(
      await apiClient.post('/signs/chatbot/', { question }),
    );
  },
};

// ── AI DETECTION ─────────────────────────────────────────────────
export const aiAPI = USE_MOCK ? mockApi.aiAPI : {
  async detect(file: File) {
    const form = new FormData();
    form.append('image', file);
    return unwrap<{
      sign_name: string;
      confidence: number;
      description: string;
      guidance: string;
      processing_time: number;
      log_id?: number;
      uploaded_image?: string;
    }>(await apiClient.post('/ai/detect/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  },
  async getLogs(userId?: number): Promise<AIDetectionLog[]> {
    const logs = unwrapList<AIDetectionLog>(await apiClient.get('/ai/logs/', { params: { page_size: 100 } }));
    if (userId) return logs.filter((l) => l.user_id === userId);
    return logs;
  },
  async getPageStats(): Promise<AIDetectionPageStats> {
    return unwrap<AIDetectionPageStats>(await apiClient.get('/ai/stats/'));
  },
  async speakKhmer(text: string): Promise<Blob> {
    const res = await apiClient.post('/ai/tts/', { text }, { responseType: 'blob' });
    return res.data as Blob;
  },
};

// ── NOTIFICATIONS ────────────────────────────────────────────────
export const notificationsAPI = USE_MOCK ? mockApi.notificationsAPI : {
  async getByUser(_userId: number): Promise<Notification[]> {
    return unwrapList<Notification>(await apiClient.get('/notifications/', { params: { page_size: 100 } }));
  },
  async markRead(id: number): Promise<void> {
    await apiClient.post(`/notifications/${id}/read/`);
  },
  async markAllRead(_userId: number): Promise<void> {
    await apiClient.post('/notifications/read/');
  },
};

// ── DASHBOARD ────────────────────────────────────────────────────
export const dashboardAPI = USE_MOCK ? mockApi.dashboardAPI : {
  async getAdminStats(): Promise<DashboardStats> {
    return unwrap<DashboardStats>(await apiClient.get('/dashboard/admin/'));
  },
  async getPoliceStats(_policeId: number) {
    return unwrap(await apiClient.get('/dashboard/police/'));
  },
  async getDriverStats(_driverId: number) {
    return unwrap(await apiClient.get('/dashboard/driver/'));
  },
};
