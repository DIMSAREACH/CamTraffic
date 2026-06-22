import {
  getSampleEvidenceArchive,
  SAMPLE_VIOLATION_RULES,
  SAMPLE_VIOLATIONS,
} from './sampleDataFallback';
import type {
  User, Vehicle, Fine, TrafficSign, TrafficViolation, ViolationRule, AIDetectionLog, AIDetectionPageStats, Notification,
  DashboardStats, AuthResponse, LoginOptions, Road, Camera,
} from '../types';
import {
  mockUsers, mockVehicles, mockFines, mockTrafficSigns,
  mockAILogs, mockNotifications, mockDashboardStats,
  MOCK_CREDENTIALS, AI_DETECTION_RESULTS, mockRoads, mockCameras,
} from './mockData';
import { normalizeCameraFrames } from '@shared/constants/cameraFrameDemo';
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
  async delete(id: string) { users = users.filter((u) => u.id !== id); },
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
  async getByOwner(ownerId: number) { return vehicles.filter((v) => v.owner_id === ownerId); },
  async create(data: Partial<Vehicle>) {
    const owner = users.find((u) => u.id === data.owner_id);
    const v: Vehicle = {
      id: vehicles.length + 1,
      owner_id: data.owner_id || 0,
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
  async delete(id: number) { vehicles = vehicles.filter((v) => v.id !== id); },
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
};

export const notificationsAPI = {
  async getByUser(userId: number) {
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
  async getById(id: number): Promise<Road> {
    await delay(200);
    const road = mockRoads.find((r) => r.id === id);
    if (!road) throw new Error('Road not found');
    return { ...road };
  },
  async create(data: Partial<Road>): Promise<Road> {
    await delay(400);
    const road: Road = {
      id: mockRoads.length + 1,
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
  async update(id: number, data: Partial<Road>): Promise<Road> {
    await delay(300);
    const idx = mockRoads.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error('Road not found');
    mockRoads[idx] = { ...mockRoads[idx], ...data, updated_at: new Date().toISOString() };
    return mockRoads[idx];
  },
  async delete(id: number): Promise<void> {
    await delay(300);
    const idx = mockRoads.findIndex((r) => r.id === id);
    if (idx >= 0) mockRoads.splice(idx, 1);
  },
};

export const camerasAPI = {
  async getAll(): Promise<Camera[]> {
    await delay(350);
    return normalizeCameraFrames([...mockCameras]);
  },
  async getById(id: number): Promise<Camera> {
    await delay(200);
    const cam = mockCameras.find((c) => c.id === id);
    if (!cam) throw new Error('Camera not found');
    return { ...cam };
  },
  async create(data: Partial<Camera> & { road: number }): Promise<Camera> {
    await delay(400);
    const road = mockRoads.find((r) => r.id === data.road);
    const cam: Camera = {
      id: mockCameras.length + 1,
      road_id: data.road,
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
  async update(id: number, data: Partial<Camera>): Promise<Camera> {
    await delay(300);
    const idx = mockCameras.findIndex((c) => c.id === id);
    if (idx < 0) throw new Error('Camera not found');
    mockCameras[idx] = { ...mockCameras[idx], ...data, updated_at: new Date().toISOString() };
    return mockCameras[idx];
  },
  async delete(id: number): Promise<void> {
    await delay(300);
    const idx = mockCameras.findIndex((c) => c.id === id);
    if (idx >= 0) mockCameras.splice(idx, 1);
  },
};

export const violationsAPI = {
  async getAll(): Promise<TrafficViolation[]> { return [...SAMPLE_VIOLATIONS]; },
  async getById(_id: number): Promise<TrafficViolation> { throw new Error('Not found'); },
  async evaluate(_data: { class_key: string; observed_action: string; sign_code?: string }) {
    return { is_violation: false };
  },
  async create(_data: {
    driver_id: number;
    class_key: string;
    observed_action: string;
    sign_code?: string;
    location?: string;
    ai_detection_log_id?: number;
  }): Promise<TrafficViolation> {
    throw new Error('Mock violations create not implemented');
  },
  async update(_id: number, _data: Partial<TrafficViolation>): Promise<TrafficViolation> {
    throw new Error('Mock violations update not implemented');
  },
  async delete(_id: number): Promise<void> {},
  async getRules(): Promise<ViolationRule[]> {
    return [...SAMPLE_VIOLATION_RULES];
  },
  async getStats() {
    return {
      total_violations: SAMPLE_VIOLATIONS.length,
      pending_review: SAMPLE_VIOLATIONS.filter((v) => v.status === 'pending_review').length,
      confirmed: SAMPLE_VIOLATIONS.filter((v) => v.status === 'confirmed').length,
      rejected: 0,
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
  async listSystemBackups() {
    return { backups: [] };
  },
  async downloadSystemBackup() {
    throw new Error('Full system backup requires the live API (disable mock mode).');
  },
};
