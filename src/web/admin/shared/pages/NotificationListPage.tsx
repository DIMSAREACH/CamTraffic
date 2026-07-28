import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, Download, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { useLanguage } from '@shared/context/LanguageContext';
import { notificationsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Notification } from '@shared/types';

type AdminNotifRow = Notification & {
  user_email?: string;
  user_name?: string;
  user_role?: string;
};

function roleLabel(role?: string) {
  if (!role) return '';
  if (role === 'police') return 'Officer';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function NotificationListPage() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminNotifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [type, setType] = useState<string>('all');
  const [role, setRole] = useState<string>('all');

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsAPI.adminList({
        q: debouncedSearch || undefined,
        type: type === 'all' ? undefined : type,
        role: role === 'all' ? undefined : role,
        page_size: 200,
      });
      setRows(data);
    } catch {
      toast.error(t('notifCenter.loadFailed') !== 'notifCenter.loadFailed'
        ? t('notifCenter.loadFailed')
        : 'Failed to load notifications from API');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, type, role, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const headers = [
    t('notifCenter.colTitle'),
    t('notifCenter.colRecipient'),
    t('notifCenter.colChannel'),
    t('notifCenter.colSentDate'),
    t('notifCenter.colStatus'),
    t('notifCenter.colActions'),
  ];

  const filtered = useMemo(() => rows, [rows]);
  const unreadCount = useMemo(() => rows.filter((r) => !r.is_read).length, [rows]);
  const dateLocale = locale === 'km' ? 'km-KH' : 'en-GB';

  const handleDelete = async (id: string) => {
    try {
      await notificationsAPI.adminDelete(id);
      setRows((prev) => prev.filter((r) => String(r.id) !== String(id)));
      toast.success(t('notifCenter.toastDeleted'));
    } catch {
      toast.error(t('notifCenter.toastDeleteFail') !== 'notifCenter.toastDeleteFail'
        ? t('notifCenter.toastDeleteFail')
        : 'Delete failed');
    }
  };

  const handleExportCsv = () => {
    if (rows.length === 0) {
      toast.message('No notifications to export');
      return;
    }
    const header = ['id', 'title', 'message', 'type', 'user_email', 'user_role', 'is_read', 'created_at'];
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...rows.map((r) => [
        r.id,
        r.title,
        r.message,
        r.type,
        r.user_email ?? '',
        r.user_role ?? '',
        r.is_read,
        r.created_at,
      ].map(escape).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notifications-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} row(s)`);
  };

  return (
    <div className="enforcement-page enforcement-page--notifications notif-center notif-list-page">
      <div className="enforcement-page__hero notif-center__hero--compact">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner notif-center__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Bell size={14} /></span>
              {t('pages.notifications.listEyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.notifications.listTitle')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.notifications.listSubtitle')}</p>
          </div>
          <div className="notif-center__hero-actions">
            <Button type="button" variant="outline" className="notif-center__btn-ghost" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {t('common.refresh') !== 'common.refresh' ? t('common.refresh') : 'Refresh'}
            </Button>
            <Button type="button" className="notif-center__btn-primary" onClick={() => navigate('/admin/notifications/send')}>
              <Plus size={15} />
              {t('notifCenter.actionNew')}
            </Button>
            <Button type="button" variant="outline" className="notif-center__btn-ghost" onClick={handleExportCsv} disabled={loading || rows.length === 0}>
              <Download size={15} />
              {t('notifCenter.actionExport') !== 'notifCenter.actionExport' ? t('notifCenter.actionExport') : 'Export'}
            </Button>
          </div>
        </div>
      </div>

      <div className="enforcement-page__toolbar notif-list__toolbar">
        <div className="notif-list__toolbar-row">
          <div className="notif-list__search">
            <label className="enforcement-page__search notif-center__search-field">
              <Search size={15} aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('notifCenter.searchPlaceholder') !== 'notifCenter.searchPlaceholder'
                  ? t('notifCenter.searchPlaceholder')
                  : 'Search notifications…'}
                aria-label="Search notifications"
              />
            </label>
          </div>
          <div className="notif-list__filters">
            <FilterSelect
              value={type}
              onValueChange={setType}
              options={[
                { value: 'all', label: 'All types' },
                { value: 'system', label: 'System' },
                { value: 'fine', label: 'Fine' },
                { value: 'violation', label: 'Violation' },
                { value: 'detection', label: 'Detection' },
                { value: 'alert', label: 'Alert' },
                { value: 'payment', label: 'Payment' },
                { value: 'appeal', label: 'Appeal' },
              ]}
              ariaLabel="Type"
              size="sm"
              tone="blue"
            />
            <FilterSelect
              value={role}
              onValueChange={setRole}
              options={[
                { value: 'all', label: 'All roles' },
                { value: 'driver', label: 'Drivers' },
                { value: 'police', label: 'Officers' },
                { value: 'admin', label: 'Admins' },
              ]}
              ariaLabel="Role"
              size="sm"
              tone="teal"
            />
          </div>
        </div>
      </div>

      <section className="enforcement-page__panel enforcement-page__panel--notifications notif-list__panel">
        <div className="notif-list__panel-head">
          <div>
            <h2 className="notif-list__panel-title">Delivery log</h2>
            <p className="notif-list__panel-subtitle">
              {loading
                ? 'Loading live notifications…'
                : `${rows.length} notification${rows.length === 1 ? '' : 's'} · ${unreadCount} unread`}
            </p>
          </div>
        </div>

        <div className="enforcement-page__table-wrap notif-list__table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={headers.length}>
                    <div className="notif-list__loading">
                      <Loader2 className="animate-spin" size={18} />
                      Loading from API…
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableEmptyState
                  colSpan={headers.length}
                  tone="blue"
                  icon={<Bell size={28} />}
                  title={t('notifCenter.emptyTitle') !== 'notifCenter.emptyTitle'
                    ? t('notifCenter.emptyTitle')
                    : 'No notifications in database'}
                  subtitle={t('notifCenter.emptyDesc') !== 'notifCenter.emptyDesc'
                    ? t('notifCenter.emptyDesc')
                    : 'Send a broadcast or wait for fines/violations to create live notifications.'}
                />
              ) : (
                filtered.map((row) => (
                  <TableRow key={String(row.id)} className="notif-list__row">
                    <TableCell className="notif-list__cell-title">
                      <button
                        type="button"
                        className="notif-center__title-link"
                        onClick={() => navigate(`/admin/notifications/details/${row.id}`)}
                      >
                        {row.title}
                      </button>
                      <div className="notif-list__message">{row.message}</div>
                    </TableCell>
                    <TableCell className="notif-list__cell-recipient">
                      <div className="notif-list__recipient-name">{row.user_name || row.user_email || '—'}</div>
                      <div className="notif-list__recipient-meta">
                        {[roleLabel(row.user_role), row.user_email].filter(Boolean).join(' · ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="notif-list__pill notif-list__pill--channel">in-app</span>
                    </TableCell>
                    <TableCell className="notif-list__cell-date">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString(dateLocale, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`notif-list__pill notif-list__pill--status ${row.is_read ? 'is-read' : 'is-unread'}`}>
                        {row.is_read ? 'Read' : 'Unread'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <CrudRowActions
                        className="notif-list__actions"
                        onView={() => navigate(`/admin/notifications/details/${row.id}`)}
                        onDelete={() => void handleDelete(String(row.id))}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
