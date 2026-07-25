import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CalendarClock, CheckCircle2, FileDown, FileSpreadsheet, FileText,
  Mail, PauseCircle, Pencil, Play, Plus, Power, PowerOff, Search, Trash2,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import { useLanguage } from '@shared/context/LanguageContext';
import { USER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';
import { usePagination } from '@shared/hooks/usePagination';
import {
  REPORT_CATEGORIES,
  SCHEDULED_REPORTS,
  type ReportCategory,
  type ReportFormat,
  type ScheduleFrequency,
  type ScheduledReport,
} from '@shared/constants/reportCatalog';
import { toast } from 'sonner';

function formatIcon(format: ReportFormat) {
  if (format === 'Excel') return <FileSpreadsheet size={14} aria-hidden />;
  if (format === 'CSV') return <FileDown size={14} aria-hidden />;
  return <FileText size={14} aria-hidden />;
}

export function ScheduledReportsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ScheduledReport[]>(SCHEDULED_REPORTS);
  const [search, setSearch] = useState('');
  const [frequency, setFrequency] = useState<ScheduleFrequency | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [category, setCategory] = useState<ReportCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (frequency !== 'all' && row.frequency !== frequency) return false;
      if (status !== 'all' && row.status !== status) return false;
      if (category !== 'all' && row.category !== category) return false;
      if (
        q
        && !row.reportName.toLowerCase().includes(q)
        && !row.recipients.some((r) => r.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [rows, search, frequency, status, category]);

  const pagination = usePagination(filtered);

  const kpis = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.status === 'active').length,
    disabled: rows.filter((r) => r.status === 'disabled').length,
    upcoming: rows
      .filter((r) => r.status === 'active')
      .slice()
      .sort((a, b) => a.nextRun.localeCompare(b.nextRun))[0]?.nextRun ?? '—',
  }), [rows]);

  const categoryLabel = (cat: ReportCategory) => {
    const key = REPORT_CATEGORIES.find((c) => c.value === cat)?.labelKey;
    return key ? t(key) : cat;
  };

  const toggleStatus = (id: string) => {
    setRows((prev) => prev.map((row) => (
      row.id === id
        ? { ...row, status: row.status === 'active' ? 'disabled' : 'active' }
        : row
    )));
    toast.success(t('reports.scheduleStatusUpdated'));
  };

  const runNow = (row: ScheduledReport) => {
    toast.success(t('reports.scheduleRunNow', { name: row.reportName }));
  };

  const handleDelete = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success(t('reports.scheduleDeleted'));
  };

  return (
    <div className="enforcement-page enforcement-page--reports dashboard-page--reports reports-page--enterprise scheduled-reports-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner reports-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><CalendarClock size={14} /></span>
              {t('pages.reports.scheduledEyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.reports.scheduledTitle')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.reports.scheduledSubtitle')}</p>
          </div>
          <div className="reports-page__hero-actions">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--teal"
              onClick={() => toast.message(t('reports.scheduleEditHint'))}
            >
              <Plus size={15} aria-hidden />
              {t('reports.scheduleNew')}
            </button>
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
              onClick={() => navigate(USER_PORTAL_ROUTES.reportsCenter)}
            >
              <FileText size={15} aria-hidden />
              {t('reports.openReportCenter')}
            </button>
          </div>
        </div>
      </div>

      <section className="enforcement-page__stat-grid enforcement-page__stat-grid--four" aria-label={t('reports.scheduleSummary')}>
        <article className="enforcement-page__stat-card enforcement-page__stat-card--blue">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue"><CalendarClock size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{kpis.total}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">{t('reports.kpiTotalSchedules')}</p>
          </div>
        </article>
        <article className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald"><CheckCircle2 size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{kpis.active}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">{t('reports.kpiActiveSchedules')}</p>
          </div>
        </article>
        <article className="enforcement-page__stat-card enforcement-page__stat-card--amber">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--amber"><PauseCircle size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{kpis.disabled}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--amber">{t('reports.kpiDisabledSchedules')}</p>
          </div>
        </article>
        <article className="enforcement-page__stat-card enforcement-page__stat-card--teal">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--teal"><Play size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value scheduled-reports-page__next-value">{kpis.upcoming}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--teal">{t('reports.kpiNextRun')}</p>
          </div>
        </article>
      </section>

      <div className="enforcement-page__toolbar scheduled-reports-page__toolbar">
        <div className="scheduled-reports-page__toolbar-row">
          <div className="enforcement-page__search-wrap scheduled-reports-page__search">
            <Search size={14} className="enforcement-page__search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('reports.scheduleSearchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
          <div className="enforcement-page__filters scheduled-reports-page__filters">
            <FilterSelect
              tone="blue"
              value={category}
              onValueChange={(v) => setCategory(v as ReportCategory | 'all')}
              ariaLabel={t('reports.filterAllCategories')}
              options={REPORT_CATEGORIES.map((c) => ({ value: c.value, label: t(c.labelKey) }))}
            />
            <FilterSelect
              tone="teal"
              value={frequency}
              onValueChange={(v) => setFrequency(v as ScheduleFrequency | 'all')}
              ariaLabel={t('reports.filterAllFrequencies')}
              options={[
                { value: 'all', label: t('reports.filterAllFrequencies') },
                { value: 'daily', label: t('reports.freq.daily') },
                { value: 'weekly', label: t('reports.freq.weekly') },
                { value: 'monthly', label: t('reports.freq.monthly') },
                { value: 'quarterly', label: t('reports.freq.quarterly') },
              ]}
            />
            <FilterSelect
              tone="purple"
              value={status}
              onValueChange={(v) => setStatus(v as typeof status)}
              ariaLabel={t('reports.filterAllStatuses')}
              options={[
                { value: 'all', label: t('reports.filterAllStatuses') },
                { value: 'active', label: t('reports.scheduleActive') },
                { value: 'disabled', label: t('reports.scheduleDisabled') },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--reports scheduled-reports-page__panel">
        <div className="mgmt-table__scroll scheduled-reports-page__scroll">
          <Table className="enforcement-page__table mgmt-table__grid scheduled-reports-page__table">
            <colgroup>
              <col className="scheduled-reports-page__col--name" />
              <col className="scheduled-reports-page__col--freq" />
              <col className="scheduled-reports-page__col--recipients" />
              <col className="scheduled-reports-page__col--format" />
              <col className="scheduled-reports-page__col--next" />
              <col className="scheduled-reports-page__col--status" />
              <col className="scheduled-reports-page__col--actions" />
            </colgroup>
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                <TableHead className="enforcement-page__th text-left">{t('reports.scheduleReportName')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{t('reports.scheduleFrequency')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{t('reports.scheduleRecipients')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{t('reports.scheduleFormat')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{t('reports.scheduleNextRun')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{t('reports.colStatus')}</TableHead>
                <TableHead className="enforcement-page__th text-right">{t('reports.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.pageItems.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  tone="teal"
                  icon={<CalendarClock size={28} />}
                  title={t('reports.scheduleEmpty')}
                  subtitle={t('reports.scheduleEmptyHint')}
                  action={{
                    label: t('reports.scheduleNew'),
                    onClick: () => toast.message(t('reports.scheduleEditHint')),
                    icon: <Plus size={15} />,
                  }}
                />
              ) : pagination.pageItems.map((row) => (
                <TableRow
                  key={row.id}
                  className={`enforcement-page__table-row${row.status === 'disabled' ? ' scheduled-reports-page__row--disabled' : ''}`}
                >
                  <TableCell>
                    <div className="scheduled-reports-page__name-cell">
                      <span className={`scheduled-reports-page__avatar scheduled-reports-page__avatar--${row.format.toLowerCase()}`} aria-hidden>
                        {formatIcon(row.format)}
                      </span>
                      <div className="mgmt-table__stack">
                        <p className="mgmt-table__stack-title scheduled-reports-page__report-title" title={row.reportName}>
                          {row.reportName}
                        </p>
                        <p className="mgmt-table__stack-meta">{categoryLabel(row.category)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`scheduled-reports-page__freq scheduled-reports-page__freq--${row.frequency}`}>
                      {t(`reports.freq.${row.frequency}`)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="scheduled-reports-page__recipients" title={row.recipients.join(', ')}>
                      <Mail size={13} aria-hidden />
                      <span>{row.recipients.join(', ')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="enforcement-page__code-pill scheduled-reports-page__format">
                      {formatIcon(row.format)}
                      {row.format}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="mgmt-table__date">{row.nextRun}</p>
                  </TableCell>
                  <TableCell>
                    <span className={`reports-page__schedule-status reports-page__schedule-status--${row.status}`}>
                      {row.status === 'active' ? t('reports.scheduleActive') : t('reports.scheduleDisabled')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="enforcement-page__table-actions mgmt-table__actions crud-actions">
                      <button
                        type="button"
                        className="crud-actions__btn crud-actions__btn--edit"
                        onClick={() => toast.message(t('reports.scheduleEditHint'))}
                        aria-label={t('reports.scheduleEdit')}
                        title={t('reports.scheduleEdit')}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className={`crud-actions__btn ${row.status === 'active' ? 'crud-actions__btn--power-off' : 'crud-actions__btn--resolve'}`}
                        onClick={() => toggleStatus(row.id)}
                        aria-label={row.status === 'active' ? t('reports.scheduleDisable') : t('reports.scheduleEnable')}
                        title={row.status === 'active' ? t('reports.scheduleDisable') : t('reports.scheduleEnable')}
                      >
                        {row.status === 'active' ? <PowerOff size={13} /> : <Power size={13} />}
                      </button>
                      <button
                        type="button"
                        className="crud-actions__btn crud-actions__btn--download"
                        onClick={() => runNow(row)}
                        disabled={row.status !== 'active'}
                        aria-label={t('reports.scheduleRun')}
                        title={t('reports.scheduleRun')}
                      >
                        <Play size={13} />
                      </button>
                      <button
                        type="button"
                        className="crud-actions__btn crud-actions__btn--delete"
                        onClick={() => handleDelete(row.id)}
                        aria-label={t('common.delete')}
                        title={t('common.delete')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.reports" />
      </div>
    </div>
  );
}
