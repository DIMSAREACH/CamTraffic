import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, Download, Plus, Search } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { useLanguage } from '@shared/context/LanguageContext';
import {
  ENTERPRISE_NOTIFICATIONS,
  type EnterpriseNotifType,
  type EnterpriseNotification,
  type NotifDeliveryStatus,
  type NotifRecipientRole,
} from '@shared/constants/notificationCatalog';
import { notifStatusBadgeStyle } from '@shared/utils/notifStatusBadge';
import { toast } from 'sonner';

export function NotificationListPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [rows, setRows] = useState<EnterpriseNotification[]>(ENTERPRISE_NOTIFICATIONS);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<EnterpriseNotifType | 'all'>('all');
  const [status, setStatus] = useState<NotifDeliveryStatus | 'all'>('all');
  const [recipient, setRecipient] = useState<NotifRecipientRole | 'all' | 'broadcast'>('all');

  const headers = [
    t('notifCenter.colTitle'),
    t('notifCenter.colRecipient'),
    t('notifCenter.colChannel'),
    t('notifCenter.colSentDate'),
    t('notifCenter.colStatus'),
    t('notifCenter.colActions'),
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (type !== 'all' && row.type !== type) return false;
      if (status !== 'all' && row.status !== status) return false;
      if (recipient === 'broadcast') {
        if (row.recipientRole !== 'all') return false;
      } else if (recipient !== 'all' && row.recipientRole !== recipient) {
        return false;
      }
      if (q && !row.title.toLowerCase().includes(q) && !row.recipientName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [rows, search, type, status, recipient]);

  const handleDelete = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success(t('notifCenter.toastDeleted'));
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
            <Button type="button" onClick={() => navigate('/admin/notifications/send')}>
              <Plus size={15} />
              {t('notifCenter.actionNew')}
            </Button>
            <Button type="button" variant="outline" onClick={() => toast.message(t('notifCenter.toastExport'))}>
              <Download size={15} />
              {t('notifCenter.actionExport')}
            </Button>
          </div>
        </div>
      </div>

      <div className="enforcement-page__toolbar notif-list__toolbar">
        <div className="notif-list__toolbar-row">
          <div className="enforcement-page__search-wrap notif-list__search">
            <Search size={14} className="enforcement-page__search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('notifCenter.searchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
          <div className="enforcement-page__filters notif-list__filters">
            <FilterSelect
              tone="blue"
              value={type}
              onValueChange={(v) => setType(v as EnterpriseNotifType | 'all')}
              ariaLabel={t('notifCenter.filterAllTypes')}
              options={[
                { value: 'all', label: t('notifCenter.filterAllTypes') },
                { value: 'violation', label: t('notifCenter.type.violation') },
                { value: 'ai', label: t('notifCenter.type.ai') },
                { value: 'payment', label: t('notifCenter.type.payment') },
                { value: 'appeal', label: t('notifCenter.type.appeal') },
                { value: 'camera', label: t('notifCenter.type.camera') },
                { value: 'system', label: t('notifCenter.type.system') },
                { value: 'security', label: t('notifCenter.type.security') },
                { value: 'maintenance', label: t('notifCenter.type.maintenance') },
              ]}
            />
            <FilterSelect
              tone="teal"
              value={status}
              onValueChange={(v) => setStatus(v as NotifDeliveryStatus | 'all')}
              ariaLabel={t('notifCenter.filterAllStatuses')}
              options={[
                { value: 'all', label: t('notifCenter.filterAllStatuses') },
                { value: 'sent', label: t('notifCenter.status.sent') },
                { value: 'delivered', label: t('notifCenter.status.delivered') },
                { value: 'read', label: t('notifCenter.status.read') },
                { value: 'failed', label: t('notifCenter.status.failed') },
                { value: 'scheduled', label: t('notifCenter.status.scheduled') },
              ]}
            />
            <FilterSelect
              tone="purple"
              value={recipient}
              onValueChange={(v) => setRecipient(v as NotifRecipientRole | 'all' | 'broadcast')}
              ariaLabel={t('notifCenter.filterAllRecipients')}
              options={[
                { value: 'all', label: t('notifCenter.filterAllRecipients') },
                { value: 'driver', label: t('notifCenter.role.driver') },
                { value: 'officer', label: t('notifCenter.role.officer') },
                { value: 'admin', label: t('notifCenter.role.admin') },
                { value: 'broadcast', label: t('notifCenter.role.all') },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--notifications">
        <div className="notif-list__panel-head">
          <div>
            <p className="notif-list__panel-title">{t('pages.notifications.listTitle')}</p>
            <p className="notif-list__panel-subtitle">
              {t('notifCenter.shownCount').replace('{count}', String(filtered.length))}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid notif-center__table--6col">
            <colgroup>
              <col />
              <col />
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {headers.map((h) => (
                  <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableEmptyState
                  colSpan={headers.length}
                  tone="blue"
                  icon={<Bell size={28} />}
                  title={t('notifCenter.emptyList')}
                />
              ) : filtered.map((row) => (
                <TableRow key={row.id} className="enforcement-page__table-row">
                  <TableCell>
                    <p className="enforcement-page__cell-primary" title={row.title}>{row.title}</p>
                    <p className="enforcement-page__cell-secondary">{t(`notifCenter.type.${row.type}`)}</p>
                  </TableCell>
                  <TableCell>
                    <p className="enforcement-page__cell-body">{t(`notifCenter.role.${row.recipientRole}`)}</p>
                    {row.recipientName ? (
                      <p className="enforcement-page__cell-secondary" title={row.recipientName}>{row.recipientName}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span className="enforcement-page__code-pill">
                      {row.channels.map((c) => t(`notifCenter.channel.${c}`)).join(', ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="enforcement-page__cell-body">{row.sentLabel}</p>
                  </TableCell>
                  <TableCell>
                    <span className="enforcement-page__badge" style={notifStatusBadgeStyle(row.status)}>
                      {t(`notifCenter.status.${row.status}`)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="enforcement-page__table-actions">
                      <CrudRowActions
                        onView={() => navigate(`/admin/notifications/details/${row.id}`)}
                        onDelete={() => handleDelete(row.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
