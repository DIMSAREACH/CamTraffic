import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CheckCircle2, Clock, FileDown, FileSpreadsheet, FileText,
  Loader2, Plus, Printer, Search, XCircle, Download,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { USER_PORTAL_ROUTES } from '@shared/constants/userPortalPaths';
import { useLanguage } from '@shared/context/LanguageContext';
import { usePagination } from '@shared/hooks/usePagination';
import {
  CATALOG_REPORTS,
  REPORT_CATEGORIES,
  type CatalogReport,
  type ReportCategory,
  type ReportFormat,
  type ReportStatus,
} from '@shared/constants/reportCatalog';
import { toast } from 'sonner';

const STATUS_META: Record<ReportStatus, { bg: string; color: string; icon: typeof CheckCircle2 }> = {
  ready: { bg: 'rgba(16,185,129,0.12)', color: '#059669', icon: CheckCircle2 },
  generating: { bg: 'rgba(37,99,235,0.12)', color: '#2563eb', icon: Loader2 },
  failed: { bg: 'rgba(239,68,68,0.12)', color: '#dc2626', icon: XCircle },
  scheduled: { bg: 'rgba(245,158,11,0.14)', color: '#d97706', icon: Clock },
};

function formatIcon(format: ReportFormat) {
  if (format === 'Excel') return <FileSpreadsheet size={14} aria-hidden />;
  if (format === 'CSV') return <FileDown size={14} aria-hidden />;
  return <FileText size={14} aria-hidden />;
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'RP';
}

export function ReportCenterPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ReportCategory | 'all'>('all');
  const [status, setStatus] = useState<ReportStatus | 'all'>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [rows, setRows] = useState<CatalogReport[]>(CATALOG_REPORTS);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== 'all' && row.category !== category) return false;
      if (status !== 'all' && row.status !== status) return false;
      if (datePreset === 'today' && row.dateLabel !== 'Today') return false;
      if (datePreset === 'week' && !['Today', 'Yesterday', '2 days ago', '3 days ago'].includes(row.dateLabel)) {
        return false;
      }
      if (datePreset === 'month' && !['Today', 'Yesterday', '2 days ago', '3 days ago', 'Last week'].includes(row.dateLabel)) {
        return false;
      }
      if (q && !row.name.toLowerCase().includes(q) && !row.createdBy.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, category, status, datePreset]);

  const pagination = usePagination(filtered);

  const kpis = useMemo(() => ({
    total: rows.length,
    ready: rows.filter((r) => r.status === 'ready').length,
    generating: rows.filter((r) => r.status === 'generating').length,
    failed: rows.filter((r) => r.status === 'failed').length,
  }), [rows]);

  const categoryLabel = (cat: ReportCategory) => {
    const key = REPORT_CATEGORIES.find((c) => c.value === cat)?.labelKey;
    return key ? t(key) : cat;
  };

  const statusLabel = (s: ReportStatus) => {
    const map: Record<ReportStatus, string> = {
      ready: t('reports.statusReady'),
      generating: t('reports.statusGenerating'),
      failed: t('reports.statusFailed'),
      scheduled: t('reports.statusScheduled'),
    };
    return map[s];
  };

  const handleDelete = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success(t('reports.centerDeleted'));
  };

  const handleDownload = (row: CatalogReport) => {
    if (row.status === 'failed') {
      toast.error(t('reports.centerDownloadFailed'));
      return;
    }
    if (row.status === 'generating') {
      toast.message(t('reports.centerDownloadPending'));
      return;
    }
    toast.success(t('reports.centerDownloadReady', { name: row.name, format: row.format }));
  };

  return (
    <div className="enforcement-page enforcement-page--reports dashboard-page--reports reports-page--enterprise report-center-page">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner reports-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><FileText size={14} /></span>
              {t('pages.reports.centerEyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.reports.centerTitle')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.reports.centerSubtitle')}</p>
          </div>
          <div className="reports-page__hero-actions">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--teal"
              onClick={() => navigate(USER_PORTAL_ROUTES.reports)}
            >
              <Plus size={15} aria-hidden />
              {t('reports.actionGenerate')}
            </button>
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
              onClick={() => toast.message(t('reports.centerExportAllHint'))}
            >
              <Download size={15} aria-hidden />
              {t('reports.actionExport')}
            </button>
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
              onClick={() => window.print()}
            >
              <Printer size={15} aria-hidden />
              {t('reports.actionPrint')}
            </button>
          </div>
        </div>
      </div>

      <section className="enforcement-page__stat-grid enforcement-page__stat-grid--four" aria-label={t('reports.centerSummary')}>
        <article className="enforcement-page__stat-card enforcement-page__stat-card--blue">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue"><FileText size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{kpis.total}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">{t('reports.kpiTotalReports')}</p>
          </div>
        </article>
        <article className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald"><CheckCircle2 size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{kpis.ready}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">{t('reports.kpiReady')}</p>
          </div>
        </article>
        <article className="enforcement-page__stat-card enforcement-page__stat-card--violet">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--violet"><Loader2 size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{kpis.generating}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--violet">{t('reports.kpiGenerating')}</p>
          </div>
        </article>
        <article className="enforcement-page__stat-card enforcement-page__stat-card--rose">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--rose"><XCircle size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{kpis.failed}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--rose">{t('reports.kpiFailed')}</p>
          </div>
        </article>
      </section>

      <div className="enforcement-page__toolbar report-center-page__toolbar">
        <div className="report-center-page__toolbar-row">
          <div className="enforcement-page__search-wrap report-center-page__search">
            <Search size={14} className="enforcement-page__search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('reports.centerSearchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
          <div className="enforcement-page__filters report-center-page__filters">
            <FilterSelect
              tone="blue"
              value={category}
              onValueChange={(v) => setCategory(v as ReportCategory | 'all')}
              ariaLabel={t('reports.filterAllCategories')}
              options={REPORT_CATEGORIES.map((c) => ({ value: c.value, label: t(c.labelKey) }))}
            />
            <FilterSelect
              tone="teal"
              value={datePreset}
              onValueChange={(v) => setDatePreset(v as typeof datePreset)}
              ariaLabel={t('reports.filterAllDates')}
              options={[
                { value: 'all', label: t('reports.filterAllDates') },
                { value: 'today', label: t('reports.filterToday') },
                { value: 'week', label: t('reports.filterThisWeek') },
                { value: 'month', label: t('reports.filterThisMonth') },
              ]}
            />
            <FilterSelect
              tone="purple"
              value={status}
              onValueChange={(v) => setStatus(v as ReportStatus | 'all')}
              ariaLabel={t('reports.filterAllStatuses')}
              options={[
                { value: 'all', label: t('reports.filterAllStatuses') },
                { value: 'ready', label: t('reports.statusReady') },
                { value: 'generating', label: t('reports.statusGenerating') },
                { value: 'failed', label: t('reports.statusFailed') },
                { value: 'scheduled', label: t('reports.statusScheduled') },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--reports report-center-page__panel">
        <div className="mgmt-table__scroll report-center-page__scroll">
          <Table className="enforcement-page__table mgmt-table__grid report-center-page__table">
            <colgroup>
              <col className="report-center-page__col--name" />
              <col className="report-center-page__col--category" />
              <col className="report-center-page__col--user" />
              <col className="report-center-page__col--date" />
              <col className="report-center-page__col--format" />
              <col className="report-center-page__col--status" />
              <col className="report-center-page__col--actions" />
            </colgroup>
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                <TableHead className="enforcement-page__th text-left">{t('reports.colReportName')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{t('reports.colCategory')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{t('reports.colCreatedBy')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{t('reports.colDate')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{t('reports.colFormat')}</TableHead>
                <TableHead className="enforcement-page__th text-left">{t('reports.colStatus')}</TableHead>
                <TableHead className="enforcement-page__th text-right">{t('reports.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.pageItems.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  tone="teal"
                  icon={<FileText size={28} />}
                  title={t('reports.centerEmpty')}
                  subtitle={t('reports.centerEmptyHint')}
                  action={{
                    label: t('reports.actionGenerate'),
                    onClick: () => navigate(USER_PORTAL_ROUTES.reports),
                    icon: <Plus size={15} />,
                  }}
                />
              ) : pagination.pageItems.map((row) => {
                const st = STATUS_META[row.status];
                const StatusIcon = st.icon;
                return (
                  <TableRow key={row.id} className="enforcement-page__table-row">
                    <TableCell>
                      <div className="report-center-page__name-cell">
                        <span className={`report-center-page__avatar report-center-page__avatar--${row.format.toLowerCase()}`} aria-hidden>
                          {formatIcon(row.format)}
                        </span>
                        <div className="mgmt-table__stack">
                          <p className="mgmt-table__stack-title report-center-page__report-title" title={row.name}>
                            {row.name}
                          </p>
                          <p className="mgmt-table__stack-meta">{row.period}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`reports-page__cat-pill reports-page__cat-pill--${row.category}`}>
                        {categoryLabel(row.category)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="report-center-page__user-cell">
                        <span className="report-center-page__user-avatar" aria-hidden>
                          {initials(row.createdBy)}
                        </span>
                        <span className="enforcement-page__cell-body report-center-page__user-name">{row.createdBy}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="mgmt-table__stack">
                        <p className="mgmt-table__date">{row.dateLabel}</p>
                        <p className="mgmt-table__stack-meta">{row.generatedAt}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__code-pill report-center-page__format">
                        {formatIcon(row.format)}
                        {row.format}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__badge" style={{ background: st.bg, color: st.color }}>
                        <StatusIcon size={11} className={row.status === 'generating' ? 'animate-spin' : undefined} />
                        {statusLabel(row.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="enforcement-page__table-actions mgmt-table__actions">
                        <CrudRowActions
                          onView={() => navigate(`${USER_PORTAL_ROUTES.reports}/details/${row.id}`)}
                          onDelete={() => handleDelete(row.id)}
                          onDownload={() => handleDownload(row)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.reports" />
      </div>
    </div>
  );
}
