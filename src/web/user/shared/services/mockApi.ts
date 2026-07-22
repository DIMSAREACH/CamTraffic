import {
  getSampleEvidenceArchive,
  SAMPLE_VIOLATION_RULES,
  SAMPLE_VIOLATIONS,
} from './sampleDataFallback';
import {
  buildReportOutputPreview,
  buildSampleEnforcementExcelBlob,
  buildSampleReportPdfBlob,
} from './reportOutputPreview';
import type {
  User, Vehicle, Fine, TrafficSign, TrafficViolation, ViolationRule, AIDetectionLog, AIDetectionPageStats, Notification,
  DashboardStats, AuthResponse, LoginOptions, Road, Camera,
} from '../types';
import {
  mockUsers, mockVehicles, mockFines, mockTrafficSigns,
  mockAILogs, mockNotifications, mockDashboardStats,
  MOCK_CREDENTIALS, AI_DETECTION_RESULTS, mockRoads, mockCameras,
} from './mockData';
import { LOGIN_ERRORS } from '@shared/utils/loginErrors';
import { loadAuthSession } from '@shared/utils/authStorage';
import type { ProfileOverview, UserPreferences } from '../types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withUserProfileImage(log: AIDetectionLog): AIDetectionLog {
  if (log.user_profile_image) return log;
  const user = users.find((u) => u.id === log.user_id) ?? mockUsers.find((u) => u.id === log.user_id);
  return {
    ...log,
    user_profile_image: user?.profile_image ?? '',
  };
}

let users = [...mockUsers];
let vehicles = [...mockVehicles];
let fines = [...mockFines];
const aiLogs = [...mockAILogs];
let notifications = [...mockNotifications];
const mockPreferences = new Map<number, UserPreferences>();

function defaultPreferences(): UserPreferences {
  return {
    notify_fines: true,
    notify_detections: true,
    notify_alerts: true,
    notify_system: false,
    two_factor_enabled: false,
    login_notifications: true,
    suspicious_alerts: true,
  };
}

function getMockUser(): User {
  const session = loadAuthSession();
  const user = session?.user ?? users.find((u) => u.is_active);
  if (!user) throw new Error('Not authenticated');
  return users.find((u) => u.id === user.id) ?? user;
}

function buildMockOverview(user: User): ProfileOverview {
  if (!mockPreferences.has(user.id)) mockPreferences.set(user.id, defaultPreferences());
  const userNotifications = notifications.filter((n) => n.user_id === user.id).slice(0, 6);
  const userLogs = aiLogs.filter((l) => l.user_id === user.id).slice(0, 4);
  return {
    user: { ...user, last_login: user.last_login ?? new Date().toISOString() },
    preferences: { ...mockPreferences.get(user.id)! },
    activity: [
      ...userNotifications.map((n) => ({
        action: n.title,
        time: n.created_at,
        time_label: 'Recently',
        type: n.type,
        color: '#2563EB',
      })),
      ...userLogs.map((l) => ({
        action: `AI detection: ${l.detected_sign}`,
        time: l.created_at,
        time_label: 'Recently',
        type: 'detection',
        color: '#7C3AED',
      })),
    ].slice(0, 8),
    sessions: [{
      device: 'Chrome · Windows',
      location: 'Current device',
      ip_masked: '203.144.x.x',
      time_label: 'Just now',
      current: true,
    }],
    login_history: [{
      status: 'success' as const,
      device: 'Chrome · Windows',
      ip_masked: '203.144.x.x',
      time: new Date().toISOString(),
      time_label: 'Just now',
    }],
  };
}

export const authAPI = {
  async login(email: string, password: string, options?: LoginOptions): Promise<AuthResponse> {
    await delay(800);
    const cred = MOCK_CREDENTIALS.find((c) => c.email === email && c.password === password);
    if (!cred) throw new Error(LOGIN_ERRORS.invalidCredentials);
    const user = users.find((u) => u.id === cred.userId);
    if (!user?.is_active) throw new Error(LOGIN_ERRORS.deactivated);
    if (options?.portal === 'admin' && user.role !== 'admin') {
      throw new Error(LOGIN_ERRORS.nonAdminOnAdminPortal);
    }
    if (options?.portal === 'user') {
      if (user.role === 'admin') {
        throw new Error(LOGIN_ERRORS.adminOnUserPortal);
      }
      if (options.role && user.role !== options.role) {
        throw new Error(
          user.role === 'police' ? LOGIN_ERRORS.wrongOfficerTab : LOGIN_ERRORS.wrongDriverTab,
        );
      }
    }
    return { access: `jwt_${user.id}`, refresh: `refresh_${user.id}`, user: { ...user } };
  },
  async register(data: Partial<User> & { password: string }): Promise<{ user: User }> {
    await delay(1000);
    if (users.find((u) => u.email === data.email)) throw new Error('Email already registered.');
    const newUser: User = {
      id: users.length + 1,
      full_name: data.full_name || '',
      email: data.email || '',
      role: 'driver',
      phone: data.phone || '',
      address: data.address || '',
      license_no: data.license_no,
      created_at: new Date().toISOString(),
      is_active: true,
    };
    users.push(newUser);
    MOCK_CREDENTIALS.push({ email: newUser.email, password: data.password, userId: newUser.id });
    return { user: newUser };
  },
  async logout() { await delay(200); },
  async changePassword(_old: string, _new: string) {
    await delay(500);
    return { message: 'Password changed' };
  },
  async getProfile() {
    await delay(300);
    return { ...getMockUser() };
  },
  async updateProfile(data: Partial<User>) {
    await delay(400);
    const user = getMockUser();
    return usersAPI.update(user.id, data);
  },
  async requestPasswordReset(email: string): Promise<{ message?: string }> {
    await delay(600);
    if (!users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('No account found with this email address.');
    }
    return { message: `Password reset link has been sent to ${email}.` };
  },
  async confirmPasswordReset(_uid: string, _token: string, new_password: string): Promise<{ message?: string }> {
    await delay(700);
    if (!new_password || new_password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    return { message: 'Password reset successful' };
  },
  async getOAuthAuthorizeUrl(_provider: 'google' | 'github', redirect_uri?: string): Promise<{ authorization_url: string }> {
    await delay(300);
    return { authorization_url: redirect_uri || `${window.location.origin}/auth/oauth/callback` };
  },
  async getOAuthStatus(): Promise<{ google: boolean; github: boolean }> {
    await delay(50);
    return { google: false, github: false };
  },
  async completeOAuth(
    provider: 'google' | 'github',
    _code: string,
    _state: string,
    portal: 'admin' | 'user',
  ): Promise<AuthResponse> {
    await delay(700);
    const preferredRole = provider === 'github' ? 'police' : 'driver';
    const roleFiltered = portal === 'admin'
      ? users.filter((u) => u.role === 'admin' && u.is_active)
      : users.filter((u) => u.role !== 'admin' && u.is_active);
    const user =
      roleFiltered.find((u) => u.role === preferredRole)
      || roleFiltered[0]
      || users[0];
    if (!user) throw new Error('No mock user available for OAuth login.');
    if (portal === 'admin' && user.role !== 'admin') {
      throw new Error('This email is not an Administrator account. Please sign in on the Driver or Officer page with this email.');
    }
    if (portal === 'user' && user.role === 'admin') {
      throw new Error('This email is for an Administrator account. Please use the Administrator sign-in page instead of Driver or Officer.');
    }
    return { access: `jwt_${user.id}`, refresh: `refresh_${user.id}`, user: { ...user } };
  },
  async sendEmailVerification() {
    await delay(400);
    return { message: 'Verification link sent.' };
  },
  async confirmEmailVerification(_uid: string, _token: string) {
    await delay(400);
    return { message: 'Email verified successfully' };
  },
};

export const usersAPI = {
  async getAll() { await delay(500); return users.map((u) => ({ ...u })); },
  async getById(id: string) {
    await delay(300);
    const u = users.find((x) => x.id === id);
    if (!u) throw new Error('User not found');
    return { ...u };
  },
  async update(id: string, data: Partial<User>) {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    users[idx] = { ...users[idx], ...data };
    return { ...users[idx] };
  },
  async uploadProfileImage(id: string, file: File) {
    await delay(400);
    const url = URL.createObjectURL(file);
    return usersAPI.update(id, { profile_image: url });
  },
  async create(data: Partial<User> & { password: string }) {
    const newUser: User = {
      id: String(users.length + 1),
      full_name: data.full_name || '',
      email: data.email || '',
      role: data.role || 'driver',
      phone: data.phone || '',
      address: data.address || '',
      license_no: data.license_no,
      created_at: new Date().toISOString(),
      is_active: true,
    };
    users.push(newUser);
    return newUser;
  },
  async delete(id: string) {
    users = users.filter((u) => u.id !== id);
    return { user: null as null, message: 'User deleted' };
  },
  async toggleActive(id: string) {
    const idx = users.findIndex((u) => u.id === id);
    users[idx].is_active = !users[idx].is_active;
    return { ...users[idx] };
  },
};

export const profileAPI = {
  async getOverview(): Promise<ProfileOverview> {
    await delay(500);
    return buildMockOverview(getMockUser());
  },
  async updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
    await delay(300);
    const user = getMockUser();
    const current = mockPreferences.get(user.id) ?? defaultPreferences();
    const next = { ...current, ...data };
    mockPreferences.set(user.id, next);
    return next;
  },
  async deactivate() {
    await delay(400);
    const user = getMockUser();
    if (user.role === 'admin') {
      throw new Error('Administrator accounts cannot be self-deactivated.');
    }
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) users[idx] = { ...users[idx], is_active: false };
    return { message: 'Account deactivated' };
  },
  async deleteAccount(password: string) {
    await delay(400);
    const user = getMockUser();
    if (user.role === 'admin') {
      throw new Error('Administrator accounts cannot be self-deleted.');
    }
    if (password !== 'password') {
      throw new Error('Invalid password.');
    }
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) users.splice(idx, 1);
    return { message: 'Account deleted' };
  },
  async logoutOtherSessions(_refresh: string) {
    await delay(400);
    return { revoked: 1, message: 'Other sessions revoked' };
  },
};

export const vehiclesAPI = {
  async getAll() { return vehicles.map((v) => ({ ...v })); },
  async getByOwner(ownerId: string | number) { return vehicles.filter((v) => String(v.owner_id) === String(ownerId)); },
  async create(data: Partial<Vehicle>) {
    const owner = users.find((u) => u.id === data.owner_id);
    const v: Vehicle = {
      id: String(vehicles.length + 1),
      owner_id: String(data.owner_id || '0'),
      owner_name: owner?.full_name || 'Unknown',
      plate_number: data.plate_number || '',
      vehicle_type: data.vehicle_type || 'car',
      model: data.model || '',
      color: data.color || '',
      year: data.year || 2024,
      created_at: new Date().toISOString(),
    };
    vehicles.push(v);
    return v;
  },
  async update(id: string | number, data: Partial<Vehicle>) {
    const idx = vehicles.findIndex((v) => String(v.id) === String(id));
    if (idx < 0) throw new Error('Vehicle not found');
    vehicles[idx] = { ...vehicles[idx], ...data };
    return vehicles[idx];
  },
  async delete(id: string | number) { vehicles = vehicles.filter((v) => String(v.id) !== String(id)); },
  async searchByPlate(plate: string) {
    return vehicles.find((v) => v.plate_number.toLowerCase().includes(plate.toLowerCase())) || null;
  },
};

export const finesAPI = {
  async getAll() { return fines.map((f) => ({ ...f })); },
  async getByDriver(driverId: number) { return fines.filter((f) => f.driver_id === driverId); },
  async getByPolice(policeId: number) { return fines.filter((f) => f.police_id === policeId); },
  async create(data: Partial<Fine>) {
    const driver = users.find((u) => u.id === data.driver_id);
    const police = users.find((u) => u.id === data.police_id);
    const f: Fine = {
      id: fines.length + 1,
      driver_id: data.driver_id || 0,
      driver_name: driver?.full_name || 'Unknown',
      driver_license: driver?.license_no || 'N/A',
      police_id: data.police_id || 0,
      police_name: police?.full_name || 'Unknown',
      amount: data.amount || 0,
      reason: data.reason || '',
      status: 'pending',
      location: data.location || '',
      vehicle_plate: data.vehicle_plate || '',
      created_at: new Date().toISOString(),
    };
    fines.push(f);
    return f;
  },
  async updateStatus(id: number, status: Fine['status']) {
    const idx = fines.findIndex((f) => f.id === id);
    fines[idx] = { ...fines[idx], status };
    return { ...fines[idx] };
  },
  async update(id: number, data: Partial<Pick<Fine, 'amount' | 'reason' | 'location' | 'vehicle_plate' | 'status'>>) {
    const idx = fines.findIndex((f) => f.id === id);
    if (idx < 0) throw new Error('Fine not found');
    fines[idx] = { ...fines[idx], ...data };
    return { ...fines[idx] };
  },
  async delete(id: number) {
    const idx = fines.findIndex((f) => f.id === id);
    if (idx >= 0) fines.splice(idx, 1);
  },
  async searchByLicense(license: string) {
    const driver = users.find((u) => u.license_no?.toLowerCase().includes(license.toLowerCase()));
    if (!driver) return { driver: null, fines: [], vehicles: [] };
    return {
      driver: { ...driver },
      fines: fines.filter((f) => f.driver_id === driver.id),
      vehicles: vehicles.filter((v) => v.owner_id === driver.id),
    };
  },
  getPdfUrl: (id: number) => `#mock-pdf-${id}`,
  async submitPayment(id: number, _formData: FormData) {
    const idx = fines.findIndex((f) => f.id === id);
    if (idx < 0) throw new Error('Fine not found');
    fines[idx] = { ...fines[idx], status: 'paid', paid_at: new Date().toISOString(), payment_method: 'aba' };
    return { ...fines[idx] };
  },
};

const appeals: import('../types').ViolationAppeal[] = [];

export const appealsAPI = {
  async getAll() { return appeals.map((a) => ({ ...a })); },
  async create(_formData: FormData) {
    const a: import('../types').ViolationAppeal = {
      id: `appeal-${appeals.length + 1}`,
      violation_id: 'v-1',
      driver_id: '1',
      driver_name: 'Demo Driver',
      driver_license: 'DL-001',
      reason: 'Mock appeal',
      status: 'pending',
      submitted_at: new Date().toISOString(),
    };
    appeals.push(a);
    return a;
  },
  async review(id: string, data: { status: 'upheld' | 'dismissed'; officer_comments?: string }) {
    const idx = appeals.findIndex((a) => a.id === id);
    appeals[idx] = { ...appeals[idx], status: data.status, officer_comments: data.officer_comments, review_date: new Date().toISOString() };
    return { ...appeals[idx] };
  },
};

export const auditAPI = {
  async getAll(): Promise<import('../types').AuditLogEntry[]> {
    const now = Date.now();
    return [
      {
        id: 'audit-rbac-1',
        user_name: 'System Admin',
        user_role: 'admin',
        action: 'update',
        resource: 'role',
        resource_id: 'admin',
        timestamp: new Date(now - 5 * 60_000).toISOString(),
        new_value: { event: 'permission_updated' },
      },
      {
        id: 'audit-rbac-2',
        user_name: 'System Admin',
        user_role: 'admin',
        action: 'create',
        resource: 'role',
        resource_id: 'supervisor',
        timestamp: new Date(now - 35 * 60_000).toISOString(),
        new_value: { event: 'role_created' },
      },
      {
        id: 'audit-rbac-3',
        user_name: 'System Admin',
        user_role: 'admin',
        action: 'update',
        resource: 'permission',
        resource_id: 'officer',
        timestamp: new Date(now - 2 * 3600_000).toISOString(),
        new_value: { event: 'user_assigned' },
      },
      {
        id: 'audit-rbac-4',
        user_name: 'Officer Sok',
        user_role: 'police',
        action: 'view',
        resource: 'rbac',
        resource_id: 'roles',
        timestamp: new Date(now - 5 * 3600_000).toISOString(),
      },
      {
        id: 'audit-1',
        user_name: 'System Admin',
        user_role: 'admin',
        action: 'login',
        resource: 'auth',
        resource_id: '',
        timestamp: new Date(now - 8 * 3600_000).toISOString(),
      },
    ];
  },
};

export const unknownVehiclesAPI = {
  async getAll(): Promise<import('../types').UnknownVehicleRecord[]> {
    return [{
      id: 'uv-1',
      plate_detected: '2BB-9999',
      camera_name: 'Demo Camera',
      is_resolved: false,
      detected_at: new Date().toISOString(),
    }];
  },
  async resolve(id: string, data: { officer_note?: string }) {
    return {
      id,
      plate_detected: '2BB-9999',
      is_resolved: true,
      officer_note: data.officer_note || '',
      detected_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    };
  },
};

export const aiModelsAPI = {
  async getAll(): Promise<import('../types').AIModelVersion[]> {
    return [
      {
        id: 'model-1',
        version: 'v1.0',
        model_file: 'runs/camtraffic-v1/weights/best.pt',
        description: 'YOLOv11 Cambodian Traffic',
        accuracy: 98.7,
        is_active: true,
        uploaded_at: new Date().toISOString(),
      },
      {
        id: 'model-2',
        version: 'v0.9',
        model_file: 'runs/camtraffic-v09/weights/best.pt',
        description: 'YOLOv11 Cambodian Traffic',
        accuracy: 97.5,
        is_active: false,
        uploaded_at: new Date(Date.now() - 86400000 * 12).toISOString(),
      },
      {
        id: 'model-3',
        version: 'v0.8',
        model_file: 'runs/combined/weights/best.pt',
        description: 'YOLOv11 Combined Detection',
        accuracy: 96.2,
        is_active: false,
        uploaded_at: new Date(Date.now() - 86400000 * 28).toISOString(),
      },
      {
        id: 'model-4',
        version: 'dataset10-n',
        model_file: 'best.pt',
        description: 'YOLOv11 Dataset-10 Nano',
        accuracy: 99.1,
        is_active: false,
        uploaded_at: new Date(Date.now() - 86400000 * 45).toISOString(),
      },
    ];
  },
  async create(data: Partial<import('../types').AIModelVersion>) {
    return {
      id: `model-${Date.now()}`,
      version: data.version || 'v1',
      model_file: data.model_file || 'best.pt',
      description: data.description,
      accuracy: data.accuracy ?? null,
      is_active: false,
      uploaded_at: new Date().toISOString(),
    };
  },
  async activate(id: string) {
    return {
      id,
      version: 'active',
      model_file: 'best.pt',
      is_active: true,
      uploaded_at: new Date().toISOString(),
    };
  },
};

let mockSignIdSeq = 10000;

export const signsAPI = {
  async getAll() { return mockTrafficSigns.map((s) => ({ ...s })); },
  async getById(id: number) {
    const sign = mockTrafficSigns.find((s) => s.id === id);
    if (!sign) throw new Error('Sign not found');
    return { ...sign };
  },
  async create(data: FormData) {
    await delay(400);
    const sign: TrafficSign = {
      id: ++mockSignIdSeq,
      sign_name: String(data.get('sign_name') ?? ''),
      sign_code: String(data.get('sign_code') ?? ''),
      description: String(data.get('description') ?? ''),
      guidance: String(data.get('guidance') ?? ''),
      category: (String(data.get('category') ?? 'warning') as TrafficSign['category']),
      penalty: String(data.get('penalty') ?? '') || undefined,
      rules: JSON.parse(String(data.get('rules') ?? '[]')) as string[],
      image: '/media/signs/mock-new.png',
    };
    mockTrafficSigns.push(sign);
    return { ...sign };
  },
  async update(id: number, data: FormData | Record<string, unknown>) {
    await delay(400);
    const idx = mockTrafficSigns.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error('Sign not found');
    const cur = mockTrafficSigns[idx];
    const patch = data instanceof FormData
      ? {
          sign_name: String(data.get('sign_name') ?? cur.sign_name),
          sign_code: String(data.get('sign_code') ?? cur.sign_code),
          description: String(data.get('description') ?? cur.description),
          guidance: String(data.get('guidance') ?? cur.guidance ?? ''),
          category: String(data.get('category') ?? cur.category) as TrafficSign['category'],
          penalty: String(data.get('penalty') ?? cur.penalty ?? ''),
          rules: JSON.parse(String(data.get('rules') ?? JSON.stringify(cur.rules ?? []))) as string[],
        }
      : data;
    mockTrafficSigns[idx] = { ...cur, ...patch, id };
    return { ...mockTrafficSigns[idx] };
  },
  async delete(id: number) {
    await delay(300);
    const idx = mockTrafficSigns.findIndex((s) => s.id === id);
    if (idx >= 0) mockTrafficSigns.splice(idx, 1);
  },
  async chatbot(question: string) {
    const sign = mockTrafficSigns.find((s) => question.toLowerCase().includes(s.sign_name.toLowerCase().split(' ')[0]));
    return { answer: sign ? `${sign.sign_name}: ${sign.description}` : 'Browse the learning page.', sign: sign ?? null };
  },
};

export const aiAPI = {
  async detect(file: File) {
    await delay(2500);
    const name = file.name.toLowerCase();
    const r1 = AI_DETECTION_RESULTS.find((x) => x.detected_sign.includes('Left Turn'))
      ?? {
        detected_sign: 'No Left Turn (R1-01)',
        confidence: 94.5,
        description:
          'R1-01 — ហាមបត់ឆ្វេង (No Left Turn). Left-turn arrow crossed by red slash. No left turn allowed.',
        guidance: 'Do not turn left. Go straight or turn right where permitted.',
      };
    const r = (name.includes('r1-01') || name.includes('no-left') || name.includes('no_left'))
      ? r1
      : AI_DETECTION_RESULTS[Math.floor(Math.random() * AI_DETECTION_RESULTS.length)];
    const confidence = parseFloat((r.confidence + Math.random() * 2 - 1).toFixed(1));
    const processing_time = parseFloat((0.7 + Math.random() * 0.8).toFixed(2));
    const entry: AIDetectionLog = withUserProfileImage({
      id: aiLogs.length ? Math.max(...aiLogs.map((l) => l.id)) + 1 : 1,
      user_id: 4,
      user_name: 'Kosal Pich',
      uploaded_image: '',
      detected_sign: r.detected_sign,
      confidence,
      description: r.description,
      guidance: r.guidance,
      created_at: new Date().toISOString(),
    });
    aiLogs.unshift(entry);
    return {
      sign_name: r.detected_sign,
      confidence,
      description: r.description,
      guidance: r.guidance,
      processing_time,
      log_id: entry.id,
      uploaded_image: entry.uploaded_image || '',
    };
  },
  async getLogs(userId?: number) {
    const rows = userId ? aiLogs.filter((l) => l.user_id === userId) : [...aiLogs];
    return rows.map(withUserProfileImage);
  },
  async getPageStats(): Promise<AIDetectionPageStats> {
    await delay(200);
    const cats = ['prohibitory', 'warning', 'mandatory', 'informative'] as const;
    const catColors: Record<string, string> = {
      prohibitory: '#EF4444', warning: '#F59E0B', mandatory: '#3B82F6', informative: '#10B981',
    };
    const catNames: Record<string, string> = {
      prohibitory: 'Prohibitory', warning: 'Warning', mandatory: 'Mandatory', informative: 'Informative',
    };
    const categories = cats.map((key) => {
      const items = mockTrafficSigns.filter((s) => s.category === key);
      return {
        key,
        name: catNames[key],
        count: items.length,
        color: catColors[key],
        desc: items.slice(0, 3).map((s) => s.sign_name).join(', ') || key,
      };
    }).filter((c) => c.count > 0);
    const avgConf = aiLogs.length
      ? aiLogs.reduce((s, l) => s + l.confidence, 0) / aiLogs.length
      : 0;
    return {
      model: {
        name: 'YOLOv8-Cambodia',
        version: 'v2.1',
        mode: 'mock',
        weights_loaded: false,
        sign_classes: mockTrafficSigns.length,
        training_images: 0,
      },
      stats: {
        total_scans: aiLogs.length,
        accuracy_avg: Math.round(avgConf * 10) / 10,
        avg_speed_sec: 1.2,
        sign_count: mockTrafficSigns.length,
      },
      categories,
      sample_signs: mockTrafficSigns.slice(0, 8).map((s, i) => ({
        id: s.id,
        sign_name: s.sign_name,
        sign_code: s.sign_code,
        category: s.category,
        image: s.image || '',
        label: s.sign_name.includes('Stop') ? 'STOP' : s.sign_name.includes('40') ? '40' : String(i + 1),
        color: catColors[s.category] || '#8B5CF6',
      })),
    };
  },
  async exportLogsCsv(): Promise<Blob> {
    await delay(200);
    const header = 'id,user,detected_sign,confidence,review_status,created_at\n';
    const rows = aiLogs.map((l) =>
      `${l.id},${l.user_name},${l.detected_sign},${l.confidence},${l.review_status || 'pending'},${l.created_at}`,
    ).join('\n');
    return new Blob([header + rows], { type: 'text/csv' });
  },
  async reviewLog(logId: string, review_status: 'approved' | 'rejected' | 'pending'): Promise<AIDetectionLog> {
    await delay(300);
    const log = aiLogs.find((l) => String(l.id) === logId);
    if (!log) throw new Error('Log not found');
    log.review_status = review_status;
    return withUserProfileImage(log);
  },
  async detectVideo(file: File) {
    return aiAPI.detect(file);
  },
};

export const catalogAPI = {
  async getCatalog() {
    await delay(150);
    return {
      service: 'camtraffic-api-mock',
      version: 'v1',
      modules: { detection_aliases: ['GET /api/detection/'] },
      detection: { hub: '/api/detection/' },
    };
  },
};

export const notificationsAPI = {
  async getByUser(userId: string | number) {
    return notifications.filter((n) => n.user_id === userId).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  },
  async markRead(id: number) {
    const n = notifications.find((x) => x.id === id);
    if (n) n.is_read = true;
  },
  async markAllRead(userId: number) {
    notifications.filter((n) => n.user_id === userId).forEach((n) => { n.is_read = true; });
  },
  async clearRead() {
    await delay(200);
    notifications = notifications.filter((n) => !n.is_read);
    return { deleted: 0 };
  },
};

export const roadsAPI = {
  async getAll(): Promise<Road[]> {
    await delay(300);
    return [...mockRoads];
  },
  async getById(id: string | number): Promise<Road> {
    await delay(200);
    const road = mockRoads.find((r) => String(r.id) === String(id));
    if (!road) throw new Error('Road not found');
    return { ...road };
  },
  async create(data: Partial<Road>): Promise<Road> {
    await delay(400);
    const road: Road = {
      id: String(mockRoads.length + 1),
      name: data.name || 'New Road',
      road_type: data.road_type || 'urban',
      length_km: data.length_km ?? null,
      speed_limit: data.speed_limit ?? 60,
      region: data.region || '',
      city: data.city || '',
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      status: data.status || 'active',
      camera_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockRoads.push(road);
    return road;
  },
  async update(id: string | number, data: Partial<Road>): Promise<Road> {
    await delay(300);
    const idx = mockRoads.findIndex((r) => String(r.id) === String(id));
    if (idx < 0) throw new Error('Road not found');
    mockRoads[idx] = { ...mockRoads[idx], ...data, updated_at: new Date().toISOString() };
    return mockRoads[idx];
  },
  async delete(id: string | number): Promise<void> {
    await delay(300);
    const idx = mockRoads.findIndex((r) => String(r.id) === String(id));
    if (idx >= 0) mockRoads.splice(idx, 1);
  },
};

export const camerasAPI = {
  async getAll(): Promise<Camera[]> {
    await delay(350);
    return [...mockCameras];
  },
  async getById(id: string | number): Promise<Camera> {
    await delay(200);
    const cam = mockCameras.find((c) => String(c.id) === String(id));
    if (!cam) throw new Error('Camera not found');
    return { ...cam };
  },
  async create(data: Partial<Camera> & { road: string | number }): Promise<Camera> {
    await delay(400);
    const road = mockRoads.find((r) => String(r.id) === String(data.road));
    const cam: Camera = {
      id: String(mockCameras.length + 1),
      road_id: String(data.road),
      road_name: road?.name || 'Unknown road',
      name: data.name || 'New Camera',
      code: data.code || `CAM-MOCK-${mockCameras.length + 1}`,
      model: data.model || '',
      camera_type: data.camera_type || 'fixed',
      installed_date: data.installed_date ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      status: data.status || 'active',
      frame_source_url: data.frame_source_url || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockCameras.push(cam);
    return cam;
  },
  async update(id: string | number, data: Partial<Camera>): Promise<Camera> {
    await delay(300);
    const idx = mockCameras.findIndex((c) => String(c.id) === String(id));
    if (idx < 0) throw new Error('Camera not found');
    mockCameras[idx] = { ...mockCameras[idx], ...data, updated_at: new Date().toISOString() };
    return mockCameras[idx];
  },
  async delete(id: string | number): Promise<void> {
    await delay(300);
    const idx = mockCameras.findIndex((c) => String(c.id) === String(id));
    if (idx >= 0) mockCameras.splice(idx, 1);
  },
  async liveStatus(): Promise<{ cameras: Camera[]; summary: { total: number; active: number; offline: number }; polled_at: string }> {
    await delay(200);
    const cameras = [...mockCameras];
    const active = cameras.filter((c) => c.status === 'active').length;
    return {
      cameras,
      summary: { total: cameras.length, active, offline: cameras.length - active },
      polled_at: new Date().toISOString(),
    };
  },
  async processFrame(_cameraId: string) {
    await delay(1200);
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' });
    const file = new File([blob], 'mock-camera-frame.jpg', { type: 'image/jpeg' });
    return aiAPI.detect(file);
  },
};

const mockViolations: TrafficViolation[] = SAMPLE_VIOLATIONS.map((v) => ({ ...v }));

export const violationsAPI = {
  async getAll(): Promise<TrafficViolation[]> { return [...mockViolations]; },
  async getById(id: string): Promise<TrafficViolation> {
    const row = mockViolations.find((v) => v.id === id);
    if (!row) throw new Error('Not found');
    return { ...row };
  },
  async evaluate(_data: { class_key: string; observed_action: string; sign_code?: string }) {
    const matched = SAMPLE_VIOLATION_RULES.some(
      (r) => r.sign_class_key === _data.class_key && r.prohibited_action === _data.observed_action,
    );
    return { is_violation: matched };
  },
  async create(data: {
    driver_id: string;
    class_key: string;
    observed_action: string;
    sign_code?: string;
    location?: string;
    ai_detection_log_id?: string;
  }): Promise<TrafficViolation> {
    await delay(300);
    const driver = users.find((u) => u.id === data.driver_id) ?? mockUsers.find((u) => u.id === data.driver_id);
    const nextId = String(
      mockViolations.reduce((max, v) => Math.max(max, parseInt(String(v.id), 10) || 0), 0) + 1,
    );
    const rule = SAMPLE_VIOLATION_RULES.find((r) => r.sign_class_key === data.class_key);
    const violation: TrafficViolation = {
      id: nextId,
      driver_id: data.driver_id,
      driver_name: driver?.full_name ?? 'Unknown driver',
      driver_license: driver?.license_no ?? '',
      officer_name: users.find((u) => u.role === 'police')?.full_name ?? 'Officer',
      vehicle_plate: mockVehicles.find((v) => v.owner_id === data.driver_id)?.plate_number ?? null,
      violation_type: rule?.violation_type ?? data.class_key,
      observed_action: data.observed_action,
      detected_sign_code: data.sign_code ?? data.class_key,
      detected_class_key: data.class_key,
      violation_date: new Date().toISOString(),
      location: data.location ?? 'Phnom Penh',
      description: rule?.description ?? `Mock violation for ${data.class_key}`,
      status: 'pending_review',
      ai_detection_log: data.ai_detection_log_id ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockViolations.push(violation);
    return violation;
  },
  async update(id: string, data: Partial<TrafficViolation>): Promise<TrafficViolation> {
    await delay(300);
    const idx = mockViolations.findIndex((v) => v.id === id);
    if (idx < 0) throw new Error('Violation not found');
    mockViolations[idx] = {
      ...mockViolations[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return mockViolations[idx];
  },
  async delete(_id: string): Promise<void> {
    await delay(200);
    const idx = mockViolations.findIndex((v) => v.id === _id);
    if (idx >= 0) mockViolations.splice(idx, 1);
  },
  async getRules(): Promise<ViolationRule[]> {
    return [...SAMPLE_VIOLATION_RULES];
  },
  async getStats() {
    return {
      total_violations: mockViolations.length,
      pending_review: mockViolations.filter((v) => v.status === 'pending_review').length,
      confirmed: mockViolations.filter((v) => v.status === 'confirmed').length,
      rejected: mockViolations.filter((v) => v.status === 'rejected').length,
      by_type: [],
    };
  },
};

export const dashboardAPI = {
  async getAdminStats(): Promise<DashboardStats> { return { ...mockDashboardStats }; },
  async getPoliceReportStats(): Promise<DashboardStats> { return { ...mockDashboardStats }; },
  async getPoliceStats(policeId: number) {
    const pf = fines.filter((f) => f.police_id === policeId);
    return {
      total_issued: pf.length,
      today_issued: 0,
      pending: pf.filter((f) => f.status === 'pending').length,
      revenue: pf.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount, 0),
      recent: pf.slice(-5).reverse(),
    };
  },
  async getDriverStats(driverId: number) {
    const df = fines.filter((f) => f.driver_id === driverId);
    return {
      vehicles: vehicles.filter((v) => v.owner_id === driverId).length,
      total_fines: df.length,
      pending: df.filter((f) => f.status === 'pending').length,
      paid: df.filter((f) => f.status === 'paid').length,
      owed: df.filter((f) => f.status !== 'paid').reduce((s, f) => s + f.amount, 0),
      recent_detections: aiLogs.filter((l) => l.user_id === driverId).slice(-3),
      recent_fines: df.slice(-3).reverse(),
    };
  },
  async searchEvidence() {
    const results = getSampleEvidenceArchive();
    return { count: results.length, results };
  },
  async downloadReportPdf(scope: 'admin' | 'police' = 'police') {
    await delay(500);
    const now = new Date();
    const preview = buildReportOutputPreview(mockDashboardStats, now.getFullYear(), now.getMonth() + 1);
    const label = scope === 'admin' ? 'System-wide analytics' : 'Officer enforcement district';
    return buildSampleReportPdfBlob(preview, label);
  },
  async downloadEnforcementExcel(year: number, month: number) {
    await delay(500);
    const preview = buildReportOutputPreview(mockDashboardStats, year, month);
    return buildSampleEnforcementExcelBlob(preview.excelRows, year, month);
  },
  async listSystemBackups() {
    await delay(200);
    return {
      backups: [
        {
          filename: 'camtraffic-backup-mock.zip',
          size_bytes: 1024,
          created_at: new Date().toISOString(),
        },
      ],
    };
  },
  async downloadSystemBackup(includeWeights = false) {
    await delay(800);
    const note = includeWeights ? 'mock-backup-with-weights' : 'mock-backup';
    return new Blob([note], { type: 'application/zip' });
  },
  async restoreSystemBackup(filename: string) {
    await delay(500);
    return { restored: ['database_sqlite', 'media'], manifest: { filename } };
  },
  async getAIDashboardStats() {
    await delay(200);
    return {
      models: { total: 3, active: 1, latest: 'v1.2.0' },
      datasets: { registered: 2 },
      detection: { total: 1284, today: 42, avg_confidence: 87.5 },
      model_runtime: { device: 'cpu', model_file: 'best.pt', classes: 43 },
      enforcement: { total_detections: 1284, detection_accuracy: 87, total_violations: 156 },
      training: { last_trained_at: new Date().toISOString(), training_images: 4200 },
      generated_at: new Date().toISOString(),
    };
  },
  async getDetectionAnalytics() {
    await delay(200);
    return {
      accuracy: mockDashboardStats.detection_accuracy,
      precision: 97.4,
      recall: 96.1,
      map50: 94.8,
      f1: 96.7,
      total_detections: mockDashboardStats.total_detections,
    };
  },
  async getHeatmap() {
    await delay(200);
    const points = (mockDashboardStats.top_locations ?? []).map((loc, i) => ({
      id: `heat-${i}`,
      name: loc.name,
      road: loc.name,
      lat: 11.55 + (i % 5) * 0.02,
      lng: 104.88 + (i % 4) * 0.015,
      detections: loc.detections,
      violations: loc.fines,
      intensity: loc.detections,
      status: 'active',
    }));
    return { points };
  },
  async getOfficerPerformance() {
    await delay(200);
    return {
      officers: [
        {
          id: '1', full_name: 'Officer Chan', email: 'chan@camtraffic.gov.kh', badge_no: 'PP-001',
          fines_issued: 42, violations_reviewed: 58, revenue_collected: 4200, pending_fines: 6,
        },
        {
          id: '2', full_name: 'Officer Sok', email: 'sok@camtraffic.gov.kh', badge_no: 'PP-014',
          fines_issued: 36, violations_reviewed: 41, revenue_collected: 3100, pending_fines: 4,
        },
      ],
    };
  },
  async getDriverAnalytics() {
    await delay(200);
    return {
      drivers: [
        {
          id: '1', full_name: 'Driver Demo', email: 'driver@example.com', vehicles: 2,
          total_fines: 5, pending_fines: 1, amount_owed: 250, paid_fines: 4,
        },
      ],
    };
  },
};

export const rbacAPI = {
  async getRoles() {
    await delay(200);
    const allPerms = await this.getPermissions();
    const byName = Object.fromEntries(allPerms.map((p) => [p.perm_name, p]));
    const pick = (...names: string[]) => names.map((n) => byName[n]).filter(Boolean);
    return [
      {
        id: '1',
        role_name: 'admin',
        description: 'Full system administrator',
        status: 'active' as const,
        permissions: allPerms,
      },
      {
        id: '2',
        role_name: 'officer',
        description: 'Traffic enforcement officer',
        status: 'active' as const,
        permissions: pick(
          'users.view', 'signs.view', 'fines.view', 'fines.create', 'fines.edit', 'fines.approve',
          'vehicles.view', 'violations.view', 'violations.create', 'violations.edit', 'violations.approve',
          'reports.view', 'ai.view',
        ),
      },
      {
        id: '3',
        role_name: 'driver',
        description: 'Registered driver portal',
        status: 'active' as const,
        permissions: pick('signs.view', 'fines.view', 'vehicles.view', 'vehicles.edit', 'reports.view'),
      },
    ];
  },
  async createRole(data: { role_name: string; description?: string }) {
    await delay(200);
    return { id: String(Date.now()), status: 'active' as const, permissions: [], ...data };
  },
  async updateRole(id: string, data: Record<string, unknown>) {
    await delay(200);
    return { id, role_name: 'role', status: 'active' as const, permissions: [], ...data };
  },
  async deleteRole() { await delay(200); },
  async getPermissions() {
    await delay(200);
    const rows: Array<{ id: string; perm_name: string; action_type: string; resource: string; description?: string }> = [
      { id: 'p1', perm_name: 'users.view', action_type: 'view', resource: 'users', description: 'View user accounts' },
      { id: 'p2', perm_name: 'users.create', action_type: 'create', resource: 'users', description: 'Create user accounts' },
      { id: 'p3', perm_name: 'users.edit', action_type: 'edit', resource: 'users', description: 'Edit user accounts' },
      { id: 'p4', perm_name: 'users.delete', action_type: 'delete', resource: 'users', description: 'Delete user accounts' },
      { id: 'p5', perm_name: 'users.manage', action_type: 'manage', resource: 'users', description: 'Full user management' },
      { id: 'p6', perm_name: 'signs.view', action_type: 'view', resource: 'signs', description: 'Browse traffic sign catalog' },
      { id: 'p7', perm_name: 'signs.create', action_type: 'create', resource: 'signs', description: 'Add traffic signs' },
      { id: 'p8', perm_name: 'signs.edit', action_type: 'edit', resource: 'signs', description: 'Edit traffic signs' },
      { id: 'p9', perm_name: 'signs.delete', action_type: 'delete', resource: 'signs', description: 'Delete traffic signs' },
      { id: 'p10', perm_name: 'signs.export', action_type: 'export', resource: 'signs', description: 'Export sign catalog' },
      { id: 'p11', perm_name: 'signs.import', action_type: 'import', resource: 'signs', description: 'Import sign catalog' },
      { id: 'p12', perm_name: 'fines.view', action_type: 'view', resource: 'fines', description: 'View fines and payments' },
      { id: 'p13', perm_name: 'fines.create', action_type: 'create', resource: 'fines', description: 'Issue fines' },
      { id: 'p14', perm_name: 'fines.edit', action_type: 'edit', resource: 'fines', description: 'Update fines' },
      { id: 'p15', perm_name: 'fines.export', action_type: 'export', resource: 'fines', description: 'Export fine records' },
      { id: 'p16', perm_name: 'fines.approve', action_type: 'approve', resource: 'fines', description: 'Approve fine actions' },
      { id: 'p17', perm_name: 'vehicles.view', action_type: 'view', resource: 'vehicles', description: 'View registered vehicles' },
      { id: 'p18', perm_name: 'vehicles.create', action_type: 'create', resource: 'vehicles', description: 'Register vehicles' },
      { id: 'p19', perm_name: 'vehicles.edit', action_type: 'edit', resource: 'vehicles', description: 'Edit vehicle records' },
      { id: 'p20', perm_name: 'vehicles.delete', action_type: 'delete', resource: 'vehicles', description: 'Delete vehicle records' },
      { id: 'p21', perm_name: 'vehicles.export', action_type: 'export', resource: 'vehicles', description: 'Export vehicles' },
      { id: 'p22', perm_name: 'vehicles.import', action_type: 'import', resource: 'vehicles', description: 'Import vehicles' },
      { id: 'p23', perm_name: 'violations.view', action_type: 'view', resource: 'violations', description: 'View violation records' },
      { id: 'p24', perm_name: 'violations.create', action_type: 'create', resource: 'violations', description: 'Create violations' },
      { id: 'p25', perm_name: 'violations.edit', action_type: 'edit', resource: 'violations', description: 'Edit violations' },
      { id: 'p26', perm_name: 'violations.export', action_type: 'export', resource: 'violations', description: 'Export violations' },
      { id: 'p27', perm_name: 'violations.approve', action_type: 'approve', resource: 'violations', description: 'Approve / confirm violations' },
      { id: 'p28', perm_name: 'infrastructure.view', action_type: 'view', resource: 'infrastructure', description: 'View cameras and roads' },
      { id: 'p29', perm_name: 'infrastructure.create', action_type: 'create', resource: 'infrastructure', description: 'Add cameras and roads' },
      { id: 'p30', perm_name: 'infrastructure.edit', action_type: 'edit', resource: 'infrastructure', description: 'Edit infrastructure' },
      { id: 'p31', perm_name: 'infrastructure.delete', action_type: 'delete', resource: 'infrastructure', description: 'Delete infrastructure' },
      { id: 'p32', perm_name: 'reports.view', action_type: 'view', resource: 'reports', description: 'Access analytics and exports' },
      { id: 'p33', perm_name: 'reports.export', action_type: 'export', resource: 'reports', description: 'Export reports' },
      { id: 'p34', perm_name: 'ai.view', action_type: 'view', resource: 'ai', description: 'View AI detection center' },
      { id: 'p35', perm_name: 'ai.create', action_type: 'create', resource: 'ai', description: 'Run detections' },
      { id: 'p36', perm_name: 'ai.manage', action_type: 'manage', resource: 'ai', description: 'Manage AI models' },
      { id: 'p37', perm_name: 'ai.export', action_type: 'export', resource: 'ai', description: 'Export detection results' },
      { id: 'p38', perm_name: 'roles.view', action_type: 'view', resource: 'roles', description: 'View roles' },
      { id: 'p39', perm_name: 'roles.create', action_type: 'create', resource: 'roles', description: 'Create roles' },
      { id: 'p40', perm_name: 'roles.edit', action_type: 'edit', resource: 'roles', description: 'Edit roles' },
      { id: 'p41', perm_name: 'roles.delete', action_type: 'delete', resource: 'roles', description: 'Delete roles' },
      { id: 'p42', perm_name: 'roles.manage', action_type: 'manage', resource: 'roles', description: 'Full RBAC management' },
      { id: 'p43', perm_name: 'settings.view', action_type: 'view', resource: 'settings', description: 'View system settings' },
      { id: 'p44', perm_name: 'settings.edit', action_type: 'edit', resource: 'settings', description: 'Edit system settings' },
      { id: 'p45', perm_name: 'settings.manage', action_type: 'manage', resource: 'settings', description: 'Manage system settings' },
    ];
    return rows;
  },
  async assignPermissions(roleId: string, permissionIds: string[]) {
    await delay(200);
    const all = await this.getPermissions();
    const permissions = all.filter((p) => permissionIds.includes(p.id));
    const roleName = roleId === '1' ? 'admin' : roleId === '2' ? 'officer' : roleId === '3' ? 'driver' : 'role';
    return { id: roleId, role_name: roleName, status: 'active' as const, permissions };
  },
};

export const officersAPI = {
  async getAll() {
    await delay(200);
    return users.filter((u) => u.role === 'police').map((u, i) => ({
      id: String(i + 1),
      user_id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      badge_no: `BADGE-${i + 1}`,
      rank: 'Officer',
      department: 'Traffic Police',
      status: 'active' as const,
    }));
  },
  async create(data: Record<string, unknown>) {
    await delay(300);
    return { id: '1', status: 'active' as const, rank: 'Officer', department: 'Traffic Police', ...data } as import('../types').OfficerProfile;
  },
  async update(id: string, data: Record<string, unknown>) {
    await delay(200);
    return { id, badge_no: 'BADGE-1', full_name: 'Officer', email: 'o@x.kh', user_id: '1', status: 'active' as const, ...data } as import('../types').OfficerProfile;
  },
  async delete() { await delay(200); },
  async getStations() {
    await delay(200);
    return [{ id: '1', name: 'Central HQ', code: 'HQ-01', city: 'Phnom Penh', status: 'active' as const }];
  },
  async createStation(data: Record<string, unknown>) {
    await delay(200);
    return { id: '2', status: 'active' as const, ...data } as import('../types').PoliceStation;
  },
  async updateStation(id: string, data: Record<string, unknown>) {
    await delay(200);
    return { id, name: 'Station', code: 'ST-1', status: 'active' as const, ...data } as import('../types').PoliceStation;
  },
  async deleteStation() { await delay(200); return { message: 'Police station deleted' }; },
};

export const driversAPI = {
  async getAll() {
    await delay(200);
    return users.filter((u) => u.role === 'driver').map((u, i) => ({
      id: String(i + 1),
      user_id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      license_no: u.license_no || `LIC-${i + 1}`,
      kyc_status: 'approved' as const,
      status: 'active' as const,
    }));
  },
  async create(data: Record<string, unknown>) {
    await delay(300);
    return { id: '1', kyc_status: 'unverified' as const, status: 'active' as const, license_no: 'LIC-NEW', ...data } as import('../types').DriverProfile;
  },
  async update(id: string, data: Record<string, unknown>) {
    await delay(200);
    return { id, license_no: 'LIC-1', full_name: 'Driver', email: 'd@x.kh', user_id: '1', kyc_status: 'approved' as const, status: 'active' as const, ...data } as import('../types').DriverProfile;
  },
  async delete() {
    await delay(200);
    return { driver: null, message: 'Driver deleted' };
  },
};
