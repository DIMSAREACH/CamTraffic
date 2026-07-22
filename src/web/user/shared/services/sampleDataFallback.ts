/**
 * Demo sample data when the live API returns empty lists or zero dashboard stats.
 * Only active when VITE_USE_SAMPLE_FALLBACK=true in development (see shared/config/dataMode.ts).
 */
import { USE_SAMPLE_FALLBACK } from '@shared/config/dataMode';
import catalog from '@shared/data/traffic_sign_catalog_10.json';
import { mergePageStatsWithDefaults } from '@shared/constants/defaultPageStats';
import type {
  AIDetectionLog,
  AIDetectionPageStats,
  DashboardStats,
  EvidenceArchiveItem,
  Fine,
  Notification,
  ProfileOverview,
  SignCategory,
  TrafficSign,
  TrafficViolation,
  User,
  Vehicle,
  ViolationRule,
  Camera,
  Road,
} from '@shared/types';
import { EMPTY_DASHBOARD_STATS, EMPTY_DRIVER_STATS, EMPTY_POLICE_STATS } from '@shared/constants/emptyDashboard';
import {
  mockAILogs,
  mockCameras,
  mockDashboardStats,
  mockFines,
  mockNotifications,
  mockRoads,
  mockUsers,
  mockVehicles,
} from './mockData';

const DEMO_SIGN_IMAGE: Record<string, string> = {
  NO_ENTRY: '/demo-signs/no-entry.png',
  NO_LEFT_TURN: '/demo-signs/no-left-turn.png',
  NO_RIGHT_TURN: '/demo-signs/no-right-turn.png',
  NO_U_TURN: '/demo-signs/no-u-turn.png',
  NO_PARKING: '/demo-signs/no-parking.png',
  M_STOP: '/demo-signs/stop.png',
  P_SPEED_LIMIT_20_KM_H: '/demo-signs/speed-limit-20.png',
  P_SPEED_LIMIT_50_KM_H: '/demo-signs/speed-limit-50.png',
  W_PEDESTRIAN_CROSSING: '/demo-signs/pedestrian-crossing.png',
  I_ONE_WAY_TRAFFIC: '/demo-signs/one-way-traffic.png',
};

const CATALOG_CATEGORY: Record<string, SignCategory> = {
  'Prohibitory Sign': 'prohibitory',
  'Mandatory Sign': 'mandatory',
  'Regulatory Sign': 'mandatory',
  'Warning Sign': 'warning',
  'Information Sign': 'informative',
};

export function withListFallback<T>(live: T[], sample: T[]): T[] {
  if (!USE_SAMPLE_FALLBACK) return live;
  return live.length > 0 ? live : sample;
}

/** Cohesive demo dataset for registered drivers (UUID ids) and empty API responses. */
export const DEMO_DRIVER_LABEL = 'Demo Driver';
export const DEMO_DRIVER_LICENSE = 'DRV-DEMO-001';

export const DEMO_DRIVER_FINES: Fine[] = [
  { id: '1001', driver_id: '4', driver_name: DEMO_DRIVER_LABEL, driver_license: DEMO_DRIVER_LICENSE, police_id: 2, police_name: 'Dara Chan', amount: 100, reason: 'Speeding (80km/h in 60km/h zone)', status: 'pending', location: 'Russian Blvd, Phnom Penh', vehicle_plate: '2AK 7788', created_at: '2026-06-15T14:20:00Z' },
  { id: '1002', driver_id: '4', driver_name: DEMO_DRIVER_LABEL, driver_license: DEMO_DRIVER_LICENSE, police_id: 9, police_name: 'Bora Keo', amount: 10, reason: 'No Helmet (Motorcycle)', status: 'overdue', location: 'Street 271, Sen Sok, Phnom Penh', vehicle_plate: '1PP 4455', created_at: '2026-05-28T16:45:00Z' },
  { id: '1003', driver_id: '4', driver_name: DEMO_DRIVER_LABEL, driver_license: DEMO_DRIVER_LICENSE, police_id: 3, police_name: 'Srey Neang', amount: 25, reason: 'No Seatbelt', status: 'paid', location: 'Norodom Blvd, Phnom Penh', vehicle_plate: '2AK 7788', created_at: '2026-05-20T09:15:00Z', paid_at: '2026-05-21T10:00:00Z' },
  { id: '1004', driver_id: '4', driver_name: DEMO_DRIVER_LABEL, driver_license: DEMO_DRIVER_LICENSE, police_id: 2, police_name: 'Dara Chan', amount: 50, reason: 'Running Red Light', status: 'paid', location: 'Monivong Blvd & Street 214, Phnom Penh', vehicle_plate: '2AA 1234', created_at: '2026-04-10T10:30:00Z', paid_at: '2026-04-12T14:00:00Z' },
  { id: '1005', driver_id: '4', driver_name: DEMO_DRIVER_LABEL, driver_license: DEMO_DRIVER_LICENSE, police_id: 3, police_name: 'Srey Neang', amount: 15, reason: 'Illegal Parking', status: 'paid', location: 'Near Central Market, Phnom Penh', vehicle_plate: '2AA 1234', created_at: '2026-04-05T13:00:00Z', paid_at: '2026-04-06T09:00:00Z' },
  { id: '1006', driver_id: '4', driver_name: DEMO_DRIVER_LABEL, driver_license: DEMO_DRIVER_LICENSE, police_id: 2, police_name: 'Dara Chan', amount: 30, reason: 'No U-Turn at R1-03', status: 'pending', location: 'Sihanouk Blvd, Phnom Penh', vehicle_plate: '2AA 1234', created_at: '2026-06-10T08:30:00Z' },
  { id: '1007', driver_id: '4', driver_name: DEMO_DRIVER_LABEL, driver_license: DEMO_DRIVER_LICENSE, police_id: 2, police_name: 'Dara Chan', amount: 25, reason: 'Failure to Stop at Stop Sign (M-032)', status: 'pending', location: 'Confederation de la Russie Blvd, Phnom Penh', vehicle_plate: '2AK 7788', created_at: '2026-06-08T11:00:00Z' },
  { id: '1008', driver_id: '4', driver_name: DEMO_DRIVER_LABEL, driver_license: DEMO_DRIVER_LICENSE, police_id: 9, police_name: 'Bora Keo', amount: 20, reason: 'Speed Limit 20 km/h Exceeded', status: 'dismissed', location: 'Chroy Changvar, Phnom Penh', vehicle_plate: '1PP 4455', created_at: '2026-03-22T07:45:00Z' },
];

export const DEMO_DRIVER_VEHICLES: Vehicle[] = [
  { id: '1001', owner_id: '4', owner_name: DEMO_DRIVER_LABEL, plate_number: '2AA 1234', vehicle_type: 'car', model: 'Toyota Camry 2022', color: 'Silver', year: 2022, created_at: '2024-02-05T08:00:00Z' },
  { id: '1002', owner_id: '4', owner_name: DEMO_DRIVER_LABEL, plate_number: '2AK 7788', vehicle_type: 'car', model: 'Toyota Hilux 2023', color: 'White', year: 2023, created_at: '2025-11-12T08:00:00Z' },
  { id: '1003', owner_id: '4', owner_name: DEMO_DRIVER_LABEL, plate_number: '1PP 4455', vehicle_type: 'motorcycle', model: 'Honda PCX 160', color: 'Grey', year: 2024, created_at: '2026-01-08T08:00:00Z' },
];

export const DEMO_DRIVER_DETECTIONS: AIDetectionLog[] = [
  { id: '1001', user_id: 4, user_name: DEMO_DRIVER_LABEL, uploaded_image: 'sign_001.jpg', detected_sign: 'Stop Sign (M-032)', confidence: 98.9, description: 'Octagonal red STOP sign with white lettering.', guidance: 'Come to a complete stop at the marked line.', created_at: '2026-06-17T12:00:00Z' },
  { id: '1002', user_id: 4, user_name: DEMO_DRIVER_LABEL, uploaded_image: 'sign_002.jpg', detected_sign: 'No Entry (R1-04)', confidence: 96.2, description: 'Round red sign with horizontal white bar.', guidance: 'Do not enter this road. Find an alternative route.', created_at: '2026-06-16T11:30:00Z' },
  { id: '1003', user_id: 4, user_name: DEMO_DRIVER_LABEL, uploaded_image: 'sign_003.jpg', detected_sign: 'Speed Limit 40 km/h', confidence: 99.1, description: 'Round white sign with red border showing 40.', guidance: 'Reduce your speed to 40 km/h or below.', created_at: '2026-06-15T09:45:00Z' },
  { id: '1004', user_id: 4, user_name: DEMO_DRIVER_LABEL, uploaded_image: 'sign_004.jpg', detected_sign: 'Pedestrian Crossing (W-040)', confidence: 94.7, description: 'Triangular warning sign with walking figure.', guidance: 'Slow down and watch for pedestrians.', created_at: '2026-06-14T14:20:00Z' },
  { id: '1005', user_id: 4, user_name: DEMO_DRIVER_LABEL, uploaded_image: 'sign_005.jpg', detected_sign: 'No Parking (R2-10)', confidence: 97.8, description: 'Blue sign with red crossed-out P.', guidance: 'Parking is not allowed here.', created_at: '2026-06-13T16:00:00Z' },
  { id: '1006', user_id: 4, user_name: DEMO_DRIVER_LABEL, uploaded_image: 'sign_006.jpg', detected_sign: 'One Way Traffic (I-064)', confidence: 97.2, description: 'Blue rectangular one-way direction sign.', guidance: 'Follow the one-way direction indicated.', created_at: '2026-06-12T10:40:00Z' },
  { id: '1007', user_id: 4, user_name: DEMO_DRIVER_LABEL, uploaded_image: 'sign_007.jpg', detected_sign: 'No Left Turn (R1-01)', confidence: 95.8, description: 'Left-turn arrow crossed by red slash.', guidance: 'Do not turn left at this intersection.', created_at: '2026-06-11T09:10:00Z' },
  { id: '1008', user_id: 4, user_name: DEMO_DRIVER_LABEL, uploaded_image: 'sign_008.jpg', detected_sign: 'Speed Limit 50 km/h (P-030)', confidence: 98.6, description: 'Mandatory 50 km/h speed limit sign.', guidance: 'Do not exceed 50 km/h.', created_at: '2026-06-10T08:05:00Z' },
];

export const DEMO_DRIVER_NOTIFICATIONS: Notification[] = [
  { id: '1001', user_id: 4, title: 'Fine Payment Reminder', message: 'You have $155 USD in outstanding fines. Pay before the due date to avoid penalties.', is_read: false, type: 'fine', created_at: '2026-06-18T08:00:00Z' },
  { id: '1002', user_id: 4, title: 'AI Detection Complete', message: 'Stop Sign (M-032) detected with 98.9% confidence near Monivong Blvd.', is_read: false, type: 'detection', created_at: '2026-06-17T12:05:00Z' },
  { id: '1003', user_id: 4, title: 'New Fine Issued', message: 'A fine of $100 USD has been issued for speeding on Russian Blvd.', is_read: false, type: 'fine', created_at: '2026-06-15T14:25:00Z' },
  { id: '1004', user_id: 4, title: 'Vehicle Registration Verified', message: 'Your Toyota Hilux (2AK 7788) registration has been verified.', is_read: true, type: 'system', created_at: '2026-06-10T09:30:00Z' },
  { id: '1005', user_id: 4, title: 'Welcome to CamTraffic', message: 'Your driver account is active. Explore AI sign detection and pay fines online.', is_read: true, type: 'system', created_at: '2026-06-01T08:00:00Z' },
  { id: '1006', user_id: 4, title: 'Traffic Alert', message: 'Heavy congestion reported on Russian Blvd. Plan extra travel time.', is_read: false, type: 'alert', created_at: '2026-06-19T07:00:00Z' },
];

const RECENT_LIST_SIZE = 5;

function usesDemoDriverData(driverId: string | number): boolean {
  if (typeof driverId === 'string') return true;
  return !mockFines.some((f) => f.driver_id === driverId);
}

function buildDriverStatsFrom(
  fines: Fine[],
  vehicles: Vehicle[],
  logs: AIDetectionLog[],
): DriverDashboardStats {
  const pendingStatuses = new Set(['pending', 'overdue']);
  return {
    vehicles: vehicles.length,
    total_fines: fines.length,
    pending: fines.filter((f) => pendingStatuses.has(f.status)).length,
    paid: fines.filter((f) => f.status === 'paid').length,
    owed: fines.filter((f) => f.status !== 'paid' && f.status !== 'dismissed').reduce((s, f) => s + f.amount, 0),
    recent_fines: [...fines].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, RECENT_LIST_SIZE),
    recent_detections: [...logs].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, RECENT_LIST_SIZE),
  };
}

export function getSampleTrafficSigns(): TrafficSign[] {
  return catalog.signs.map((sign, index) => ({
    id: index + 1,
    sign_name: sign.sign_name_en,
    sign_name_km: sign.sign_name_km,
    sign_name_en: sign.sign_name_en,
    sign_code: sign.sign_code,
    description: sign.description_en,
    description_en: sign.description_en,
    guidance: sign.description_en,
    image: DEMO_SIGN_IMAGE[sign.class_key] ?? '',
    category: CATALOG_CATEGORY[sign.category] ?? 'warning',
    penalty: 'Fine per Cambodian traffic law',
    rules: [sign.description_en],
  }));
}

export const SAMPLE_VIOLATIONS: TrafficViolation[] = [
  {
    id: '1',
    driver_id: '4',
    driver_name: 'Kosal Pich',
    driver_license: 'DL-KH-2024-001234',
    officer_name: 'Dara Chan',
    vehicle_plate: '2AA 1234',
    violation_type: 'NO_STOP',
    observed_action: 'ENTER',
    detected_sign_code: 'M-032',
    detected_class_key: 'M_STOP',
    violation_date: '2024-04-10T10:15:00Z',
    location: 'Monivong Blvd & Street 214, Phnom Penh',
    description: 'Vehicle failed to come to a complete stop at M-032 Stop sign.',
    evidence_image: '/demo-signs/stop.png',
    status: 'confirmed',
    ai_detection_log: '1',
    fine_id: '10',
    created_at: '2024-04-10T10:20:00Z',
    updated_at: '2024-04-10T10:20:00Z',
  },
  {
    id: '2',
    driver_id: '5',
    driver_name: 'Vanna Sok',
    driver_license: 'DL-KH-2024-002345',
    officer_name: 'Srey Neang',
    vehicle_plate: '1CC 9012',
    violation_type: 'NO_LEFT_TURN',
    observed_action: 'LEFT_TURN',
    detected_sign_code: 'R1-01',
    detected_class_key: 'NO_LEFT_TURN',
    violation_date: '2024-04-08T14:30:00Z',
    location: 'Russian Blvd, Phnom Penh',
    description: 'Illegal left turn at R1-01 No Left Turn sign.',
    evidence_image: '/demo-signs/no-left-turn.png',
    status: 'pending_review',
    created_at: '2024-04-08T14:35:00Z',
    updated_at: '2024-04-08T14:35:00Z',
  },
  {
    id: '3',
    driver_id: '7',
    driver_name: 'Ratana Heng',
    driver_license: 'DL-KH-2024-004567',
    officer_name: 'Bora Keo',
    vehicle_plate: '2EE 7890',
    violation_type: 'NO_ENTRY',
    observed_action: 'ENTER',
    detected_sign_code: 'R1-04',
    detected_class_key: 'NO_ENTRY',
    violation_date: '2024-04-05T09:00:00Z',
    location: 'Street 271, Sen Sok, Phnom Penh',
    description: 'Entered road marked with R1-04 No Entry sign.',
    evidence_image: '/demo-signs/no-entry.png',
    status: 'confirmed',
    created_at: '2024-04-05T09:05:00Z',
    updated_at: '2024-04-05T09:05:00Z',
  },
  {
    id: '4',
    driver_id: '10',
    driver_name: 'Chenda Ros',
    driver_license: 'DL-KH-2024-006789',
    officer_name: 'Dara Chan',
    vehicle_plate: '3FF 2345',
    violation_type: 'NO_PARKING',
    observed_action: 'PARKING',
    detected_sign_code: 'R2-10',
    detected_class_key: 'NO_PARKING',
    violation_date: '2024-04-01T11:30:00Z',
    location: 'Street 63, Chamkar Mon, Phnom Penh',
    description: 'Parked in a No Parking zone (R2-10).',
    evidence_image: '/demo-signs/no-parking.png',
    status: 'pending_review',
    created_at: '2024-04-01T11:35:00Z',
    updated_at: '2024-04-01T11:35:00Z',
  },
  {
    id: '5',
    driver_id: '4',
    driver_name: 'Kosal Pich',
    driver_license: 'DL-KH-2024-001234',
    officer_name: 'Dara Chan',
    vehicle_plate: '2AA 1234',
    violation_type: 'NO_STOP',
    observed_action: 'ENTER',
    detected_sign_code: 'M-032',
    detected_class_key: 'M_STOP',
    violation_date: '2026-06-08T11:00:00Z',
    location: 'Confederation de la Russie Blvd, Phnom Penh',
    description: 'Failed to stop at M-032 Stop sign.',
    evidence_image: '/demo-signs/stop.png',
    status: 'confirmed',
    created_at: '2026-06-08T11:05:00Z',
    updated_at: '2026-06-08T11:05:00Z',
  },
  {
    id: '6',
    driver_id: '5',
    driver_name: 'Vanna Sok',
    driver_license: 'DL-KH-2024-002345',
    officer_name: 'Srey Neang',
    vehicle_plate: '1CC 9012',
    violation_type: 'SPEEDING',
    observed_action: 'ENTER',
    detected_sign_code: 'P-030',
    detected_class_key: 'P_SPEED_LIMIT_50_KM_H',
    violation_date: '2026-06-14T08:00:00Z',
    location: 'Airport Road, Phnom Penh',
    description: 'Exceeded posted 50 km/h speed limit.',
    evidence_image: '/demo-signs/speed-limit-50.png',
    status: 'pending_review',
    created_at: '2026-06-14T08:05:00Z',
    updated_at: '2026-06-14T08:05:00Z',
  },
  {
    id: '7',
    driver_id: '7',
    driver_name: 'Ratana Heng',
    driver_license: 'DL-KH-2024-004567',
    officer_name: 'Bora Keo',
    vehicle_plate: '2EE 7890',
    violation_type: 'NO_PARKING',
    observed_action: 'PARKING',
    detected_sign_code: 'R2-10',
    detected_class_key: 'NO_PARKING',
    violation_date: '2026-05-15T13:00:00Z',
    location: 'Central Market, Phnom Penh',
    description: 'Vehicle parked in R2-10 No Parking zone.',
    evidence_image: '/demo-signs/no-parking.png',
    status: 'confirmed',
    created_at: '2026-05-15T13:05:00Z',
    updated_at: '2026-05-15T13:05:00Z',
  },
  {
    id: '8',
    driver_id: '10',
    driver_name: 'Chenda Ros',
    driver_license: 'DL-KH-2024-006789',
    officer_name: 'Dara Chan',
    vehicle_plate: '3FF 2345',
    violation_type: 'NO_U_TURN',
    observed_action: 'U_TURN',
    detected_sign_code: 'R1-03',
    detected_class_key: 'NO_U_TURN',
    violation_date: '2026-06-10T08:30:00Z',
    location: 'Sihanouk Blvd, Phnom Penh',
    description: 'Illegal U-turn at R1-03 sign.',
    evidence_image: '/demo-signs/no-u-turn.png',
    status: 'pending_review',
    created_at: '2026-06-10T08:35:00Z',
    updated_at: '2026-06-10T08:35:00Z',
  },
];

export const SAMPLE_VIOLATION_RULES: ViolationRule[] = [
  {
    id: '1',
    sign_class_key: 'M_STOP',
    prohibited_action: 'ENTER',
    violation_type: 'NO_STOP',
    title: 'Failed to Stop',
    description: 'Driver did not stop at M-032 Stop sign.',
    default_fine_amount: 25,
    is_active: true,
  },
  {
    id: '2',
    sign_class_key: 'NO_LEFT_TURN',
    prohibited_action: 'LEFT_TURN',
    violation_type: 'NO_LEFT_TURN',
    title: 'Illegal Left Turn',
    description: 'Left turn prohibited at R1-01.',
    default_fine_amount: 30,
    is_active: true,
  },
  {
    id: '3',
    sign_class_key: 'NO_ENTRY',
    prohibited_action: 'ENTER',
    violation_type: 'NO_ENTRY',
    title: 'No Entry Violation',
    description: 'Entered a road marked R1-04 No Entry.',
    default_fine_amount: 50,
    is_active: true,
  },
  {
    id: '4',
    sign_class_key: 'NO_PARKING',
    prohibited_action: 'PARKING',
    violation_type: 'NO_PARKING',
    title: 'Illegal Parking',
    description: 'Parked where R2-10 No Parking applies.',
    default_fine_amount: 15,
    is_active: true,
  },
];

export function getSampleEvidenceArchive(): EvidenceArchiveItem[] {
  if (!USE_SAMPLE_FALLBACK) return [];
  return [
    {
      id: 'sample-det-1',
      source_type: 'detection',
      source_id: '1',
      title: 'Stop Sign — M-032',
      plate: '2AA 1234',
      location: 'Monivong Blvd, Phnom Penh',
      image_url: '/demo-signs/stop.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2024-04-10T10:15:00Z',
    },
    {
      id: 'sample-vio-1',
      source_type: 'violation',
      source_id: '2',
      title: 'No Left Turn — R1-01',
      plate: '1CC 9012',
      location: 'Russian Blvd, Phnom Penh',
      image_url: '/demo-signs/no-left-turn.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2024-04-08T14:30:00Z',
    },
    {
      id: 'sample-fine-1',
      source_type: 'fine',
      source_id: '1',
      title: 'Red Light Violation',
      plate: '2AA 1234',
      location: 'Monivong Blvd & Street 214',
      image_url: '/demo-signs/no-entry.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2024-03-10T10:30:00Z',
    },
    {
      id: 'sample-det-2',
      source_type: 'detection',
      source_id: '3',
      title: 'Speed Limit 50 — P-030',
      plate: '1CC 9012',
      location: 'Airport Road, Phnom Penh',
      image_url: '/demo-signs/speed-limit-50.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2024-04-11T09:45:00Z',
    },
    {
      id: 'sample-det-3',
      source_type: 'detection',
      source_id: '4',
      title: 'Pedestrian Crossing — W-040',
      plate: '2EE 7890',
      location: 'Norodom Blvd, Phnom Penh',
      image_url: '/demo-signs/pedestrian-crossing.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2024-04-11T14:20:00Z',
    },
    {
      id: 'sample-vio-2',
      source_type: 'violation',
      source_id: '3',
      title: 'No Entry — R1-04',
      plate: '2EE 7890',
      location: 'Street 271, Sen Sok',
      image_url: '/demo-signs/no-entry.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2024-04-05T09:00:00Z',
    },
    {
      id: 'sample-det-4',
      source_type: 'detection',
      source_id: '4',
      title: 'No Parking — R2-10',
      plate: '2AK 7788',
      location: 'Central Market, Phnom Penh',
      image_url: '/demo-signs/no-parking.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2026-06-13T16:00:00Z',
    },
    {
      id: 'sample-vio-3',
      source_type: 'violation',
      source_id: '5',
      title: 'No Stop — M-032',
      plate: '2AA 1234',
      location: 'Confederation de la Russie Blvd',
      image_url: '/demo-signs/stop.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2026-06-08T11:05:00Z',
    },
    {
      id: 'sample-fine-2',
      source_type: 'fine',
      source_id: '1001',
      title: 'Speeding Violation',
      plate: '2AK 7788',
      location: 'Russian Blvd, Phnom Penh',
      image_url: '/demo-signs/speed-limit-50.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2026-06-15T14:20:00Z',
    },
    {
      id: 'sample-det-5',
      source_type: 'detection',
      source_id: '5',
      title: 'One Way Traffic — I-064',
      plate: '1PP 4455',
      location: 'Chroy Changvar, Phnom Penh',
      image_url: '/demo-signs/one-way-traffic.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2026-06-12T10:40:00Z',
    },
    {
      id: 'sample-det-6',
      source_type: 'detection',
      source_id: '6',
      title: 'No Left Turn — R1-01',
      plate: '2AA 1234',
      location: 'Monivong Blvd, Phnom Penh',
      image_url: '/demo-signs/no-left-turn.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2026-06-11T09:10:00Z',
    },
    {
      id: 'sample-vio-4',
      source_type: 'violation',
      source_id: '8',
      title: 'No U-Turn — R1-03',
      plate: '3FF 2345',
      location: 'Sihanouk Blvd, Phnom Penh',
      image_url: '/demo-signs/no-u-turn.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2026-06-10T08:35:00Z',
    },
    {
      id: 'sample-det-7',
      source_type: 'detection',
      source_id: '7',
      title: 'Speed Limit 20 — P-029',
      plate: '1PP 4455',
      location: 'School zone, Sen Sok',
      image_url: '/demo-signs/speed-limit-20.png',
      vehicle_image_url: null,
      plate_image_url: null,
      created_at: '2026-06-09T07:30:00Z',
    },
  ];
}

/** True when fines/violations/revenue charts have no real data (detections alone do not count). */
export function isDashboardEmpty(stats: DashboardStats): boolean {
  return !hasEnforcementData(stats);
}

function hasEnforcementData(stats: DashboardStats): boolean {
  return (stats.total_fines ?? 0) > 0
    || (stats.fine_revenue ?? 0) > 0
    || (stats.total_violations ?? 0) > 0
    || (stats.monthly_fines?.some((m) => (m.count ?? 0) > 0) ?? false)
    || (stats.fine_by_reason?.some((r) => (r.count ?? 0) > 0) ?? false);
}

function hasChartSeries<T extends { count?: number }>(rows: T[] | undefined): boolean {
  return (rows?.some((row) => (row.count ?? 0) > 0) ?? false);
}

export function getSampleAdminDashboard(): DashboardStats {
  if (!USE_SAMPLE_FALLBACK) return { ...EMPTY_DASHBOARD_STATS };
  return { ...mockDashboardStats };
}

/** Fill demo dashboard when enforcement data is missing; patch empty chart series otherwise. */
export function mergeDashboardStats(live: DashboardStats): DashboardStats {
  if (!USE_SAMPLE_FALLBACK) return live;
  const sample = getSampleAdminDashboard();

  if (!hasEnforcementData(live)) {
    return {
      ...sample,
      total_detections: Math.max(live.total_detections ?? 0, sample.total_detections),
      detection_accuracy: (live.detection_accuracy ?? 0) > 0
        ? live.detection_accuracy
        : sample.detection_accuracy,
    };
  }

  return {
    ...live,
    monthly_fines: hasChartSeries(live.monthly_fines) ? live.monthly_fines : sample.monthly_fines,
    monthly_detections: hasChartSeries(live.monthly_detections)
      ? live.monthly_detections
      : sample.monthly_detections,
    monthly_violations: hasChartSeries(live.monthly_violations)
      ? live.monthly_violations
      : sample.monthly_violations,
    fine_by_reason: live.fine_by_reason?.length ? live.fine_by_reason : sample.fine_by_reason,
    violation_by_type: live.violation_by_type?.length ? live.violation_by_type : sample.violation_by_type,
    user_distribution: hasChartSeries(live.user_distribution)
      ? live.user_distribution
      : sample.user_distribution,
    detection_by_sign: live.detection_by_sign?.length ? live.detection_by_sign : sample.detection_by_sign,
    top_locations: live.top_locations?.length ? live.top_locations : sample.top_locations,
    peak_hours: live.peak_hours?.length ? live.peak_hours : sample.peak_hours,
    monthly_registrations: hasChartSeries(live.monthly_registrations)
      ? live.monthly_registrations
      : sample.monthly_registrations,
    total_users: Math.max(live.total_users ?? 0, sample.total_users),
    total_drivers: Math.max(live.total_drivers ?? 0, sample.total_drivers),
    total_police: Math.max(live.total_police ?? 0, sample.total_police),
    total_vehicles: Math.max(live.total_vehicles ?? 0, sample.total_vehicles),
    total_signs: Math.max(live.total_signs ?? 0, sample.total_signs ?? 0),
  };
}

export type DriverDashboardStats = {
  vehicles: number;
  total_fines: number;
  pending: number;
  paid: number;
  owed: number;
  recent_detections: AIDetectionLog[];
  recent_fines: Fine[];
};

export type PoliceDashboardStats = {
  total_issued: number;
  today_issued: number;
  pending: number;
  revenue: number;
  recent: Fine[];
};

export function getSampleDriverStats(driverId: string | number = 4): DriverDashboardStats {
  if (!USE_SAMPLE_FALLBACK) return { ...EMPTY_DRIVER_STATS };
  return sampleDriverStats(driverId);
}

export function getSamplePoliceStats(policeId: string | number = 2): PoliceDashboardStats {
  if (!USE_SAMPLE_FALLBACK) return { ...EMPTY_POLICE_STATS };
  return samplePoliceStats(policeId);
}

function sampleDriverStats(driverId: string | number): DriverDashboardStats {
  if (usesDemoDriverData(driverId)) {
    return buildDriverStatsFrom(DEMO_DRIVER_FINES, DEMO_DRIVER_VEHICLES, DEMO_DRIVER_DETECTIONS);
  }
  const fines = mockFines.filter((f) => f.driver_id === driverId);
  const vehicles = mockVehicles.filter((v) => v.owner_id === driverId);
  const logs = mockAILogs.filter((l) => l.user_id === driverId);
  if (fines.length >= 3) {
    return buildDriverStatsFrom(fines, vehicles.length ? vehicles : DEMO_DRIVER_VEHICLES, logs.length ? logs : DEMO_DRIVER_DETECTIONS);
  }
  return buildDriverStatsFrom(DEMO_DRIVER_FINES, DEMO_DRIVER_VEHICLES, DEMO_DRIVER_DETECTIONS);
}

function samplePoliceStats(policeId: string | number): PoliceDashboardStats {
  const numericId = typeof policeId === 'number' ? policeId : 2;
  const pf = mockFines.filter((f) => f.police_id === numericId);
  const fines = pf.length >= 4 ? pf : mockFines.slice(0, 8);
  return {
    total_issued: fines.length,
    today_issued: 3,
    pending: fines.filter((f) => f.status === 'pending' || f.status === 'overdue').length,
    revenue: fines.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount, 0),
    recent: [...fines].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, RECENT_LIST_SIZE),
  };
}

export function mergeDriverStats(live: DriverDashboardStats, driverId: string | number): DriverDashboardStats {
  if (!USE_SAMPLE_FALLBACK) return live;
  const sample = sampleDriverStats(driverId);
  const empty = live.total_fines === 0
    && live.vehicles === 0
    && !live.recent_fines?.length
    && !live.recent_detections?.length;
  if (empty) return sample;
  return {
    vehicles: Math.max(live.vehicles, sample.vehicles),
    total_fines: Math.max(live.total_fines, sample.total_fines),
    pending: Math.max(live.pending, sample.pending),
    paid: Math.max(live.paid, sample.paid),
    owed: Math.max(live.owed, sample.owed),
    recent_fines: live.recent_fines?.length ? live.recent_fines : sample.recent_fines,
    recent_detections: live.recent_detections?.length ? live.recent_detections : sample.recent_detections,
  };
}

export function mergePoliceStats(live: PoliceDashboardStats, policeId: string | number): PoliceDashboardStats {
  if (!USE_SAMPLE_FALLBACK) return live;
  const empty = live.total_issued === 0 && !live.recent?.length;
  if (empty) return samplePoliceStats(policeId);
  const sample = samplePoliceStats(policeId);
  return {
    total_issued: Math.max(live.total_issued, sample.total_issued),
    today_issued: Math.max(live.today_issued, sample.today_issued),
    pending: Math.max(live.pending, sample.pending),
    revenue: Math.max(live.revenue, sample.revenue),
    recent: live.recent?.length ? live.recent : sample.recent,
  };
}

export function sampleFinesForDriver(driverId: string | number): Fine[] {
  if (usesDemoDriverData(driverId)) return DEMO_DRIVER_FINES;
  const matched = mockFines.filter((f) => f.driver_id === driverId);
  return matched.length ? matched : DEMO_DRIVER_FINES;
}

export function sampleFinesForPolice(policeId: string | number): Fine[] {
  const numericId = typeof policeId === 'number' ? policeId : 2;
  const matched = mockFines.filter((f) => f.police_id === numericId);
  return matched.length ? matched : mockFines.slice(0, 8);
}

export function sampleVehiclesForOwner(ownerId: string | number): Vehicle[] {
  if (usesDemoDriverData(ownerId)) return DEMO_DRIVER_VEHICLES;
  const matched = mockVehicles.filter((v) => v.owner_id === ownerId);
  return matched.length ? matched : DEMO_DRIVER_VEHICLES;
}

export function sampleNotificationsForUser(userId: string | number): Notification[] {
  if (usesDemoDriverData(userId)) return DEMO_DRIVER_NOTIFICATIONS;
  const numericId = typeof userId === 'number' ? userId : 4;
  const matched = mockNotifications.filter((n) => n.user_id === numericId);
  return matched.length ? matched : DEMO_DRIVER_NOTIFICATIONS;
}

export function mergeProfileOverview(live: ProfileOverview): ProfileOverview {
  if (!USE_SAMPLE_FALLBACK) return live;
  if (live.activity.length > 0) return live;
  const now = new Date().toISOString();
  return {
    ...live,
    activity: [
      {
        action: 'Signed in to CamTraffic',
        time: now,
        time_label: 'Recently',
        type: 'system',
        color: '#2563EB',
      },
      {
        action: 'AI detected Stop Sign (M-032) — 98.9% confidence',
        time: now,
        time_label: 'Recently',
        type: 'detection',
        color: '#7C3AED',
      },
      {
        action: 'Viewed outstanding fines ($155 USD pending)',
        time: now,
        time_label: 'Recently',
        type: 'fine',
        color: '#E11D48',
      },
      {
        action: 'Registered vehicle Toyota Hilux (2AK 7788)',
        time: now,
        time_label: 'Recently',
        type: 'system',
        color: '#059669',
      },
      {
        action: 'Browsed traffic sign catalog (10 Cambodia signs)',
        time: now,
        time_label: 'Recently',
        type: 'system',
        color: '#0891B2',
      },
    ],
    sessions: live.sessions.length ? live.sessions : [{
      device: 'Chrome · Windows',
      location: 'Current device',
      ip_masked: '203.144.x.x',
      time_label: 'Just now',
      current: true,
    }],
    login_history: live.login_history.length ? live.login_history : [{
      status: 'success',
      device: 'Chrome · Windows',
      ip_masked: '203.144.x.x',
      time: now,
      time_label: 'Just now',
    }],
  };
}

export function mergePageStats(stats: AIDetectionPageStats): AIDetectionPageStats {
  return mergePageStatsWithDefaults(stats);
}

export function sampleUsers(): User[] {
  return mockUsers;
}

/** Live API users plus demo catalog entries (deduped by email) for a fuller admin table. */
export function mergeUsersWithSamples(live: User[]): User[] {
  const seen = new Set(live.map((u) => u.email.trim().toLowerCase()));
  const merged: User[] = [...live];
  for (const sample of mockUsers) {
    const key = sample.email.trim().toLowerCase();
    if (seen.has(key)) continue;
    merged.push(sample);
    seen.add(key);
  }
  return merged.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function sampleRoads(): Road[] {
  return mockRoads;
}

export function sampleCameras(): Camera[] {
  return mockCameras;
}

export function sampleAiLogs(): AIDetectionLog[] {
  return mockAILogs;
}

export function sampleFines(): Fine[] {
  return mockFines;
}

export function sampleVehicles(): Vehicle[] {
  return mockVehicles;
}
