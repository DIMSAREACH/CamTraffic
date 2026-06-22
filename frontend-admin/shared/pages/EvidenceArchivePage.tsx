import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive, Search, ImageIcon, Car, Hash, MapPin, RefreshCw,
  Camera, AlertTriangle, FileText, Eye, X, ExternalLink, Maximize2,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Dialog, DialogContent } from '@shared/components/ui/dialog';
import { useLanguage } from '@shared/context/LanguageContext';
import { dashboardAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { EvidenceArchiveItem } from '@shared/types';
import { resolveEvidenceDisplayImage } from '@shared/utils/evidenceDisplayImage';
import { EvidenceSignImage } from '@shared/components/evidence/EvidenceSignImage';

const TYPE_TABS = ['all', 'detection', 'violation', 'fine'] as const;
type TypeTab = typeof TYPE_TABS[number];

const TYPE_META: Record<Exclude<TypeTab, 'all'>, {
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

function formatWhen(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleString(locale === 'km' ? 'km-KH' : undefined);
  } catch {
    return iso;
  }
}

function EvidenceFullImageLightbox({
  src,
  alt,
  title,
  sourceType,
  open,
  onClose,
  t,
}: {
  src: string;
  alt: string;
  title?: string;
  sourceType?: EvidenceArchiveItem['source_type'];
  open: boolean;
  onClose: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div className="evidence-archive-lightbox" role="dialog" aria-modal="true" aria-label={alt}>
      <button
        type="button"
        className="evidence-archive-lightbox__close"
        onClick={onClose}
        aria-label={t('evidenceArchive.closeFullImage')}
      >
        <X size={22} />
      </button>
      <div className="evidence-archive-lightbox__stage">
        <EvidenceSignImage
          src={src}
          alt={alt}
          sourceType={sourceType ?? 'detection'}
          className="evidence-archive-lightbox__sign-frame"
          imgClassName="evidence-archive-lightbox__img"
        />
      </div>
      {title ? <p className="evidence-archive-lightbox__caption">{title}</p> : null}
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="evidence-archive-lightbox__open-tab"
      >
        <ExternalLink size={15} />
        {t('evidenceArchive.openInNewTab')}
      </a>
    </div>
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
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setLightboxSrc(null);
  }, [open, item?.id]);

  if (!item) return null;
  const meta = TYPE_META[item.source_type];
  const displayImageUrl = resolveEvidenceDisplayImage(item);

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
                onClick={() => openFullImage(displayImageUrl)}
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
                  onClick={() => openFullImage(displayImageUrl)}
                >
                  <Maximize2 size={15} />
                  {t('evidenceArchive.viewFullImage')}
                </Button>
                <a
                  href={item.image_url}
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
      title={item.title}
      sourceType={item.source_type}
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

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await dashboardAPI.searchEvidence({ plate: query, type: 'all', limit: 120 });
      setAllRows(data.results);
    } catch {
      setAllRows([]);
      if (!silent) toast.error(t('evidenceArchive.loadFail'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [query, t]);

  useEffect(() => {
    load();
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

  const statValues: Record<typeof STAT_CARDS[number]['key'], number> = counts;

  return (
    <div className="enforcement-page enforcement-page--evidence dashboard-page--evidence">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Archive size={14} /></span>
              {t('evidenceArchive.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('evidenceArchive.title')}</h1>
            <p className="enforcement-page__subtitle">{t('evidenceArchive.subtitle')}</p>
          </div>
          <button
            type="button"
            className="enforcement-page__hero-btn enforcement-page__hero-btn--violet"
            onClick={() => load()}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'evidence-archive-spin' : undefined} />
            {t('evidenceArchive.refresh')}
          </button>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              className={`enforcement-page__stat-card enforcement-page__stat-card--${card.variant} evidence-archive-stat${type === card.key ? ' evidence-archive-stat--active' : ''}`}
              onClick={() => setType(card.key as TypeTab)}
            >
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${card.variant}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{statValues[card.key].toLocaleString()}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${card.variant}`}>
                  {t(card.labelKey)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="enforcement-page__toolbar evidence-archive-toolbar">
        <div className="evidence-archive-toolbar__row">
          <form
            className="evidence-archive-search"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(plate.trim());
            }}
          >
            <div className="enforcement-page__search-wrap evidence-archive-search__field">
              <Search size={16} className="enforcement-page__search-icon" />
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
          <p className="evidence-archive-toolbar__count">
            {t('evidenceArchive.showingCount', { count: rows.length, total: allRows.length })}
          </p>
        </div>
      </div>

      <div className="enforcement-page__filters evidence-archive-filters">
        {TYPE_TABS.map((key) => {
          const active = type === key;
          const gradient = key === 'all'
            ? 'linear-gradient(135deg, #2563EB, #1D4ED8)'
            : TYPE_META[key].gradient;
          return (
            <button
              key={key}
              type="button"
              className={`enforcement-page__filter-btn${active ? ' enforcement-page__filter-btn--active' : ''}`}
              style={active ? { background: gradient } : undefined}
              onClick={() => setType(key)}
            >
              {t(`evidenceArchive.type.${key}`)}
              <span className="evidence-archive-filter-count">{counts[key]}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="evidence-archive-grid evidence-archive-grid--loading">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="enforcement-page__skeleton evidence-archive-card-skeleton" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="enforcement-page__panel evidence-archive-empty">
          <div className="enforcement-page__empty-icon enforcement-page__empty-icon--violet">
            <Archive size={28} />
          </div>
          <p className="enforcement-page__empty-title">{t('evidenceArchive.empty')}</p>
          <p className="enforcement-page__empty-subtitle">{t('evidenceArchive.emptyHint')}</p>
        </div>
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
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(row); }}
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
                    <Icon size={11} />
                    {t(`evidenceArchive.type.${row.source_type}`)}
                  </span>
                  <div className="evidence-archive-card__overlay">
                    <Eye size={18} />
                    {t('evidenceArchive.viewEvidence')}
                  </div>
                </div>
                <div className="evidence-archive-card__body">
                  <h3 className="evidence-archive-card__title">{row.title}</h3>
                  <p className="evidence-archive-card__meta">{formatWhen(row.created_at, locale)}</p>
                  <div className="evidence-archive-card__chips">
                    {row.plate ? (
                      <span className="evidence-archive-card__chip">
                        <Hash size={12} /> {row.plate}
                      </span>
                    ) : null}
                    {row.location ? (
                      <span className="evidence-archive-card__chip evidence-archive-card__chip--muted">
                        <MapPin size={12} /> {row.location}
                      </span>
                    ) : null}
                  </div>
                  {(row.vehicle_image_url || row.plate_image_url) ? (
                    <div className="evidence-archive-card__thumbs">
                      {row.vehicle_image_url ? (
                        <div className="evidence-archive-card__thumb" title={t('evidenceArchive.vehicleCrop')}>
                          <Car size={11} />
                          <img src={row.vehicle_image_url} alt="" />
                        </div>
                      ) : null}
                      {row.plate_image_url ? (
                        <div className="evidence-archive-card__thumb" title={t('evidenceArchive.plateCrop')}>
                          <Hash size={11} />
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
