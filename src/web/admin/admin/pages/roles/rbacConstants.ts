import {
  Shield, KeyRound, Car, BadgeCheck, FileText, AlertTriangle, BarChart3,
  Camera, Sparkles, Scale, Settings, Lock, LayoutDashboard, Bell, Users,
  type LucideIcon,
} from 'lucide-react';

export type RolesTab =
  | 'overview'
  | 'roles'
  | 'matrix'
  | 'assignment'
  | 'activity';

export const MATRIX_ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'export',
  'import',
  'approve',
  'manage',
] as const;

export type MatrixAction = (typeof MATRIX_ACTIONS)[number];

export const SYSTEM_ROLES = new Set(['admin', 'police', 'driver', 'officer']);

export const ROLE_META: Record<string, { icon: LucideIcon; color: string; bg: string; gradient: string }> = {
  admin: { icon: Shield, color: '#4F46E5', bg: 'rgba(79,70,229,0.14)', gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)' },
  police: { icon: BadgeCheck, color: '#2563EB', bg: 'rgba(37,99,235,0.14)', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
  officer: { icon: BadgeCheck, color: '#2563EB', bg: 'rgba(37,99,235,0.14)', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
  driver: { icon: Car, color: '#0891B2', bg: 'rgba(6,182,212,0.14)', gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
};

export const RESOURCE_PALETTE: Record<string, { accent: string; soft: string; border: string; gradient: string; icon: LucideIcon }> = {
  dashboard: { accent: '#7C3AED', soft: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.22)', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.16), rgba(124,58,237,0.06))', icon: LayoutDashboard },
  users: { accent: '#7C3AED', soft: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.22)', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.16), rgba(124,58,237,0.06))', icon: Users },
  signs: { accent: '#2563EB', soft: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.22)', gradient: 'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(29,78,216,0.06))', icon: FileText },
  fines: { accent: '#DC2626', soft: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.22)', gradient: 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(220,38,38,0.05))', icon: Scale },
  vehicles: { accent: '#0891B2', soft: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.22)', gradient: 'linear-gradient(135deg, rgba(6,182,212,0.16), rgba(8,145,178,0.06))', icon: Car },
  violations: { accent: '#D97706', soft: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.24)', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(217,119,6,0.06))', icon: AlertTriangle },
  infrastructure: { accent: '#475569', soft: 'rgba(100,116,139,0.14)', border: 'rgba(100,116,139,0.22)', gradient: 'linear-gradient(135deg, rgba(100,116,139,0.14), rgba(71,85,105,0.05))', icon: Camera },
  cameras: { accent: '#475569', soft: 'rgba(100,116,139,0.14)', border: 'rgba(100,116,139,0.22)', gradient: 'linear-gradient(135deg, rgba(100,116,139,0.14), rgba(71,85,105,0.05))', icon: Camera },
  reports: { accent: '#059669', soft: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.22)', gradient: 'linear-gradient(135deg, rgba(16,185,129,0.16), rgba(5,150,105,0.06))', icon: BarChart3 },
  auth: { accent: '#DB2777', soft: 'rgba(219,39,119,0.12)', border: 'rgba(219,39,119,0.22)', gradient: 'linear-gradient(135deg, rgba(219,39,119,0.14), rgba(190,24,93,0.05))', icon: Lock },
  appeals: { accent: '#6366F1', soft: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.22)', gradient: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(79,70,229,0.06))', icon: Scale },
  audit: { accent: '#0EA5E9', soft: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.22)', gradient: 'linear-gradient(135deg, rgba(14,165,233,0.14), rgba(2,132,199,0.05))', icon: Settings },
  ai: { accent: '#8B5CF6', soft: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.22)', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.16), rgba(124,58,237,0.06))', icon: Sparkles },
  notifications: { accent: '#F59E0B', soft: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.22)', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(217,119,6,0.05))', icon: Bell },
  roles: { accent: '#7C3AED', soft: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.22)', gradient: 'linear-gradient(135deg, rgba(124,58,237,0.14), rgba(124,58,237,0.04))', icon: KeyRound },
  settings: { accent: '#64748B', soft: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.22)', gradient: 'linear-gradient(135deg, rgba(100,116,139,0.14), rgba(71,85,105,0.04))', icon: Settings },
};

export const FALLBACK_RESOURCE_PALETTE = [
  { accent: '#7C3AED', soft: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.22)', gradient: 'linear-gradient(135deg, rgba(124,58,237,0.14), rgba(124,58,237,0.04))', icon: KeyRound },
  { accent: '#2563EB', soft: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.22)', gradient: 'linear-gradient(135deg, rgba(37,99,235,0.14), rgba(37,99,235,0.04))', icon: KeyRound },
  { accent: '#059669', soft: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.22)', gradient: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.04))', icon: KeyRound },
];

export const CHART_COLORS = ['#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DC2626'];

/** Map app User.role values onto RBAC role names for assignment UI. */
export function userRoleMatchesRbac(userRole: string, rbacRoleName: string): boolean {
  const u = userRole.toLowerCase();
  const r = rbacRoleName.toLowerCase();
  if (u === r) return true;
  if ((r === 'officer' || r === 'police') && (u === 'police' || u === 'officer')) return true;
  return false;
}

export function normalizeAction(action: string): MatrixAction | string {
  const key = action.toLowerCase();
  if (key === 'update' || key === 'write') return 'edit';
  if (key === 'read') return 'view';
  if (key === 'remove') return 'delete';
  return key;
}
