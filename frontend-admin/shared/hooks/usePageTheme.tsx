import type { ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Camera,
  Cctv,
  Car,
  FileText,
  Shield,
  User,
  Users,
} from 'lucide-react';
import { useLocation } from 'react-router';
import { useLanguage } from '@shared/context/LanguageContext';

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

export function usePageTheme(): PageThemeConfig {
  const { t } = useLanguage();
  const location = useLocation();
  const themeKey = location.pathname.startsWith('/admin')
    ? location.pathname.replace('/admin', '/dashboard')
    : location.pathname;
  const cfg = THEME_MAP[themeKey] ?? THEME_MAP['/dashboard'];

  return {
    crumb: cfg.crumbKeys.map((k) => t(k)),
    label: t(cfg.labelKey),
    icon: cfg.icon,
    color: cfg.color,
    gradient: cfg.gradient,
  };
}
