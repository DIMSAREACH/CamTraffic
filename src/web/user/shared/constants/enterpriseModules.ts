/**
 * Enterprise sidebar modules — Traffic Operations (/officer) + Citizen (/citizen).
 */

import type { UserRole } from '@shared/types';
import {
  CITIZEN_PORTAL_ROUTES,
  OFFICER_PORTAL_ROUTES,
} from '@shared/constants/userPortalPaths';

export interface EnterpriseSubNavItem {
  labelKey: string;
  path: string;
}

export interface EnterpriseModule {
  id: string;
  labelKey: string;
  path: string;
  roles: UserRole[];
  matchPrefixes: string[];
  subNav?: EnterpriseSubNavItem[];
}

export interface EnterpriseNavSection {
  id: string;
  labelKey: string;
  moduleIds: string[];
  roles: UserRole[];
  showLogout?: boolean;
}

const O = OFFICER_PORTAL_ROUTES;
const C = CITIZEN_PORTAL_ROUTES;

export const POLICE_ENTERPRISE_MODULES: EnterpriseModule[] = [
  {
    id: 'dashboard',
    labelKey: 'sidebar.modules.dashboard',
    path: O.dashboard,
    roles: ['police'],
    matchPrefixes: [O.dashboard],
  },
  {
    id: 'detection',
    labelKey: 'sidebar.modules.aiDetection',
    path: O.aiDetection,
    roles: ['police'],
    matchPrefixes: [O.aiDetectionSource, O.aiDetection, O.aiDetectionNew, O.aiLogs],
    subNav: [
      { labelKey: 'sidebar.subNav.detectionDashboard', path: O.aiDetection },
      { labelKey: 'sidebar.subNav.newDetection', path: O.aiDetectionNew },
      { labelKey: 'sidebar.subNav.detectionHistory', path: O.aiLogs },
    ],
  },
  {
    id: 'cameras',
    labelKey: 'sidebar.modules.cameras',
    path: O.cameras,
    roles: ['police'],
    matchPrefixes: [O.cameras],
  },
  {
    id: 'vehicles',
    labelKey: 'sidebar.modules.vehicles',
    path: O.unknownVehicles,
    roles: ['police'],
    matchPrefixes: [O.unknownVehicles],
  },
  {
    id: 'drivers',
    labelKey: 'sidebar.modules.drivers',
    path: O.driverSearch,
    roles: ['police'],
    matchPrefixes: [O.driverSearch],
  },
  {
    id: 'violations',
    labelKey: 'sidebar.modules.violations',
    path: O.detectionQueue,
    roles: ['police'],
    matchPrefixes: [O.detectionQueue, O.violations, O.evidence],
    subNav: [
      { labelKey: 'sidebar.subNav.detectionQueue', path: O.detectionQueue },
      { labelKey: 'sidebar.subNav.violations', path: O.violations },
      { labelKey: 'sidebar.subNav.evidenceViewer', path: O.evidence },
    ],
  },
  {
    id: 'fines',
    labelKey: 'sidebar.modules.fines',
    path: O.fines,
    roles: ['police'],
    matchPrefixes: [O.fines],
  },
  {
    id: 'appeals',
    labelKey: 'sidebar.modules.appeals',
    path: O.appeals,
    roles: ['police'],
    matchPrefixes: [O.appeals],
  },
  {
    id: 'reports',
    labelKey: 'sidebar.modules.reports',
    path: O.reports,
    roles: ['police'],
    matchPrefixes: [O.reports, O.reportsCenter, O.reportsAnalytics],
    subNav: [
      { labelKey: 'sidebar.subNav.reportsDashboard', path: O.reports },
      { labelKey: 'sidebar.subNav.reportCenter', path: O.reportsCenter },
      { labelKey: 'sidebar.subNav.reportAnalytics', path: O.reportsAnalytics },
    ],
  },
  {
    id: 'notifications',
    labelKey: 'sidebar.modules.notifications',
    path: O.notifications,
    roles: ['police'],
    matchPrefixes: [O.notifications],
  },
  {
    id: 'profile',
    labelKey: 'sidebar.modules.profile',
    path: O.profile,
    roles: ['police'],
    matchPrefixes: [O.profile],
  },
  {
    id: 'settings',
    labelKey: 'sidebar.modules.settings',
    path: O.settings,
    roles: ['police'],
    matchPrefixes: [O.settings],
  },
];

export const DRIVER_ENTERPRISE_MODULES: EnterpriseModule[] = [
  {
    id: 'dashboard',
    labelKey: 'sidebar.modules.dashboard',
    path: C.dashboard,
    roles: ['driver'],
    matchPrefixes: [C.dashboard],
  },
  {
    id: 'profile',
    labelKey: 'sidebar.modules.profile',
    path: C.profile,
    roles: ['driver'],
    matchPrefixes: [C.profile],
  },
  {
    id: 'vehicles',
    labelKey: 'sidebar.modules.myVehicles',
    path: C.vehicles,
    roles: ['driver'],
    matchPrefixes: [C.vehicles],
  },
  {
    id: 'violations',
    labelKey: 'sidebar.modules.violations',
    path: C.violations,
    roles: ['driver'],
    matchPrefixes: [C.violations],
  },
  {
    id: 'fines',
    labelKey: 'sidebar.modules.myFines',
    path: C.fines,
    roles: ['driver'],
    matchPrefixes: [C.fines],
  },
  {
    id: 'payments',
    labelKey: 'sidebar.modules.payments',
    path: C.finesPayments,
    roles: ['driver'],
    matchPrefixes: [C.finesPayments],
  },
  {
    id: 'appeals',
    labelKey: 'sidebar.modules.appeals',
    path: C.appeals,
    roles: ['driver'],
    matchPrefixes: [C.appeals],
  },
  {
    id: 'signs',
    labelKey: 'sidebar.modules.trafficSigns',
    path: C.signs,
    roles: ['driver'],
    matchPrefixes: [C.signs],
  },
  {
    id: 'traffic-rules',
    labelKey: 'sidebar.modules.trafficRules',
    path: C.trafficRules,
    roles: ['driver'],
    matchPrefixes: [C.trafficRules],
  },
  {
    id: 'notifications',
    labelKey: 'sidebar.modules.notifications',
    path: C.notifications,
    roles: ['driver'],
    matchPrefixes: [C.notifications],
  },
  {
    id: 'support',
    labelKey: 'sidebar.modules.support',
    path: C.support,
    roles: ['driver'],
    matchPrefixes: [C.support],
  },
  {
    id: 'settings',
    labelKey: 'sidebar.modules.settings',
    path: C.settings,
    roles: ['driver'],
    matchPrefixes: [C.settings],
  },
];

/** Traffic Operations sidebar sections */
export const POLICE_NAV_SECTIONS: EnterpriseNavSection[] = [
  { id: 'main', labelKey: 'sidebar.sections.main', moduleIds: ['dashboard'], roles: ['police'] },
  { id: 'ai', labelKey: 'sidebar.sections.ai', moduleIds: ['detection'], roles: ['police'] },
  { id: 'traffic', labelKey: 'sidebar.sections.traffic', moduleIds: ['cameras', 'vehicles', 'drivers'], roles: ['police'] },
  { id: 'law', labelKey: 'sidebar.sections.lawEnforcement', moduleIds: ['violations', 'fines', 'appeals'], roles: ['police'] },
  { id: 'reports', labelKey: 'sidebar.sections.reports', moduleIds: ['reports', 'notifications'], roles: ['police'] },
  { id: 'account', labelKey: 'sidebar.sections.account', moduleIds: ['profile'], roles: ['police'] },
  { id: 'system', labelKey: 'sidebar.sections.system', moduleIds: ['settings'], roles: ['police'], showLogout: true },
];

/** Citizen Service sidebar sections */
export const DRIVER_NAV_SECTIONS: EnterpriseNavSection[] = [
  { id: 'main', labelKey: 'sidebar.sections.main', moduleIds: ['dashboard'], roles: ['driver'] },
  { id: 'account', labelKey: 'sidebar.sections.myAccount', moduleIds: ['profile'], roles: ['driver'] },
  { id: 'vehicle', labelKey: 'sidebar.sections.myVehicle', moduleIds: ['vehicles'], roles: ['driver'] },
  { id: 'records', labelKey: 'sidebar.sections.myRecords', moduleIds: ['violations', 'fines', 'payments', 'appeals'], roles: ['driver'] },
  { id: 'info', labelKey: 'sidebar.sections.information', moduleIds: ['signs', 'traffic-rules', 'notifications'], roles: ['driver'] },
  { id: 'support', labelKey: 'sidebar.sections.support', moduleIds: ['support'], roles: ['driver'] },
  { id: 'system', labelKey: 'sidebar.sections.system', moduleIds: ['settings'], roles: ['driver'], showLogout: true },
];

export function getEnterpriseModulesForRole(role: UserRole): EnterpriseModule[] {
  if (role === 'police') return POLICE_ENTERPRISE_MODULES;
  if (role === 'driver') return DRIVER_ENTERPRISE_MODULES;
  return [];
}

export function getNavSectionsForRole(role: UserRole): EnterpriseNavSection[] {
  if (role === 'police') return POLICE_NAV_SECTIONS;
  if (role === 'driver') return DRIVER_NAV_SECTIONS;
  return [];
}

export function getUserModuleById(id: string, role?: UserRole): EnterpriseModule | undefined {
  if (role === 'police' || role === 'driver') {
    return getEnterpriseModulesForRole(role).find((m) => m.id === id);
  }
  return (
    POLICE_ENTERPRISE_MODULES.find((m) => m.id === id)
    ?? DRIVER_ENTERPRISE_MODULES.find((m) => m.id === id)
  );
}

export function resolveUserEnterpriseModule(pathname: string, role: UserRole): EnterpriseModule | null {
  const modules = getEnterpriseModulesForRole(role);
  // Prefer the most specific module (longest matching prefix) so `/dashboard` does not
  // swallow every nested route and hide module sub-nav (Evidence, Detection, Reports).
  let best: EnterpriseModule | null = null;
  let bestLen = -1;
  for (const mod of modules) {
    for (const prefix of mod.matchPrefixes) {
      const exactDashboard = mod.id === 'dashboard' && pathname === prefix;
      const match = exactDashboard
        || (mod.id !== 'dashboard' && (pathname === prefix || pathname.startsWith(`${prefix}/`)));
      if (!match) continue;
      if (prefix.length > bestLen) {
        best = mod;
        bestLen = prefix.length;
      }
    }
  }
  return best;
}

export function isUserModuleActive(pathname: string, mod: EnterpriseModule): boolean {
  if (mod.id === 'dashboard') return pathname === mod.path;
  return mod.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
