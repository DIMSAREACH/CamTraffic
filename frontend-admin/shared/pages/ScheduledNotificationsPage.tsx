import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CalendarClock } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { useLanguage } from '@shared/context/LanguageContext';
import {
  SCHEDULED_NOTIFICATIONS,
  type ScheduledNotification,
} from '@shared/constants/notificationCatalog';
import { notifStatusBadgeStyle } from '@shared/utils/notifStatusBadge';
import { toast } from 'sonner';

export function ScheduledNotificationsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ScheduledNotification[]>(SCHEDULED_NOTIFICATIONS);

  const headers = [
    t('notifCenter.colTitle'),
    t('notifCenter.colRecipient'),
    t('notifCenter.colSchedule'),
    t('notifCenter.colChannel'),
    t('notifCenter.colStatus'),
    t('notifCenter.colActions'),
  ];

  const handleDelete = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success(t('notifCenter.toastScheduleDeleted'));
  };

  return (
    <div className="enforcement-page enforcement-page--notifications notif-center">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><CalendarClock size={14} /></span>
              {t('pages.notifications.scheduledEyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.notifications.scheduledTitle')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.notifications.scheduledSubtitle')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--notifications">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid notif-center__table--scheduled">
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
              {rows.length === 0 ? (
                <TableEmptyState
                  colSpan={headers.length}
                  tone="blue"
                  icon={<CalendarClock size={28} />}
                  title={t('notifCenter.emptyList')}
                />
              ) : rows.map((row) => (
                <TableRow key={row.id} className="enforcement-page__table-row">
                  <TableCell>
                    <p className="enforcement-page__cell-primary">{row.title}</p>
                    <p className="enforcement-page__cell-secondary">{t(`notifCenter.type.${row.type}`)}</p>
                  </TableCell>
                  <TableCell>
                    <p className="enforcement-page__cell-body">{t(`notifCenter.role.${row.recipientRole}`)}</p>
                  </TableCell>
                  <TableCell>
                    <p className="enforcement-page__cell-body">{row.schedule}</p>
                  </TableCell>
                  <TableCell>
                    <span className="enforcement-page__code-pill">
                      {row.channels.map((c) => t(`notifCenter.channel.${c}`)).join(', ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="enforcement-page__badge"
                      style={notifStatusBadgeStyle(row.status)}
                    >
                      {row.status === 'active' ? t('notifCenter.scheduleActive') : t('notifCenter.scheduleDisabled')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="enforcement-page__table-actions">
                      <CrudRowActions
                        onEdit={() => {
                          toast.message(t('notifCenter.toastScheduleEdit'));
                          navigate('/admin/notifications/send');
                        }}
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
