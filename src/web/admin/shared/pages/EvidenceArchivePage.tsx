import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive, Search, ImageIcon, Car, Hash, MapPin, RefreshCw, Loader2,
  Camera, AlertTriangle, FileText, Eye, X, ExternalLink, Maximize2, Clock,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Dialog, DialogContent } from '@shared/components/ui/dialog';
import { EmptyStatePanel } from '@shared/components/ui/TableEmptyState';
import { useLanguage } from '@shared/context/LanguageContext';
import { dashboardAPI } from '@shared/services/api';
import type { Locale } from '@shared/i18n/translations';
import { cn } from '@shared/components/ui/utils';
import { toast } from 'sonner';
import type { EvidenceArchiveItem } from '@shared/types';
import { resolveEvidenceDisplayImage } from '@shared/utils/evidenceDisplayImage';
import { EvidenceSignImage } from '@shared/components/evidence/EvidenceSignImage';

type TypeTab = 'all' | EvidenceArchiveItem['source_type'];

const TYPE_META: Record<EvidenceArchiveItem['source_type'], {
  icon: typeof Camera;
  gradient: string;
  variant: 'violet' | 'rose' | 'amber';
}> = {
  detection: {
    icon: Camera,
    gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    variant: 'violet',
  },
  violation: {
    icon: AlertTriangle,
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
    variant: 'rose',
  },
  fine: {
    icon: FileText,
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    variant: 'amber',
  },
};

const STAT_CARDS = [
  { key: 'all', labelKey: 'evidenceArchive.statTotal', icon: Archive, variant: 'blue' },
  { key: 'detection', labelKey: 'evidenceArchive.statDetection', icon: Camera, variant: 'violet' },
  { key: 'violation', labelKey: 'evidenceArchive.statViolation', icon: AlertTriangle, variant: 'rose' },
  { key: 'fine', labelKey: 'evidenceArchive.statFine', icon: FileText, variant: 'amber' },
] as const;

function formatWhen(iso: string, locale: Locale) {
  try {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleString(locale === 'km' ? 'km-KH' : undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function shortSourceId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 8)}…`;
}

function EvidenceFullImageLightbox({
  src,
  alt,
  open,
  onClose,
  t,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open || !src) return null;

  return createPortal(
    <div
      className="evidence-archive-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button
        type="button"
        className="evidence-archive-lightbox__close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={t('evidenceArchive.closeFullImage')}
      >
        <X size={22} />
      </button>
      <div className="evidence-archive-lightbox__stage">
        <img src={src} alt={alt} className="evidence-archive-lightbox__img" />
      </div>
    </div>,
    document.body,
  );
}

function EvidenceDetailDialog({
  item,
  open,
  onClose,
  locale,
  t,
}: {
  item: EvidenceArchiveItem | null;
  open: boolean;
  onClose: () => void;
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setLightboxSrc(null);
  }, [open, item?.id]);

  if (!item) return null;
  const meta = TYPE_META[item.source_type];
  const displayImageUrl = resolveEvidenceDisplayImage(item);
  const fullImageUrl = item.image_url || displayImageUrl;

  const openFullImage = (src: string) => setLightboxSrc(src);

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="evidence-archive-dialog evidence-archive-dialog--wide p-0 gap-0 overflow-hidden rounded-2xl border-0">
          <div className="evidence-archive-dialog__shell">
            <div className="evidence-archive-dialog__header">
              <div
                className="evidence-archive-dialog__header-icon"
                style={{ background: meta.gradient }}
              >
                <meta.icon size={18} />
              </div>
              <div className="evidence-archive-dialog__header-copy">
                <h2 className="evidence-archive-dialog__header-title">{t('evidenceArchive.detailTitle')}</h2>
                <p className="evidence-archive-dialog__header-meta">
                  {t(`evidenceArchive.type.${item.source_type}`)}
                  <span aria-hidden> · </span>
                  #{item.source_id}
                  <span aria-hidden> · </span>
                  {formatWhen(item.created_at, locale)}
                </p>
              </div>
            </div>

            <div className={`evidence-archive-dialog__hero-wrap evidence-archive-dialog__hero-wrap--${item.source_type}`}>
              {displayImageUrl ? (
                <button
                  type="button"
                  className="evidence-archive-dialog__hero"
                  onClick={() => openFullImage(fullImageUrl)}
                  aria-label={t('evidenceArchive.viewFullImage')}
                >
                  <EvidenceSignImage
                    src={displayImageUrl}
                    alt={item.title}
                    sourceType={item.source_type}
                    imgClassName="evidence-archive-dialog__hero-img"
                  />
                  <span className="evidence-archive-dialog__hero-zoom">
                    <Maximize2 size={16} />
                    {t('evidenceArchive.viewFullImage')}
                  </span>
                </button>
              ) : (
                <div className="evidence-archive-dialog__hero evidence-archive-dialog__hero--empty">
                  <div className="evidence-archive-dialog__hero-empty">
                    <ImageIcon size={32} />
                    <span>{t('evidenceArchive.noImage')}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="evidence-archive-dialog__body">
              <h3 className="evidence-archive-dialog__title">{item.title}</h3>
              <div className="evidence-archive-dialog__meta-grid">
                {item.plate ? (
                  <div className="evidence-archive-dialog__meta-item">
                    <Hash size={15} />
                    <span>{item.plate}</span>
                  </div>
                ) : null}
                {item.location ? (
                  <div className="evidence-archive-dialog__meta-item">
                    <MapPin size={15} />
                    <span>{item.location}</span>
                  </div>
                ) : null}
              </div>

              {(item.vehicle_image_url || item.plate_image_url) ? (
                <div className="evidence-archive-dialog__crops">
                  <p className="evidence-archive-dialog__crops-label">{t('evidenceArchive.relatedCrops')}</p>
                  <div className="evidence-archive-dialog__crops-row">
                    {item.vehicle_image_url ? (
                      <button
                        type="button"
                        onClick={() => openFullImage(item.vehicle_image_url!)}
                        className="evidence-archive-dialog__crop"
                      >
                        <span className="evidence-archive-dialog__crop-label">
                          <Car size={14} /> {t('evidenceArchive.vehicleCrop')}
                        </span>
                        <img src={item.vehicle_image_url} alt="" />
                      </button>
                    ) : null}
                    {item.plate_image_url ? (
                      <button
                        type="button"
                        onClick={() => openFullImage(item.plate_image_url!)}
                        className="evidence-archive-dialog__crop"
                      >
                        <span className="evidence-archive-dialog__crop-label">
                          <Hash size={14} /> {t('evidenceArchive.plateCrop')}
                        </span>
                        <img src={item.plate_image_url} alt="" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {displayImageUrl ? (
                <div className="evidence-archive-dialog__actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openFullImage(fullImageUrl)}
                  >
                    <Maximize2 size={15} />
                    {t('evidenceArchive.viewFullImage')}
                  </Button>
                  <a
                    href={item.image_url || fullImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="evidence-archive-dialog__open-link"
                  >
                    <ExternalLink size={15} />
                    {t('evidenceArchive.openInNewTab')}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EvidenceFullImageLightbox
        src={lightboxSrc || ''}
        alt={item.title}
        open={!!lightboxSrc}
        onClose={() => setLightboxSrc(null)}
        t={t}
      />
    </>
  );
}

export function EvidenceArchivePage() {
  const { t, locale } = useLanguage();
  const [plate, setPlate] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeTab>('all');
  const [allRows, setAllRows] = useState<EvidenceArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EvidenceArchiveItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardAPI.searchEvidence({ plate: query, type: 'all', limit: 120 });
      setAllRows(data.results);
    } catch {
      setAllRows([]);
      toast.error(t('evidenceArchive.loadFail'));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => ({
    all: allRows.length,
    detection: allRows.filter((r) => r.source_type === 'detection').length,
    violation: allRows.filter((r) => r.source_type === 'violation').length,
    fine: allRows.filter((r) => r.source_type === 'fine').length,
  }), [allRows]);

  const rows = useMemo(() => {
    if (type === 'all') return allRows;
    return allRows.filter((r) => r.source_type === type);
  }, [allRows, type]);

  const hasFilters = type !== 'all' || query.length > 0;

  const clearFilters = () => {
    setPlate('');
    setQuery('');
    setType('all');
  };

  return (
    <div className="enforcement-page enforcement-page--evidence dashboard-page--evidence">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Archive size={14} aria-hidden /></span>
              {t('evidenceArchive.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('evidenceArchive.title')}</h1>
            <p className="enforcement-page__subtitle">{t('evidenceArchive.subtitle')}</p>
          </div>
          <button
            type="button"
            className="enforcement-page__hero-btn enforcement-page__hero-btn--violet"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : (
              <RefreshCw size={16} aria-hidden />
            )}
            {t('evidenceArchive.refresh')}
          </button>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four mb-6">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const active = type === card.key;
          return (
            <button
              key={card.key}
              type="button"
              aria-pressed={active}
              className={cn(
                `enforcement-page__stat-card enforcement-page__stat-card--${card.variant} evidence-archive-stat`,
                active && 'evidence-archive-stat--active',
              )}
              onClick={() => setType(card.key as TypeTab)}
            >
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.variant}`}>
                <Icon size={18} aria-hidden />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{counts[card.key].toLocaleString()}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.variant}`}>
                  {t(card.labelKey)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <section className="enforcement-page__panel p-5">
        <div className="flex flex-col gap-4 mb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold text-lg">{t('evidenceArchive.browseTitle')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('evidenceArchive.browseHint')}</p>
          </div>
          <p className="evidence-archive-toolbar__count shrink-0">
            {t('evidenceArchive.showingCount', { count: rows.length, total: allRows.length })}
          </p>
        </div>

        <form
          className="evidence-archive-search mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(plate.trim());
          }}
        >
          <div className="enforcement-page__search-wrap evidence-archive-search__field">
            <Search size={16} className="enforcement-page__search-icon" aria-hidden />
            <input
              className="enforcement-page__search evidence-archive-search__input"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder={t('evidenceArchive.searchPlate')}
            />
            {plate ? (
              <button
                type="button"
                className="evidence-archive-search__clear"
                onClick={() => { setPlate(''); setQuery(''); }}
                aria-label={t('evidenceArchive.clearSearch')}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <Button type="submit" className="evidence-archive-search__btn">
            {t('evidenceArchive.search')}
          </Button>
        </form>

        {hasFilters ? (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {type !== 'all' ? (
              <span className="evidence-archive-active-filter">
                {t('evidenceArchive.filteredBy', { type: t(`evidenceArchive.type.${type}`) })}
              </span>
            ) : null}
            {query ? (
              <span className="evidence-archive-active-filter evidence-archive-active-filter--plate">
                <Hash size={12} aria-hidden />
                {query}
              </span>
            ) : null}
            <button type="button" className="evidence-archive-clear-filters" onClick={clearFilters}>
              {t('evidenceArchive.clearFilters')}
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="evidence-archive-grid evidence-archive-grid--loading" aria-busy="true" aria-label={t('common.loading')}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="enforcement-page__skeleton evidence-archive-card-skeleton" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyStatePanel
            tone="violet"
            icon={<Archive size={22} />}
            title={t('evidenceArchive.empty')}
            subtitle={t('evidenceArchive.emptyHint')}
            action={hasFilters ? {
              label: t('evidenceArchive.clearFilters'),
              icon: <X size={14} />,
              onClick: clearFilters,
            } : undefined}
          />
        ) : (
          <div className="evidence-archive-grid">
            {rows.map((row) => {
              const meta = TYPE_META[row.source_type];
              const Icon = meta.icon;
              const displayImageUrl = resolveEvidenceDisplayImage(row);
              return (
                <article
                  key={row.id}
                  className={`evidence-archive-card evidence-archive-card--${row.source_type}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(row);
                    }
                  }}
                >
                  <div className="evidence-archive-card__media">
                    {displayImageUrl ? (
                      <div className="evidence-archive-card__img-stage">
                        <EvidenceSignImage
                          src={displayImageUrl}
                          alt={row.title}
                          sourceType={row.source_type}
                          imgClassName="evidence-archive-card__img"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="evidence-archive-card__placeholder"><ImageIcon size={28} /></div>
                    )}
                    <span
                      className={`evidence-archive-card__badge evidence-archive-card__badge--${row.source_type}`}
                      style={{ background: meta.gradient }}
                    >
                      <Icon size={11} aria-hidden />
                      {t(`evidenceArchive.type.${row.source_type}`)}
                    </span>
                    <div className="evidence-archive-card__overlay">
                      <Eye size={18} aria-hidden />
                      {t('evidenceArchive.viewEvidence')}
                    </div>
                  </div>
                  <div className="evidence-archive-card__body">
                    <h3 className="evidence-archive-card__title">{row.title}</h3>
                    <p className="evidence-archive-card__meta">
                      <Clock size={12} className="inline mr-1 -mt-0.5" aria-hidden />
                      {formatWhen(row.created_at, locale)}
                    </p>
                    <div className="evidence-archive-card__chips">
                      <span
                        className="evidence-archive-card__chip evidence-archive-card__chip--ref"
                        title={row.source_id}
                      >
                        {t('evidenceArchive.sourceRef', { id: shortSourceId(row.source_id) })}
                      </span>
                      {row.plate ? (
                        <span className="evidence-archive-card__chip">
                          <Hash size={12} aria-hidden /> {row.plate}
                        </span>
                      ) : null}
                      {row.location ? (
                        <span className="evidence-archive-card__chip evidence-archive-card__chip--muted">
                          <MapPin size={12} aria-hidden /> {row.location}
                        </span>
                      ) : null}
                    </div>
                    {(row.vehicle_image_url || row.plate_image_url) ? (
                      <div className="evidence-archive-card__thumbs">
                        {row.vehicle_image_url ? (
                          <div className="evidence-archive-card__thumb" title={t('evidenceArchive.vehicleCrop')}>
                            <Car size={11} aria-hidden />
                            <img src={row.vehicle_image_url} alt="" />
                          </div>
                        ) : null}
                        {row.plate_image_url ? (
                          <div className="evidence-archive-card__thumb" title={t('evidenceArchive.plateCrop')}>
                            <Hash size={11} aria-hidden />
                            <img src={row.plate_image_url} alt="" />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <EvidenceDetailDialog
        item={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        locale={locale}
        t={t}
      />
    </div>
  );
}
