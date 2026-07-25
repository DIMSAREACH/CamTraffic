import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { EntityDetailField, EntityViewDialog } from '@shared/components/admin/EntityViewDialog';
import { Activity, Clock, Database, Globe, Hash, RefreshCw, Search, Shield, Users } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { auditAPI } from '@shared/services/api';
import type { AuditLogEntry } from '@shared/types';

type ActionTone = 'emerald' | 'amber' | 'rose' | 'blue' | 'violet';
type ActionFilter = 'all' | 'create' | 'update' | 'delete' | 'auth';

const ACTION_FILTERS: ActionFilter[] = ['all', 'create', 'update', 'delete', 'auth'];

const STAT_CARDS = [
  { key: 'total', labelKey: 'audit.statTotal', icon: Shield, variant: 'blue' },
  { key: 'users', labelKey: 'audit.statUsers', icon: Users, variant: 'violet' },
  { key: 'today', labelKey: 'audit.statToday', icon: Activity, variant: 'teal' },
  { key: 'resources', labelKey: 'audit.statResources', icon: Database, variant: 'emerald' },
] as const;

const TABLE_COLUMNS = [
  { labelKey: 'audit.colTime', className: 'audit-page__col--time' },
  { labelKey: 'audit.colUser', className: 'audit-page__col--user' },
  { labelKey: 'audit.colAction', className: 'audit-page__col--action' },
  { labelKey: 'audit.colResource', className: 'audit-page__col--resource' },
  { labelKey: 'audit.colIp', className: 'audit-page__col--ip' },
  { labelKey: 'audit.colActions', className: 'audit-page__col--actions' },
] as const;

function actionTone(action: string): ActionTone {
  const a = action.toLowerCase();
  if (a.includes('delete') || a.includes('remove')) return 'rose';
  if (a.includes('create') || a.includes('add') || a.includes('register')) return 'emerald';
  if (a.includes('update') || a.includes('patch') || a.includes('edit')) return 'amber';
  if (a.includes('login') || a.includes('auth') || a.includes('logout')) return 'blue';
  return 'violet';
}

function resourceTone(resource: string): ActionTone {
  const r = resource.toLowerCase();
  if (r.includes('user') || r.includes('driver') || r.includes('officer')) return 'blue';
  if (r.includes('fine') || r.includes('violation') || r.includes('appeal')) return 'rose';
  if (r.includes('vehicle') || r.includes('camera') || r.includes('road')) return 'amber';
  if (r.includes('ai') || r.includes('model') || r.includes('sign')) return 'violet';
  return 'emerald';
}

function actionCategory(action: string): ActionFilter {
  const a = action.toLowerCase();
  if (a.includes('delete') || a.includes('remove')) return 'delete';
  if (a.includes('create') || a.includes('add') || a.includes('register')) return 'create';
  if (a.includes('update') || a.includes('patch') || a.includes('edit')) return 'update';
  if (a.includes('login') || a.includes('auth') || a.includes('logout')) return 'auth';
  return 'update';
}

function roleTone(role: string): ActionTone {
  const r = role.toLowerCase();
  if (r === 'admin') return 'violet';
  if (r === 'police') return 'blue';
  if (r === 'driver') return 'emerald';
  return 'amber';
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'SY';
}

function formatJsonBlock(value?: Record<string, unknown>) {
  if (!value || Object.keys(value).length === 0) return '—';
  return JSON.stringify(value, null, 2);
}

export function AuditLogsPage() {
  const { t, locale } = useLanguage();
  const dateLocale = locale === 'km' ? 'km-KH' : undefined;
  const { user } = useAuth();
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [viewRow, setViewRow] = useState<AuditLogEntry | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!user || user.role !== 'admin') return;
    if (!silent) setLoading(true);
    try {
      setRows(await auditAPI.getAll());
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useLiveData(() => load(true), 60_000, user?.role === 'admin');

  const formatAction = (action: string) => {
    const key = `audit.actions.${action.toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : action.replace(/_/g, ' ');
  };

  const formatResource = (resource: string) => {
    const normalized = resource.toLowerCase().replace(/-/g, '_');
    const key = `audit.resources.${normalized}`;
    const translated = t(key);
    return translated !== key ? translated : resource.replace(/_/g, ' ');
  };

  const formatRole = (role: string) => {
    const map: Record<string, string> = {
      admin: 'users.roleAdmin',
      police: 'users.rolePolice',
      driver: 'users.roleDriver',
    };
    const key = map[role.toLowerCase()];
    return key ? t(key) : role;
  };

  const counts = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: rows.length,
      users: new Set(rows.map((r) => r.user_name).filter(Boolean)).size,
      today: rows.filter((r) => new Date(r.timestamp).toDateString() === today).length,
      resources: new Set(rows.map((r) => r.resource)).size,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (actionFilter !== 'all') {
      list = list.filter((r) => actionCategory(r.action) === actionFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        (r.user_name || '').toLowerCase().includes(q)
        || r.resource.toLowerCase().includes(q)
        || r.action.toLowerCase().includes(q)
        || r.resource_id.toLowerCase().includes(q)
        || (r.ip_address || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, search, actionFilter]);

  const pagination = usePagination(filtered);

  if (user?.role !== 'admin') {
    return <div className="enforcement-page p-8">{t('audit.adminOnly')}</div>;
  }

  return (
    <div className="enforcement-page enforcement-page--audit audit-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Shield size={14} /></span>
              {t('pages.audit.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.audit.title')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.audit.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant}`}>
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.variant}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{counts[card.key]}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.variant}`}>
                  {t(card.labelKey)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="enforcement-page__toolbar audit-page__toolbar">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3 w-full">
          <div className="enforcement-page__filters audit-page__filters">
            {ACTION_FILTERS.map((tab) => {
              const active = actionFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActionFilter(tab)}
                  className={`enforcement-page__filter-btn audit-page__filter-btn${active ? ' enforcement-page__filter-btn--active audit-page__filter-btn--active' : ''}`}
                >
                  {t(`audit.filters.${tab}`)}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="enforcement-page__search-wrap flex-1 min-w-0">
              <Search size={14} className="enforcement-page__search-icon" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('audit.searchPlaceholder')}
                className="enforcement-page__search"
              />
            </div>
            <Button type="button" variant="outline" size="sm" className="audit-page__refresh shrink-0" onClick={() => void load()}>
              <RefreshCw size={14} />
              {t('audit.refresh')}
            </Button>
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel audit-page__panel">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid audit-page__table">
            <colgroup>
              <col className="audit-page__col audit-page__col--time" />
              <col className="audit-page__col audit-page__col--user" />
              <col className="audit-page__col audit-page__col--action" />
              <col className="audit-page__col audit-page__col--resource" />
              <col className="audit-page__col audit-page__col--ip" />
              <col className="audit-page__col audit-page__col--actions" />
            </colgroup>
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {TABLE_COLUMNS.map((col) => (
                  <TableHead key={col.labelKey} className={`enforcement-page__th audit-page__th ${col.className}`}>
                    {t(col.labelKey)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((__, j) => (
                      <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pagination.pageItems.length === 0 ? (
                <TableEmptyState
                  colSpan={6}
                  tone="blue"
                  icon={<Shield size={28} />}
                  title={t('audit.empty')}
                  subtitle={t('audit.emptyHint')}
                />
              ) : pagination.pageItems.map((row) => (
                <TableRow key={row.id} className="enforcement-page__table-row audit-page__row">
                  <TableCell className="audit-page__col audit-page__col--time">
                    <div className="audit-page__time-cell">
                      <Clock size={12} className="audit-page__time-icon" aria-hidden />
                      <time dateTime={row.timestamp}>
                        {new Date(row.timestamp).toLocaleString(dateLocale, {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </time>
                    </div>
                  </TableCell>
                  <TableCell className="audit-page__col audit-page__col--user">
                    <div className="audit-page__user-cell">
                      <div className="audit-page__avatar">{initials(row.user_name || 'System')}</div>
                      <div className="audit-page__user-copy min-w-0">
                        <p className="audit-page__user">{row.user_name || t('audit.systemUser')}</p>
                        {row.user_role ? (
                          <span className={`audit-page__role-pill audit-page__role-pill--${roleTone(row.user_role)}`}>
                            {formatRole(row.user_role)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="audit-page__col audit-page__col--action">
                    <span className={`audit-page__pill audit-page__pill--${actionTone(row.action)}`}>
                      {formatAction(row.action)}
                    </span>
                  </TableCell>
                  <TableCell className="audit-page__col audit-page__col--resource">
                    <div className="audit-page__resource-cell">
                      <span className={`audit-page__pill audit-page__pill--${resourceTone(row.resource)}`}>
                        {formatResource(row.resource)}
                      </span>
                      {row.resource_id ? (
                        <span className="audit-page__resource-id">
                          <Hash size={10} aria-hidden />
                          {row.resource_id.slice(0, 8)}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="audit-page__col audit-page__col--ip">
                    <span className="audit-page__ip-cell">
                      <Globe size={12} aria-hidden />
                      {row.ip_address || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="audit-page__col audit-page__col--actions">
                    <CrudRowActions onView={() => setViewRow(row)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.audit" />
      </div>

      <EntityViewDialog
        open={!!viewRow}
        onOpenChange={(open) => !open && setViewRow(null)}
        title={t('audit.viewTitle')}
        accent="blue"
      >
        {viewRow ? (
          <>
            <EntityDetailField
              label={t('audit.colTime')}
              value={new Date(viewRow.timestamp).toLocaleString(dateLocale, { dateStyle: 'full', timeStyle: 'medium' })}
            />
            <EntityDetailField label={t('audit.colUser')} value={viewRow.user_name || t('audit.systemUser')} />
            <EntityDetailField label={t('audit.userRole')} value={viewRow.user_role ? formatRole(viewRow.user_role) : '—'} />
            <EntityDetailField label={t('audit.colAction')} value={formatAction(viewRow.action)} />
            <EntityDetailField label={t('audit.colResource')} value={formatResource(viewRow.resource)} />
            <EntityDetailField label={t('audit.resourceId')} value={viewRow.resource_id || '—'} />
            <EntityDetailField label={t('audit.colIp')} value={viewRow.ip_address || '—'} />
            <EntityDetailField
              label={t('audit.previousValue')}
              value={<pre className="audit-page__json-block">{formatJsonBlock(viewRow.old_value)}</pre>}
            />
            <EntityDetailField
              label={t('audit.newValue')}
              value={<pre className="audit-page__json-block">{formatJsonBlock(viewRow.new_value)}</pre>}
            />
          </>
        ) : null}
      </EntityViewDialog>
    </div>
  );
}
