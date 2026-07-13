import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Shield, Plus, Save, KeyRound, CheckCircle2, Lock, Search, UserPlus, Car, BadgeCheck,
  FileText, AlertTriangle, BarChart3, Camera, Sparkles, Scale, Settings, RefreshCw,
  Loader2, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { EmptyStatePanel } from '@shared/components/ui/TableEmptyState';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { EntityDetailField, EntityViewDialog } from '@shared/components/admin/EntityViewDialog';
import { useLanguage } from '@shared/context/LanguageContext';
import { rbacAPI } from '@shared/services/api';
import { cn } from '@shared/components/ui/utils';
import { toast } from 'sonner';
import type { RBACPermission, RBACRole } from '@shared/types';

type MobilePane = 'roles' | 'permissions';

const ROLE_META: Record<string, { icon: typeof Shield; color: string; bg: string; gradient: string }> = {
  admin: { icon: Shield, color: '#7C3AED', bg: 'rgba(139,92,246,0.14)', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
  police: { icon: BadgeCheck, color: '#2563EB', bg: 'rgba(37,99,235,0.14)', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
  officer: { icon: BadgeCheck, color: '#2563EB', bg: 'rgba(37,99,235,0.14)', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
  driver: { icon: Car, color: '#0891B2', bg: 'rgba(6,182,212,0.14)', gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
};

const RESOURCE_PALETTE: Record<string, { accent: string; soft: string; border: string; gradient: string; icon: typeof Shield }> = {
  users: { accent: '#7C3AED', soft: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.22)', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.16), rgba(124,58,237,0.06))', icon: Shield },
  signs: { accent: '#2563EB', soft: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.22)', gradient: 'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(29,78,216,0.06))', icon: FileText },
  fines: { accent: '#DC2626', soft: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.22)', gradient: 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(220,38,38,0.05))', icon: Scale },
  vehicles: { accent: '#0891B2', soft: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.22)', gradient: 'linear-gradient(135deg, rgba(6,182,212,0.16), rgba(8,145,178,0.06))', icon: Car },
  violations: { accent: '#D97706', soft: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.24)', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(217,119,6,0.06))', icon: AlertTriangle },
  infrastructure: { accent: '#475569', soft: 'rgba(100,116,139,0.14)', border: 'rgba(100,116,139,0.22)', gradient: 'linear-gradient(135deg, rgba(100,116,139,0.14), rgba(71,85,105,0.05))', icon: Camera },
  reports: { accent: '#059669', soft: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.22)', gradient: 'linear-gradient(135deg, rgba(16,185,129,0.16), rgba(5,150,105,0.06))', icon: BarChart3 },
  auth: { accent: '#DB2777', soft: 'rgba(219,39,119,0.12)', border: 'rgba(219,39,119,0.22)', gradient: 'linear-gradient(135deg, rgba(219,39,119,0.14), rgba(190,24,93,0.05))', icon: Lock },
  appeals: { accent: '#6366F1', soft: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.22)', gradient: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(79,70,229,0.06))', icon: Scale },
  audit: { accent: '#0EA5E9', soft: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.22)', gradient: 'linear-gradient(135deg, rgba(14,165,233,0.14), rgba(2,132,199,0.05))', icon: Settings },
  ai: { accent: '#8B5CF6', soft: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.22)', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.16), rgba(124,58,237,0.06))', icon: Sparkles },
};

const FALLBACK_RESOURCE_PALETTE = [
  { accent: '#7C3AED', soft: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.22)', gradient: 'linear-gradient(135deg, rgba(124,58,237,0.14), rgba(124,58,237,0.04))', icon: KeyRound },
  { accent: '#2563EB', soft: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.22)', gradient: 'linear-gradient(135deg, rgba(37,99,235,0.14), rgba(37,99,235,0.04))', icon: KeyRound },
  { accent: '#059669', soft: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.22)', gradient: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.04))', icon: KeyRound },
];

const ACTION_PALETTE: Record<string, { color: string; bg: string }> = {
  view: { color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  manage: { color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  create: { color: '#059669', bg: 'rgba(16,185,129,0.12)' },
  update: { color: '#D97706', bg: 'rgba(245,158,11,0.14)' },
  delete: { color: '#DC2626', bg: 'rgba(239,68,68,0.12)' },
};

const SYSTEM_ROLES = new Set(['admin', 'police', 'driver', 'officer']);

function isSystemRole(name: string) {
  return SYSTEM_ROLES.has(name.toLowerCase());
}

function roleMeta(name: string) {
  const key = name.toLowerCase();
  return ROLE_META[key] ?? { icon: KeyRound, color: '#7C3AED', bg: 'rgba(124,58,237,0.12)', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' };
}

function resourcePalette(resource: string) {
  const key = resource.toLowerCase();
  if (RESOURCE_PALETTE[key]) return RESOURCE_PALETTE[key];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i) * (i + 1)) % FALLBACK_RESOURCE_PALETTE.length;
  return FALLBACK_RESOURCE_PALETTE[hash] ?? FALLBACK_RESOURCE_PALETTE[0];
}

function actionPalette(action: string) {
  const key = action.toLowerCase();
  return ACTION_PALETTE[key] ?? { color: '#64748B', bg: 'rgba(100,116,139,0.12)' };
}

function coverageTone(pct: number) {
  if (pct >= 75) return 'emerald';
  if (pct >= 40) return 'amber';
  return 'rose';
}

function roleCoveragePct(role: RBACRole, totalPermissions: number) {
  if (!totalPermissions) return 0;
  return Math.round(((role.permissions?.length ?? 0) / totalPermissions) * 100);
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

function permIdSignature(ids: string[]) {
  return [...ids].sort().join(',');
}

function isGenericRoleDescription(description: string, roleName: string): boolean {
  const desc = description.trim().toLowerCase();
  const name = roleName.trim().toLowerCase();
  if (!desc) return true;
  return desc === `${name} role` || desc === name || desc === `${name} account` || desc === `${name} user`;
}

function roleSubtitle(role: RBACRole, t: (key: string) => string): string {
  const custom = role.description?.trim();
  if (custom && !isGenericRoleDescription(custom, role.role_name)) {
    return custom;
  }
  const key = role.role_name.toLowerCase();
  const map: Record<string, string> = {
    admin: 'roles.roleDescAdmin',
    police: 'roles.roleDescPolice',
    officer: 'roles.roleDescOfficer',
    driver: 'roles.roleDescDriver',
  };
  return t(map[key] ?? 'roles.roleDescFallback');
}

export function RolesPage() {
  const { t } = useLanguage();
  const [roles, setRoles] = useState<RBACRole[]>([]);
  const [permissions, setPermissions] = useState<RBACPermission[]>([]);
  const [selected, setSelected] = useState<RBACRole | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editRole, setEditRole] = useState<RBACRole | null>(null);
  const [deleteRole, setDeleteRole] = useState<RBACRole | null>(null);
  const [viewRole, setViewRole] = useState<RBACRole | null>(null);
  const [form, setForm] = useState({ role_name: '', description: '', status: 'active' as RBACRole['status'] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [permSearch, setPermSearch] = useState('');
  const [mobilePane, setMobilePane] = useState<MobilePane>('roles');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([rbacAPI.getRoles(), rbacAPI.getPermissions()]);
      setRoles(r);
      setPermissions(p);
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
    if (selected) {
      setSelectedPermIds((selected.permissions || []).map((p) => p.id));
    } else {
      setSelectedPermIds([]);
    }
  }, [selected]);

  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles;
    const q = roleSearch.toLowerCase();
    return roles.filter((r) =>
      r.role_name.toLowerCase().includes(q)
      || (r.description || '').toLowerCase().includes(q),
    );
  }, [roles, roleSearch]);

  const filteredPermissions = useMemo(() => {
    if (!permSearch.trim()) return permissions;
    const q = permSearch.toLowerCase();
    return permissions.filter((p) =>
      p.perm_name.toLowerCase().includes(q)
      || p.resource.toLowerCase().includes(q)
      || p.action_type.toLowerCase().includes(q)
      || (p.description || '').toLowerCase().includes(q),
    );
  }, [permissions, permSearch]);

  const permissionGroups = useMemo(() => groupPermissions(filteredPermissions), [filteredPermissions]);

  const savedPermSignature = useMemo(
    () => permIdSignature((selected?.permissions || []).map((p) => p.id)),
    [selected],
  );
  const currentPermSignature = useMemo(
    () => permIdSignature(selectedPermIds),
    [selectedPermIds],
  );
  const hasUnsavedChanges = !!selected && savedPermSignature !== currentPermSignature;

  const assignmentPct = permissions.length
    ? Math.round((selectedPermIds.length / permissions.length) * 100)
    : 0;
  const coverageVariant = coverageTone(assignmentPct);
  const selectedMeta = selected ? roleMeta(selected.role_name) : null;

  const statusLabel = (status: string) => {
    const key = `roles.status.${status}` as const;
    const translated = t(key);
    return translated !== key ? translated : status;
  };

  const selectRole = (role: RBACRole) => {
    setSelected(role);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches) {
      setMobilePane('permissions');
    }
  };

  const openCreateRole = () => {
    setEditRole(null);
    setForm({ role_name: '', description: '', status: 'active' });
    setOpen(true);
  };

  const beginEditRole = (role: RBACRole) => {
    setEditRole(role);
    setForm({ role_name: role.role_name, description: role.description || '', status: role.status });
    setOpen(true);
  };

  const handleCreate = async () => {
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
        toast.success(t('roles.updated'));
      } else {
        await rbacAPI.createRole({ role_name: form.role_name.trim(), description: form.description.trim() || undefined });
        toast.success(t('roles.created'));
      }
      setOpen(false);
      setEditRole(null);
      setForm({ role_name: '', description: '', status: 'active' });
      void load();
    } catch {
      toast.error(editRole ? t('roles.updateFailed') : t('roles.createFailed'));
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRole) return;
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
    if (selected) {
      setSelectedPermIds((selected.permissions || []).map((p) => p.id));
    }
  };

  const togglePerm = (id: string) => {
    setSelectedPermIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleGroup = (ids: string[], enabled: boolean) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (enabled) next.add(id);
        else next.delete(id);
      }
      return [...next];
    });
  };

  const toggleGroupCollapsed = (resource: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(resource)) next.delete(resource);
      else next.add(resource);
      return next;
    });
  };

  const selectAllPermissions = () => {
    setSelectedPermIds(permissions.map((p) => p.id));
  };

  const clearAllPermissions = () => {
    setSelectedPermIds([]);
  };

  return (
    <div className="enforcement-page enforcement-page--roles dashboard-page--roles">
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
            <p className="enforcement-page__subtitle">{t('roles.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--violet"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <RefreshCw size={16} aria-hidden />}
              {t('roles.refresh')}
            </button>
            <button type="button" className="enforcement-page__hero-btn" onClick={openCreateRole}>
              <Plus size={16} aria-hidden />
              {t('roles.add')}
            </button>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four roles-page__stats mb-6">
        <div className="enforcement-page__stat-card enforcement-page__stat-card--violet roles-page__stat-card">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--violet">
            <Shield size={18} aria-hidden />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{roles.length}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--violet">{t('roles.statRoles')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--blue roles-page__stat-card">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue">
            <KeyRound size={18} aria-hidden />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{permissions.length}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">{t('roles.statPermissions')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--teal roles-page__stat-card">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--teal">
            <CheckCircle2 size={18} aria-hidden />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{selected ? selectedPermIds.length : '—'}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--teal">{t('roles.statAssigned')}</p>
          </div>
        </div>
        <div className={`enforcement-page__stat-card enforcement-page__stat-card--${coverageVariant} roles-page__stat-card roles-page__stat-card--coverage`}>
          <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${coverageVariant}`}>
            <Sparkles size={18} aria-hidden />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{selected ? `${assignmentPct}%` : '—'}</p>
            <p className={`enforcement-page__stat-label enforcement-page__stat-label--${coverageVariant}`}>{t('roles.statCoverage')}</p>
          </div>
        </div>
      </div>

      <div className="roles-page__rbac-banner mb-6">
        <Info size={18} className="roles-page__rbac-banner-icon" aria-hidden />
        <p>{t('roles.rbacHint')}</p>
      </div>

      <div className="roles-page__mobile-tabs" role="tablist" aria-label={t('roles.title')}>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === 'roles'}
          className={cn('roles-page__mobile-tab', mobilePane === 'roles' && 'roles-page__mobile-tab--active')}
          onClick={() => setMobilePane('roles')}
        >
          {t('roles.tabRoles')}
          <span className="roles-page__mobile-tab-count">{roles.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === 'permissions'}
          className={cn('roles-page__mobile-tab', mobilePane === 'permissions' && 'roles-page__mobile-tab--active')}
          onClick={() => setMobilePane('permissions')}
        >
          {t('roles.tabPermissions')}
          {selected ? <span className="roles-page__mobile-tab-count">{selectedPermIds.length}</span> : null}
        </button>
      </div>

      <div className="roles-page__workspace">
        <aside className={cn('enforcement-page__panel roles-page__roles-panel', mobilePane !== 'roles' && 'roles-page__pane--hidden-mobile')}>
          <header className="roles-page__panel-header roles-page__panel-header--roles">
            <div>
              <h2 className="roles-page__panel-title">{t('roles.list')}</h2>
              <p className="roles-page__matrix-subtitle">{t('roles.listHint')}</p>
            </div>
            <span className="roles-page__panel-count">{filteredRoles.length}</span>
          </header>

          <div className="roles-page__sidebar-search">
            <div className="enforcement-page__search-wrap roles-page__search-wrap">
              <Search size={14} className="enforcement-page__search-icon" aria-hidden />
              <input
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder={t('roles.searchRoles')}
                className="enforcement-page__search"
              />
            </div>
          </div>

          {loading ? (
            <div className="roles-page__loading" aria-busy="true" aria-label={t('common.loading')}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="enforcement-page__skeleton roles-page__skeleton" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <EmptyStatePanel
              tone="violet"
              icon={<Lock size={28} />}
              title={t('roles.emptyRoles')}
              subtitle={t('roles.emptyRolesHint')}
              action={{ label: t('roles.add'), onClick: openCreateRole, icon: <Plus size={15} /> }}
              className="roles-page__empty-panel"
            />
          ) : filteredRoles.length === 0 ? (
            <div className="roles-page__empty roles-page__empty--compact">
              <p className="enforcement-page__empty-title">{t('roles.noSearchResults')}</p>
            </div>
          ) : (
            <div className="roles-page__role-list">
              {filteredRoles.map((role) => {
                const meta = roleMeta(role.role_name);
                const Icon = meta.icon;
                const isActive = selected?.id === role.id;
                const assigned = role.permissions?.length ?? 0;
                const coverage = roleCoveragePct(role, permissions.length);
                const isActiveStatus = role.status === 'active';
                const coverageClass = coverageTone(coverage);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => selectRole(role)}
                    className={cn('roles-page__role-item', isActive && 'roles-page__role-item--active')}
                    style={isActive ? { '--role-accent': meta.color } as CSSProperties : undefined}
                  >
                    <div
                      className="roles-page__role-icon"
                      style={{
                        color: meta.color,
                        background: meta.bg,
                        borderColor: `${meta.color}35`,
                        boxShadow: isActive ? `0 8px 20px ${meta.color}22` : undefined,
                      }}
                    >
                      <Icon size={17} strokeWidth={1.75} />
                    </div>
                    <div className="roles-page__role-body">
                      <div className="roles-page__role-title-row">
                        <p className="roles-page__role-name">{role.role_name}</p>
                        {isSystemRole(role.role_name) ? (
                          <span className="roles-page__system-badge">{t('roles.systemRole')}</span>
                        ) : null}
                      </div>
                      <p className="roles-page__role-meta">
                        {roleSubtitle(role, t)}
                      </p>
                      <div className="roles-page__role-coverage">
                        <div className="roles-page__role-coverage-bar">
                          <div
                            className={`roles-page__role-coverage-fill roles-page__role-coverage-fill--${coverageClass}`}
                            style={{ width: `${coverage}%` }}
                          />
                        </div>
                        <span className="roles-page__role-coverage-label">{coverage}%</span>
                      </div>
                    </div>
                    <div className="roles-page__role-trailing">
                      <span className="roles-page__role-badge">{assigned}</span>
                      <div className="enforcement-page__table-actions users-page__actions roles-page__role-actions" onClick={(e) => e.stopPropagation()}>
                        <CrudRowActions
                          onView={() => setViewRole(role)}
                          onEdit={!isSystemRole(role.role_name) ? () => beginEditRole(role) : undefined}
                          onDelete={!isSystemRole(role.role_name) ? () => setDeleteRole(role) : undefined}
                        />
                      </div>
                      <span
                        className="enforcement-page__badge roles-page__status-badge"
                        style={isActiveStatus
                          ? { background: 'rgba(16,185,129,0.1)', color: '#059669' }
                          : { background: 'rgba(148,163,184,0.12)', color: '#64748B' }}
                      >
                        {statusLabel(role.status)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <main
          className={cn(
            'enforcement-page__panel roles-page__matrix-panel',
            mobilePane !== 'permissions' && 'roles-page__pane--hidden-mobile',
          )}
          style={selectedMeta ? { '--matrix-accent': selectedMeta.color } as CSSProperties : undefined}
        >
          {selected && selectedMeta ? (() => {
            const SelectedIcon = selectedMeta.icon;
            return (
            <div className="roles-page__selected-hero" style={{ background: selectedMeta.gradient }}>
              <div className="roles-page__selected-hero-icon">
                <SelectedIcon size={22} aria-hidden />
              </div>
              <div className="roles-page__selected-hero-copy">
                <h2 className="roles-page__selected-hero-title">{selected.role_name}</h2>
                <p className="roles-page__selected-hero-meta">
                  {roleSubtitle(selected, t)}
                </p>
              </div>
              <div className="roles-page__selected-hero-stats">
                <span>{t('roles.permissionsSelected', { count: selectedPermIds.length, total: permissions.length })}</span>
                <span>{t('roles.coverage', { pct: assignmentPct })}</span>
              </div>
            </div>
            );
          })() : null}

          <header className="roles-page__matrix-header">
            <div className="min-w-0 flex-1">
              <h2 className="roles-page__panel-title">{t('roles.permissionMatrix')}</h2>
              {selected ? (
                <>
                  <p className="roles-page__matrix-subtitle">
                    {t('roles.permissionsSelected', { count: selectedPermIds.length, total: permissions.length })}
                  </p>
                  <div className="roles-page__coverage">
                    <div className="roles-page__coverage-bar">
                      <div
                        className={`roles-page__coverage-fill roles-page__coverage-fill--${coverageVariant}`}
                        style={{ width: `${assignmentPct}%` }}
                      />
                    </div>
                    <span className={`roles-page__coverage-label roles-page__coverage-label--${coverageVariant}`}>
                      {t('roles.coverage', { pct: assignmentPct })}
                    </span>
                  </div>
                </>
              ) : (
                <p className="roles-page__matrix-subtitle">{t('roles.selectRole')}</p>
              )}
            </div>
            {selected && permissions.length > 0 && (
              <div className="roles-page__matrix-actions">
                <button type="button" className="roles-page__chip-btn roles-page__chip-btn--blue" onClick={selectAllPermissions}>
                  {t('roles.selectAllPermissions')}
                </button>
                <button type="button" className="roles-page__chip-btn roles-page__chip-btn--slate" onClick={clearAllPermissions}>
                  {t('roles.clearAllPermissions')}
                </button>
                <button
                  type="button"
                  className="roles-page__save-btn"
                  onClick={() => void handleSavePermissions()}
                  disabled={saving || !hasUnsavedChanges}
                >
                  <Save size={14} aria-hidden />
                  {saving ? t('common.saving') : t('roles.savePermissions')}
                </button>
              </div>
            )}
          </header>

          {selected && permissions.length > 0 && (
            <div className="roles-page__matrix-toolbar">
              <div className="enforcement-page__search-wrap roles-page__search-wrap roles-page__search-wrap--wide">
                <Search size={14} className="enforcement-page__search-icon" aria-hidden />
                <input
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  placeholder={t('roles.searchPermissions')}
                  className="enforcement-page__search"
                />
              </div>
            </div>
          )}

          {!selected ? (
            <EmptyStatePanel
              tone="violet"
              icon={<Shield size={28} />}
              title={t('roles.selectRole')}
              subtitle={t('roles.selectRoleHint')}
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
          ) : permissionGroups.length === 0 ? (
            <div className="roles-page__empty">
              <p className="enforcement-page__empty-title">{t('roles.noSearchResults')}</p>
            </div>
          ) : (
            <div className="roles-page__matrix-scroll">
              {permissionGroups.map(([resource, perms]) => {
                const ids = perms.map((p) => p.id);
                const allOn = ids.every((id) => selectedPermIds.includes(id));
                const someOn = ids.some((id) => selectedPermIds.includes(id));
                const groupSelected = ids.filter((id) => selectedPermIds.includes(id)).length;
                const palette = resourcePalette(resource);
                const ResourceIcon = palette.icon;
                const collapsed = collapsedGroups.has(resource);
                return (
                  <section
                    key={resource}
                    className={cn('roles-page__resource-group', collapsed && 'roles-page__resource-group--collapsed')}
                    style={{
                      '--resource-accent': palette.accent,
                      '--resource-soft': palette.soft,
                      '--resource-border': palette.border,
                    } as CSSProperties}
                  >
                    <div className="roles-page__resource-head" style={{ background: palette.gradient }}>
                      <button
                        type="button"
                        className="roles-page__resource-collapse"
                        onClick={() => toggleGroupCollapsed(resource)}
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? t('roles.expandGroup') : t('roles.collapseGroup')}
                      >
                        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                      <div className="roles-page__resource-title-wrap">
                        <span className="roles-page__resource-icon" style={{ color: palette.accent, background: palette.soft, borderColor: palette.border }}>
                          <ResourceIcon size={14} strokeWidth={2} />
                        </span>
                        <h3 className="roles-page__resource-title" style={{ color: palette.accent }}>{resource}</h3>
                        <span className="roles-page__resource-count" style={{ color: palette.accent, background: palette.soft, borderColor: palette.border }}>
                          {groupSelected}/{perms.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="roles-page__resource-toggle"
                        style={{ color: palette.accent, background: palette.soft, borderColor: palette.border }}
                        onClick={() => toggleGroup(ids, !allOn)}
                      >
                        {allOn ? t('roles.clearGroup') : t('roles.selectAll')}
                        {someOn && !allOn ? ` (${groupSelected})` : ''}
                      </button>
                    </div>
                    {!collapsed ? (
                      <div className="roles-page__perm-grid">
                        {perms.map((p) => {
                          const checked = selectedPermIds.includes(p.id);
                          const action = actionPalette(p.action_type);
                          return (
                            <label
                              key={p.id}
                              className={cn('roles-page__perm-card', checked && 'roles-page__perm-card--on')}
                              style={checked ? {
                                borderColor: palette.border,
                                background: palette.gradient,
                                boxShadow: `0 8px 22px ${palette.accent}14`,
                              } : undefined}
                            >
                              <input
                                type="checkbox"
                                className="roles-page__perm-check"
                                style={{ accentColor: palette.accent }}
                                checked={checked}
                                onChange={() => togglePerm(p.id)}
                              />
                              <div className="roles-page__perm-body">
                                <span className="roles-page__perm-name">{p.perm_name}</span>
                                <span
                                  className="roles-page__perm-action"
                                  style={{ color: action.color, background: action.bg }}
                                >
                                  {p.action_type}
                                </span>
                                {p.description ? (
                                  <span className="roles-page__perm-desc">{p.description}</span>
                                ) : null}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}

          {hasUnsavedChanges && selected ? (
            <div className="roles-page__sticky-save">
              <p className="roles-page__sticky-save-copy">{t('roles.unsavedChanges')}</p>
              <div className="roles-page__sticky-save-actions">
                <button type="button" className="roles-page__chip-btn roles-page__chip-btn--slate" onClick={discardChanges}>
                  {t('roles.discardChanges')}
                </button>
                <button
                  type="button"
                  className="roles-page__save-btn"
                  onClick={() => void handleSavePermissions()}
                  disabled={saving}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Save size={14} aria-hidden />}
                  {saving ? t('common.saving') : t('roles.savePermissions')}
                </button>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent accent="violet" className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--violet">
                <UserPlus size={15} />
              </div>
              <span className="enforcement-page__dialog-title">{editRole ? t('roles.edit') : t('roles.add')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="enforcement-page__form-label">{t('roles.name')} *</Label>
              <Input
                className="mt-1"
                placeholder={t('roles.namePlaceholder')}
                value={form.role_name}
                onChange={(e) => setForm({ ...form, role_name: e.target.value })}
              />
            </div>
            <div>
              <Label className="enforcement-page__form-label">{t('roles.description')}</Label>
              <Input
                className="mt-1"
                placeholder={t('roles.descriptionPlaceholder')}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            {editRole ? (
              <div>
                <Label className="enforcement-page__form-label">{t('users.colStatus')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as RBACRole['status'] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{statusLabel('active')}</SelectItem>
                    <SelectItem value="inactive">{statusLabel('inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('users.cancel')}</Button>
            <Button type="button" onClick={() => void handleCreate()}>{t('common.save')}</Button>
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
        onOpenChange={(open) => !open && setViewRole(null)}
        title={t('roles.viewTitle')}
        accent="violet"
        onEdit={viewRole && !isSystemRole(viewRole.role_name) ? () => beginEditRole(viewRole) : undefined}
      >
        {viewRole ? (
          <>
            <EntityDetailField label={t('roles.name')} value={viewRole.role_name} />
            <EntityDetailField label={t('roles.description')} value={roleSubtitle(viewRole, t)} />
            <EntityDetailField label={t('users.colStatus')} value={statusLabel(viewRole.status)} />
            <EntityDetailField
              label={t('roles.permissionMatrix')}
              value={t('roles.permissionsSelected', {
                count: viewRole.permissions?.length ?? 0,
                total: permissions.length,
              })}
            />
            {viewRole.permissions && viewRole.permissions.length > 0 ? (
              <EntityDetailField
                label={t('roles.assignedPermissions')}
                value={(
                  <ul className="entity-detail-field__list">
                    {viewRole.permissions.map((p) => (
                      <li key={p.id}>{p.perm_name}</li>
                    ))}
                  </ul>
                )}
              />
            ) : null}
          </>
        ) : null}
      </EntityViewDialog>
    </div>
  );
}
