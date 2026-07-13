export const USER_PORTAL_BASE = '/dashboard';

/** Canonical user-portal paths (officer + driver). */
export const USER_PORTAL_ROUTES = {
  dashboard: USER_PORTAL_BASE,
  aiDetection: `${USER_PORTAL_BASE}/ai-detection`,
  aiDetectionSource: `${USER_PORTAL_BASE}/ai-detection/source`,
  cameras: `${USER_PORTAL_BASE}/cameras`,
  signs: `${USER_PORTAL_BASE}/signs`,
  fines: `${USER_PORTAL_BASE}/fines`,
  finesPayments: `${USER_PORTAL_BASE}/fines/payments`,
  violations: `${USER_PORTAL_BASE}/violations`,
  appeals: `${USER_PORTAL_BASE}/appeals`,
  vehicles: `${USER_PORTAL_BASE}/vehicles`,
  aiLogs: `${USER_PORTAL_BASE}/ai-logs`,
  evidence: `${USER_PORTAL_BASE}/evidence`,
  unknownVehicles: `${USER_PORTAL_BASE}/unknown-vehicles`,
  driverSearch: `${USER_PORTAL_BASE}/driver-search`,
  reports: `${USER_PORTAL_BASE}/reports`,
  notifications: `${USER_PORTAL_BASE}/notifications`,
  profile: `${USER_PORTAL_BASE}/profile`,
  settings: `${USER_PORTAL_BASE}/settings`,
  trafficRules: `${USER_PORTAL_BASE}/traffic-rules`,
  support: `${USER_PORTAL_BASE}/support`,
  auditLogs: `${USER_PORTAL_BASE}/audit-logs`,
} as const;
