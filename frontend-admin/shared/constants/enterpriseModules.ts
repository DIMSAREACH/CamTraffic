/**
 * Enterprise sidebar modules — admin portal.
 * Categorized sections; sub-pages use EnterpriseModuleSubNav.
 */

export interface EnterpriseSubNavItem {
  labelKey: string;
  path: string;
}

export interface EnterpriseModule {
  id: string;
  labelKey: string;
  path: string;
  matchPrefixes: string[];
  subNav?: EnterpriseSubNavItem[];
}

export interface EnterpriseNavSection {
  id: string;
  labelKey: string;
  moduleIds: string[];
  /** Show logout link after module items (SYSTEM section). */
  showLogout?: boolean;
}

const ADMIN_BASE = '/admin';

export const ADMIN_ENTERPRISE_MODULES: EnterpriseModule[] = [
  {
    id: 'dashboard',
    labelKey: 'sidebar.modules.dashboard',
    path: `${ADMIN_BASE}/dashboard`,
    matchPrefixes: [`${ADMIN_BASE}/dashboard`],
  },
  {
    id: 'ai-detection',
    labelKey: 'sidebar.modules.aiDetection',
    path: `${ADMIN_BASE}/ai-detection`,
    matchPrefixes: [`${ADMIN_BASE}/ai-detection`, `${ADMIN_BASE}/ai-logs`],
    subNav: [
      { labelKey: 'sidebar.subNav.detectionDashboard', path: `${ADMIN_BASE}/ai-detection` },
      { labelKey: 'sidebar.subNav.newDetection', path: `${ADMIN_BASE}/ai-detection/new` },
      { labelKey: 'sidebar.subNav.detectionHistory', path: `${ADMIN_BASE}/ai-logs` },
    ],
  },
  {
    id: 'ai-models',
    labelKey: 'sidebar.modules.aiModels',
    path: `${ADMIN_BASE}/ai-models`,
    matchPrefixes: [`${ADMIN_BASE}/ai-models`, `${ADMIN_BASE}/ai-dashboard`, `${ADMIN_BASE}/ai-training`],
    subNav: [
      { labelKey: 'sidebar.subNav.aiOverview', path: `${ADMIN_BASE}/ai-models` },
      { labelKey: 'sidebar.subNav.modelRegistry', path: `${ADMIN_BASE}/ai-models/list` },
      { labelKey: 'sidebar.subNav.aiTraining', path: `${ADMIN_BASE}/ai-models/train` },
      { labelKey: 'sidebar.subNav.aiDatasets', path: `${ADMIN_BASE}/ai-models/datasets` },
      { labelKey: 'sidebar.subNav.aiDeployments', path: `${ADMIN_BASE}/ai-models/deployments` },
      { labelKey: 'sidebar.subNav.aiHistory', path: `${ADMIN_BASE}/ai-models/history` },
    ],
  },
  {
    id: 'traffic-signs',
    labelKey: 'sidebar.modules.trafficSigns',
    path: `${ADMIN_BASE}/signs`,
    matchPrefixes: [`${ADMIN_BASE}/signs`],
  },
  {
    id: 'cameras',
    labelKey: 'sidebar.modules.cameras',
    path: `${ADMIN_BASE}/cameras`,
    matchPrefixes: [`${ADMIN_BASE}/cameras`, `${ADMIN_BASE}/camera-locations`],
    subNav: [
      { labelKey: 'sidebar.subNav.cameraDashboard', path: `${ADMIN_BASE}/cameras` },
      { labelKey: 'sidebar.subNav.cameraLocations', path: `${ADMIN_BASE}/camera-locations` },
    ],
  },
  {
    id: 'roads',
    labelKey: 'sidebar.modules.roads',
    path: `${ADMIN_BASE}/roads`,
    matchPrefixes: [`${ADMIN_BASE}/roads`],
  },
  {
    id: 'vehicles',
    labelKey: 'sidebar.modules.vehicles',
    path: `${ADMIN_BASE}/vehicles`,
    matchPrefixes: [`${ADMIN_BASE}/vehicles`, `${ADMIN_BASE}/vehicle-owners`, `${ADMIN_BASE}/unknown-vehicles`],
    subNav: [
      { labelKey: 'sidebar.subNav.vehicleList', path: `${ADMIN_BASE}/vehicles` },
      { labelKey: 'sidebar.subNav.vehicleOwners', path: `${ADMIN_BASE}/vehicle-owners` },
      { labelKey: 'sidebar.subNav.unknownVehicles', path: `${ADMIN_BASE}/unknown-vehicles` },
    ],
  },
  {
    id: 'drivers',
    labelKey: 'sidebar.modules.drivers',
    path: `${ADMIN_BASE}/drivers`,
    matchPrefixes: [`${ADMIN_BASE}/drivers`],
  },
  {
    id: 'violations',
    labelKey: 'sidebar.modules.violations',
    path: `${ADMIN_BASE}/violations`,
    matchPrefixes: [`${ADMIN_BASE}/violations`, `${ADMIN_BASE}/evidence`],
    subNav: [
      { labelKey: 'sidebar.subNav.violations', path: `${ADMIN_BASE}/violations` },
      { labelKey: 'sidebar.subNav.evidenceViewer', path: `${ADMIN_BASE}/evidence` },
    ],
  },
  {
    id: 'fines',
    labelKey: 'sidebar.modules.fines',
    path: `${ADMIN_BASE}/fines`,
    matchPrefixes: [`${ADMIN_BASE}/fines`],
  },
  {
    id: 'appeals',
    labelKey: 'sidebar.modules.appeals',
    path: `${ADMIN_BASE}/appeals`,
    matchPrefixes: [`${ADMIN_BASE}/appeals`],
  },
  {
    id: 'officers',
    labelKey: 'sidebar.modules.officers',
    path: `${ADMIN_BASE}/officers`,
    matchPrefixes: [`${ADMIN_BASE}/officers`],
  },
  {
    id: 'users',
    labelKey: 'sidebar.modules.users',
    path: `${ADMIN_BASE}/users`,
    matchPrefixes: [`${ADMIN_BASE}/users`],
  },
  {
    id: 'roles',
    labelKey: 'sidebar.modules.roles',
    path: `${ADMIN_BASE}/roles`,
    matchPrefixes: [`${ADMIN_BASE}/roles`],
  },
  {
    id: 'reports',
    labelKey: 'sidebar.modules.reports',
    path: `${ADMIN_BASE}/reports`,
    matchPrefixes: [`${ADMIN_BASE}/reports`, `${ADMIN_BASE}/analytics`],
    subNav: [
      { labelKey: 'sidebar.subNav.reportsDashboard', path: `${ADMIN_BASE}/reports` },
      { labelKey: 'sidebar.subNav.reportCenter', path: `${ADMIN_BASE}/reports/center` },
      { labelKey: 'sidebar.subNav.reportAnalytics', path: `${ADMIN_BASE}/reports/analytics` },
      { labelKey: 'sidebar.subNav.scheduledReports', path: `${ADMIN_BASE}/reports/scheduled` },
    ],
  },
  {
    id: 'notifications',
    labelKey: 'sidebar.modules.notifications',
    path: `${ADMIN_BASE}/notifications`,
    matchPrefixes: [`${ADMIN_BASE}/notifications`],
    subNav: [
      { labelKey: 'sidebar.subNav.notifDashboard', path: `${ADMIN_BASE}/notifications` },
      { labelKey: 'sidebar.subNav.notifList', path: `${ADMIN_BASE}/notifications/list` },
      { labelKey: 'sidebar.subNav.notifSend', path: `${ADMIN_BASE}/notifications/send` },
      { labelKey: 'sidebar.subNav.notifScheduled', path: `${ADMIN_BASE}/notifications/scheduled` },
      { labelKey: 'sidebar.subNav.notifTemplates', path: `${ADMIN_BASE}/notifications/templates` },
    ],
  },
  {
    id: 'audit',
    labelKey: 'sidebar.modules.auditLogs',
    path: `${ADMIN_BASE}/audit-logs`,
    matchPrefixes: [`${ADMIN_BASE}/audit-logs`],
  },
  {
    id: 'profile',
    labelKey: 'sidebar.modules.profile',
    path: `${ADMIN_BASE}/profile`,
    matchPrefixes: [`${ADMIN_BASE}/profile`],
  },
  {
    id: 'settings',
    labelKey: 'sidebar.modules.settings',
    path: `${ADMIN_BASE}/settings`,
    matchPrefixes: [`${ADMIN_BASE}/settings`, `${ADMIN_BASE}/backup-restore`],
    subNav: [
      { labelKey: 'sidebar.subNav.generalSettings', path: `${ADMIN_BASE}/settings` },
      { labelKey: 'sidebar.subNav.backupRestore', path: `${ADMIN_BASE}/backup-restore` },
      { labelKey: 'sidebar.modules.auditLogs', path: `${ADMIN_BASE}/audit-logs` },
    ],
  },
];

/** Categorized admin sidebar layout. */
export const ADMIN_NAV_SECTIONS: EnterpriseNavSection[] = [
  { id: 'main', labelKey: 'sidebar.sections.main', moduleIds: ['dashboard'] },
  { id: 'ai', labelKey: 'sidebar.sections.ai', moduleIds: ['ai-detection', 'ai-models'] },
  { id: 'traffic', labelKey: 'sidebar.sections.traffic', moduleIds: ['traffic-signs', 'cameras', 'roads'] },
  { id: 'vehicles', labelKey: 'sidebar.sections.vehicles', moduleIds: ['vehicles', 'drivers'] },
  { id: 'law', labelKey: 'sidebar.sections.lawEnforcement', moduleIds: ['violations', 'fines', 'appeals'] },
  { id: 'users', labelKey: 'sidebar.sections.userManagement', moduleIds: ['officers', 'users', 'roles'] },
  { id: 'reports', labelKey: 'sidebar.sections.reports', moduleIds: ['reports', 'notifications', 'audit'] },
  { id: 'account', labelKey: 'sidebar.sections.account', moduleIds: ['profile'] },
  { id: 'system', labelKey: 'sidebar.sections.system', moduleIds: ['settings'], showLogout: true },
];

const ADMIN_MODULE_MAP = new Map(ADMIN_ENTERPRISE_MODULES.map((m) => [m.id, m]));

export function getAdminModuleById(id: string): EnterpriseModule | undefined {
  return ADMIN_MODULE_MAP.get(id);
}

export function resolveAdminEnterpriseModule(pathname: string): EnterpriseModule | null {
  for (const mod of ADMIN_ENTERPRISE_MODULES) {
    if (mod.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return mod;
    }
  }
  return null;
}

export function isAdminModuleActive(pathname: string, mod: EnterpriseModule): boolean {
  if (mod.id === 'dashboard') return pathname === mod.path;
  return mod.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
