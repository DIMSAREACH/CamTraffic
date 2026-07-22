import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Archive, Clock, Database, Download, HardDrive, Loader2, RefreshCw, RotateCcw,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { EmptyStatePanel } from '@shared/components/ui/TableEmptyState';
import { useLanguage } from '@shared/context/LanguageContext';
import { dashboardAPI } from '@shared/services/api';
import type { Locale } from '@shared/i18n/translations';
import { toast } from 'sonner';
import type { SystemBackupItem } from '@shared/types';

const STAT_CARDS = [
  { key: 'count', labelKey: 'backup.statTotal', icon: Archive, variant: 'blue' },
  { key: 'storage', labelKey: 'backup.statStorage', icon: HardDrive, variant: 'violet' },
  { key: 'latest', labelKey: 'backup.statLatest', icon: Clock, variant: 'teal' },
] as const;

function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatBackupDate(iso: string, locale: Locale): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(locale === 'km' ? 'km-KH' : undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function BackupRestorePage() {
  const { t, locale } = useLanguage();
  const [backups, setBackups] = useState<SystemBackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.listSystemBackups();
      setBackups((res.backups || []) as SystemBackupItem[]);
    } catch {
      toast.error(t('backup.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const totalBytes = backups.reduce((sum, item) => sum + (item.size_bytes || 0), 0);
    const latest = backups.length
      ? backups.reduce((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? a : b))
      : null;

    return {
      count: backups.length,
      storage: formatBytes(totalBytes),
      latest: latest ? formatBackupDate(latest.created_at, locale) : '—',
    };
  }, [backups, locale]);

  const handleDownload = async () => {
    setBusy('download');
    try {
      const blob = await dashboardAPI.downloadSystemBackup(false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `camtraffic-backup-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('backup.downloadStarted'));
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('backup.downloadFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!window.confirm(t('backup.restoreConfirm', { name: filename }))) return;
    setBusy(filename);
    try {
      const res = await dashboardAPI.restoreSystemBackup(filename);
      toast.success(t('backup.restored', { items: (res.restored || []).join(', ') }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('backup.restoreFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="enforcement-page enforcement-page--backup">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <Database size={14} aria-hidden />
              {t('backup.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('backup.title')}</h1>
            <p className="enforcement-page__subtitle">{t('backup.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--violet"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : undefined} aria-hidden />
              {t('backup.refresh')}
            </button>
            <button
              type="button"
              className="enforcement-page__hero-btn"
              onClick={() => void handleDownload()}
              disabled={busy === 'download'}
            >
              {busy === 'download' ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                <Download size={16} aria-hidden />
              )}
              {busy === 'download' ? t('backup.creating') : t('backup.create')}
            </button>
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--three mb-6">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key];
          return (
            <div
              key={card.key}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant}`}
            >
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.variant}`}>
                <Icon size={18} aria-hidden />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value text-base sm:text-lg">{value}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.variant}`}>
                  {t(card.labelKey)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 px-4 py-3 mb-6 flex gap-3 items-start">
        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
        <p className="text-sm text-amber-900 dark:text-amber-200">{t('backup.restoreWarning')}</p>
      </div>

      <section className="enforcement-page__panel p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-lg">{t('backup.storedBackups')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('backup.storedBackupsHint')}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label={t('common.loading')}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="enforcement-page__skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : backups.length === 0 ? (
          <EmptyStatePanel
            tone="blue"
            icon={<Archive size={22} />}
            title={t('backup.empty')}
            subtitle={t('backup.emptyHint')}
            action={{
              label: t('backup.create'),
              icon: busy === 'download' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />,
              onClick: () => void handleDownload(),
            }}
          />
        ) : (
          <ul className="backup-page__list">
            {backups.map((b) => {
              const restoring = busy === b.filename;
              return (
                <li key={b.filename} className="backup-page__item">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="backup-page__item-icon">
                      <Archive size={16} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="backup-page__item-name">{b.filename}</p>
                      <div className="backup-page__item-meta">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} aria-hidden />
                          {formatBackupDate(b.created_at, locale)}
                        </span>
                        <span className="backup-page__size-pill">
                          {formatBytes(b.size_bytes)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="backup-page__restore-btn shrink-0"
                    disabled={restoring || busy === 'download'}
                    onClick={() => void handleRestore(b.filename)}
                  >
                    {restoring ? (
                      <Loader2 size={14} className="animate-spin mr-1" aria-hidden />
                    ) : (
                      <RotateCcw size={14} className="mr-1" aria-hidden />
                    )}
                    {t('backup.restore')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
