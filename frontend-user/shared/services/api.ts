/**
 * API layer — routes to Django REST backend or in-memory mock.
 * Set VITE_USE_MOCK=true in .env to run without backend.
 */
import type {
  User, Vehicle, Fine, TrafficSign, TrafficViolation, ViolationRule, AIDetectionLog, AIDetectionPageStats, Notification,
  DashboardStats, AuthResponse, RegisterResponse, LoginOptions, Road, Camera,
  ProfileOverview, UserPreferences, EvidenceArchiveItem,
} from '../types';
import { getRefreshToken } from '@shared/utils/authStorage';
import { apiClient, unwrap, unwrapList } from './axiosClient';
import * as mockApi from './mockApi';
import * as sample from './sampleDataFallback';

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
    const live = unwrap<ProfileOverview>(await apiClient.get('/auth/profile/overview/'));
    return sample.mergeProfileOverview(live);
  },
  async updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
    return unwrap<UserPreferences>(await apiClient.patch('/auth/profile/preferences/', data));
  },
  async deactivate(refresh?: string): Promise<{ message?: string }> {
    return unwrap(await apiClient.post('/auth/profile/deactivate/', refresh ? { refresh } : {}));
  },
  async deleteAccount(password: string, refresh?: string): Promise<{ message?: string }> {
    return unwrap(await apiClient.post('/auth/profile/delete/', { password, ...(refresh ? { refresh } : {}) }));
  },
  async logoutOtherSessions(refresh: string): Promise<{ revoked: number; message?: string }> {
    return unwrap(await apiClient.post('/auth/profile/logout-others/', { refresh }));
  },
};

// ── USERS ────────────────────────────────────────────────────────
export const usersAPI = USE_MOCK ? mockApi.usersAPI : {
  async getAll(): Promise<User[]> {
    const live = unwrapList<User>(await apiClient.get('/users/', { params: { page_size: 100 } }));
    return sample.withListFallback(live, sample.sampleUsers());
  },
  async getById(id: string): Promise<User> {
    return unwrap<User>(await apiClient.get(`/users/${id}/`));
  },
  async update(id: string, data: Partial<User>): Promise<User> {
    return unwrap<User>(await apiClient.patch(`/users/${id}/`, data));
  },
  async uploadProfileImage(id: string, file: File): Promise<User> {
    const form = new FormData();
    form.append('profile_image', file);
    return unwrap<User>(await apiClient.patch(`/users/${id}/`, form));
  },
  async create(data: Partial<User> & { password: string }): Promise<User> {
    return unwrap<User>(await apiClient.post('/users/', data));
  },
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}/`);
  },
  async toggleActive(id: string): Promise<User> {
    return unwrap<User>(await apiClient.post(`/users/${id}/toggle-active/`));
  },
};

// ── VEHICLES ─────────────────────────────────────────────────────
export const vehiclesAPI = USE_MOCK ? mockApi.vehiclesAPI : {
  async getAll(): Promise<Vehicle[]> {
    const live = unwrapList<Vehicle>(await apiClient.get('/vehicles/', { params: { page_size: 100 } }));
    return sample.withListFallback(live, sample.sampleVehicles());
  },
  async getByOwner(ownerId: number): Promise<Vehicle[]> {
    const all = await vehiclesAPI.getAll();
    const owned = all.filter((v) => v.owner_id === ownerId);
    return sample.withListFallback(owned, sample.sampleVehiclesForOwner(ownerId));
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
    const live = unwrapList<Fine>(await apiClient.get('/fines/', { params: { page_size: 100 } }));
    return sample.withListFallback(live, sample.sampleFines());
  },
  async getByDriver(driverId: number): Promise<Fine[]> {
    const all = await finesAPI.getAll();
    const owned = all.filter((f) => f.driver_id === driverId);
    return sample.withListFallback(owned, sample.sampleFinesForDriver(driverId));
  },
  async getByPolice(policeId: number): Promise<Fine[]> {
    const all = await finesAPI.getAll();
    const issued = all.filter((f) => f.police_id === policeId);
    return sample.withListFallback(issued, sample.sampleFinesForPolice(policeId));
  },
  async create(data: Partial<Fine> & { driver_id?: number; violation_id?: number }): Promise<Fine> {
    return unwrap<Fine>(await apiClient.post('/fines/', {
      driver_id: data.driver_id,
      violation_id: data.violation_id,
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
    return unwrap<{
      driver: User | null;
      driver_profile_id: number | null;
      fines: Fine[];
      vehicles: Vehicle[];
    }>(await apiClient.get('/fines/lookup/', { params: { license } }));
  },
  getPdfUrl(fineId: number): string {
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
    return `${base}/fines/${fineId}/pdf/`;
  },
};

// ── VIOLATIONS ───────────────────────────────────────────────────
export const violationsAPI = USE_MOCK ? mockApi.violationsAPI : {
  async getAll(): Promise<TrafficViolation[]> {
    const live = unwrapList<TrafficViolation>(await apiClient.get('/violations/', { params: { page_size: 100 } }));
    return sample.withListFallback(live, sample.SAMPLE_VIOLATIONS);
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
  async getRules(): Promise<ViolationRule[]> {
    const live = unwrapList<ViolationRule>(await apiClient.get('/violations/rules/'));
    return sample.withListFallback(live, sample.SAMPLE_VIOLATION_RULES);
  },
};

// ── TRAFFIC SIGNS ────────────────────────────────────────────────
export const signsAPI = USE_MOCK ? mockApi.signsAPI : {
  async getAll(opts?: { trainedOnly?: boolean }): Promise<TrafficSign[]> {
    const params: Record<string, string | number> = { page_size: 500 };
    if (opts?.trainedOnly) params.trained_only = '1';
    const live = unwrapList<TrafficSign>(await apiClient.get('/signs/', { params }));
    return sample.withListFallback(live, sample.getSampleTrafficSigns());
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
    live_scan?: boolean;
    live_fast?: boolean;
    sign_only?: boolean;
    catalog_sign_code?: string;
    track_session?: string;
    debug_mode?: boolean;
  }) {
    const form = new FormData();
    form.append('image', file, file.name);
    form.append('original_filename', file.name);
    if (options?.live_scan) form.append('live_scan', 'true');
    if (options?.live_fast) form.append('live_fast', 'true');
    if (options?.track_session) form.append('track_session', options.track_session);
    if (options?.sign_only) form.append('sign_only', 'true');
    if (options?.catalog_sign_code) form.append('catalog_sign_code', options.catalog_sign_code);
    if (options?.debug_mode) form.append('debug_mode', 'true');
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
        track_id?: number;
      }>;
      vehicle_count?: number;
      track_session?: string;
      vehicle_tracking_enabled?: boolean;
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
      crop_size?: string;
      localization_debug?: {
        found?: boolean;
        method?: string;
        guide_size?: string;
        crop_size?: string;
        sign_code?: string;
        yolo_class_key?: string;
        yolo_class_id?: number | null;
        yolo_class_name?: string;
        yolo_confidence?: number;
        confidence?: number;
      };
      guide_frame_image?: string;
      sign_crop_image?: string;
      processed_image?: string;
      annotated_processed_image?: string;
      pipeline_trace?: {
        found?: boolean;
        method?: string;
        guide_size?: string;
        crop_size?: string;
        sign_code?: string;
        yolo_class_key?: string;
        yolo_class_id?: number | null;
        yolo_class_name?: string;
        yolo_confidence?: number;
        confidence?: number;
        used_adaptive?: boolean;
        contrast?: number;
        white_ratio?: number;
      };
    }>(await apiClient.post('/ai/detect/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  },
  async getLogs(userId?: number): Promise<AIDetectionLog[]> {
    const live = unwrapList<AIDetectionLog>(await apiClient.get('/ai/logs/', { params: { page_size: 100 } }));
    const logs = sample.withListFallback(live, sample.sampleAiLogs());
    if (userId) return logs.filter((l) => l.user_id === userId);
    return logs;
  },
  async getPageStats(): Promise<AIDetectionPageStats> {
    const live = unwrap<AIDetectionPageStats>(await apiClient.get('/ai/stats/'));
    return sample.mergePageStats(live);
  },
  async exportLogsCsv(): Promise<Blob> {
    const res = await apiClient.get('/ai/logs/export/', { responseType: 'blob' });
    return res.data as Blob;
  },
  async speakText(text: string, lang: 'km' | 'en' = 'km'): Promise<Blob> {
    const res = await apiClient.post('/ai/tts/', { text, lang }, {
      responseType: 'blob',
      timeout: 45000,
    });
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
    const live = unwrapList<Notification>(await apiClient.get('/notifications/', { params: { page_size: 100 } }));
    return sample.withListFallback(live, sample.sampleNotificationsForUser(_userId));
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
    const live = unwrapList<Road>(await apiClient.get('/roads/', { params: { page_size: 200 } }));
    return sample.withListFallback(live, sample.sampleRoads());
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
    const live = unwrapList<Camera>(await apiClient.get('/cameras/', { params: { page_size: 200 } }));
    return sample.withListFallback(live, sample.sampleCameras());
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
    try {
      const live = unwrap<DashboardStats>(await apiClient.get('/dashboard/admin/'));
      return sample.mergeDashboardStats(live);
    } catch {
      return sample.getSampleAdminDashboard();
    }
  },
  async getPoliceStats(policeId: number) {
    try {
      const live = unwrap(await apiClient.get('/dashboard/police/'));
      return sample.mergePoliceStats(live as sample.PoliceDashboardStats, policeId);
    } catch {
      return sample.getSamplePoliceStats(policeId);
    }
  },
  async getPoliceReportStats(): Promise<DashboardStats> {
    try {
      const live = unwrap<DashboardStats>(await apiClient.get('/dashboard/police/reports/'));
      return sample.mergeDashboardStats(live);
    } catch {
      return sample.getSampleAdminDashboard();
    }
  },
  async getDriverStats(driverId: string | number) {
    try {
      const live = unwrap(await apiClient.get('/dashboard/driver/'));
      return sample.mergeDriverStats(live as sample.DriverDashboardStats, driverId);
    } catch {
      return sample.getSampleDriverStats(driverId);
    }
  },
  async downloadReportPdf(scope: 'admin' | 'police' = 'police'): Promise<Blob> {
    const path = scope === 'admin'
      ? '/dashboard/admin/report/pdf/'
      : '/dashboard/police/reports/pdf/';
    const res = await apiClient.get(path, { responseType: 'blob', timeout: 60000 });
    const blob = res.data as Blob;
    const type = (blob.type || res.headers['content-type'] || '').toLowerCase();
    if (type.includes('json') || type.includes('text')) {
      const raw = await blob.text();
      throw new Error(raw || 'Report PDF export failed');
    }
    return blob;
  },
  async downloadEnforcementExcel(year: number, month: number): Promise<Blob> {
    const res = await apiClient.get('/dashboard/enforcement/export.xlsx/', {
      params: { year, month },
      responseType: 'blob',
      timeout: 60000,
    });
    const blob = res.data as Blob;
    const type = (blob.type || res.headers['content-type'] || '').toLowerCase();
    if (type.includes('json') || type.includes('text')) {
      const raw = await blob.text();
      throw new Error(raw || 'Excel export failed');
    }
    return blob;
  },
  async searchEvidence(params?: { plate?: string; type?: string; limit?: number }) {
    const live = unwrap<{ count: number; results: EvidenceArchiveItem[] }>(
      await apiClient.get('/dashboard/evidence/', { params }),
    );
    if (live.results?.length) return live;
    const results = sample.getSampleEvidenceArchive();
    return { count: results.length, results };
  },
};
