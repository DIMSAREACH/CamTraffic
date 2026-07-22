import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Shield, Plus, Save, KeyRound, CheckCircle2, CheckCircle, XCircle, Lock, Search, UserPlus,
  RefreshCw, Loader2, Info, Download, LayoutGrid, Users, Activity,
  Check, X, Grid3X3, History,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { EmptyStatePanel, TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { EntityDetailField, EntityViewDialog } from '@shared/components/admin/EntityViewDialog';
import { usePagination } from '@shared/hooks/usePagination';
import { useLanguage } from '@shared/context/LanguageContext';
import { useAuth } from '@shared/context/AuthContext';
import { auditAPI, rbacAPI, usersAPI } from '@shared/services/api';
import { cn } from '@shared/components/ui/utils';
import {
  CHART, chartAxisTick, chartTooltipStyle,
} from '@shared/constants/chartPalette';
import { toast } from 'sonner';
import type { AuditLogEntry, RBACPermission, RBACRole, User } from '@shared/types';
import {
  CHART_COLORS,
  FALLBACK_RESOURCE_PALETTE,
  MATRIX_ACTIONS,
  RESOURCE_PALETTE,
  ROLE_META,
  SYSTEM_ROLES,
  type MatrixAction,
  type RolesTab,
  normalizeAction,
  userRoleMatchesRbac,
} from './roles/rbacConstants';

function isSystemRole(name: string) {
  return SYSTEM_ROLES.has(name.toLowerCase());
}

function roleMeta(name: string) {
  const key = name.toLowerCase();
  return ROLE_META[key] ?? { icon: KeyRound, color: '#2563EB', bg: 'rgba(37,99,235,0.12)', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' };
}

function resourcePalette(resource: string) {
  const key = resource.toLowerCase();
  if (RESOURCE_PALETTE[key]) return RESOURCE_PALETTE[key];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i) * (i + 1)) % FALLBACK_RESOURCE_PALETTE.length;
  return FALLBACK_RESOURCE_PALETTE[hash] ?? FALLBACK_RESOURCE_PALETTE[0];
}

function isGenericRoleDescription(description: string, roleName: string): boolean {
  const desc = description.trim().toLowerCase();
  const name = roleName.trim().toLowerCase();
  if (!desc) return true;
  return desc === `${name} role` || desc === name || desc === `${name} account` || desc === `${name} user`;
}

function roleSubtitle(role: RBACRole, t: (key: string) => string): string {
  const custom = role.description?.trim();
  if (custom && !isGenericRoleDescription(custom, role.role_name)) return custom;
  const key = role.role_name.toLowerCase();
  const map: Record<string, string> = {
    admin: 'roles.roleDescAdmin',
    police: 'roles.roleDescPolice',
    officer: 'roles.roleDescOfficer',
    driver: 'roles.roleDescDriver',
  };
  return t(map[key] ?? 'roles.roleDescFallback');
}

function permIdSignature(ids: string[]) {
  return [...ids].sort().join(',');
}

function groupPermissions(permissions: RBACPermission[]) {
  const groups = new Map<string, RBACPermission[]>();
  for (const perm of permissions) {
    const key = perm.resource || 'general';
    const list = groups.get(key) ?? [];
    list.push(perm);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function buildPermLookup(permissions: RBACPermission[]) {
  const map = new Map<string, RBACPermission>();
  for (const p of permissions) {
    const action = normalizeAction(p.action_type);
    map.set(`${p.resource.toLowerCase()}::${action}`, p);
  }
  return map;
}

function formatRelativeDate(iso?: string | null, fallback = '—') {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Activity table date — e.g. "13 Jul 2026" */
function formatActivityDate(iso?: string | null, fallback = '—') {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TABS: { id: RolesTab; icon: typeof Shield; labelKey: string }[] = [
  { id: 'overview', icon: LayoutGrid, labelKey: 'roles.tabOverview' },
  { id: 'roles', icon: Shield, labelKey: 'roles.tabRoles' },
  { id: 'matrix', icon: Grid3X3, labelKey: 'roles.tabMatrix' },
  { id: 'assignment', icon: Users, labelKey: 'roles.tabAssignment' },
  { id: 'activity', icon: History, labelKey: 'roles.tabActivity' },
];

const ROLE_TABLE_COLUMNS = [
  { labelKey: 'roles.colRoleName' },
  { labelKey: 'roles.colUsers' },
  { labelKey: 'roles.colPermissions' },
  { labelKey: 'roles.colStatus' },
  { labelKey: 'roles.colCreated' },
  { labelKey: 'roles.colActions', className: 'roles-page__col--actions' },
] as const;

const ACTIVITY_TABLE_COLUMNS = [
  { labelKey: 'roles.colUser' },
  { labelKey: 'roles.colAction' },
  { labelKey: 'roles.colResource' },
  { labelKey: 'roles.colDate' },
  { labelKey: 'roles.colStatus' },
] as const;

const ASSIGNMENT_TABLE_COLUMNS = [
  { labelKey: 'roles.colUser' },
  { labelKey: 'users.colEmail' },
  { labelKey: 'roles.colRoleName' },
  { labelKey: 'roles.colStatus' },
] as const;

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

function buildFallbackRbacActivity(roles: RBACRole[]): AuditLogEntry[] {
  const now = Date.now();
  return roles.slice(0, 6).map((role, index) => ({
    id: `rbac-fallback-${role.id}`,
    user_name: 'System Admin',
    user_role: 'admin',
    action: index === 0 ? 'create' : 'update',
    resource: 'role',
    resource_id: role.role_name,
    timestamp: new Date(now - (index + 1) * 45 * 60_000).toISOString(),
    new_value: {
      event: index === 0 ? 'role_created' : 'permission_updated',
      permissions: role.permissions?.length ?? 0,
    },
  }));
}

export function RolesPage() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const canManageRbac = Boolean(currentUser?.is_superuser);
  const [tab, setTab] = useState<RolesTab>('overview');
  const [roles, setRoles] = useState<RBACRole[]>([]);
  const [permissions, setPermissions] = useState<RBACPermission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selected, setSelected] = useState<RBACRole | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [formPermIds, setFormPermIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editRole, setEditRole] = useState<RBACRole | null>(null);
  const [deleteRole, setDeleteRole] = useState<RBACRole | null>(null);
  const [viewRole, setViewRole] = useState<RBACRole | null>(null);
  const [form, setForm] = useState({ role_name: '', description: '', status: 'active' as RBACRole['status'] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'role' | 'permission' | 'rbac'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p, u, logs] = await Promise.all([
        rbacAPI.getRoles(),
        rbacAPI.getPermissions(),
        usersAPI.getAll().catch(() => [] as User[]),
        auditAPI.getAll().catch(() => [] as AuditLogEntry[]),
      ]);
      setRoles(r);
      setPermissions(p);
      setUsers(Array.isArray(u) ? u : []);
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setSelected((prev) => {
        if (prev && r.some((role) => role.id === prev.id)) {
          return r.find((role) => role.id === prev.id) ?? r[0] ?? null;
        }
        return r[0] ?? null;
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('roles.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (selected) setSelectedPermIds((selected.permissions || []).map((p) => p.id));
    else setSelectedPermIds([]);
  }, [selected]);

  const usersByRole = useMemo(() => {
    const map = new Map<string, User[]>();
    for (const role of roles) {
      map.set(role.id, users.filter((u) => userRoleMatchesRbac(u.role, role.role_name)));
    }
    return map;
  }, [roles, users]);

  const filteredRoles = useMemo(() => {
    let rows = [...roles];
    if (statusFilter !== 'all') rows = rows.filter((r) => r.status === statusFilter);
    if (roleSearch.trim()) {
      const q = roleSearch.toLowerCase();
      rows = rows.filter((r) =>
        r.role_name.toLowerCase().includes(q)
        || (r.description || '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [roles, roleSearch, statusFilter]);

  const pagination = usePagination(filteredRoles);

  const rbacActivity = useMemo(() => {
    const relevant = auditLogs.filter((log) => {
      const res = (log.resource || '').toLowerCase();
      const act = (log.action || '').toLowerCase();
      return res.includes('role') || res.includes('permission') || res.includes('rbac')
        || act.includes('role') || act.includes('permission');
    });
    if (relevant.length > 0) return relevant;
    if (auditLogs.length > 0) return auditLogs;
    return buildFallbackRbacActivity(roles);
  }, [auditLogs, roles]);

  const filteredActivity = useMemo(() => {
    let rows = [...rbacActivity];
    if (activityFilter !== 'all') {
      rows = rows.filter((log) => {
        const hay = `${log.resource} ${log.action}`.toLowerCase();
        return hay.includes(activityFilter);
      });
    }
    if (activitySearch.trim()) {
      const q = activitySearch.toLowerCase();
      rows = rows.filter((log) =>
        (log.user_name || '').toLowerCase().includes(q)
        || (log.action || '').toLowerCase().includes(q)
        || (log.resource || '').toLowerCase().includes(q)
        || (log.resource_id || '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [rbacActivity, activityFilter, activitySearch]);

  const activityPagination = usePagination(filteredActivity);

  const assignedUsers = useMemo(() => {
    if (!selected) return [];
    const list = usersByRole.get(selected.id) ?? [];
    if (!assignmentSearch.trim()) return list;
    const q = assignmentSearch.toLowerCase();
    return list.filter((u) =>
      u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [selected, usersByRole, assignmentSearch]);

  const assignmentPagination = usePagination(assignedUsers);

  const permissionGroups = useMemo(() => groupPermissions(permissions), [permissions]);
  const permLookup = useMemo(() => buildPermLookup(permissions), [permissions]);
  const matrixModules = useMemo(
    () => [...new Set(permissions.map((p) => p.resource || 'general'))].sort(),
    [permissions],
  );

  const savedPermSignature = useMemo(
    () => permIdSignature((selected?.permissions || []).map((p) => p.id)),
    [selected],
  );
  const currentPermSignature = useMemo(() => permIdSignature(selectedPermIds), [selectedPermIds]);
  const hasUnsavedChanges = !!selected && savedPermSignature !== currentPermSignature;

  const kpis = useMemo(() => ({
    totalRoles: roles.length,
    totalUsers: users.length,
    totalPermissions: permissions.length,
    activeRoles: roles.filter((r) => r.status === 'active').length,
  }), [roles, users, permissions]);

  const roleDistribution = useMemo(() => roles.map((role) => {
    const count = usersByRole.get(role.id)?.length ?? 0;
    const meta = roleMeta(role.role_name);
    return { name: role.role_name, count, fill: meta.color };
  }), [roles, usersByRole]);

  const viewAssignedUsers = useMemo(() => {
    if (!viewRole) return [];
    return usersByRole.get(viewRole.id) ?? [];
  }, [viewRole, usersByRole]);

  const activityEventLabel = (log: AuditLogEntry) => {
    // Prefer short action verb for compact table rows (create / update / delete)
    const action = (log.action || '').trim().toLowerCase();
    if (action) return action;
    const event = typeof log.new_value?.event === 'string' ? log.new_value.event : '';
    if (event === 'role_created') return t('roles.activityRoleCreated');
    if (event === 'permission_updated') return t('roles.activityPermissionUpdated');
    if (event === 'user_assigned') return t('roles.activityUserAssigned');
    return '—';
  };

  const renderActivityRow = (log: AuditLogEntry) => (
    <TableRow key={log.id} className="enforcement-page__table-row roles-page__activity-row">
      <TableCell className="roles-page__activity-td roles-page__activity-td--user">
        <div className="roles-page__user-cell">
          <div
            className="enforcement-page__avatar roles-page__avatar"
            style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}
          >
            {initials(log.user_name || 'SA')}
          </div>
          <div className="min-w-0">
            <p className="enforcement-page__cell-primary roles-page__truncate" title={log.user_name || undefined}>
              {log.user_name || '—'}
            </p>
            {log.user_role ? (
              <p className="enforcement-page__cell-secondary">{log.user_role}</p>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell className="roles-page__activity-td roles-page__activity-td--action">
        <span className="enforcement-page__badge roles-page__action-badge">
          {activityEventLabel(log)}
        </span>
      </TableCell>
      <TableCell className="roles-page__activity-td roles-page__activity-td--resource">
        <div className="roles-page__activity-resource-cell">
          <span className="enforcement-page__code-pill">{log.resource}</span>
          {log.resource_id ? (
            <span className="roles-page__resource-id" title={String(log.resource_id)}>
              {log.resource_id}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="roles-page__activity-td roles-page__activity-td--date">
        <span className="enforcement-page__cell-secondary">{formatActivityDate(log.timestamp)}</span>
      </TableCell>
      <TableCell className="roles-page__activity-td roles-page__activity-td--status">
        <span className="enforcement-page__badge roles-page__status-badge">
          <CheckCircle size={11} />
          {t('roles.status.success')}
        </span>
      </TableCell>
    </TableRow>
  );

  const statusLabel = (status: string) => {
    const key = `roles.status.${status}` as const;
    const translated = t(key);
    return translated !== key ? translated : status;
  };

  const openCreateRole = () => {
    setEditRole(null);
    setForm({ role_name: '', description: '', status: 'active' });
    setFormPermIds([]);
    setOpen(true);
  };

  const beginEditRole = (role: RBACRole) => {
    setEditRole(role);
    setForm({ role_name: role.role_name, description: role.description || '', status: role.status });
    setFormPermIds((role.permissions || []).map((p) => p.id));
    setOpen(true);
  };

  const handleCreate = async () => {
    if (!canManageRbac) {
      toast.error('Only a super administrator can create or edit roles.');
      return;
    }
    if (!form.role_name.trim()) {
      toast.error(t('roles.nameRequired'));
      return;
    }
    try {
      if (editRole) {
        await rbacAPI.updateRole(editRole.id, {
          role_name: form.role_name.trim(),
          description: form.description.trim() || undefined,
          status: form.status,
        });
        if (formPermIds.length > 0 || (editRole.permissions?.length ?? 0) > 0) {
          await rbacAPI.assignPermissions(editRole.id, formPermIds);
        }
        toast.success(t('roles.updated'));
      } else {
        const created = await rbacAPI.createRole({
          role_name: form.role_name.trim(),
          description: form.description.trim() || undefined,
        });
        if (formPermIds.length > 0 && created?.id) {
          await rbacAPI.assignPermissions(created.id, formPermIds);
        }
        toast.success(t('roles.created'));
      }
      setOpen(false);
      setEditRole(null);
      setForm({ role_name: '', description: '', status: 'active' });
      setFormPermIds([]);
      void load();
    } catch {
      toast.error(editRole ? t('roles.updateFailed') : t('roles.createFailed'));
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRole) return;
    if (!canManageRbac) {
      toast.error('Only a super administrator can delete roles.');
      return;
    }
    try {
      await rbacAPI.deleteRole(deleteRole.id);
      toast.success(t('roles.deleted'));
      if (selected?.id === deleteRole.id) setSelected(null);
      setDeleteRole(null);
      void load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('roles.deleteFailed'));
    }
  };

  const handleSavePermissions = async () => {
    if (!selected) return;
    if (!canManageRbac) {
      toast.error('Only a super administrator can change role permissions.');
      return;
    }
    setSaving(true);
    try {
      const updated = await rbacAPI.assignPermissions(selected.id, selectedPermIds);
      setSelected(updated);
      toast.success(t('roles.permissionsSaved'));
      void load();
    } catch {
      toast.error(t('roles.permissionsFailed'));
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    if (selected) setSelectedPermIds((selected.permissions || []).map((p) => p.id));
  };

  const toggleMatrixCell = (perm: RBACPermission | undefined) => {
    if (!perm) return;
    setSelectedPermIds((prev) => (
      prev.includes(perm.id) ? prev.filter((id) => id !== perm.id) : [...prev, perm.id]
    ));
  };

  const toggleFormGroup = (ids: string[], enabled: boolean) => {
    setFormPermIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (enabled) next.add(id);
        else next.delete(id);
      }
      return [...next];
    });
  };

  const exportRoles = () => {
    const payload = roles.map((role) => ({
      role_name: role.role_name,
      description: role.description,
      status: role.status,
      users: usersByRole.get(role.id)?.length ?? 0,
      permissions: (role.permissions || []).map((p) => p.perm_name),
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camtraffic-roles-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('roles.exportDone'));
  };

  const goToMatrix = (role?: RBACRole) => {
    if (role) setSelected(role);
    setTab('matrix');
  };

  const actionLabel = (action: MatrixAction) => {
    const key = `roles.matrix.${action}` as const;
    const translated = t(key);
    return translated !== key ? translated : action;
  };

  return (
    <div className="enforcement-page enforcement-page--roles dashboard-page--roles roles-page--enterprise">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Shield size={14} aria-hidden />
              </span>
              {t('roles.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('roles.title')}</h1>
            <p className="enforcement-page__subtitle">{t('roles.subtitleEnterprise')}</p>
            {!canManageRbac && (
              <p className="enforcement-page__subtitle" style={{ marginTop: '0.35rem', opacity: 0.85 }}>
                View-only: only a super administrator can create roles or change the permission matrix.
              </p>
            )}
          </div>
          <div className="roles-page__hero-actions">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--violet"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <RefreshCw size={16} aria-hidden />}
              {t('roles.refresh')}
            </button>
            <button type="button" className="enforcement-page__hero-btn" onClick={openCreateRole} disabled={!canManageRbac}>
              <Plus size={16} aria-hidden />
              {t('roles.add')}
            </button>
            <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--violet" onClick={() => setTab('matrix')}>
              <Grid3X3 size={16} aria-hidden />
              {t('roles.permissionMatrix')}
            </button>
            <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--violet" onClick={() => setTab('activity')}>
              <Activity size={16} aria-hidden />
              {t('roles.auditLog')}
            </button>
            <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--outline" onClick={exportRoles}>
              <Download size={16} aria-hidden />
              {t('roles.export')}
            </button>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four roles-page__stats">
        <button type="button" className="enforcement-page__stat-card enforcement-page__stat-card--violet roles-page__stat-card" onClick={() => setTab('roles')}>
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--violet"><Shield size={18} aria-hidden /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{kpis.totalRoles}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--violet">{t('roles.statTotalRoles')}</p>
          </div>
        </button>
        <button type="button" className="enforcement-page__stat-card enforcement-page__stat-card--blue roles-page__stat-card" onClick={() => setTab('assignment')}>
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue"><Users size={18} aria-hidden /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{kpis.totalUsers}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">{t('roles.statTotalUsers')}</p>
          </div>
        </button>
        <button type="button" className="enforcement-page__stat-card enforcement-page__stat-card--teal roles-page__stat-card" onClick={() => setTab('matrix')}>
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--teal"><KeyRound size={18} aria-hidden /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{kpis.totalPermissions}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--teal">{t('roles.statPermissions')}</p>
          </div>
        </button>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald roles-page__stat-card">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald"><CheckCircle2 size={18} aria-hidden /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{kpis.activeRoles}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">{t('roles.statActiveRoles')}</p>
          </div>
        </div>
      </div>

      <div className="roles-page__rbac-banner">
        <Info size={18} className="roles-page__rbac-banner-icon" aria-hidden />
        <p>{t('roles.rbacHint')}</p>
      </div>

      <div className="roles-page__tabs-toolbar" role="tablist" aria-label={t('roles.title')}>
        <div className="roles-page__tabs">
          {TABS.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn('roles-page__tab', tab === id && 'roles-page__tab--active')}
            >
              <Icon size={14} aria-hidden />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="roles-page__overview">
          <section className="enforcement-page__panel roles-page__overview-panel">
            <header className="roles-page__panel-header">
              <div>
                <h2 className="roles-page__panel-title">{t('roles.recentActivity')}</h2>
                <p className="roles-page__matrix-subtitle">{t('roles.recentActivityHint')}</p>
              </div>
              <button type="button" className="roles-page__chip-btn roles-page__chip-btn--blue" onClick={() => setTab('activity')}>
                {t('roles.viewAll')}
              </button>
            </header>
            <div className="overflow-x-auto">
              <Table className="enforcement-page__table mgmt-table__grid roles-page__activity-table">
                <TableHeader>
                  <TableRow className="enforcement-page__table-head">
                    {ACTIVITY_TABLE_COLUMNS.map((col) => (
                      <TableHead key={col.labelKey} className="enforcement-page__th text-left">
                        {t(col.labelKey)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(4)].map((_, i) => (
                      <TableRow key={i}>
                        {ACTIVITY_TABLE_COLUMNS.map((col) => (
                          <TableCell key={col.labelKey}>
                            <div className="enforcement-page__skeleton roles-page__skeleton" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : rbacActivity.length === 0 ? (
                    <TableEmptyState
                      colSpan={ACTIVITY_TABLE_COLUMNS.length}
                      tone="violet"
                      icon={<History size={28} />}
                      title={t('roles.emptyActivity')}
                      subtitle={t('roles.emptyActivityHint')}
                    />
                  ) : rbacActivity.slice(0, 6).map((log) => renderActivityRow(log))}
                </TableBody>
              </Table>
            </div>
          </section>

          <div className="roles-page__charts">
            <section className="enforcement-page__panel roles-page__chart-card">
              <header className="roles-page__panel-header">
                <div>
                  <h2 className="roles-page__panel-title">{t('roles.roleDistribution')}</h2>
                  <p className="roles-page__matrix-subtitle">{t('roles.roleDistributionHint')}</p>
                </div>
              </header>
              <div className="roles-page__chart-body">
                {roleDistribution.every((d) => d.count === 0) ? (
                  <p className="roles-page__chart-empty">{t('roles.chartEmpty')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={roleDistribution} dataKey="count" nameKey="name" cx="50%" cy="45%" innerRadius={48} outerRadius={82} paddingAngle={3}>
                        {roleDistribution.map((d, i) => (
                          <Cell key={d.name} fill={d.fill || CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="enforcement-page__panel roles-page__chart-card">
              <header className="roles-page__panel-header">
                <div>
                  <h2 className="roles-page__panel-title">{t('roles.usersByRole')}</h2>
                  <p className="roles-page__matrix-subtitle">{t('roles.usersByRoleHint')}</p>
                </div>
              </header>
              <div className="roles-page__chart-body">
                {roleDistribution.every((d) => d.count === 0) ? (
                  <p className="roles-page__chart-empty">{t('roles.chartEmpty')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={roleDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                      <XAxis dataKey="name" tick={chartAxisTick} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={chartAxisTick} axisLine={false} tickLine={false} />
                      <Tooltip cursor={false} contentStyle={chartTooltipStyle} />
                      <Bar dataKey="count" name={t('roles.statTotalUsers')} radius={[6, 6, 0, 0]} maxBarSize={40}>
                        {roleDistribution.map((d, i) => (
                          <Cell key={d.name} fill={d.fill || CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === 'roles' && (
        <>
          <div className="enforcement-page__toolbar">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
              <div className="enforcement-page__filters">
                {([
                  { key: 'all' as const, labelKey: 'roles.filterAll' },
                  { key: 'active' as const, labelKey: 'roles.status.active' },
                  { key: 'inactive' as const, labelKey: 'roles.status.inactive' },
                ]).map((item) => {
                  const active = statusFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStatusFilter(item.key)}
                      className={cn('enforcement-page__filter-btn', active && 'enforcement-page__filter-btn--active')}
                      style={active ? { background: 'linear-gradient(135deg, #2563EB, #4F46E5)' } : undefined}
                    >
                      {t(item.labelKey)}
                      <span className={cn('enforcement-page__filter-count', active && 'enforcement-page__filter-count--active')}>
                        {item.key === 'all'
                          ? roles.length
                          : roles.filter((r) => r.status === item.key).length}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="enforcement-page__search-wrap flex-1">
                <Search size={14} className="enforcement-page__search-icon" aria-hidden />
                <input
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder={t('roles.searchRoles')}
                  className="enforcement-page__search"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="enforcement-page__hero-btn" onClick={openCreateRole}>
                  <Plus size={15} aria-hidden />
                  {t('roles.add')}
                </button>
                <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--outline" onClick={exportRoles}>
                  <Download size={15} aria-hidden />
                  {t('roles.export')}
                </button>
              </div>
            </div>
          </div>

          <div className="enforcement-page__panel enforcement-page__panel--roles">
            <div className="overflow-x-auto">
              <Table className="enforcement-page__table mgmt-table__grid roles-page__table">
                <TableHeader>
                  <TableRow className="enforcement-page__table-head">
                    {ROLE_TABLE_COLUMNS.map((col) => (
                      <TableHead
                        key={col.labelKey}
                        className={`enforcement-page__th text-left${'className' in col && col.className ? ` ${col.className}` : ''}`}
                      >
                        {t(col.labelKey)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {ROLE_TABLE_COLUMNS.map((col) => (
                          <TableCell key={col.labelKey}>
                            <div className="enforcement-page__skeleton roles-page__skeleton" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredRoles.length === 0 ? (
                    <TableEmptyState
                      colSpan={ROLE_TABLE_COLUMNS.length}
                      tone="violet"
                      icon={<Lock size={28} />}
                      title={roles.length === 0 ? t('roles.emptyRoles') : t('roles.noSearchResults')}
                      subtitle={roles.length === 0 ? t('roles.emptyRolesHint') : undefined}
                      action={roles.length === 0 ? { label: t('roles.add'), onClick: openCreateRole, icon: <Plus size={15} /> } : undefined}
                    />
                  ) : pagination.pageItems.map((role) => {
                    const meta = roleMeta(role.role_name);
                    const Icon = meta.icon;
                    const userCount = usersByRole.get(role.id)?.length ?? 0;
                    const permCount = role.permissions?.length ?? 0;
                    const isActiveStatus = role.status === 'active';
                    return (
                      <TableRow
                        key={role.id}
                        className={cn('enforcement-page__table-row', !isActiveStatus && 'roles-page__row--inactive')}
                      >
                        <TableCell className="py-3.5">
                          <div className="roles-page__user-cell">
                            <div
                              className="enforcement-page__avatar roles-page__avatar"
                              style={{ background: meta.gradient }}
                            >
                              <Icon size={16} strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0">
                              <div className="roles-page__role-title-row">
                                <p className="enforcement-page__cell-primary roles-page__truncate" title={role.role_name}>
                                  {role.role_name}
                                </p>
                                {isSystemRole(role.role_name) ? (
                                  <span className="roles-page__system-badge">{t('roles.systemRole')}</span>
                                ) : null}
                              </div>
                              <p className="enforcement-page__cell-secondary roles-page__truncate" title={roleSubtitle(role, t)}>
                                {roleSubtitle(role, t)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="enforcement-page__code-pill">{userCount}</span>
                        </TableCell>
                        <TableCell>
                          <span className="enforcement-page__code-pill">{permCount}</span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="enforcement-page__badge"
                            style={isActiveStatus
                              ? { background: 'rgba(16,185,129,0.1)', color: '#059669' }
                              : { background: 'rgba(239,68,68,0.1)', color: '#DC2626' }}
                          >
                            {isActiveStatus ? <CheckCircle size={11} /> : <XCircle size={11} />}
                            {statusLabel(role.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="enforcement-page__cell-secondary">
                            {formatRelativeDate(role.created_at || role.assigned_date)}
                          </span>
                        </TableCell>
                        <TableCell className="roles-page__col--actions">
                          <div className="enforcement-page__table-actions users-page__actions" role="group" aria-label={t('roles.colActions')}>
                            <CrudRowActions
                              onView={() => setViewRole(role)}
                              onEdit={!isSystemRole(role.role_name) ? () => beginEditRole(role) : () => goToMatrix(role)}
                              onDelete={!isSystemRole(role.role_name) ? () => setDeleteRole(role) : undefined}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePagination pagination={pagination} labelKey="pagination.label.roles" />
          </div>
        </>
      )}

      {tab === 'matrix' && (
        <section className="enforcement-page__panel roles-page__matrix-enterprise">
          <header className="roles-page__matrix-header">
            <div className="min-w-0 flex-1">
              <h2 className="roles-page__panel-title">{t('roles.permissionMatrix')}</h2>
              <p className="roles-page__matrix-subtitle">{t('roles.matrixHint')}</p>
            </div>
            <div className="roles-page__matrix-actions">
              {roles.length > 0 ? (
                <Select
                  value={selected?.id ?? roles[0]?.id}
                  onValueChange={(id) => setSelected(roles.find((r) => r.id === id) ?? null)}
                >
                  <SelectTrigger className="roles-page__role-select">
                    <SelectValue placeholder={t('roles.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>{role.role_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <button
                type="button"
                className="roles-page__save-btn"
                onClick={() => void handleSavePermissions()}
                disabled={!selected || saving || !hasUnsavedChanges}
              >
                {saving ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Save size={14} aria-hidden />}
                {saving ? t('common.saving') : t('roles.savePermissions')}
              </button>
            </div>
          </header>

          {!selected ? (
            <EmptyStatePanel
              tone="violet"
              icon={<Shield size={28} />}
              title={t('roles.selectRole')}
              subtitle={t('roles.selectRoleHintMatrix')}
              className="roles-page__empty-panel roles-page__empty-panel--matrix"
            />
          ) : permissions.length === 0 ? (
            <EmptyStatePanel
              tone="blue"
              icon={<KeyRound size={28} />}
              title={t('roles.emptyPermissions')}
              subtitle={t('roles.emptyPermissionsHint')}
              className="roles-page__empty-panel roles-page__empty-panel--matrix"
            />
          ) : (
            <div className="roles-page__matrix-table-wrap">
              <table className="roles-page__matrix-table">
                <thead>
                  <tr>
                    <th>{t('roles.colModule')}</th>
                    {MATRIX_ACTIONS.map((action) => (
                      <th key={action}>{actionLabel(action)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixModules.map((resource) => {
                    const palette = resourcePalette(resource);
                    const ResourceIcon = palette.icon;
                    return (
                      <tr key={resource}>
                        <td>
                          <div className="roles-page__module-cell">
                            <span className="roles-page__resource-icon" style={{ color: palette.accent, background: palette.soft, borderColor: palette.border }}>
                              <ResourceIcon size={13} strokeWidth={2} />
                            </span>
                            <span className="roles-page__module-name">{resource}</span>
                          </div>
                        </td>
                        {MATRIX_ACTIONS.map((action) => {
                          const perm = permLookup.get(`${resource.toLowerCase()}::${action}`);
                          const checked = perm ? selectedPermIds.includes(perm.id) : false;
                          const available = !!perm;
                          return (
                            <td key={action} className="roles-page__matrix-cell">
                              {available ? (
                                <button
                                  type="button"
                                  className={cn('roles-page__matrix-check', checked && 'roles-page__matrix-check--on')}
                                  onClick={() => toggleMatrixCell(perm)}
                                  aria-pressed={checked}
                                  aria-label={`${resource} ${action}`}
                                >
                                  {checked ? <Check size={14} strokeWidth={2.5} /> : <X size={12} strokeWidth={2} className="opacity-30" />}
                                </button>
                              ) : (
                                <span className="roles-page__matrix-na">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {hasUnsavedChanges && selected ? (
            <div className="roles-page__sticky-save">
              <p className="roles-page__sticky-save-copy">{t('roles.unsavedChanges')}</p>
              <div className="roles-page__sticky-save-actions">
                <button type="button" className="roles-page__chip-btn roles-page__chip-btn--slate" onClick={discardChanges}>
                  {t('roles.discardChanges')}
                </button>
                <button type="button" className="roles-page__save-btn" onClick={() => void handleSavePermissions()} disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Save size={14} aria-hidden />}
                  {t('roles.savePermissions')}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {tab === 'assignment' && (
        <div className="roles-page__assignment">
          <aside className="enforcement-page__panel roles-page__assignment-roles">
            <header className="roles-page__panel-header">
              <div>
                <h2 className="roles-page__panel-title">{t('roles.list')}</h2>
                <p className="roles-page__matrix-subtitle">{t('roles.assignmentPickRole')}</p>
              </div>
            </header>
            <div className="roles-page__role-list">
              {roles.map((role) => {
                const meta = roleMeta(role.role_name);
                const Icon = meta.icon;
                const count = usersByRole.get(role.id)?.length ?? 0;
                const isActive = selected?.id === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    className={cn('roles-page__role-item', isActive && 'roles-page__role-item--active')}
                    style={isActive ? { ['--role-accent' as string]: meta.color } : undefined}
                    onClick={() => setSelected(role)}
                  >
                    <div className="roles-page__role-icon" style={{ color: meta.color, background: meta.bg, borderColor: `${meta.color}35` }}>
                      <Icon size={17} strokeWidth={1.75} />
                    </div>
                    <div className="roles-page__role-body">
                      <p className="roles-page__role-name">{role.role_name}</p>
                      <p className="roles-page__role-meta">{t('roles.usersCount', { count })}</p>
                    </div>
                    <span className="roles-page__role-badge">{count}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="enforcement-page__panel roles-page__assignment-users">
            <header className="roles-page__panel-header">
              <div>
                <h2 className="roles-page__panel-title">
                  {selected ? t('roles.assignedUsersFor', { name: selected.role_name }) : t('roles.assignedUsers')}
                </h2>
                <p className="roles-page__matrix-subtitle">{t('roles.assignmentHint')}</p>
              </div>
            </header>
            {selected ? (
              <>
                <div className="enforcement-page__toolbar roles-page__embedded-toolbar">
                  <div className="enforcement-page__search-wrap flex-1">
                    <Search size={14} className="enforcement-page__search-icon" aria-hidden />
                    <input
                      value={assignmentSearch}
                      onChange={(e) => setAssignmentSearch(e.target.value)}
                      placeholder={t('roles.searchUsers')}
                      className="enforcement-page__search"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table className="enforcement-page__table mgmt-table__grid roles-page__assignment-table">
                    <TableHeader>
                      <TableRow className="enforcement-page__table-head">
                        {ASSIGNMENT_TABLE_COLUMNS.map((col) => (
                          <TableHead key={col.labelKey} className="enforcement-page__th text-left">
                            {t(col.labelKey)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedUsers.length === 0 ? (
                        <TableEmptyState
                          colSpan={ASSIGNMENT_TABLE_COLUMNS.length}
                          tone="violet"
                          icon={<Users size={28} />}
                          title={t('roles.emptyAssignedUsers')}
                          subtitle={t('roles.emptyAssignedUsersHint')}
                        />
                      ) : assignmentPagination.pageItems.map((user) => {
                        const meta = roleMeta(selected.role_name);
                        return (
                          <TableRow key={user.id} className="enforcement-page__table-row">
                            <TableCell className="py-3.5">
                              <div className="roles-page__user-cell">
                                <div
                                  className="enforcement-page__avatar roles-page__avatar"
                                  style={{ background: meta.gradient }}
                                >
                                  {initials(user.full_name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="enforcement-page__cell-primary roles-page__truncate" title={user.full_name}>
                                    {user.full_name}
                                  </p>
                                  <p className="enforcement-page__cell-secondary roles-page__truncate">{user.phone || '—'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="enforcement-page__cell-body roles-page__truncate" title={user.email}>{user.email}</span>
                            </TableCell>
                            <TableCell>
                              <span className="enforcement-page__badge" style={{ background: meta.bg, color: meta.color }}>
                                {selected.role_name}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className="enforcement-page__badge"
                                style={user.is_active
                                  ? { background: 'rgba(16,185,129,0.1)', color: '#059669' }
                                  : { background: 'rgba(239,68,68,0.1)', color: '#DC2626' }}
                              >
                                {user.is_active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                                {user.is_active ? statusLabel('active') : statusLabel('inactive')}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination pagination={assignmentPagination} labelKey="pagination.label.users" />
              </>
            ) : (
              <EmptyStatePanel
                tone="violet"
                icon={<Users size={28} />}
                title={t('roles.selectRole')}
                subtitle={t('roles.assignmentPickRole')}
                className="roles-page__empty-panel"
              />
            )}
          </section>
        </div>
      )}

      {tab === 'activity' && (
        <>
          <div className="enforcement-page__toolbar">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
              <div className="enforcement-page__filters">
                {([
                  { key: 'all' as const, labelKey: 'roles.filterAllActivity' },
                  { key: 'role' as const, labelKey: 'roles.filterRoleEvents' },
                  { key: 'permission' as const, labelKey: 'roles.filterPermissionEvents' },
                  { key: 'rbac' as const, labelKey: 'roles.filterRbacEvents' },
                ]).map((item) => {
                  const active = activityFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActivityFilter(item.key)}
                      className={cn('enforcement-page__filter-btn', active && 'enforcement-page__filter-btn--active')}
                      style={active ? { background: 'linear-gradient(135deg, #2563EB, #4F46E5)' } : undefined}
                    >
                      {t(item.labelKey)}
                    </button>
                  );
                })}
              </div>
              <div className="enforcement-page__search-wrap flex-1">
                <Search size={14} className="enforcement-page__search-icon" aria-hidden />
                <input
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder={t('roles.searchActivity')}
                  className="enforcement-page__search"
                />
              </div>
            </div>
          </div>

          <section className="enforcement-page__panel roles-page__activity-panel">
            <div className="overflow-x-auto">
              <Table className="enforcement-page__table mgmt-table__grid roles-page__activity-table">
                <TableHeader>
                  <TableRow className="enforcement-page__table-head">
                    {ACTIVITY_TABLE_COLUMNS.map((col) => (
                      <TableHead key={col.labelKey} className="enforcement-page__th text-left">
                        {t(col.labelKey)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {ACTIVITY_TABLE_COLUMNS.map((col) => (
                          <TableCell key={col.labelKey}>
                            <div className="enforcement-page__skeleton roles-page__skeleton" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredActivity.length === 0 ? (
                    <TableEmptyState
                      colSpan={ACTIVITY_TABLE_COLUMNS.length}
                      tone="violet"
                      icon={<History size={28} />}
                      title={t('roles.emptyActivity')}
                      subtitle={t('roles.emptyActivityHint')}
                    />
                  ) : activityPagination.pageItems.map((log) => renderActivityRow(log))}
                </TableBody>
              </Table>
            </div>
            <TablePagination pagination={activityPagination} labelKey="pagination.label.audit" />
          </section>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          accent="violet"
          className="roles-form-dialog max-w-[42rem] sm:max-w-[42rem] p-0 gap-0 overflow-hidden"
        >
          <DialogHeader
            className={cn(
              'roles-form-dialog__header',
              editRole ? 'roles-form-dialog__header--edit' : 'roles-form-dialog__header--create',
            )}
          >
            <div className="roles-form-dialog__header-main">
              <span className="roles-form-dialog__icon" aria-hidden>
                {editRole ? <Shield size={20} strokeWidth={2.35} /> : <UserPlus size={20} strokeWidth={2.35} />}
              </span>
              <div>
                <p className="roles-form-dialog__eyebrow">{t('roles.eyebrow')}</p>
                <DialogTitle className="roles-form-dialog__title">
                  {editRole ? t('roles.edit') : t('roles.add')}
                </DialogTitle>
                <DialogDescription className="roles-form-dialog__desc">
                  {editRole ? t('roles.formDescEdit') : t('roles.formDescCreate')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="roles-form-dialog__body">
            <div className="roles-form-dialog__panel">
              <p className="roles-form-dialog__section-title">{t('roles.formSectionBasic')}</p>
              <div className="roles-form-dialog__field">
                <Label className="roles-form-dialog__label">{t('roles.name')} *</Label>
                <Input
                  className="roles-form-dialog__input"
                  placeholder={t('roles.namePlaceholder')}
                  value={form.role_name}
                  onChange={(e) => setForm({ ...form, role_name: e.target.value })}
                  disabled={!!editRole && isSystemRole(editRole.role_name)}
                />
              </div>
              <div className="roles-form-dialog__field">
                <Label className="roles-form-dialog__label">{t('roles.description')}</Label>
                <Input
                  className="roles-form-dialog__input"
                  placeholder={t('roles.descriptionPlaceholder')}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="roles-form-dialog__field">
                <Label className="roles-form-dialog__label">{t('users.colStatus')}</Label>
                <div className="roles-form-dialog__status-radios" role="radiogroup" aria-label={t('users.colStatus')}>
                  {(['active', 'inactive'] as const).map((status) => (
                    <label
                      key={status}
                      className={cn(
                        'roles-form-dialog__status-radio',
                        `roles-form-dialog__status-radio--${status}`,
                        form.status === status && 'is-active',
                      )}
                    >
                      <input
                        type="radio"
                        name="role-status"
                        checked={form.status === status}
                        onChange={() => setForm({ ...form, status })}
                      />
                      <span className="roles-form-dialog__status-dot" aria-hidden />
                      {statusLabel(status)}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="roles-form-dialog__panel">
              <p className="roles-form-dialog__section-title">{t('roles.permissionGroups')}</p>
              <p className="roles-form-dialog__hint">{t('roles.permissionGroupsHint')}</p>
              <div className="roles-form-dialog__groups">
                {permissionGroups.map(([resource, perms]) => {
                  const ids = perms.map((p) => p.id);
                  const selectedCount = ids.filter((id) => formPermIds.includes(id)).length;
                  const allOn = selectedCount === ids.length && ids.length > 0;
                  const someOn = selectedCount > 0;
                  const palette = resourcePalette(resource);
                  const ResourceIcon = palette.icon;
                  return (
                    <label
                      key={resource}
                      className={cn('roles-form-dialog__group', (allOn || someOn) && 'is-on')}
                      style={{ ['--group-accent' as string]: palette.accent, ['--group-soft' as string]: palette.soft, ['--group-border' as string]: palette.border }}
                    >
                      <input
                        type="checkbox"
                        checked={allOn}
                        ref={(el) => { if (el) el.indeterminate = someOn && !allOn; }}
                        onChange={() => toggleFormGroup(ids, !allOn)}
                      />
                      <span className="roles-form-dialog__group-icon">
                        <ResourceIcon size={14} />
                      </span>
                      <span className="roles-form-dialog__group-meta">
                        <span className="roles-form-dialog__group-name">{resource}</span>
                        <span className="roles-form-dialog__group-count">{selectedCount}/{ids.length}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="roles-form-dialog__footer">
            <Button type="button" variant="outline" className="roles-form-dialog__btn-cancel" onClick={() => setOpen(false)}>
              {t('users.cancel')}
            </Button>
            <Button type="button" className="roles-form-dialog__btn-submit" disabled={saving} onClick={() => void handleCreate()}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {t('roles.saveRole')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
        <DialogContent accent="rose" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('roles.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="enforcement-page__dialog-text">{t('roles.deleteConfirm', { name: deleteRole?.role_name ?? '' })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRole(null)}>{t('users.cancel')}</Button>
            <Button variant="destructive" onClick={() => void handleDeleteRole()}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EntityViewDialog
        open={!!viewRole}
        onOpenChange={(isOpen) => !isOpen && setViewRole(null)}
        title={t('roles.viewTitle')}
        accent="violet"
        onEdit={viewRole && !isSystemRole(viewRole.role_name) ? () => { setViewRole(null); beginEditRole(viewRole); } : undefined}
      >
        {viewRole ? (
          <>
            <EntityDetailField label={t('roles.name')} value={viewRole.role_name} />
            <EntityDetailField label={t('roles.description')} value={roleSubtitle(viewRole, t)} />
            <EntityDetailField label={t('users.colStatus')} value={statusLabel(viewRole.status)} />
            <EntityDetailField label={t('roles.colUsers')} value={String(viewAssignedUsers.length)} />
            <EntityDetailField
              label={t('roles.assignedPermissions')}
              value={(
                viewRole.permissions && viewRole.permissions.length > 0 ? (
                  <ul className="entity-detail-field__list">
                    {viewRole.permissions.map((p) => (
                      <li key={p.id}>{p.perm_name}</li>
                    ))}
                  </ul>
                ) : t('roles.noPermissions')
              )}
            />
            <EntityDetailField
              label={t('roles.assignedUsers')}
              value={(
                viewAssignedUsers.length > 0 ? (
                  <ul className="entity-detail-field__list">
                    {viewAssignedUsers.slice(0, 12).map((u) => (
                      <li key={u.id}>{u.full_name}</li>
                    ))}
                    {viewAssignedUsers.length > 12 ? <li>… +{viewAssignedUsers.length - 12}</li> : null}
                  </ul>
                ) : t('roles.emptyAssignedUsers')
              )}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setViewRole(null); goToMatrix(viewRole); }}>
                <Grid3X3 size={14} className="mr-1.5" /> {t('roles.permissionMatrix')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setSelected(viewRole); setViewRole(null); setTab('assignment'); }}>
                <Users size={14} className="mr-1.5" /> {t('roles.tabAssignment')}
              </Button>
            </div>
          </>
        ) : null}
      </EntityViewDialog>
    </div>
  );
}
