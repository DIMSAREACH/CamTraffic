/**
 * API layer — Django REST backend (production truth).
 * Development-only: VITE_USE_MOCK=true uses in-memory mockApi; VITE_USE_SAMPLE_FALLBACK=true merges demo rows when APIs return empty.
 */
import { assertProductionDataMode, USE_MOCK_API } from '@shared/config/dataMode';
import type {
  User, Vehicle, Fine, TrafficSign, TrafficViolation, ViolationRule, AIDetectionLog, AIDetectionPageStats, Notification,
  DashboardStats, AuthResponse, RegisterResponse, LoginOptions, Road, Camera,
  ProfileOverview, UserPreferences, EvidenceArchiveItem,
  ViolationAppeal, AuditLogEntry, UnknownVehicleRecord, AIModelVersion,
  RBACRole, RBACPermission, OfficerProfile, DriverProfile, PoliceStation, SystemBackupItem,
} from '../types';
import { getRefreshToken } from '@shared/utils/authStorage';
import { normalizeDetectionMedia } from '@shared/utils/profileImage';
import { apiClient, unwrap, unwrapList } from './axiosClient';
import { API_CATALOG, DETECTION_API } from './detectionEndpoints';
import * as mockApi from './mockApi';
import * as sample from './sampleDataFallback';

assertProductionDataMode();
const USE_MOCK = USE_MOCK_API;

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
  async getOAuthAuthorizeUrl(provider: 'google' | 'github', redirect_uri?: string): Promise<{ authorization_url: string; redirect_uri?: string }> {
    return unwrap<{ authorization_url: string; redirect_uri?: string }>(await apiClient.get(`/auth/oauth/${provider}/authorize/`, {
      params: redirect_uri ? { redirect_uri } : undefined,
    }));
  },
  async getOAuthStatus(): Promise<{ google: boolean; github: boolean }> {
    return unwrap<{ google: boolean; github: boolean }>(await apiClient.get('/auth/oauth/status/'));
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
  async sendEmailVerification(): Promise<{ message?: string }> {
    return unwrap(await apiClient.post('/auth/verify-email/send/'));
  },
  async confirmEmailVerification(uid: string, token: string): Promise<{ message?: string }> {
    return unwrap(await apiClient.post('/auth/verify-email/confirm/', { uid, token }));
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
  async deleteAccount(
    password: string,
    refresh?: string,
    options?: { confirm?: string },
  ): Promise<{ message?: string }> {
    return unwrap(await apiClient.post('/auth/profile/delete/', {
      password,
      ...(options?.confirm ? { confirm: options.confirm } : {}),
      ...(refresh ? { refresh } : {}),
    }));
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
  async delete(id: string): Promise<{ user: User | null; message?: string }> {
    const res = await apiClient.delete(`/users/${id}/`);
    const body = res.data as { data?: User | null; message?: string };
    return {
      user: body?.data && typeof body.data === 'object' ? body.data : null,
      message: body?.message,
    };
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
  async getByOwner(ownerId: string | number): Promise<Vehicle[]> {
    const all = await vehiclesAPI.getAll();
    const owned = all.filter((v) => String(v.owner_id) === String(ownerId));
    return sample.withListFallback(owned, sample.sampleVehiclesForOwner(ownerId));
  },
  async create(data: Partial<Vehicle>): Promise<Vehicle> {
    return unwrap<Vehicle>(await apiClient.post('/vehicles/', data));
  },
  async update(id: string | number, data: Partial<Vehicle>): Promise<Vehicle> {
    return unwrap<Vehicle>(await apiClient.patch(`/vehicles/${id}/`, data));
  },
  async delete(id: string | number): Promise<void> {
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
  async getByDriver(driverId: string): Promise<Fine[]> {
    const all = await finesAPI.getAll();
    const owned = all.filter((f) => f.driver_id === driverId);
    return sample.withListFallback(owned, sample.sampleFinesForDriver(driverId));
  },
  async getByPolice(policeId: string): Promise<Fine[]> {
    const all = await finesAPI.getAll();
    const issued = all.filter((f) => f.police_id === policeId);
    return sample.withListFallback(issued, sample.sampleFinesForPolice(policeId));
  },
  async create(data: Partial<Fine> & { driver_id?: string; violation_id?: string }): Promise<Fine> {
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
  async updateStatus(id: string, status: Fine['status']): Promise<Fine> {
    return unwrap<Fine>(await apiClient.patch(`/fines/${id}/`, { status }));
  },
  async update(id: string, data: Partial<Pick<Fine, 'amount' | 'reason' | 'location' | 'vehicle_plate' | 'status'>>): Promise<Fine> {
    return unwrap<Fine>(await apiClient.patch(`/fines/${id}/`, data));
  },
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/fines/${id}/`);
  },
  async searchByLicense(license: string) {
    return unwrap<{
      driver: User | null;
      driver_profile_id: string | null;
      fines: Fine[];
      vehicles: Vehicle[];
    }>(await apiClient.get('/fines/lookup/', { params: { license } }));
  },
  getPdfUrl(fineId: string): string {
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
    return `${base}/fines/${fineId}/pdf/`;
  },
  async submitPayment(fineId: string, formData: FormData): Promise<Fine> {
    return unwrap<Fine>(await apiClient.post(`/fines/${fineId}/pay/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  },
  async getPaymentConfig(): Promise<{
    modes: string[];
    stripe_enabled: boolean;
    khqr_enabled: boolean;
    manual_enabled: boolean;
    currency: string;
  }> {
    return unwrap(await apiClient.get('/fines/payment-config/'));
  },
  async createStripeCheckout(fineId: string): Promise<{ checkout_url: string; session_id: string }> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return unwrap(await apiClient.post(`/fines/${fineId}/checkout/stripe/`, {
      success_url: `${origin}/dashboard/fines?paid=1`,
      cancel_url: `${origin}/dashboard/fines?cancel=1`,
    }));
  },
  async createKhqrSession(fineId: string): Promise<{
    bill_reference: string;
    amount_usd: string;
    instructions_en: string;
    instructions_km: string;
    merchant_name: string;
    merchant_account_usd?: string;
    merchant_account_khr?: string;
    qr_image_url: string;
    payment_reference: string;
  }> {
    return unwrap(await apiClient.post(`/fines/${fineId}/checkout/khqr/`, {}));
  },
};

// ── APPEALS ──────────────────────────────────────────────────────
export const appealsAPI = USE_MOCK ? mockApi.appealsAPI : {
  async getAll(): Promise<ViolationAppeal[]> {
    return unwrapList<ViolationAppeal>(await apiClient.get('/appeals/', { params: { page_size: 100 } }));
  },
  async create(formData: FormData): Promise<ViolationAppeal> {
    return unwrap<ViolationAppeal>(await apiClient.post('/appeals/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  },
  async review(id: string, data: { status: 'upheld' | 'dismissed'; officer_comments?: string }) {
    return unwrap<ViolationAppeal>(await apiClient.patch(`/appeals/${id}/review/`, data));
  },
};

export const auditAPI = USE_MOCK ? mockApi.auditAPI : {
  async getAll(): Promise<AuditLogEntry[]> {
    return unwrapList<AuditLogEntry>(await apiClient.get('/audit/', { params: { page_size: 200 } }));
  },
};

export const unknownVehiclesAPI = USE_MOCK ? mockApi.unknownVehiclesAPI : {
  async getAll(): Promise<UnknownVehicleRecord[]> {
    return unwrapList<UnknownVehicleRecord>(
      await apiClient.get('/unknown-vehicles/', { params: { page_size: 100 } }),
    );
  },
  async resolve(id: string, data: { linked_vehicle_id?: string; officer_note?: string }) {
    return unwrap<UnknownVehicleRecord>(
      await apiClient.patch(`/unknown-vehicles/${id}/resolve/`, data),
    );
  },
};

export const aiModelsAPI = USE_MOCK ? mockApi.aiModelsAPI : {
  async getAll(): Promise<AIModelVersion[]> {
    return unwrapList<AIModelVersion>(await apiClient.get('/ai-models/', { params: { page_size: 50 } }));
  },
  async create(data: Partial<AIModelVersion> & { is_active?: boolean }) {
    return unwrap<AIModelVersion>(await apiClient.post('/ai-models/', data));
  },
  async activate(id: string) {
    return unwrap<AIModelVersion>(await apiClient.post(`/ai-models/${id}/activate/`));
  },
};

// ── VIOLATIONS ───────────────────────────────────────────────────
export const violationsAPI = USE_MOCK ? mockApi.violationsAPI : {
  async getAll(): Promise<TrafficViolation[]> {
    const live = unwrapList<TrafficViolation>(await apiClient.get('/violations/', { params: { page_size: 100 } }));
    return sample.withListFallback(live, sample.SAMPLE_VIOLATIONS);
  },
  async getById(id: string): Promise<TrafficViolation> {
    return unwrap<TrafficViolation>(await apiClient.get(`/violations/${id}/`));
  },
  async evaluate(data: { class_key: string; observed_action: string; sign_code?: string }) {
    return unwrap(await apiClient.post('/violations/evaluate/', data));
  },
  async create(data: {
    driver_id: string;
    class_key: string;
    observed_action: string;
    sign_code?: string;
    location?: string;
    ai_detection_log_id?: string;
  }): Promise<TrafficViolation> {
    return unwrap<TrafficViolation>(await apiClient.post('/violations/', data));
  },
  async update(id: string, data: Partial<Pick<TrafficViolation, 'status' | 'location' | 'description'>>): Promise<TrafficViolation> {
    return unwrap<TrafficViolation>(await apiClient.patch(`/violations/${id}/`, data));
  },
  async delete(id: string): Promise<void> {
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
    return normalizeDetectionMedia(unwrap<{
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
    }>(await apiClient.post(DETECTION_API.image, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })));
  },
  async detectVideo(file: File, options?: {
    observed_action?: string;
    demo_violation?: boolean;
    auto_create_violation?: boolean;
  }) {
    const form = new FormData();
    form.append('video', file, file.name);
    if (options?.observed_action) form.append('observed_action', options.observed_action);
    if (options?.demo_violation) form.append('demo_violation', 'true');
    if (options?.auto_create_violation) form.append('auto_create_violation', 'true');
    return normalizeDetectionMedia(unwrap(await apiClient.post(DETECTION_API.video, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
    })));
  },
  async getDetectionHub() {
    return unwrap<{
      service: string;
      modes: Record<string, { method: string; url: string }>;
    }>(await apiClient.get(DETECTION_API.hub));
  },
  async getWebcamCapabilities() {
    return unwrap<{
      mode: string;
      method: string;
      url: string;
      fields: Record<string, string>;
    }>(await apiClient.get(DETECTION_API.webcam));
  },
  async getLogs(userId?: number): Promise<AIDetectionLog[]> {
    const live = unwrapList<AIDetectionLog>(await apiClient.get(DETECTION_API.logs, { params: { page_size: 100 } }));
    const logs = sample.withListFallback(live, sample.sampleAiLogs());
    if (userId) return logs.filter((l) => l.user_id === userId);
    return logs;
  },
  async getPageStats(): Promise<AIDetectionPageStats> {
    const live = unwrap<AIDetectionPageStats>(await apiClient.get(DETECTION_API.stats));
    return sample.mergePageStats(live);
  },
  async exportLogsCsv(): Promise<Blob> {
    const res = await apiClient.get(DETECTION_API.logsExport, { responseType: 'blob' });
    return res.data as Blob;
  },
  async speakText(text: string, lang: 'km' | 'en' = 'km'): Promise<Blob> {
    const res = await apiClient.post(DETECTION_API.tts, { text, lang }, {
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

export const catalogAPI = USE_MOCK ? mockApi.catalogAPI : {
  async getCatalog() {
    return unwrap<{
      service: string;
      version: string;
      modules: Record<string, string[]>;
      detection: Record<string, string>;
    }>(await apiClient.get(API_CATALOG));
  },
};

// ── NOTIFICATIONS ────────────────────────────────────────────────
export const notificationsAPI = USE_MOCK ? mockApi.notificationsAPI : {
  async getByUser(_userId: string | number): Promise<Notification[]> {
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
  async getById(id: string | number): Promise<Road> {
    return unwrap<Road>(await apiClient.get(`/roads/${id}/`));
  },
  async create(data: Partial<Road>): Promise<Road> {
    return unwrap<Road>(await apiClient.post('/roads/', data));
  },
  async update(id: string | number, data: Partial<Road>): Promise<Road> {
    return unwrap<Road>(await apiClient.patch(`/roads/${id}/`, data));
  },
  async delete(id: string | number): Promise<void> {
    await apiClient.delete(`/roads/${id}/`);
  },
};

export const camerasAPI = USE_MOCK ? mockApi.camerasAPI : {
  async getAll(): Promise<Camera[]> {
    const live = unwrapList<Camera>(await apiClient.get('/cameras/', { params: { page_size: 200 } }));
    return sample.withListFallback(live, sample.sampleCameras());
  },
  async getById(id: string | number): Promise<Camera> {
    return unwrap<Camera>(await apiClient.get(`/cameras/${id}/`));
  },
  async create(data: Partial<Camera> & { road: string | number }): Promise<Camera> {
    return unwrap<Camera>(await apiClient.post('/cameras/', data));
  },
  async update(id: string | number, data: Partial<Camera>): Promise<Camera> {
    return unwrap<Camera>(await apiClient.patch(`/cameras/${id}/`, data));
  },
  async delete(id: string | number): Promise<void> {
    await apiClient.delete(`/cameras/${id}/`);
  },
  async liveStatus(): Promise<{ cameras: Camera[]; summary: { total: number; active: number; offline: number }; polled_at: string }> {
    return unwrap(await apiClient.get('/cameras/live-status/'));
  },
  async processFrame(cameraId: string, extra?: Record<string, string>): Promise<unknown> {
    const form = new FormData();
    form.append('camera_id', cameraId);
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => form.append(k, v));
    }
    return normalizeDetectionMedia(unwrap(await apiClient.post(DETECTION_API.live, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    })));
  },
};

// ── DASHBOARD ────────────────────────────────────────────────────
export const dashboardAPI = USE_MOCK ? mockApi.dashboardAPI : {
  async getAdminStats(): Promise<DashboardStats> {
    const live = unwrap<DashboardStats>(await apiClient.get('/dashboard/admin/'));
    return sample.mergeDashboardStats(live);
  },
  async getPoliceStats(policeId?: string | number) {
    const live = unwrap(await apiClient.get('/dashboard/police/'));
    return sample.mergePoliceStats(live as sample.PoliceDashboardStats, policeId);
  },
  async getPoliceReportStats(): Promise<DashboardStats> {
    const live = unwrap<DashboardStats>(await apiClient.get('/dashboard/police/reports/'));
    return sample.mergeDashboardStats(live);
  },
  async getDriverStats(driverId: string | number) {
    const live = unwrap(await apiClient.get('/dashboard/driver/'));
    return sample.mergeDriverStats(live as sample.DriverDashboardStats, driverId);
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
    if (!results.length) return live;
    return { count: results.length, results };
  },
  async listSystemBackups(): Promise<{ backups: Array<Record<string, unknown>> }> {
    return unwrap(await apiClient.get('/dashboard/admin/backups/'));
  },
  async downloadSystemBackup(includeWeights = false): Promise<Blob> {
    const res = await apiClient.get('/dashboard/admin/backup/', {
      params: { include_weights: includeWeights ? 'true' : 'false' },
      responseType: 'blob',
      timeout: 300000,
    });
    const blob = res.data as Blob;
    const type = (blob.type || res.headers['content-type'] || '').toLowerCase();
    if (type.includes('json') || type.includes('text')) {
      const raw = await blob.text();
      throw new Error(raw || 'System backup export failed');
    }
    return blob;
  },
  async restoreSystemBackup(filename: string, includeMedia = true): Promise<{ restored: string[]; manifest?: Record<string, unknown> }> {
    return unwrap(await apiClient.post(`/dashboard/admin/backups/${encodeURIComponent(filename)}/restore/`, {
      include_media: includeMedia,
    }));
  },
};

// ── RBAC ─────────────────────────────────────────────────────────
export const rbacAPI = USE_MOCK ? mockApi.rbacAPI : {
  async getRoles(): Promise<RBACRole[]> {
    return unwrapList<RBACRole>(await apiClient.get('/rbac/roles/'));
  },
  async createRole(data: Partial<RBACRole>): Promise<RBACRole> {
    return unwrap<RBACRole>(await apiClient.post('/rbac/roles/', data));
  },
  async updateRole(id: string, data: Partial<RBACRole>): Promise<RBACRole> {
    return unwrap<RBACRole>(await apiClient.patch(`/rbac/roles/${id}/`, data));
  },
  async deleteRole(id: string): Promise<void> {
    await apiClient.delete(`/rbac/roles/${id}/`);
  },
  async getPermissions(): Promise<RBACPermission[]> {
    return unwrapList<RBACPermission>(await apiClient.get('/rbac/permissions/'));
  },
  async assignPermissions(roleId: string, permissionIds: string[]): Promise<RBACRole> {
    return unwrap<RBACRole>(await apiClient.post(`/rbac/roles/${roleId}/permissions/`, {
      permission_ids: permissionIds,
    }));
  },
};

// ── OFFICERS & STATIONS ─────────────────────────────────────────
export const officersAPI = USE_MOCK ? mockApi.officersAPI : {
  async getAll(): Promise<OfficerProfile[]> {
    return unwrapList<OfficerProfile>(await apiClient.get('/officers/'));
  },
  async create(data: Record<string, unknown>): Promise<OfficerProfile> {
    return unwrap<OfficerProfile>(await apiClient.post('/officers/', data));
  },
  async update(id: string, data: Partial<OfficerProfile>): Promise<OfficerProfile> {
    return unwrap<OfficerProfile>(await apiClient.patch(`/officers/${id}/`, data));
  },
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/officers/${id}/`);
  },
  async getStations(): Promise<PoliceStation[]> {
    return unwrapList<PoliceStation>(await apiClient.get('/officers/stations/'));
  },
  async createStation(data: Partial<PoliceStation>): Promise<PoliceStation> {
    return unwrap<PoliceStation>(await apiClient.post('/officers/stations/', data));
  },
  async updateStation(id: string, data: Partial<PoliceStation>): Promise<PoliceStation> {
    return unwrap<PoliceStation>(await apiClient.patch(`/officers/stations/${id}/`, data));
  },
  async deleteStation(id: string): Promise<void> {
    await apiClient.delete(`/officers/stations/${id}/`);
  },
};

// ── DRIVERS ───────────────────────────────────────────────────────
export const driversAPI = USE_MOCK ? mockApi.driversAPI : {
  async getAll(): Promise<DriverProfile[]> {
    return unwrapList<DriverProfile>(await apiClient.get('/drivers/'));
  },
  async create(data: Record<string, unknown>): Promise<DriverProfile> {
    return unwrap<DriverProfile>(await apiClient.post('/drivers/', data));
  },
  async update(id: string, data: Partial<DriverProfile>): Promise<DriverProfile> {
    return unwrap<DriverProfile>(await apiClient.patch(`/drivers/${id}/`, data));
  },
  async delete(id: string): Promise<{ driver: DriverProfile | null; message?: string }> {
    const res = await apiClient.delete(`/drivers/${id}/`);
    const body = res.data as { data?: DriverProfile | null; message?: string };
    return {
      driver: body?.data && typeof body.data === 'object' ? body.data : null,
      message: body?.message,
    };
  },
};
