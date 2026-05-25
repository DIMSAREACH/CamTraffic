/** In-memory mock API — used when VITE_USE_MOCK=true */
import type {
  User, Vehicle, Fine, TrafficSign, AIDetectionLog, AIDetectionPageStats, Notification,
  DashboardStats, AuthResponse, LoginOptions,
} from '../types';
import {
  mockUsers, mockVehicles, mockFines, mockTrafficSigns,
  mockAILogs, mockNotifications, mockDashboardStats,
  MOCK_CREDENTIALS, AI_DETECTION_RESULTS,
} from './mockData';
import { LOGIN_ERRORS } from '@shared/utils/loginErrors';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let users = [...mockUsers];
let vehicles = [...mockVehicles];
let fines = [...mockFines];
const aiLogs = [...mockAILogs];
let notifications = [...mockNotifications];

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
};

export const usersAPI = {
  async getAll() { await delay(500); return users.map((u) => ({ ...u })); },
  async getById(id: number) {
    await delay(300);
    const u = users.find((x) => x.id === id);
    if (!u) throw new Error('User not found');
    return { ...u };
  },
  async update(id: number, data: Partial<User>) {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    users[idx] = { ...users[idx], ...data };
    return { ...users[idx] };
  },
  async uploadProfileImage(id: number, file: File) {
    await delay(400);
    const url = URL.createObjectURL(file);
    return usersAPI.update(id, { profile_image: url });
  },
  async create(data: Partial<User> & { password: string }) {
    const newUser: User = {
      id: users.length + 1,
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
  async delete(id: number) { users = users.filter((u) => u.id !== id); },
  async toggleActive(id: number) {
    const idx = users.findIndex((u) => u.id === id);
    users[idx].is_active = !users[idx].is_active;
    return { ...users[idx] };
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
    const entry: AIDetectionLog = {
      id: aiLogs.length ? Math.max(...aiLogs.map((l) => l.id)) + 1 : 1,
      user_id: 4,
      user_name: 'Kosal Pich',
      uploaded_image: '',
      detected_sign: r.detected_sign,
      confidence,
      description: r.description,
      guidance: r.guidance,
      created_at: new Date().toISOString(),
    };
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
    return userId ? aiLogs.filter((l) => l.user_id === userId) : [...aiLogs];
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
};

export const dashboardAPI = {
  async getAdminStats(): Promise<DashboardStats> { return { ...mockDashboardStats }; },
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
};
