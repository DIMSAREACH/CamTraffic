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

export function NotificationListPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminNotifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('all');
  const [role, setRole] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsAPI.adminList({
        q: search.trim() || undefined,
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
  }, [search, type, role, t]);

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

  return (
    <div className="enforcement-page enforcement-page--notifications notif-center">
      <div className="enforcement-page__hero">
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
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {t('common.refresh') !== 'common.refresh' ? t('common.refresh') : 'Refresh'}
            </Button>
            <Button type="button" onClick={() => navigate('/admin/notifications/send')}>
              <Plus size={15} />
              {t('notifCenter.actionNew')}
            </Button>
            <Button type="button" variant="outline" onClick={() => toast.message('Export uses live DB rows — copy from table or use audit export')}>
              <Download size={15} />
              {t('notifCenter.actionExport') !== 'notifCenter.actionExport' ? t('notifCenter.actionExport') : 'Export'}
            </Button>
          </div>
        </div>
      </div>

      <div className="notif-center__filters">
        <div className="notif-center__search">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('notifCenter.searchPlaceholder') !== 'notifCenter.searchPlaceholder'
              ? t('notifCenter.searchPlaceholder')
              : 'Search title, message, email…'}
          />
        </div>
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
          tone="teal"
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

      <div className="enforcement-page__table-wrap">
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
                  <div className="flex items-center gap-2 p-6 text-muted-foreground">
                    <Loader2 className="animate-spin" size={18} /> Loading from API…
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
                <TableRow key={String(row.id)}>
                  <TableCell>
                    <button
                      type="button"
                      className="notif-center__title-link"
                      onClick={() => navigate(`/admin/notifications/details/${row.id}`)}
                    >
                      {row.title}
                    </button>
                    <div className="text-xs text-muted-foreground line-clamp-1">{row.message}</div>
                  </TableCell>
                  <TableCell>
                    <div>{row.user_name || row.user_email || '—'}</div>
                    <div className="text-xs text-muted-foreground">{row.user_role} · {row.user_email}</div>
                  </TableCell>
                  <TableCell>in-app</TableCell>
                  <TableCell>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</TableCell>
                  <TableCell>{row.is_read ? 'read' : 'unread'}</TableCell>
                  <TableCell>
                    <CrudRowActions
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
    </div>
  );
}
