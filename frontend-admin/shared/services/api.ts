/**
 * API layer — routes to Django REST backend or in-memory mock.
 * Set VITE_USE_MOCK=true in .env to run without backend.
 */
import type {
  User, Vehicle, Fine, TrafficSign, TrafficViolation, AIDetectionLog, AIDetectionPageStats, Notification,
  DashboardStats, AuthResponse, RegisterResponse, LoginOptions, Road, Camera,
  ProfileOverview, UserPreferences,
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
  async getProfile(): Promise<User> {
    return unwrap<User>(await apiClient.get('/auth/profile/'));
  },
  async updateProfile(data: Partial<User>): Promise<User> {
    return unwrap<User>(await apiClient.patch('/auth/profile/', data));
  },
  async requestPasswordReset(email: string): Promise<{ message?: string }> {
    const res = await apiClient.post('/auth/password-reset/', { email });
    return { message: res.data?.message };
  },
  async confirmPasswordReset(uid: string, token: string, new_password: string): Promise<{ message?: string }> {
    const res = await apiClient.post('/auth/password-reset/confirm/', { uid, token, new_password });
    return { message: res.data?.message };
  },
  async getOAuthAuthorizeUrl(provider: 'google' | 'github', redirect_uri?: string): Promise<{ authorization_url: string }> {
    return unwrap<{ authorization_url: string }>(await apiClient.get(`/auth/oauth/${provider}/authorize/`, {
      params: redirect_uri ? { redirect_uri } : undefined,
    }));
  },
  async completeOAuth(
    provider: 'google' | 'github',
    code: string,
    state: string,
    portal: 'admin' | 'user',
    redirect_uri?: string,
  ): Promise<AuthResponse> {
    const data = unwrap<{ access: string; refresh: string; user: User }>(await apiClient.post('/auth/oauth/complete/', {
      provider,
      code,
      state,
      portal,
      ...(redirect_uri ? { redirect_uri } : {}),
    }));
    return { access: data.access, refresh: data.refresh, user: data.user };
  },
};

// ── PROFILE ─────────────────────────────────────────────────────
export const profileAPI = USE_MOCK ? mockApi.profileAPI : {
  async getOverview(): Promise<ProfileOverview> {
    return unwrap<ProfileOverview>(await apiClient.get('/auth/profile/overview/'));
  },
  async updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
    return unwrap<UserPreferences>(await apiClient.patch('/auth/profile/preferences/', data));
  },
  async deactivate(refresh?: string): Promise<{ message?: string }> {
    return unwrap(await apiClient.post('/auth/profile/deactivate/', refresh ? { refresh } : {}));
  },
  async logoutOtherSessions(refresh: string): Promise<{ revoked: number; message?: string }> {
    return unwrap(await apiClient.post('/auth/profile/logout-others/', { refresh }));
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

// ── VIOLATIONS ───────────────────────────────────────────────────
export const violationsAPI = USE_MOCK ? mockApi.violationsAPI : {
  async getAll(): Promise<TrafficViolation[]> {
    return unwrapList<TrafficViolation>(await apiClient.get('/violations/', { params: { page_size: 100 } }));
  },
  async getById(id: number): Promise<TrafficViolation> {
    return unwrap<TrafficViolation>(await apiClient.get(`/violations/${id}/`));
  },
  async evaluate(data: { class_key: string; observed_action: string; sign_code?: string }) {
    return unwrap(await apiClient.post('/violations/evaluate/', data));
  },
  async create(data: {
    driver_id: number;
    class_key: string;
    observed_action: string;
    sign_code?: string;
    location?: string;
    ai_detection_log_id?: number;
  }): Promise<TrafficViolation> {
    return unwrap<TrafficViolation>(await apiClient.post('/violations/', data));
  },
  async update(id: number, data: Partial<Pick<TrafficViolation, 'status' | 'location' | 'description'>>): Promise<TrafficViolation> {
    return unwrap<TrafficViolation>(await apiClient.patch(`/violations/${id}/`, data));
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/violations/${id}/`);
  },
  async getStats() {
    return unwrap(await apiClient.get('/violations/stats/'));
  },
};

// ── TRAFFIC SIGNS ────────────────────────────────────────────────
export const signsAPI = USE_MOCK ? mockApi.signsAPI : {
  async getAll(opts?: { trainedOnly?: boolean }): Promise<TrafficSign[]> {
    const params: Record<string, string | number> = { page_size: 500 };
    if (opts?.trainedOnly) params.trained_only = '1';
    return unwrapList<TrafficSign>(await apiClient.get('/signs/', { params }));
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
  async detect(file: File, options?: {
    observed_action?: string;
    demo_violation?: boolean;
    auto_create_violation?: boolean;
    location?: string;
    camera_id?: number;
  }) {
    const form = new FormData();
    form.append('image', file);
    if (options?.observed_action) form.append('observed_action', options.observed_action);
    if (options?.demo_violation) form.append('demo_violation', 'true');
    if (options?.auto_create_violation) form.append('auto_create_violation', 'true');
    if (options?.location) form.append('location', options.location);
    if (options?.camera_id != null) form.append('camera_id', String(options.camera_id));
    return unwrap<{
      sign_name: string;
      sign_name_km?: string;
      sign_name_en?: string;
      sign_code?: string;
      sign_bbox?: { x1: number; y1: number; x2: number; y2: number };
      category?: string;
      confidence: number;
      description: string;
      description_en?: string;
      guidance: string;
      guidance_en?: string;
      processing_time: number;
      log_id?: number;
      uploaded_image?: string;
      vehicles?: Array<{
        vehicle_type: string;
        label: string;
        confidence: number;
        bbox: { x1: number; y1: number; x2: number; y2: number };
      }>;
      vehicle_count?: number;
      detection_mode?: 'sign' | 'vehicle' | 'plate' | 'unknown_sign' | 'no_sign';
      detected_plate?: string;
      plate_confidence?: number;
      plate_type?: string;
      matched_vehicle?: {
        id: number;
        plate_number: string;
        owner_name: string;
        vehicle_type: string;
      } | null;
      pipeline?: Array<{
        id: string;
        status: string;
        detail_en?: string;
        detail_km?: string;
        confidence?: number;
      }>;
      pipeline_vehicle?: {
        vehicle_type: string;
        vehicle_label_en: string;
        vehicle_label_km: string;
        vehicle_confidence: number;
        source?: string;
      };
      violation_evaluation?: {
        is_violation: boolean;
        violation_type?: string;
        title?: string;
        description?: string;
        observed_action?: string;
        default_fine_amount?: number;
        reason?: string;
      };
      violation?: TrafficViolation;
      violation_error?: string;
      vehicle_snapshot?: string;
      plate_snapshot?: string;
      pipeline_enforcement?: {
        observed_action?: string;
        demo_mode?: boolean;
        evidence_log_id?: number;
        violation_id?: number;
        evidence_saved?: boolean;
      };
      display_title?: string;
      display_title_en?: string;
      display_title_km?: string;
      display_confidence?: number;
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
  async speakText(text: string, lang: 'km' | 'en' = 'km'): Promise<Blob> {
    const res = await apiClient.post('/ai/tts/', { text, lang }, { responseType: 'blob' });
    const blob = res.data as Blob;
    const type = (blob.type || res.headers['content-type'] || '').toLowerCase();
    if (type.includes('json') || type.includes('text')) {
      const raw = await blob.text();
      throw new Error(raw || 'TTS request failed');
    }
    return blob;
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
  async clearRead(): Promise<{ deleted: number }> {
    return unwrap(await apiClient.delete('/notifications/clear-read/'));
  },
};

// ── INFRASTRUCTURE (roads & cameras) ─────────────────────────────
export const roadsAPI = USE_MOCK ? mockApi.roadsAPI : {
  async getAll(): Promise<Road[]> {
    return unwrapList<Road>(await apiClient.get('/roads/', { params: { page_size: 200 } }));
  },
  async getById(id: number): Promise<Road> {
    return unwrap<Road>(await apiClient.get(`/roads/${id}/`));
  },
  async create(data: Partial<Road>): Promise<Road> {
    return unwrap<Road>(await apiClient.post('/roads/', data));
  },
  async update(id: number, data: Partial<Road>): Promise<Road> {
    return unwrap<Road>(await apiClient.patch(`/roads/${id}/`, data));
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/roads/${id}/`);
  },
};

export const camerasAPI = USE_MOCK ? mockApi.camerasAPI : {
  async getAll(): Promise<Camera[]> {
    return unwrapList<Camera>(await apiClient.get('/cameras/', { params: { page_size: 200 } }));
  },
  async getById(id: number): Promise<Camera> {
    return unwrap<Camera>(await apiClient.get(`/cameras/${id}/`));
  },
  async create(data: Partial<Camera> & { road: number }): Promise<Camera> {
    return unwrap<Camera>(await apiClient.post('/cameras/', data));
  },
  async update(id: number, data: Partial<Camera>): Promise<Camera> {
    return unwrap<Camera>(await apiClient.patch(`/cameras/${id}/`, data));
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/cameras/${id}/`);
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
  async getPoliceReportStats(): Promise<DashboardStats> {
    return unwrap<DashboardStats>(await apiClient.get('/dashboard/police/reports/'));
  },
  async getDriverStats(_driverId: number) {
    return unwrap(await apiClient.get('/dashboard/driver/'));
  },
};
