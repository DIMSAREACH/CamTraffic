import { useEffect, useMemo, useState, useCallback } from 'react';
import { usePagination } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import {
  Activity, Search, Eye, Camera, Users, BarChart2, CheckCircle, ImageIcon, Sparkles,
  Info, ExternalLink, Car, AlertCircle, Hash, Download, Trash2,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import { Dialog, DialogContent } from '@shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useLanguage } from '@shared/context/LanguageContext';
import { useAuth } from '@shared/context/AuthContext';
import { useLiveData } from '@shared/hooks/useLiveData';
import { aiAPI } from '@shared/services/api';
import { toast } from 'sonner';
import { SpeakButton } from '@shared/components/SpeakButton';
import { useSpeech } from '@shared/hooks/useSpeech';
import { heroSpeechText, logDisplay, logDisplayColor } from '@shared/utils/detectionDisplay';
import { getProfileImageSrc } from '@shared/utils/profileImage';
import type { AIDetectionLog } from '@shared/types';

function effectiveConfidence(log: AIDetectionLog, locale: 'km' | 'en') {
  return logDisplay(log, locale).confidence;
}

const CONFIDENCE_TABS = ['all', 'high', 'medium', 'low'] as const;
type ConfidenceTab = typeof CONFIDENCE_TABS[number];

const CONFIDENCE_STYLE = {
  high: { bg: 'rgba(16,185,129,0.12)', color: '#059669', gradient: 'linear-gradient(135deg, #10B981, #059669)' },
  medium: { bg: 'rgba(245,158,11,0.12)', color: '#D97706', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  low: { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
} as const;

const STAT_CARDS = [
  { key: 'total', labelKey: 'aiLogs.statTotal', icon: Camera, variant: 'violet' },
  { key: 'confidence', labelKey: 'aiLogs.statAvgConfidence', icon: BarChart2, variant: 'blue' },
  { key: 'users', labelKey: 'aiLogs.statUniqueUsers', icon: Users, variant: 'teal' },
] as const;

function normalizeConfidence(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value <= 1 ? value * 100 : value;
}

function formatConfidence(value: number) {
  return `${normalizeConfidence(value).toFixed(1)}%`;
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AI';
}

function UserAvatar({
  name,
  profileImage,
  size = 'sm',
  inDialog = false,
}: {
  name: string;
  profileImage?: string | null;
  size?: 'sm' | 'md' | 'lg';
  inDialog?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = imgFailed ? null : getProfileImageSrc(profileImage);
  const sizeClass =
    size === 'lg' ? ' enforcement-page__avatar--lg' : size === 'md' ? ' enforcement-page__avatar--md' : '';
  const dialogClass = inDialog ? ' ai-log-dialog__avatar' : '';

  if (src) {
    return (
      <div className={`enforcement-page__avatar enforcement-page__avatar--ai enforcement-page__avatar--photo${dialogClass}${sizeClass}`}>
        <img
          src={src}
          alt={name}
          className="enforcement-page__avatar-img"
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`enforcement-page__avatar enforcement-page__avatar--ai${dialogClass}${sizeClass}`}>
      {initials(name)}
    </div>
  );
}

function confidenceTier(value: number): keyof typeof CONFIDENCE_STYLE {
  const normalized = normalizeConfidence(value);
  if (normalized >= 80) return 'high';
  if (normalized >= 50) return 'medium';
  return 'low';
}

function matchesConfidenceTab(log: AIDetectionLog, tab: ConfidenceTab, locale: 'km' | 'en') {
  if (tab === 'all') return true;
  const tier = confidenceTier(effectiveConfidence(log, locale));
  return tier === tab;
}

function modeIcon(mode: string) {
  if (mode === 'vehicle') return Car;
  if (mode === 'plate') return Hash;
  if (mode === 'no_sign') return AlertCircle;
  return CheckCircle;
}

function modeLabel(mode: string, t: (key: string) => string) {
  if (mode === 'vehicle') return t('aiLogs.modeVehicle');
  if (mode === 'plate') return t('aiLogs.modePlate');
  if (mode === 'no_sign') return t('aiLogs.modeNoSign');
  return t('aiLogs.modeSign');
}

function AILogDetailDialog({
  log,
  open,
  onClose,
  t,
  dateLocale,
  locale,
}: {
  log: AIDetectionLog | null;
  open: boolean;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dateLocale: string;
  locale: 'km' | 'en';
}) {
  const { speak, speakingId } = useSpeech(locale);

  if (!log) return null;

  const hero = logDisplay(log, locale);
  const fullSpeechKm = heroSpeechText(log, 'km');
  const fullSpeechEn = heroSpeechText(log, 'en');
  const tier = confidenceTier(hero.confidence);
  const tierMeta = CONFIDENCE_STYLE[tier];
  const normalizedConfidence = normalizeConfidence(hero.confidence);
  const ModeIcon = modeIcon(hero.mode);
  const confidenceTierLabel = (value: keyof typeof CONFIDENCE_STYLE) => t(`aiLogs.confidence.${value}`);
  const formattedDate = new Date(log.created_at).toLocaleString(dateLocale);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent accent="violet" className="ai-log-dialog p-0 gap-0 overflow-hidden">
        <div className="ai-log-dialog__shell">
          <div className="ai-log-dialog__header">
            <div className="ai-log-dialog__header-icon">
              <Activity size={18} />
            </div>
            <div className="ai-log-dialog__header-copy">
              <h2 className="ai-log-dialog__header-title">{t('aiLogs.detailTitle')}</h2>
              <div className="ai-log-dialog__header-meta">
                <span className="ai-log-dialog__header-meta-id">
                  {t('aiLogs.detailLogId')} #{log.id}
                </span>
                <span className="ai-log-dialog__header-meta-date">{formattedDate}</span>
              </div>
            </div>
          </div>

          <div className="ai-log-dialog__body">
          <div className="ai-log-dialog__preview">
            {log.uploaded_image ? (
              <img
                src={log.uploaded_image}
                alt={hero.title}
                className="ai-log-dialog__preview-img"
              />
            ) : (
              <div className="ai-log-dialog__preview-empty">
                <ImageIcon size={28} strokeWidth={1.5} />
                <span>{t('aiLogs.noImage')}</span>
              </div>
            )}
          </div>

          <div className="ai-log-dialog__summary">
            <div className="ai-log-dialog__summary-main">
              <p className="ai-log-dialog__summary-label">{t('aiLogs.colDetected')}</p>
              <div className="ai-log-dialog__summary-title-row">
                <h3 className="ai-log-dialog__summary-title">{hero.title}</h3>
                <SpeakButton
                  size="md"
                  label={t('aiDetection.listenResult')}
                  isActive={speakingId === 'log-full'}
                  onClick={() => speak(
                    locale === 'km' ? fullSpeechKm : fullSpeechEn,
                    'log-full',
                    locale,
                  )}
                />
              </div>
              <div className="ai-log-dialog__summary-mode-row">
                <p className="ai-log-dialog__summary-mode">{modeLabel(hero.mode, t)}</p>
              </div>
              <span
                className="ai-log-dialog__tier-badge ai-log-dialog__tier-badge--inline"
                style={{ background: tierMeta.bg, color: tierMeta.color, border: `1px solid ${tierMeta.color}30` }}
              >
                <ModeIcon size={12} />
                {confidenceTierLabel(tier)}
              </span>
            </div>
          </div>

          <div className="ai-log-dialog__cards">
            <div
              className="ai-log-dialog__card ai-log-dialog__card--confidence"
              style={{
                background: tierMeta.bg,
                borderColor: `${tierMeta.color}28`,
              }}
            >
              <div className="ai-log-dialog__card-head">
                <span className="ai-log-dialog__card-label">{t('aiLogs.detailConfidence')}</span>
                <strong className="ai-log-dialog__card-value" style={{ color: tierMeta.color }}>
                  {formatConfidence(hero.confidence)}
                </strong>
              </div>
              <div className="ai-log-dialog__confidence-track">
                <div
                  className="ai-log-dialog__confidence-fill"
                  style={{
                    width: `${Math.max(Math.min(normalizedConfidence, 100), normalizedConfidence > 0 ? 4 : 0)}%`,
                    background: tierMeta.gradient,
                  }}
                />
              </div>
            </div>

            <div className="ai-log-dialog__card ai-log-dialog__card--user">
              <div className="ai-log-dialog__user-profile">
                <UserAvatar name={log.user_name} profileImage={log.user_profile_image} size="lg" inDialog />
                <div className="ai-log-dialog__user-field">
                  <span className="ai-log-dialog__user-field-label">{t('aiLogs.colUser')}</span>
                  <p className="ai-log-dialog__user-name">{log.user_name}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="ai-log-dialog__scroll">
            <section className="ai-log-dialog__section">
              <div className="ai-log-dialog__section-head">
                <div className="ai-log-dialog__section-icon ai-log-dialog__section-icon--info">
                  <Info size={15} />
                </div>
                <p className="ai-log-dialog__section-label">{t('aiLogs.detailDescription')}</p>
                <SpeakButton
                  label={t('aiLogs.listenDescription')}
                  isActive={speakingId === 'log-desc'}
                  onClick={() => speak(hero.description, 'log-desc', locale)}
                />
              </div>
              <div className="ai-log-dialog__section-box ai-log-dialog__section-box--info">
                <p className="ai-log-dialog__section-text">{hero.description || '—'}</p>
              </div>
            </section>

            {(log.detected_vehicles?.length ?? 0) > 0 && (
              <section className="ai-log-dialog__section">
                <div className="ai-log-dialog__section-head">
                  <div className="ai-log-dialog__section-icon ai-log-dialog__section-icon--info">
                    <Car size={15} />
                  </div>
                  <p className="ai-log-dialog__section-label">{t('aiLogs.vehiclesSection')}</p>
                </div>
                <div className="ai-log-dialog__section-box ai-log-dialog__section-box--info space-y-2">
                  {(log.detected_vehicles ?? []).map((v, i) => (
                    <div key={`${v.vehicle_type}-${i}`} className="flex items-center justify-between gap-3">
                      <span className="ai-log-dialog__section-text">{v.label}</span>
                      <span className="font-bold" style={{ color: CONFIDENCE_STYLE.high.color }}>
                        {v.confidence.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {log.detected_plate && hero.mode !== 'plate' && (
              <section className="ai-log-dialog__section">
                <div className="ai-log-dialog__section-head">
                  <div className="ai-log-dialog__section-icon ai-log-dialog__section-icon--info">
                    <Hash size={15} />
                  </div>
                  <p className="ai-log-dialog__section-label">{t('aiLogs.plateSection')}</p>
                  <SpeakButton
                    label={t('aiLogs.listenPlate')}
                    isActive={speakingId === 'log-plate'}
                    onClick={() => speak(
                      locale === 'en'
                        ? `License plate ${log.detected_plate}, ${(log.plate_confidence ?? 0).toFixed(1)} percent confidence`
                        : `ផ្លាកលេខ ${log.detected_plate} ភាពជឿជាក់ ${(log.plate_confidence ?? 0).toFixed(1)} ភាគរយ`,
                      'log-plate',
                      locale,
                    )}
                  />
                </div>
                <div className="ai-log-dialog__section-box ai-log-dialog__section-box--info space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="ai-log-dialog__section-text font-bold tracking-wide">{log.detected_plate}</span>
                    <span className="font-bold" style={{ color: CONFIDENCE_STYLE.high.color }}>
                      {(log.plate_confidence ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  {log.plate_type && (
                    <p className="ai-log-dialog__section-text text-sm capitalize opacity-80">{log.plate_type}</p>
                  )}
                  {log.matched_vehicle && (
                    <p className="ai-log-dialog__section-text text-sm">
                      {t('aiLogs.plateLinked')}: <strong>{log.matched_vehicle.owner_name}</strong>
                    </p>
                  )}
                </div>
              </section>
            )}

            <section className="ai-log-dialog__section">
              <div className="ai-log-dialog__section-head">
                <div className="ai-log-dialog__section-icon ai-log-dialog__section-icon--guide">
                  <Sparkles size={15} />
                </div>
                <p className="ai-log-dialog__section-label">{t('aiLogs.detailGuidance')}</p>
                <SpeakButton
                  label={t('aiLogs.listenGuidance')}
                  isActive={speakingId === 'log-guide'}
                  onClick={() => speak(hero.guidance, 'log-guide', locale)}
                />
              </div>
              <div className="ai-log-dialog__section-box ai-log-dialog__section-box--guide">
                <p className="ai-log-dialog__section-text">{hero.guidance || '—'}</p>
              </div>
            </section>
          </div>
          </div>

          <div className="ai-log-dialog__footer">
            {log.uploaded_image ? (
              <a
                href={log.uploaded_image}
                target="_blank"
                rel="noreferrer"
                className="ai-log-dialog__open-link"
              >
                <ExternalLink size={14} />
                {t('aiLogs.openFullImage')}
              </a>
            ) : (
              <span />
            )}
            <Button variant="outline" className="ai-log-dialog__close-btn" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AILogsPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const dateLocale = locale === 'km' ? 'km-KH' : 'en-US';
  const [logs, setLogs] = useState<AIDetectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceTab>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [plateFilter, setPlateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sign' | 'vehicle' | 'plate' | 'no_sign'>('all');
  const [selected, setSelected] = useState<AIDetectionLog | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await aiAPI.exportLogsCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-detection-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('aiLogs.exportCsvSuccess'));
    } catch {
      toast.error(t('aiLogs.exportCsvFail'));
    } finally {
      setExporting(false);
    }
  };

  const loadLogs = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    aiAPI.getLogs()
      .then((data) => setLogs(data))
      .catch(() => { if (!silent) toast.error(t('aiLogs.loadFail')); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [t]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useLiveData(() => loadLogs(true), 30_000, true);

  const speechLocale = locale === 'en' ? 'en' : 'km';

  const filtered = useMemo(() => {
    let rows = logs.filter((log) => matchesConfidenceTab(log, confidenceFilter, speechLocale));
    if (dateFilter) {
      rows = rows.filter((log) => {
        const d = new Date(log.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key === dateFilter;
      });
    }
    if (plateFilter.trim()) {
      const q = plateFilter.trim().toLowerCase();
      rows = rows.filter((log) => {
        const plate = (log.detected_plate || log.matched_vehicle?.plate_number || '').toLowerCase();
        return plate.includes(q);
      });
    }
    if (typeFilter !== 'all') {
      rows = rows.filter((log) => (log.detection_mode || 'sign') === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((log) => {
        const hero = logDisplay(log, speechLocale);
        const vehicleText = (log.detected_vehicles ?? []).map((v) => `${v.label} ${v.vehicle_type}`).join(' ');
        const plate = (log.detected_plate || '').toLowerCase();
        return hero.title.toLowerCase().includes(q)
          || log.detected_sign.toLowerCase().includes(q)
          || log.user_name.toLowerCase().includes(q)
          || hero.description.toLowerCase().includes(q)
          || vehicleText.toLowerCase().includes(q)
          || plate.includes(q);
      });
    }
    return rows;
  }, [logs, search, confidenceFilter, speechLocale, dateFilter, plateFilter, typeFilter]);

  const handleDelete = async (log: AIDetectionLog) => {
    if (!isAdmin) {
      toast.error(t('aiLogs.deleteDenied'));
      return;
    }
    if (!window.confirm(t('aiLogs.deleteConfirm'))) return;
    setDeletingId(log.id);
    try {
      await aiAPI.deleteLog(log.id);
      toast.success(t('aiLogs.deleteSuccess'));
      if (selected?.id === log.id) setSelected(null);
      loadLogs(true);
    } catch {
      toast.error(t('aiLogs.deleteFail'));
    } finally {
      setDeletingId(null);
    }
  };

  const pagination = usePagination(filtered);

  const counts = useMemo(() => ({
    all: logs.length,
    high: logs.filter((l) => confidenceTier(effectiveConfidence(l, speechLocale)) === 'high').length,
    medium: logs.filter((l) => confidenceTier(effectiveConfidence(l, speechLocale)) === 'medium').length,
    low: logs.filter((l) => confidenceTier(effectiveConfidence(l, speechLocale)) === 'low').length,
  }), [logs, speechLocale]);

  const avgConfidence = logs.length
    ? logs.reduce((sum, log) => sum + normalizeConfidence(effectiveConfidence(log, speechLocale)), 0) / logs.length
    : null;
  const uniqueUsers = new Set(logs.map((log) => log.user_id)).size;

  const confidenceFilterLabel = (tab: ConfidenceTab) => t(`aiLogs.confidence.${tab}`);

  const tableColumns = [
    { key: 'image', label: t('aiLogs.colImage'), colClass: 'ai-log-table__col ai-log-table__col--image' },
    { key: 'user', label: t('aiLogs.colUser'), colClass: 'ai-log-table__col ai-log-table__col--user' },
    { key: 'sign', label: t('aiLogs.colDetected'), colClass: 'ai-log-table__col ai-log-table__col--sign' },
    { key: 'confidence', label: t('aiLogs.colConfidence'), colClass: 'ai-log-table__col ai-log-table__col--confidence' },
    { key: 'description', label: t('aiLogs.colDescription'), colClass: 'ai-log-table__col ai-log-table__col--description' },
    { key: 'date', label: t('aiLogs.colDate'), colClass: 'ai-log-table__col ai-log-table__col--date' },
    { key: 'actions', label: t('aiLogs.colActions'), colClass: 'ai-log-table__col ai-log-table__col--actions' },
  ] as const;

  return (
    <div className="enforcement-page enforcement-page--ai-logs dashboard-page--ai-logs">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Activity size={14} />
              </span>
              {t('pages.aiLogs.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.aiLogs.title')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.aiLogs.heroSubtitle')}</p>
          </div>
          <button
            type="button"
            className="enforcement-page__hero-btn"
            disabled={exporting || loading}
            onClick={() => void handleExportCsv()}
          >
            <Download size={16} />
            {exporting ? t('common.saving') : t('aiLogs.exportCsv')}
          </button>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--three">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = card.key === 'total'
            ? logs.length
            : card.key === 'confidence'
              ? (avgConfidence == null ? '—' : `${avgConfidence.toFixed(1)}%`)
              : uniqueUsers;
          return (
            <div
              key={card.key}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant}`}
            >
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.variant}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{value}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.variant}`}>
                  {t(card.labelKey)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="enforcement-page__toolbar">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="enforcement-page__filters">
            {CONFIDENCE_TABS.map((tab) => {
              const active = confidenceFilter === tab;
              const meta = tab !== 'all' ? CONFIDENCE_STYLE[tab] : null;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setConfidenceFilter(tab)}
                  className={`enforcement-page__filter-btn${active ? ' enforcement-page__filter-btn--active' : ''}`}
                  style={active ? { background: meta?.gradient ?? 'linear-gradient(135deg, #0F172A, #1E293B)' } : undefined}
                >
                  {confidenceFilterLabel(tab)}
                  <span className={`enforcement-page__filter-count${active ? ' enforcement-page__filter-count--active' : ''}`}>
                    {counts[tab]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="enforcement-page__search-wrap">
            <Search size={14} className="enforcement-page__search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('aiLogs.searchPlaceholder')}
              className="enforcement-page__search"
            />
          </div>
        </div>
        <div className="enterprise-ai-history-filters" style={{ marginTop: '0.75rem' }}>
          <label className="enterprise-ai-history-filters__field">
            <span>{t('aiLogs.filterDate')}</span>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </label>
          <label className="enterprise-ai-history-filters__field">
            <span>{t('aiLogs.filterPlate')}</span>
            <input
              type="text"
              value={plateFilter}
              onChange={(e) => setPlateFilter(e.target.value)}
              placeholder={t('aiLogs.filterPlate')}
            />
          </label>
          <label className="enterprise-ai-history-filters__field">
            <span>{t('aiLogs.filterType')}</span>
            <FilterSelect
              tone="purple"
              size="sm"
              className="ct-filter-select--block"
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
              ariaLabel={t('aiLogs.filterType')}
              options={[
                { value: 'all', label: t('aiLogs.filterAllTypes') },
                { value: 'sign', label: t('aiLogs.modeSign') },
                { value: 'vehicle', label: t('aiLogs.modeVehicle') },
                { value: 'plate', label: t('aiLogs.modePlate') },
                { value: 'no_sign', label: t('aiLogs.modeNoSign') },
              ]}
            />
          </label>
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--ai-logs">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid enforcement-page__table--ai-logs">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {tableColumns.map((col) => (
                  <TableHead key={col.key} className={`enforcement-page__th text-left ${col.colClass}`}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="ai-log-table__row">
                    {tableColumns.map((col) => (
                      <TableCell key={col.key} className={`py-3.5 ${col.colClass}`}>
                        <div className="enforcement-page__skeleton ai-log-table__skeleton" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableEmptyState
                  colSpan={tableColumns.length}
                  tone="violet"
                  icon={<Activity size={28} />}
                  title={t('aiLogs.empty')}
                  subtitle={t('aiLogs.emptyHint')}
                />
              ) : pagination.pageItems.map((log) => {
                const hero = logDisplay(log, speechLocale);
                const tier = confidenceTier(hero.confidence);
                const tierMeta = CONFIDENCE_STYLE[tier];
                const createdAt = new Date(log.created_at);
                const ModeIcon = modeIcon(hero.mode);
                const accent = logDisplayColor(hero.mode);
                return (
                  <TableRow key={log.id} className="enforcement-page__table-row ai-log-table__row">
                    <TableCell className={`py-3.5 ${tableColumns[0].colClass} ai-log-table__col--center`}>
                      {log.uploaded_image ? (
                        <button
                          type="button"
                          className="enforcement-page__log-thumb"
                          onClick={() => setSelected(log)}
                        >
                          <img src={log.uploaded_image} alt="" className="enforcement-page__log-thumb-img" />
                        </button>
                      ) : (
                        <div className="enforcement-page__log-thumb enforcement-page__log-thumb--empty">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className={`py-3.5 ${tableColumns[1].colClass}`}>
                      <div className="ai-log-table__user">
                        <UserAvatar name={log.user_name} profileImage={log.user_profile_image} />
                        <span className="enforcement-page__cell-primary ai-log-table__truncate" title={log.user_name}>
                          {log.user_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={`py-3.5 ${tableColumns[2].colClass}`}>
                      <div className="ai-log-table__sign">
                        <ModeIcon size={13} className="enforcement-page__sign-icon" style={{ color: accent }} />
                        <div className="min-w-0">
                          <span className="enforcement-page__cell-primary ai-log-table__truncate block" title={hero.title}>
                            {hero.title}
                          </span>
                          <span className="enforcement-page__cell-secondary text-[10px]">{modeLabel(hero.mode, t)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`py-3.5 ${tableColumns[3].colClass}`}>
                      <div className="ai-log-table__confidence">
                        <div className="ai-log-table__confidence-meta">
                          <span className="enforcement-page__badge" style={{ background: tierMeta.bg, color: tierMeta.color }}>
                            {formatConfidence(hero.confidence)}
                          </span>
                          <span className="ai-log-table__confidence-tier" style={{ color: tierMeta.color }}>
                            {t(`aiLogs.confidence.${tier}`)}
                          </span>
                        </div>
                        <div className="ai-log-table__confidence-bar" aria-hidden>
                          <div
                            className="enforcement-page__confidence-fill"
                            style={{
                              width: `${Math.max(Math.min(normalizeConfidence(hero.confidence), 100), normalizeConfidence(hero.confidence) > 0 ? 4 : 0)}%`,
                              background: tierMeta.gradient,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`py-3.5 ${tableColumns[4].colClass}`}>
                      <p className="enforcement-page__cell-body ai-log-table__desc" title={hero.description}>
                        {hero.description || '—'}
                      </p>
                    </TableCell>
                    <TableCell className={`py-3.5 ${tableColumns[5].colClass}`}>
                      <div className="ai-log-table__date">
                        <span className="enforcement-page__cell-primary ai-log-table__truncate">
                          {createdAt.toLocaleDateString(dateLocale)}
                        </span>
                        <span className="enforcement-page__cell-secondary ai-log-table__truncate">
                          {createdAt.toLocaleTimeString(dateLocale)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={`py-3.5 ${tableColumns[6].colClass} ai-log-table__col--center`}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          className="enforcement-page__action-btn enforcement-page__action-btn--violet"
                          onClick={() => setSelected(log)}
                        >
                          <Eye size={13} /> {t('aiLogs.view')}
                        </button>
                        {isAdmin ? (
                          <button
                            type="button"
                            className="enforcement-page__action-btn"
                            disabled={deletingId === log.id}
                            onClick={() => void handleDelete(log)}
                            title={t('aiLogs.delete')}
                          >
                            <Trash2 size={13} /> {t('aiLogs.delete')}
                          </button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <TablePagination pagination={pagination} labelKey="pagination.label.logs" />
      </div>

      <AILogDetailDialog
        log={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        t={t}
        dateLocale={dateLocale}
        locale={speechLocale}
      />
    </div>
  );
}
