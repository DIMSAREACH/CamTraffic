/**
 * Enterprise sidebar modules — user portal (officer + driver).
 */

import type { UserRole } from '@shared/types';
import { USER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';

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

const R = USER_PORTAL_ROUTES;

export const POLICE_ENTERPRISE_MODULES: EnterpriseModule[] = [
  {
    id: 'dashboard',
    labelKey: 'sidebar.modules.dashboard',
    path: R.dashboard,
    roles: ['police'],
    matchPrefixes: [R.dashboard],
  },
  {
    id: 'detection',
    labelKey: 'sidebar.modules.aiDetection',
    path: R.aiDetectionSource,
    roles: ['police'],
    matchPrefixes: [R.aiDetectionSource, R.aiDetection, R.aiLogs],
    subNav: [
      { labelKey: 'sidebar.subNav.detectionSource', path: R.aiDetectionSource },
      { labelKey: 'sidebar.subNav.liveDetection', path: R.aiDetection },
      { labelKey: 'sidebar.subNav.detectionHistory', path: R.aiLogs },
    ],
  },
  {
    id: 'cameras',
    labelKey: 'sidebar.modules.cameras',
    path: R.cameras,
    roles: ['police'],
    matchPrefixes: [R.cameras],
  },
  {
    id: 'vehicles',
    labelKey: 'sidebar.modules.vehicles',
    path: R.unknownVehicles,
    roles: ['police'],
    matchPrefixes: [R.unknownVehicles],
  },
  {
    id: 'drivers',
    labelKey: 'sidebar.modules.drivers',
    path: R.driverSearch,
    roles: ['police'],
    matchPrefixes: [R.driverSearch],
  },
  {
    id: 'violations',
    labelKey: 'sidebar.modules.violations',
    path: R.violations,
    roles: ['police'],
    matchPrefixes: [R.violations, R.evidence],
    subNav: [
      { labelKey: 'sidebar.subNav.violations', path: R.violations },
      { labelKey: 'sidebar.subNav.evidenceViewer', path: R.evidence },
    ],
  },
  {
    id: 'fines',
    labelKey: 'sidebar.modules.fines',
    path: R.fines,
    roles: ['police'],
    matchPrefixes: [R.fines],
  },
  {
    id: 'appeals',
    labelKey: 'sidebar.modules.appeals',
    path: R.appeals,
    roles: ['police'],
    matchPrefixes: [R.appeals],
  },
  {
    id: 'reports',
    labelKey: 'sidebar.modules.reports',
    path: R.reports,
    roles: ['police'],
    matchPrefixes: [R.reports],
  },
  {
    id: 'notifications',
    labelKey: 'sidebar.modules.notifications',
    path: R.notifications,
    roles: ['police'],
    matchPrefixes: [R.notifications],
  },
  {
    id: 'profile',
    labelKey: 'sidebar.modules.profile',
    path: R.profile,
    roles: ['police'],
    matchPrefixes: [R.profile],
  },
  {
    id: 'settings',
    labelKey: 'sidebar.modules.settings',
    path: R.settings,
    roles: ['police'],
    matchPrefixes: [R.settings],
  },
];

export const DRIVER_ENTERPRISE_MODULES: EnterpriseModule[] = [
  {
    id: 'dashboard',
    labelKey: 'sidebar.modules.dashboard',
    path: R.dashboard,
    roles: ['driver'],
    matchPrefixes: [R.dashboard],
  },
  {
    id: 'profile',
    labelKey: 'sidebar.modules.profile',
    path: R.profile,
    roles: ['driver'],
    matchPrefixes: [R.profile],
  },
  {
    id: 'vehicles',
    labelKey: 'sidebar.modules.myVehicles',
    path: R.vehicles,
    roles: ['driver'],
    matchPrefixes: [R.vehicles],
  },
  {
    id: 'violations',
    labelKey: 'sidebar.modules.violations',
    path: R.violations,
    roles: ['driver'],
    matchPrefixes: [R.violations],
  },
  {
    id: 'fines',
    labelKey: 'sidebar.modules.myFines',
    path: R.fines,
    roles: ['driver'],
    matchPrefixes: [R.fines],
  },
  {
    id: 'payments',
    labelKey: 'sidebar.modules.payments',
    path: R.finesPayments,
    roles: ['driver'],
    matchPrefixes: [R.finesPayments],
  },
  {
    id: 'appeals',
    labelKey: 'sidebar.modules.appeals',
    path: R.appeals,
    roles: ['driver'],
    matchPrefixes: [R.appeals],
  },
  {
    id: 'signs',
    labelKey: 'sidebar.modules.trafficSigns',
    path: R.signs,
    roles: ['driver'],
    matchPrefixes: [R.signs],
  },
  {
    id: 'traffic-rules',
    labelKey: 'sidebar.modules.trafficRules',
    path: R.trafficRules,
    roles: ['driver'],
    matchPrefixes: [R.trafficRules],
  },
  {
    id: 'notifications',
    labelKey: 'sidebar.modules.notifications',
    path: R.notifications,
    roles: ['driver'],
    matchPrefixes: [R.notifications],
  },
  {
    id: 'support',
    labelKey: 'sidebar.modules.support',
    path: R.support,
    roles: ['driver'],
    matchPrefixes: [R.support],
  },
  {
    id: 'settings',
    labelKey: 'sidebar.modules.settings',
    path: R.settings,
    roles: ['driver'],
    matchPrefixes: [R.settings],
  },
];

export const POLICE_NAV_SECTIONS: EnterpriseNavSection[] = [
  { id: 'main', labelKey: 'sidebar.sections.main', moduleIds: ['dashboard'], roles: ['police'] },
  { id: 'ai', labelKey: 'sidebar.sections.ai', moduleIds: ['detection'], roles: ['police'] },
  { id: 'traffic', labelKey: 'sidebar.sections.traffic', moduleIds: ['cameras', 'vehicles', 'drivers'], roles: ['police'] },
  { id: 'law', labelKey: 'sidebar.sections.lawEnforcement', moduleIds: ['violations', 'fines', 'appeals'], roles: ['police'] },
  { id: 'reports', labelKey: 'sidebar.sections.reports', moduleIds: ['reports', 'notifications'], roles: ['police'] },
  { id: 'account', labelKey: 'sidebar.sections.account', moduleIds: ['profile'], roles: ['police'] },
  { id: 'system', labelKey: 'sidebar.sections.system', moduleIds: ['settings'], roles: ['police'], showLogout: true },
];

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

const USER_MODULE_MAP = new Map(
  [...POLICE_ENTERPRISE_MODULES, ...DRIVER_ENTERPRISE_MODULES].map((m) => [m.id, m]),
);

export function getUserModuleById(id: string): EnterpriseModule | undefined {
  return USER_MODULE_MAP.get(id);
}

export function resolveUserEnterpriseModule(pathname: string, role: UserRole): EnterpriseModule | null {
  const modules = getEnterpriseModulesForRole(role);
  for (const mod of modules) {
    if (mod.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return mod;
    }
  }
  return null;
}

export function isUserModuleActive(pathname: string, mod: EnterpriseModule): boolean {
  if (mod.id === 'dashboard') return pathname === mod.path;
  return mod.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
