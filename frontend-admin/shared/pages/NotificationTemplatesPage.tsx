import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell, Download, FileText, LayoutTemplate, Mail, Plus, Radio, Search, Layers,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@shared/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { EntityDetailField, EntityViewDialog } from '@shared/components/admin/EntityViewDialog';
import { useLanguage } from '@shared/context/LanguageContext';
import { usePagination } from '@shared/hooks/usePagination';
import {
  CATALOG_TEMPLATES,
  type CatalogTemplate,
  type EnterpriseNotifType,
  type NotifChannel,
} from '@shared/constants/notificationCatalog';
import { cn } from '@shared/components/ui/utils';
import { toast } from 'sonner';

const CATALOG_STORAGE_KEY = 'camtraffic_notification_catalog_templates';

const TYPE_OPTIONS: EnterpriseNotifType[] = [
  'violation', 'payment', 'appeal', 'ai', 'camera', 'system', 'security', 'maintenance',
];

const CHANNEL_OPTIONS: NotifChannel[] = ['system', 'email', 'push', 'sms'];

const TYPE_BADGE: Record<EnterpriseNotifType, { bg: string; color: string; soft: string }> = {
  violation: { bg: 'rgba(239,68,68,0.12)', color: '#dc2626', soft: 'rgba(239,68,68,0.08)' },
  payment: { bg: 'rgba(245,158,11,0.14)', color: '#d97706', soft: 'rgba(245,158,11,0.08)' },
  appeal: { bg: 'rgba(139,92,246,0.12)', color: '#7c3aed', soft: 'rgba(139,92,246,0.08)' },
  ai: { bg: 'rgba(37,99,235,0.12)', color: '#2563eb', soft: 'rgba(37,99,235,0.08)' },
  camera: { bg: 'rgba(14,165,233,0.12)', color: '#0284c7', soft: 'rgba(14,165,233,0.08)' },
  system: { bg: 'rgba(100,116,139,0.14)', color: '#475569', soft: 'rgba(100,116,139,0.08)' },
  security: { bg: 'rgba(244,63,94,0.12)', color: '#e11d48', soft: 'rgba(244,63,94,0.08)' },
  maintenance: { bg: 'rgba(16,185,129,0.12)', color: '#059669', soft: 'rgba(16,185,129,0.08)' },
};

const CHANNEL_META: Record<NotifChannel, { bg: string; color: string }> = {
  system: { bg: 'rgba(100,116,139,0.12)', color: '#475569' },
  email: { bg: 'rgba(37,99,235,0.12)', color: '#2563eb' },
  push: { bg: 'rgba(139,92,246,0.12)', color: '#7c3aed' },
  sms: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
};

const emptyForm = {
  name: '',
  type: 'violation' as EnterpriseNotifType,
  channel: 'push' as NotifChannel,
  subject: '',
  body: '',
};

function loadCatalog(): CatalogTemplate[] {
  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (!raw) return [...CATALOG_TEMPLATES];
    const parsed = JSON.parse(raw) as CatalogTemplate[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [...CATALOG_TEMPLATES];
    return parsed;
  } catch {
    return [...CATALOG_TEMPLATES];
  }
}

function persistCatalog(rows: CatalogTemplate[]) {
  localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(rows));
}

export function NotificationTemplatesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<CatalogTemplate[]>(loadCatalog);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<EnterpriseNotifType | 'all'>('all');
  const [channel, setChannel] = useState<NotifChannel | 'all'>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState<CatalogTemplate | null>(null);
  const [deleteRow, setDeleteRow] = useState<CatalogTemplate | null>(null);

  useEffect(() => {
    setRows(loadCatalog());
  }, []);

  const headers = [
    t('notifCenter.colTemplateName'),
    t('notifCenter.colType'),
    t('notifCenter.colChannel'),
    t('notifCenter.colLastUpdated'),
    t('notifCenter.colActions'),
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (type !== 'all' && row.type !== type) return false;
      if (channel !== 'all' && row.channel !== channel) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q)
        || row.subject.toLowerCase().includes(q)
        || row.body.toLowerCase().includes(q)
        || row.type.includes(q)
      );
    });
  }, [rows, search, type, channel]);

  const pagination = usePagination(filtered);

  const kpis = useMemo(() => {
    const channels = new Set(rows.map((r) => r.channel));
    const types = new Set(rows.map((r) => r.type));
    return {
      total: rows.length,
      channels: channels.size,
      types: types.size,
      email: rows.filter((r) => r.channel === 'email').length,
    };
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: CatalogTemplate) => {
    setEditing(row);
    setForm({
      name: row.name,
      type: row.type,
      channel: row.channel,
      subject: row.subject,
      body: row.body,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error(t('notifCenter.validationTemplateName'));
      return;
    }
    if (!form.subject.trim()) {
      toast.error(t('notifCenter.validationTemplateSubject'));
      return;
    }
    if (!form.body.trim()) {
      toast.error(t('notifCenter.validationTemplateBody'));
      return;
    }

    setSaving(true);
    try {
      const next = editing
        ? rows.map((r) => (r.id === editing.id
          ? {
            ...r,
            name: form.name.trim(),
            type: form.type,
            channel: form.channel,
            subject: form.subject.trim(),
            body: form.body.trim(),
            lastUpdated: t('notifCenter.updatedJustNow'),
          }
          : r))
        : [
          {
            id: `tpl-${Date.now()}`,
            name: form.name.trim(),
            type: form.type,
            channel: form.channel,
            subject: form.subject.trim(),
            body: form.body.trim(),
            lastUpdated: t('notifCenter.updatedJustNow'),
          },
          ...rows,
        ];
      setRows(next);
      persistCatalog(next);
      setDialogOpen(false);
      toast.success(editing ? t('notifCenter.toastTemplateUpdated') : t('notifCenter.toastTemplateCreated'));
    } catch {
      toast.error(t('notifCenter.toastTemplateFail'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = useCallback(() => {
    if (!deleteRow) return;
    const next = rows.filter((r) => r.id !== deleteRow.id);
    setRows(next);
    persistCatalog(next);
    setDeleteRow(null);
    toast.success(t('notifCenter.toastTemplateDeleted'));
  }, [deleteRow, rows, t]);

  return (
    <div className="enforcement-page enforcement-page--notifications dashboard-page--notif-templates notif-templates-page notif-templates-page--enterprise">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner notif-templates-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><LayoutTemplate size={14} /></span>
              {t('pages.notifications.templatesEyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.notifications.templatesTitle')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.notifications.templatesSubtitle')}</p>
          </div>
          <div className="notif-templates-page__hero-actions">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--blue"
              onClick={openCreate}
            >
              <Plus size={15} aria-hidden />
              {t('notifCenter.actionNewTemplate')}
            </button>
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
              onClick={() => toast.message(t('notifCenter.toastTemplateExport'))}
            >
              <Download size={15} aria-hidden />
              {t('notifCenter.actionExport')}
            </button>
          </div>
        </div>
      </div>

      <section className="notif-templates-page__kpis" aria-label={t('notifCenter.templatesSummary')}>
        <article className="notif-templates-page__kpi notif-templates-page__kpi--blue">
          <div className="notif-templates-page__kpi-icon" aria-hidden>
            <FileText size={16} />
          </div>
          <div>
            <p className="notif-templates-page__kpi-label">{t('notifCenter.kpiTemplates')}</p>
            <p className="notif-templates-page__kpi-value">{kpis.total}</p>
          </div>
        </article>
        <article className="notif-templates-page__kpi notif-templates-page__kpi--violet">
          <div className="notif-templates-page__kpi-icon" aria-hidden>
            <Layers size={16} />
          </div>
          <div>
            <p className="notif-templates-page__kpi-label">{t('notifCenter.kpiTemplateTypes')}</p>
            <p className="notif-templates-page__kpi-value">{kpis.types}</p>
          </div>
        </article>
        <article className="notif-templates-page__kpi notif-templates-page__kpi--cyan">
          <div className="notif-templates-page__kpi-icon" aria-hidden>
            <Radio size={16} />
          </div>
          <div>
            <p className="notif-templates-page__kpi-label">{t('notifCenter.kpiChannelsUsed')}</p>
            <p className="notif-templates-page__kpi-value">{kpis.channels}</p>
          </div>
        </article>
        <article className="notif-templates-page__kpi notif-templates-page__kpi--emerald">
          <div className="notif-templates-page__kpi-icon" aria-hidden>
            <Mail size={16} />
          </div>
          <div>
            <p className="notif-templates-page__kpi-label">{t('notifCenter.kpiEmailTemplates')}</p>
            <p className="notif-templates-page__kpi-value">{kpis.email}</p>
          </div>
        </article>
      </section>

      <div className="enforcement-page__toolbar notif-templates-page__toolbar">
        <div className="notif-templates-page__toolbar-row">
          <div className="enforcement-page__search-wrap notif-templates-page__search">
            <Search size={14} className="enforcement-page__search-icon" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('notifCenter.searchTemplates')}
              className="enforcement-page__search"
            />
          </div>
          <div className="enforcement-page__filters notif-templates-page__filters">
            <FilterSelect
              tone="blue"
              value={type}
              onValueChange={(v) => setType(v as EnterpriseNotifType | 'all')}
              ariaLabel={t('notifCenter.filterAllTypes')}
              options={[
                { value: 'all', label: t('notifCenter.filterAllTypes') },
                ...TYPE_OPTIONS.map((opt) => ({
                  value: opt,
                  label: t(`notifCenter.type.${opt}`),
                })),
              ]}
            />
            <FilterSelect
              tone="teal"
              value={channel}
              onValueChange={(v) => setChannel(v as NotifChannel | 'all')}
              ariaLabel={t('notifCenter.filterAllChannels')}
              options={[
                { value: 'all', label: t('notifCenter.filterAllChannels') },
                ...CHANNEL_OPTIONS.map((opt) => ({
                  value: opt,
                  label: t(`notifCenter.channel.${opt}`),
                })),
              ]}
            />
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel notif-templates-page__panel">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid notif-templates-page__table">
            <colgroup>
              <col className="notif-templates-page__col--name" />
              <col className="notif-templates-page__col--type" />
              <col className="notif-templates-page__col--channel" />
              <col className="notif-templates-page__col--updated" />
              <col className="notif-templates-page__col--actions" />
            </colgroup>
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {headers.map((h) => (
                  <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.pageItems.length === 0 ? (
                <TableEmptyState
                  colSpan={headers.length}
                  tone="blue"
                  icon={<Bell size={28} />}
                  title={t('notifCenter.emptyTemplates')}
                  subtitle={t('notifCenter.emptyTemplatesHint')}
                  action={{
                    label: t('notifCenter.actionNewTemplate'),
                    onClick: openCreate,
                    icon: <Plus size={15} />,
                  }}
                />
              ) : pagination.pageItems.map((row) => {
                const badge = TYPE_BADGE[row.type];
                const channelMeta = CHANNEL_META[row.channel];
                return (
                  <TableRow key={row.id} className="enforcement-page__table-row notif-templates-page__row">
                    <TableCell>
                      <div className="notif-templates-page__name-cell">
                        <span
                          className="notif-templates-page__name-icon"
                          style={{ background: badge.soft, color: badge.color }}
                          aria-hidden
                        >
                          <FileText size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="enforcement-page__cell-primary notif-templates-page__truncate" title={row.name}>
                            {row.name}
                          </p>
                          <p className="enforcement-page__cell-secondary notif-templates-page__truncate" title={row.subject}>
                            {row.subject}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="enforcement-page__badge" style={{ background: badge.bg, color: badge.color }}>
                        {t(`notifCenter.type.${row.type}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn('enforcement-page__code-pill notif-templates-page__channel-pill')}
                        style={{ background: channelMeta.bg, color: channelMeta.color }}
                      >
                        {t(`notifCenter.channel.${row.channel}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="enforcement-page__cell-body">{row.lastUpdated}</p>
                    </TableCell>
                    <TableCell>
                      <div className="enforcement-page__table-actions">
                        <CrudRowActions
                          onView={() => setViewRow(row)}
                          onEdit={() => openEdit(row)}
                          onDelete={() => setDeleteRow(row)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <TablePagination pagination={pagination} labelKey="pagination.label.templates" />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent accent="blue" className="max-w-md sm:max-w-lg notif-templates-page__dialog">
          <DialogHeader>
            <DialogTitle className="users-page__dialog-header">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--primary">
                <FileText size={15} aria-hidden />
              </div>
              <span className="enforcement-page__dialog-title">
                {editing ? t('notifCenter.editTemplate') : t('notifCenter.createTemplate')}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name" className="enforcement-page__form-label">{t('notifCenter.fieldTemplateName')}</Label>
              <Input
                id="tpl-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('notifCenter.fieldTemplateNamePlaceholder')}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-type" className="enforcement-page__form-label">{t('notifCenter.colType')}</Label>
                <FilterSelect
                  className="ct-filter-select--block"
                  tone="blue"
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as EnterpriseNotifType }))}
                  ariaLabel={t('notifCenter.colType')}
                  options={TYPE_OPTIONS.map((opt) => ({
                    value: opt,
                    label: t(`notifCenter.type.${opt}`),
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-channel" className="enforcement-page__form-label">{t('notifCenter.colChannel')}</Label>
                <FilterSelect
                  className="ct-filter-select--block"
                  tone="teal"
                  value={form.channel}
                  onValueChange={(v) => setForm((f) => ({ ...f, channel: v as NotifChannel }))}
                  ariaLabel={t('notifCenter.colChannel')}
                  options={CHANNEL_OPTIONS.map((opt) => ({
                    value: opt,
                    label: t(`notifCenter.channel.${opt}`),
                  }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-subject" className="enforcement-page__form-label">{t('notificationTemplates.subject')}</Label>
              <Input
                id="tpl-subject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="{plate}, {amount}, {violation}…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-body" className="enforcement-page__form-label">{t('notificationTemplates.body')}</Label>
              <textarea
                id="tpl-body"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={4}
                className="notif-templates-page__textarea"
                placeholder={t('notifCenter.fieldMessagePlaceholder')}
              />
            </div>
            <p className="notif-templates-page__dialog-hint">{t('notificationTemplates.hint')}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EntityViewDialog
        open={!!viewRow}
        onOpenChange={(open) => { if (!open) setViewRow(null); }}
        title={viewRow?.name || t('notifCenter.viewTemplate')}
        accent="blue"
        onEdit={viewRow ? () => openEdit(viewRow) : undefined}
      >
        {viewRow ? (
          <>
            <EntityDetailField label={t('notifCenter.colType')} value={t(`notifCenter.type.${viewRow.type}`)} />
            <EntityDetailField label={t('notifCenter.colChannel')} value={t(`notifCenter.channel.${viewRow.channel}`)} />
            <EntityDetailField label={t('notifCenter.colLastUpdated')} value={viewRow.lastUpdated} />
            <EntityDetailField label={t('notificationTemplates.subject')} value={viewRow.subject} wide />
            <EntityDetailField label={t('notificationTemplates.body')} value={viewRow.body} wide />
          </>
        ) : null}
      </EntityViewDialog>

      <Dialog open={!!deleteRow} onOpenChange={(open) => { if (!open) setDeleteRow(null); }}>
        <DialogContent accent="rose" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('notifCenter.deleteTemplate')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('notifCenter.deleteTemplateConfirm', { name: deleteRow?.name ?? '' })}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteRow(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
