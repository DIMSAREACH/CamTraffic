import type { ReactNode } from 'react';
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  Brain,
  Camera,
  Car,
  Cctv,
  FileText,
  Scale,
  Shield,
  ShieldAlert,
  User,
  Users,
} from 'lucide-react';
import { useLocation } from 'react-router';
import { useLanguage } from '@shared/context/LanguageContext';
import { useAuth } from '@shared/context/AuthContext';
import { resolveUserEnterpriseModule } from '@shared/constants/enterpriseModules';

type PageThemeConfig = {
  crumb: string[];
  icon: ReactNode;
  color: string;
  gradient: string;
  label: string;
};

const THEME_MAP: Record<
  string,
  Omit<PageThemeConfig, 'crumb' | 'label'> & {
    crumbKeys: string[];
    labelKey: string;
  }
> = {
  '/dashboard': {
    crumbKeys: ['pageTheme.crumbDashboard'],
    labelKey: 'pageTheme.overview',
    icon: <div className="w-2 h-2 rounded-full bg-emerald-500" />,
    color: '#16a34a',
    gradient: 'linear-gradient(90deg,#16a34a,#22c55e,#4ade80,transparent)',
  },
  '/dashboard/ai-detection': {
    crumbKeys: ['pageTheme.crumbAiSystem', 'pageTheme.crumbDetection'],
    labelKey: 'pageTheme.aiDetect',
    icon: <Camera size={13} className="text-violet-500" />,
    color: '#7c3aed',
    gradient: 'linear-gradient(90deg,#6d28d9,#7c3aed,#a78bfa,transparent)',
  },
  '/dashboard/cameras': {
    crumbKeys: ['pageTheme.crumbInfrastructure', 'pageTheme.crumbCameras'],
    labelKey: 'pageTheme.cameras',
    icon: <Cctv size={13} className="text-blue-500" />,
    color: '#2563eb',
    gradient: 'linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa,transparent)',
  },
  '/dashboard/ai-logs': {
    crumbKeys: ['pageTheme.crumbAiSystem', 'pageTheme.crumbDetectionLogs'],
    labelKey: 'pageTheme.aiLogs',
    icon: <Activity size={13} className="text-violet-500" />,
    color: '#7c3aed',
    gradient: 'linear-gradient(90deg,#6d28d9,#7c3aed,#a78bfa,transparent)',
  },
  '/dashboard/fines': {
    crumbKeys: ['pageTheme.crumbEnforcement', 'pageTheme.crumbFineManagement'],
    labelKey: 'pageTheme.fines',
    icon: <FileText size={13} className="text-red-500" />,
    color: '#dc2626',
    gradient: 'linear-gradient(90deg,#dc2626,#ef4444,#f87171,transparent)',
  },
  '/dashboard/violations': {
    crumbKeys: ['pageTheme.crumbEnforcement', 'pageTheme.crumbViolationManagement'],
    labelKey: 'pageTheme.violations',
    icon: <Shield size={13} className="text-red-600" />,
    color: '#b91c1c',
    gradient: 'linear-gradient(90deg,#991b1b,#dc2626,#f87171,transparent)',
  },
  '/dashboard/appeals': {
    crumbKeys: ['pageTheme.crumbEnforcement', 'pageTheme.crumbAppeals'],
    labelKey: 'pageTheme.appeals',
    icon: <Scale size={13} className="text-amber-600" />,
    color: '#d97706',
    gradient: 'linear-gradient(90deg,#b45309,#d97706,#fbbf24,transparent)',
  },
  '/dashboard/signs': {
    crumbKeys: ['pageTheme.crumbReference', 'pageTheme.crumbTrafficSigns'],
    labelKey: 'pageTheme.signs',
    icon: <Shield size={13} className="text-cyan-600" />,
    color: '#0891b2',
    gradient: 'linear-gradient(90deg,#0891b2,#06b6d4,#22d3ee,transparent)',
  },
  '/dashboard/vehicles': {
    crumbKeys: ['pageTheme.crumbRegistry', 'pageTheme.vehicles'],
    labelKey: 'pageTheme.vehicles',
    icon: <Car size={13} className="text-emerald-600" />,
    color: '#059669',
    gradient: 'linear-gradient(90deg,#059669,#10b981,#34d399,transparent)',
  },
  '/dashboard/unknown-vehicles': {
    crumbKeys: ['pageTheme.crumbRegistry', 'pageTheme.crumbUnknownVehicles'],
    labelKey: 'pageTheme.unknownVehicles',
    icon: <Car size={13} className="text-orange-600" />,
    color: '#ea580c',
    gradient: 'linear-gradient(90deg,#c2410c,#ea580c,#fb923c,transparent)',
  },
  '/dashboard/evidence': {
    crumbKeys: ['pageTheme.crumbEnforcement', 'pageTheme.crumbEvidence'],
    labelKey: 'pageTheme.evidence',
    icon: <Archive size={13} className="text-slate-600" />,
    color: '#475569',
    gradient: 'linear-gradient(90deg,#334155,#475569,#94a3b8,transparent)',
  },
  '/dashboard/audit-logs': {
    crumbKeys: ['pageTheme.crumbAdmin', 'pageTheme.crumbAuditLogs'],
    labelKey: 'pageTheme.auditLogs',
    icon: <ShieldAlert size={13} className="text-rose-600" />,
    color: '#e11d48',
    gradient: 'linear-gradient(90deg,#be123c,#e11d48,#fb7185,transparent)',
  },
  '/dashboard/ai-models': {
    crumbKeys: ['pageTheme.crumbAiSystem', 'pageTheme.crumbAiModels'],
    labelKey: 'pageTheme.aiModels',
    icon: <Brain size={13} className="text-indigo-500" />,
    color: '#6366f1',
    gradient: 'linear-gradient(90deg,#4f46e5,#6366f1,#a5b4fc,transparent)',
  },
  '/dashboard/users': {
    crumbKeys: ['pageTheme.crumbAdmin', 'pageTheme.crumbUserManagement'],
    labelKey: 'pageTheme.users',
    icon: <Users size={13} className="text-violet-500" />,
    color: '#7c3aed',
    gradient: 'linear-gradient(90deg,#6d28d9,#7c3aed,#8b5cf6,transparent)',
  },
  '/dashboard/reports': {
    crumbKeys: ['pageTheme.crumbAnalytics', 'pageTheme.crumbReports'],
    labelKey: 'pageTheme.analytics',
    icon: <BarChart3 size={13} className="text-amber-500" />,
    color: '#d97706',
    gradient: 'linear-gradient(90deg,#d97706,#f59e0b,#fcd34d,transparent)',
  },
  '/dashboard/notifications': {
    crumbKeys: ['pageTheme.crumbAccount', 'pageTheme.crumbNotifications'],
    labelKey: 'pageTheme.alerts',
    icon: <Bell size={13} className="text-blue-500" />,
    color: '#2563eb',
    gradient: 'linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa,transparent)',
  },
  '/dashboard/profile': {
    crumbKeys: ['pageTheme.crumbAccount', 'pageTheme.crumbMyProfile'],
    labelKey: 'pageTheme.profile',
    icon: <User size={13} className="text-sky-500" />,
    color: '#0284c7',
    gradient: 'linear-gradient(90deg,#0284c7,#0ea5e9,#38bdf8,transparent)',
  },
};

const USER_MODULE_TITLE_KEYS: Record<string, string> = {
  dashboard: 'sidebar.pageTitles.dashboard',
  detection: 'sidebar.pageTitles.detection',
  cameras: 'sidebar.pageTitles.cameras',
  vehicles: 'sidebar.pageTitles.vehicles',
  drivers: 'sidebar.pageTitles.drivers',
  violations: 'sidebar.pageTitles.violations',
  fines: 'sidebar.pageTitles.fines',
  appeals: 'sidebar.pageTitles.appeals',
  reports: 'sidebar.pageTitles.reports',
  notifications: 'sidebar.pageTitles.notifications',
  profile: 'sidebar.pageTitles.profile',
  settings: 'sidebar.pageTitles.settings',
  payments: 'sidebar.pageTitles.payments',
  signs: 'sidebar.pageTitles.trafficSigns',
  'traffic-rules': 'sidebar.pageTitles.trafficRules',
  support: 'sidebar.pageTitles.support',
};

function getModuleTitleKey(modId: string, role?: string): string | null {
  if (modId === 'fines' && role === 'driver') return 'sidebar.pageTitles.myFines';
  if (modId === 'vehicles' && role === 'driver') return 'sidebar.pageTitles.myVehicles';
  return USER_MODULE_TITLE_KEYS[modId] ?? null;
}

export function usePageTheme(): PageThemeConfig {
  const { t } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const themeKey = location.pathname.startsWith('/admin')
    ? location.pathname.replace('/admin', '/dashboard')
    : location.pathname;
  const cfg = THEME_MAP[themeKey] ?? THEME_MAP['/dashboard'];
  const userMod = user ? resolveUserEnterpriseModule(location.pathname, user.role) : null;
  const titleKey = userMod ? getModuleTitleKey(userMod.id, user?.role) : null;

  return {
    crumb: cfg.crumbKeys.map((k) => t(k)),
    label: titleKey ? t(titleKey) : t(cfg.labelKey),
    icon: cfg.icon,
    color: cfg.color,
    gradient: cfg.gradient,
  };
}
