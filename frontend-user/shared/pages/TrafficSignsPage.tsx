import { useState, useEffect, useMemo, type KeyboardEvent, type ReactNode } from 'react';
import { usePagination, useSignGridPageSize } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import { useLanguage } from '@shared/context/LanguageContext';
import {
  Search, BookOpen, AlertTriangle, Shield, Info, ChevronRight, LayoutGrid, Table2, Plus, Tags, Pencil, Trash2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { SignFormDialog } from '@shared/components/signs/SignFormDialog';
import { SignDetailIntro } from '@shared/components/signs/SignDetailIntro';
import { SignNameLabels } from '@shared/components/signs/SignNameLabels';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState, EmptyStatePanel } from '@shared/components/ui/TableEmptyState';
import { CrudRowActions } from '@shared/components/admin/CrudRowActions';
import { SignCategoriesManagementPanel } from '@shared/components/admin/SignCategoriesManagementPanel';
import { cn } from '@shared/components/ui/utils';
import {
  clearSignMediaCache,
  markSignMediaInvalid,
  markSignMediaValid,
  catalogIncludesSign,
  normalizeTrafficSign,
  resetSignMediaProbeForSign,
  trafficSignImageCandidates,
  isPlaceholderSignGraphic,
} from '@shared/utils/signImage';
import { signsAPI } from '@shared/services/api';
import { signDisplayNames } from '@shared/utils/signDisplayNames';
import { toast } from 'sonner';
import type { TrafficSign, SignCategory } from '@shared/types';

const CAN_MANAGE_SIGNS = import.meta.env.VITE_PORTAL_SURFACE === 'admin';

type SignsTab = 'catalog' | 'categories';

/* ── Category visual tokens ───────────────────────────── */
const CAT: Record<SignCategory, {
  gradient: string; glow: string; bg: string; color: string;
  border: string; signBg: string; signBorder: string; signText: string;
}> = {
  prohibitory: {
    gradient: 'linear-gradient(135deg,#EF4444,#DC2626)', glow: 'rgba(239,68,68,0.28)',
    bg: 'rgba(239,68,68,0.07)', color: '#DC2626', border: 'rgba(239,68,68,0.18)',
    signBg: '#DC2626', signBorder: '#B91C1C', signText: '#fff',
  },
  warning: {
    gradient: 'linear-gradient(135deg,#EA580C,#C2410C)', glow: 'rgba(234,88,12,0.35)',
    bg: 'rgba(234,88,12,0.14)', color: '#9A3412', border: 'rgba(194,65,12,0.28)',
    signBg: '#EA580C', signBorder: '#9A3412', signText: '#fff',
  },
  mandatory: {
    gradient: 'linear-gradient(135deg,#2563EB,#1D4ED8)', glow: 'rgba(37,99,235,0.28)',
    bg: 'rgba(37,99,235,0.07)', color: '#2563EB', border: 'rgba(37,99,235,0.18)',
    signBg: '#2563EB', signBorder: '#1D4ED8', signText: '#fff',
  },
  informative: {
    gradient: 'linear-gradient(135deg,#10B981,#059669)', glow: 'rgba(16,185,129,0.28)',
    bg: 'rgba(16,185,129,0.07)', color: '#059669', border: 'rgba(16,185,129,0.18)',
    signBg: '#059669', signBorder: '#047857', signText: '#fff',
  },
};

const CAT_ICONS: Record<SignCategory, typeof Shield> = {
  prohibitory: Shield,
  warning: AlertTriangle,
  mandatory: BookOpen,
  informative: Info,
};

function categoryBadgeStyle(category: SignCategory, variant: 'solid' | 'soft' = 'solid') {
  const c = CAT[category];
  if (variant === 'soft') {
    return {
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      boxShadow: 'none',
      fontWeight: 700,
    };
  }
  return {
    background: c.gradient,
    color: '#ffffff',
    border: `1px solid ${c.signBorder}`,
    boxShadow: `0 2px 10px ${c.glow}`,
    fontWeight: 700,
    textShadow: category === 'warning' ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.15)',
  };
}

function CategoryBadge({
  category,
  children,
  className = '',
  variant = 'solid',
}: {
  category: SignCategory;
  children: ReactNode;
  className?: string;
  variant?: 'solid' | 'soft';
}) {
  return (
    <span
      className={`signs-category-badge signs-category-badge--${category} inline-flex items-center rounded-full font-bold ${className}`}
      style={categoryBadgeStyle(category, variant)}
    >
      {children}
    </span>
  );
}

/* ── Fallback sign icon when no image ─────────────────── */
function SignFallback({ sign, size = 52 }: { sign: TrafficSign; size?: number }) {
  const c = CAT[sign.category];
  const isWarning = sign.category === 'warning';
  const short = sign.sign_name.split(' ').slice(0, 2).join('\n');
  const shape = isWarning ? 'rotate-45 rounded' : sign.category === 'prohibitory' || sign.category === 'mandatory' ? 'rounded-full' : 'rounded';
  return (
    <div
      className={`flex items-center justify-center ${shape} shadow-md flex-shrink-0`}
      style={{ width: size, height: size, backgroundColor: c.signBg, border: `3px solid ${c.signBorder}` }}
    >
      {isWarning ? (
        <div className="-rotate-45 flex items-center justify-center w-full h-full">
          <span className="text-[8px] font-black text-center leading-tight px-1" style={{ color: c.signText }}>{short}</span>
        </div>
      ) : (
        <span className="text-[7px] font-black text-center leading-tight px-1" style={{ color: c.signText }}>{short}</span>
      )}
    </div>
  );
}

/** Sign has a displayable image (API media or catalog demo art). */
function hasSignImage(sign: TrafficSign): boolean {
  return trafficSignImageCandidates(sign).length > 0;
}

function mergeCatalogSigns(
  server: TrafficSign[],
  extras: TrafficSign[],
  adminCatalog: boolean,
): TrafficSign[] {
  const map = new Map<number, TrafficSign>();
  for (const sign of server) {
    if (catalogIncludesSign(sign, adminCatalog)) map.set(sign.id, sign);
  }
  for (const sign of extras) {
    const normalized = normalizeTrafficSign(sign);
    if (catalogIncludesSign(normalized, adminCatalog)) map.set(normalized.id, normalized);
  }
  return Array.from(map.values());
}

/* ── Sign image with fallback ─────────────────────────── */
function SignImage({
  sign,
  size = 52,
  className = '',
  hideFallback = false,
  showcase = false,
  fill = false,
  strictProbe = true,
  onUnavailable,
}: {
  sign: TrafficSign;
  size?: number;
  className?: string;
  /** When true, missing/broken images render nothing (no colored placeholder). */
  hideFallback?: boolean;
  /** White stage behind transparent PNGs for clearer viewing. */
  showcase?: boolean;
  /** Fill parent container (use with showcase on cards / dialog). */
  fill?: boolean;
  /** When false, skip blank-pixel rejection (admin catalog). */
  strictProbe?: boolean;
  onUnavailable?: () => void;
}) {
  const candidates = useMemo(
    () => trafficSignImageCandidates(sign),
    [sign.id, sign.image, sign.sign_code],
  );
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [sign.id, sign.image, sign.sign_code]);

  const src = candidates[index] ?? null;

  const tryNext = () => {
    if (src) markSignMediaInvalid(src);
    if (index < candidates.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setFailed(true);
    onUnavailable?.();
  };

  const imgStyle = fill
    ? { width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' }
    : { width: size, height: size };

  if (src && !failed) {
    const img = (
      <img
        src={src}
        alt={sign.sign_name}
        loading="lazy"
        decoding="async"
        onLoad={e => {
          const el = e.currentTarget;
          const url = el.currentSrc || el.src;
          const rejectPlaceholder = strictProbe || candidates.length > 1;
          if (rejectPlaceholder) {
            try {
              if (isPlaceholderSignGraphic(el)) {
                tryNext();
                return;
              }
            } catch { /* tainted canvas — treat as valid */ }
          }
          if (strictProbe) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 32; canvas.height = 32;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(el, 0, 0, 32, 32);
                const { data } = ctx.getImageData(0, 0, 32, 32);
                let visible = 0;
                for (let i = 3; i < data.length; i += 4) if (data[i] > 24) visible++;
                if (visible < 24) { tryNext(); return; }
              }
            } catch { /* tainted canvas — treat as valid */ }
          }
          markSignMediaValid(url);
        }}
        onError={tryNext}
        className={`object-contain flex-shrink-0 ${className}`}
        style={imgStyle}
        draggable={false}
      />
    );

    if (showcase) {
      return (
        <div
          className={`signs-img-stage${fill ? ' signs-img-stage--fill' : ''}`}
          style={fill ? undefined : { width: size, height: size }}
        >
          {img}
        </div>
      );
    }
    return img;
  }
  if (hideFallback) return null;
  return <SignFallback sign={sign} size={size} />;
}

/* ── Dialog hero: real sign photo only (no green/text placeholder) ─ */
function SignDialogVisual({
  sign,
  onUnavailable,
}: {
  sign: TrafficSign;
  onUnavailable?: () => void;
}) {
  const c = CAT[sign.category];
  const candidates = useMemo(
    () => trafficSignImageCandidates(sign),
    [sign.id, sign.image, sign.sign_code],
  );
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [sign.id, sign.image, sign.sign_code]);

  const src = candidates[index] ?? null;

  const tryNext = () => {
    if (index < candidates.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setFailed(true);
    onUnavailable?.();
  };

  if (!src || failed) return null;

  return (
    <div
      className="signs-dialog-visual relative flex-shrink-0 flex items-center justify-center px-8 py-8"
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
        borderBottom: `3px solid ${c.color}`,
      }}
    >
      <div className="signs-dialog-showcase relative z-[1] w-full flex items-center justify-center">
        <div className="signs-img-stage signs-img-stage--dialog signs-img-stage--dialog-clear">
          <img
            src={src}
            alt={sign.sign_name}
            className="signs-dialog-showcase__img object-contain"
            decoding="async"
            fetchPriority="high"
            draggable={false}
            onLoad={e => {
              const url = e.currentTarget.currentSrc || e.currentTarget.src;
              markSignMediaValid(url);
            }}
            onError={tryNext}
          />
        </div>
      </div>
    </div>
  );
}

type SignViewMode = 'grid' | 'list';
const SIGNS_VIEW_KEY = 'camtraffic_signs_view';

function readSignViewMode(): SignViewMode {
  try {
    const v = localStorage.getItem(SIGNS_VIEW_KEY);
    if (v === 'list' || v === 'grid') return v;
  } catch { /* ignore */ }
  return 'grid';
}

/* ── View toggle (cards / rows) ───────────────────────── */
function SignsViewToggle({
  mode,
  onChange,
  cardLabel,
  listLabel,
  viewAsLabel,
}: {
  mode: SignViewMode;
  onChange: (m: SignViewMode) => void;
  cardLabel: string;
  listLabel: string;
  viewAsLabel: string;
  variant?: 'default' | 'onDark';
}) {
  return (
    <div className="signs-view-toggle">
      <span className="signs-view-toggle__label">{viewAsLabel}</span>
      <div className="signs-view-toggle__track" role="group" aria-label={viewAsLabel}>
        <button
          type="button"
          title={cardLabel}
          aria-pressed={mode === 'grid'}
          onClick={() => onChange('grid')}
          className={`signs-view-toggle__btn${mode === 'grid' ? ' is-active' : ''}`}
        >
          <LayoutGrid size={15} strokeWidth={2.2} aria-hidden />
          <span>{cardLabel}</span>
        </button>
        <button
          type="button"
          title={listLabel}
          aria-pressed={mode === 'list'}
          onClick={() => onChange('list')}
          className={`signs-view-toggle__btn${mode === 'list' ? ' is-active' : ''}`}
        >
          <Table2 size={15} strokeWidth={2.2} aria-hidden />
          <span>{listLabel}</span>
        </button>
      </div>
    </div>
  );
}

/* ── Sign card (grid) — compact width, large sign image ─ */
function SignCardItem({
  sign,
  categoryLabel,
  onSelect,
  canManage = false,
  onEdit,
  onDelete,
}: {
  sign: TrafficSign;
  categoryLabel: string;
  onSelect: () => void;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useLanguage();
  const c = CAT[sign.category];
  const [photoInvalid, setPhotoInvalid] = useState(false);

  if (!catalogIncludesSign(sign, canManage)) return null;
  if (!canManage && (!hasSignImage(sign) || photoInvalid)) return null;
  const hideCard = () => {
    if (!canManage) setPhotoInvalid(true);
  };

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if ((e.target as HTMLElement).closest('[data-sign-card-action]')) return;
    e.preventDefault();
    onSelect();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-category={sign.category}
      onClick={e => {
        if ((e.target as HTMLElement).closest('[data-sign-card-action]')) return;
        onSelect();
      }}
      onKeyDown={handleCardKeyDown}
      className="signs-card group relative"
    >
      <div className="signs-card__accent" style={{ background: c.gradient }} />
      <div className="signs-card__media" data-category={sign.category}>
        <div className="signs-card__img-wrap">
          <SignImage
            sign={sign}
            hideFallback={!canManage}
            strictProbe={!canManage}
            showcase
            fill
            onUnavailable={hideCard}
            className="signs-card__img object-contain"
          />
        </div>
      </div>
      <div className="signs-card__body">
        <SignNameLabels sign={sign} />
        <div className="flex items-center justify-between gap-2 mt-3">
          <CategoryBadge category={sign.category} className="signs-card__badge px-2.5 py-0.5 text-xs">
            {categoryLabel}
          </CategoryBadge>
          {canManage && (
            <div className="crud-actions" data-sign-card-action onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="crud-actions__btn crud-actions__btn--edit"
                onClick={() => onEdit?.()}
                aria-label={t('common.edit')}
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                className="crud-actions__btn crud-actions__btn--delete"
                onClick={() => onDelete?.()}
                aria-label={t('common.delete')}
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SignsCardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="signs-card-grid">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="signs-card-skeleton w-full rounded-2xl overflow-hidden animate-pulse">
          <div className="h-1 w-full" style={{ background: 'rgba(37,99,235,0.12)' }} />
          <div className="h-[16rem]" style={{ background: 'rgba(37,99,235,0.06)' }} />
          <div className="px-3.5 py-3.5 space-y-2" style={{ background: 'rgba(37,99,235,0.05)' }}>
            <div className="h-3.5 w-full rounded" style={{ background: 'rgba(37,99,235,0.1)' }} />
            <div className="h-3 w-2/3 rounded" style={{ background: 'rgba(37,99,235,0.07)' }} />
            <div className="h-6 w-20 rounded-full" style={{ background: 'rgba(37,99,235,0.08)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Signs data table (list / table view) ─────────────── */
function SignsTable({
  signs,
  catLabel,
  labels,
  onSelect,
  canManage = false,
  onEdit,
  onDelete,
}: {
  signs: TrafficSign[];
  catLabel: (cat: SignCategory) => string;
  labels: {
    image: string;
    sign: string;
    category: string;
    description: string;
    action: string;
    view: string;
    edit: string;
    delete: string;
  };
  onSelect: (sign: TrafficSign) => void;
  canManage?: boolean;
  onEdit?: (sign: TrafficSign) => void;
  onDelete?: (sign: TrafficSign) => void;
}) {
  return (
    <div className="mgmt-table__scroll signs-page__scroll">
      <Table className="enforcement-page__table mgmt-table__grid signs-page__table">
        <colgroup>
          <col className="signs-page__col signs-page__col--image" />
          <col className="signs-page__col signs-page__col--sign" />
          <col className="signs-page__col signs-page__col--category" />
          <col className="signs-page__col signs-page__col--description" />
          <col className="signs-page__col signs-page__col--action" />
        </colgroup>
        <TableHeader>
          <TableRow className="enforcement-page__table-head">
            <TableHead className="enforcement-page__th text-center">{labels.image}</TableHead>
            <TableHead className="enforcement-page__th text-left">{labels.sign}</TableHead>
            <TableHead className="enforcement-page__th text-left hidden lg:table-cell">{labels.category}</TableHead>
            <TableHead className="enforcement-page__th text-left hidden md:table-cell">{labels.description}</TableHead>
            <TableHead className="enforcement-page__th text-right">{labels.action}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signs.map((sign) => (
            <SignTableRow
              key={sign.id}
              sign={sign}
              catLabel={catLabel}
              labels={labels}
              onSelect={onSelect}
              canManage={canManage}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SignTableRow({
  sign,
  catLabel,
  labels,
  onSelect,
  canManage = false,
  onEdit,
  onDelete,
}: {
  sign: TrafficSign;
  catLabel: (cat: SignCategory) => string;
  labels: {
    image: string;
    sign: string;
    category: string;
    description: string;
    action: string;
    view: string;
    edit: string;
    delete: string;
  };
  onSelect: (sign: TrafficSign) => void;
  canManage?: boolean;
  onEdit?: (sign: TrafficSign) => void;
  onDelete?: (sign: TrafficSign) => void;
}) {
  const categoryLabel = catLabel(sign.category);
  const [photoInvalid, setPhotoInvalid] = useState(false);

  if (!catalogIncludesSign(sign, canManage)) return null;
  if (!canManage && (!hasSignImage(sign) || photoInvalid)) return null;
  const hideCard = () => {
    if (!canManage) setPhotoInvalid(true);
  };

  return (
    <TableRow className="enforcement-page__table-row">
      <TableCell className="text-center">
        <div className="signs-table-img-wrap mx-auto">
          <SignImage
            sign={sign}
            size={56}
            showcase
            strictProbe={!canManage}
            hideFallback={!canManage}
            onUnavailable={hideCard}
            className="signs-table-img"
          />
        </div>
      </TableCell>
      <TableCell>
        <SignNameLabels sign={sign} size="sm" />
        <span className="enforcement-page__code-pill mt-1.5 inline-flex lg:hidden">
          {sign.sign_code}
        </span>
        <CategoryBadge category={sign.category} className="mt-1.5 lg:hidden px-2.5 py-0.5" variant="soft">
          {categoryLabel}
        </CategoryBadge>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <CategoryBadge category={sign.category} className="px-2.5 py-1" variant="soft">
          {categoryLabel}
        </CategoryBadge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <p className="enforcement-page__cell-secondary line-clamp-2" title={sign.description}>
          {sign.description}
        </p>
      </TableCell>
      <TableCell>
        <div className="enforcement-page__table-actions mgmt-table__actions">
          <CrudRowActions
            onView={() => onSelect(sign)}
            onEdit={canManage ? () => onEdit?.(sign) : undefined}
            onDelete={canManage ? () => onDelete?.(sign) : undefined}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function SignsTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <Table className="enforcement-page__table mgmt-table__grid signs-page__table">
        <TableHeader>
          <TableRow className="enforcement-page__table-head">
            {[...Array(5)].map((_, i) => (
              <TableHead key={i} className="enforcement-page__th">
                <div className="enforcement-page__skeleton h-3 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(rows)].map((_, i) => (
            <TableRow key={i}>
              {[...Array(5)].map((__, j) => (
                <TableCell key={j}>
                  <div className="enforcement-page__skeleton h-8 w-full max-w-[8rem]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════ */
export function TrafficSignsPage() {
  const { t, locale } = useLanguage();
  const canManage = CAN_MANAGE_SIGNS;
  const [signs, setSigns] = useState<TrafficSign[]>([]);
  const [filtered, setFiltered] = useState<TrafficSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<SignCategory | 'all'>('all');
  const [selected, setSelected] = useState<TrafficSign | null>(null);
  const [dialogHero, setDialogHero] = useState(true);
  const [viewMode, setViewMode] = useState<SignViewMode>(readSignViewMode);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editSign, setEditSign] = useState<TrafficSign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrafficSign | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<SignsTab>('catalog');

  const setView = (mode: SignViewMode) => {
    setViewMode(mode);
    try { localStorage.setItem(SIGNS_VIEW_KEY, mode); } catch { /* ignore */ }
  };

  const loadSigns = async (opts?: { silent?: boolean; keep?: TrafficSign[] }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const data = await signsAPI.getAll({ trainedOnly: true });
      const server = data.map(normalizeTrafficSign);
      setSigns(mergeCatalogSigns(server, opts?.keep ?? [], canManage));
    } catch {
      toast.error(t('pages.signs.loadFailed'));
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const handleSignSaved = async (saved?: TrafficSign) => {
    const normalized = saved ? normalizeTrafficSign(saved) : undefined;
    if (normalized) {
      resetSignMediaProbeForSign(normalized);
      setCategory('all');
      setSearch('');
      setSigns(prev => mergeCatalogSigns(prev, [normalized], canManage));
    }
    await loadSigns({ silent: true, keep: normalized ? [normalized] : [] });
  };

  useEffect(() => {
    clearSignMediaCache();
    loadSigns();
  }, []);

  const openSignDetail = (sign: TrafficSign) => {
    if (!canManage && !hasSignImage(sign)) return;
    setDialogHero(true);
    setSelected(sign);
  };

  const openCreate = () => {
    setFormMode('create');
    setEditSign(null);
    setFormOpen(true);
  };

  const openEdit = (sign: TrafficSign) => {
    setFormMode('edit');
    setEditSign(sign);
    setFormOpen(true);
    setSelected(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await signsAPI.delete(deleteTarget.id);
      toast.success(t('pages.signs.deleteSuccess'));
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) setSelected(null);
      await loadSigns();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('pages.signs.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    setDialogHero(true);
  }, [selected?.id]);

  useEffect(() => {
    let result = [...signs];
    if (category !== 'all') result = result.filter(s => s.category === category);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => {
        const { km, en } = signDisplayNames(s);
        return (
          km.toLowerCase().includes(q) ||
          en.toLowerCase().includes(q) ||
          s.sign_name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.description_en || '').toLowerCase().includes(q) ||
          s.sign_code.toLowerCase().includes(q)
        );
      });
    }
    setFiltered(result);
  }, [signs, search, category]);

  const gridPageSize = useSignGridPageSize(2);
  const pagination = usePagination(filtered, viewMode === 'grid' ? gridPageSize : 10);

  const counts = {
    all: signs.length,
    prohibitory: signs.filter(s => s.category === 'prohibitory').length,
    warning: signs.filter(s => s.category === 'warning').length,
    mandatory: signs.filter(s => s.category === 'mandatory').length,
    informative: signs.filter(s => s.category === 'informative').length,
  };

  const CAT_KEYS: SignCategory[] = ['prohibitory', 'warning', 'mandatory', 'informative'];
  const catLabel = (cat: SignCategory) => t(`signCategories.${cat}`);

  const openCategoryFromTab = (cat: SignCategory) => {
    setCategory(cat);
    setTab('catalog');
  };

  return (
    <div className="enforcement-page enforcement-page--signs dashboard-home dashboard-page--signs signs-page--enterprise">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner signs-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <BookOpen size={14} />
              </span>
              {canManage ? t('pages.signs.manageEyebrow') : t('pages.signs.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.signs.title')}</h1>
            <p className="enforcement-page__subtitle">
              {(canManage ? t('pages.signs.manageSubtitle') : t('pages.signs.subtitle')).replace('{count}', String(signs.length))}
            </p>
          </div>
          <div className="signs-page__hero-actions">
            {canManage && tab === 'catalog' ? (
              <button
                type="button"
                className="enforcement-page__hero-btn enforcement-page__hero-btn--teal"
                onClick={openCreate}
              >
                <Plus size={16} aria-hidden />
                {t('pages.signs.addSign')}
              </button>
            ) : null}
            {canManage ? (
              <button
                type="button"
                className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
                onClick={() => setTab(tab === 'categories' ? 'catalog' : 'categories')}
              >
                <Tags size={15} aria-hidden />
                {tab === 'categories' ? t('pages.signs.tabCatalog') : t('pages.signs.tabCategories')}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="enforcement-page__stat-grid signs-kpi-grid">
        <button
          type="button"
          onClick={() => {
            setTab('catalog');
            setCategory('all');
          }}
          className={`enforcement-page__stat-card enforcement-page__stat-card--teal signs-kpi-card${tab === 'catalog' && category === 'all' ? ' is-active' : ''}`}
        >
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--teal">
            <LayoutGrid size={18} />
          </div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.all}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--teal">
              {t('pages.signs.allCategory')}
            </p>
          </div>
        </button>
        {CAT_KEYS.map((cat) => {
          const Icon = CAT_ICONS[cat];
          const active = tab === 'catalog' && cat === category;
          const tone =
            cat === 'prohibitory' ? 'rose'
              : cat === 'warning' ? 'amber'
                : cat === 'mandatory' ? 'blue'
                  : 'emerald';
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setTab('catalog');
                setCategory(cat === category ? 'all' : cat);
              }}
              className={`enforcement-page__stat-card enforcement-page__stat-card--${tone} signs-kpi-card${active ? ' is-active' : ''}`}
            >
              <div className={`enforcement-page__stat-icon enforcement-page__stat-icon--${tone}`}>
                <Icon size={18} />
              </div>
              <div className="enforcement-page__stat-copy">
                <p className="enforcement-page__stat-value">{counts[cat]}</p>
                <p className={`enforcement-page__stat-label enforcement-page__stat-label--${tone}`}>
                  {catLabel(cat)}
                </p>
              </div>
              <ChevronRight size={16} className="signs-kpi-card__chev" aria-hidden />
            </button>
          );
        })}
      </div>

      {canManage ? (
        <div className="enforcement-page__toolbar signs-page__tabs-toolbar" role="tablist" aria-label={t('pages.signs.title')}>
          <div className="enforcement-page__filters signs-page__tabs">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'catalog'}
              onClick={() => setTab('catalog')}
              className={cn('enforcement-page__filter-btn signs-page__tab', tab === 'catalog' && 'is-active enforcement-page__filter-btn--active')}
            >
              <BookOpen size={13} className="inline mr-1.5 -mt-px" aria-hidden />
              {t('pages.signs.tabCatalog')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'categories'}
              onClick={() => setTab('categories')}
              className={cn('enforcement-page__filter-btn signs-page__tab', tab === 'categories' && 'is-active enforcement-page__filter-btn--active')}
            >
              <Tags size={13} className="inline mr-1.5 -mt-px" aria-hidden />
              {t('pages.signs.tabCategories')}
            </button>
          </div>
        </div>
      ) : null}

      {tab === 'categories' ? (
        <SignCategoriesManagementPanel signs={signs} onSelectCategory={openCategoryFromTab} />
      ) : (
        <>
          <div className="enforcement-page__toolbar">
            <div className="signs-page__toolbar-row">
              <div className="enforcement-page__search-wrap signs-page__search">
                <Search size={14} className="enforcement-page__search-icon" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('pages.signs.searchPlaceholder')}
                  className="enforcement-page__search"
                />
              </div>
              <div className="enforcement-page__filters signs-page__filters">
                <FilterSelect
                  tone="blue"
                  className="signs-page__filter-select"
                  value={category}
                  onValueChange={(v) => setCategory(v as SignCategory | 'all')}
                  ariaLabel={t('pages.signs.allCategory')}
                  options={[
                    { value: 'all', label: `${t('pages.signs.allCategory')} (${counts.all})` },
                    ...CAT_KEYS.map((cat) => ({
                      value: cat,
                      label: `${catLabel(cat)} (${counts[cat]})`,
                    })),
                  ]}
                />
              </div>
              <div className="signs-page__view-toggle">
                <SignsViewToggle
                  mode={viewMode}
                  onChange={setView}
                  viewAsLabel={t('pages.signs.viewAs')}
                  cardLabel={t('pages.signs.viewCard')}
                  listLabel={t('pages.signs.viewList')}
                />
              </div>
            </div>
          </div>

          <div className="enforcement-page__panel enforcement-page__panel--signs">
            <div className="signs-page__panel-head">
              <div>
                <p className="signs-page__panel-title">{t('pages.signs.catalogTitle')}</p>
                <p className="signs-page__panel-subtitle">
                  {t('pages.signs.shownCount').replace('{count}', String(filtered.length))}
                </p>
              </div>
            </div>

            {loading ? (
              viewMode === 'grid' ? (
                <SignsCardGridSkeleton count={14} />
              ) : (
                <SignsTableSkeleton />
              )
            ) : filtered.length === 0 ? (
              viewMode === 'list' ? (
                <Table className="enforcement-page__table mgmt-table__grid">
                  <TableBody>
                    <TableEmptyState
                      colSpan={5}
                      tone="teal"
                      icon={<BookOpen size={28} />}
                      title={t('pages.signs.noResults')}
                      subtitle={t('pages.signs.noResultsHint')}
                      action={canManage ? {
                        label: t('pages.signs.addSign'),
                        onClick: openCreate,
                        icon: <Plus size={15} />,
                      } : undefined}
                    />
                  </TableBody>
                </Table>
              ) : (
                <EmptyStatePanel
                  tone="teal"
                  icon={<BookOpen size={28} />}
                  title={t('pages.signs.noResults')}
                  subtitle={t('pages.signs.noResultsHint')}
                  action={canManage ? {
                    label: t('pages.signs.addSign'),
                    onClick: openCreate,
                    icon: <Plus size={15} />,
                  } : undefined}
                  className="m-4"
                />
              )
            ) : viewMode === 'grid' ? (
              <div className="signs-card-grid">
                {pagination.pageItems.map((sign) => (
                  <div key={sign.id} className="signs-card-grid__slot min-w-0">
                    <SignCardItem
                      sign={sign}
                      categoryLabel={catLabel(sign.category)}
                      onSelect={() => openSignDetail(sign)}
                      canManage={canManage}
                      onEdit={() => openEdit(sign)}
                      onDelete={() => setDeleteTarget(sign)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <SignsTable
                signs={pagination.pageItems}
                catLabel={catLabel}
                onSelect={openSignDetail}
                canManage={canManage}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                labels={{
                  image: t('pages.signs.listColImage'),
                  sign: t('pages.signs.listColSign'),
                  category: t('pages.signs.listColCategory'),
                  description: t('pages.signs.listColDescription'),
                  action: t('pages.signs.listColAction'),
                  view: t('pages.signs.viewDetails'),
                  edit: t('common.edit'),
                  delete: t('common.delete'),
                }}
              />
            )}

            {!loading && filtered.length > 0 ? (
              <TablePagination pagination={pagination} labelKey="pagination.label.signs" />
            ) : null}
          </div>
        </>
      )}

      {/* ── DETAIL MODAL ── */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent
          accent={
            selected?.category === 'prohibitory' ? 'rose'
              : selected?.category === 'warning' ? 'amber'
                : selected?.category === 'mandatory' ? 'blue'
                  : 'teal'
          }
          className={`dashboard-signs-dialog signs-detail-popup flex flex-col max-w-none p-0 gap-0 overflow-hidden rounded-[1.35rem] border-0 ${
            selected && (!dialogHero || !hasSignImage(selected)) ? 'dashboard-signs-dialog--no-hero' : ''
          }`}
        >
          {selected && (() => {
            const c = CAT[selected.category];
            const showDialogHero = dialogHero && hasSignImage(selected);
            return (
              <div className="signs-dialog flex flex-col min-h-0 flex-1 overflow-hidden">
                {showDialogHero && (
                  <SignDialogVisual
                    sign={selected}
                    onUnavailable={() => setDialogHero(false)}
                  />
                )}

                {/* Bottom — all text */}
                <div
                  className={`signs-dialog-body relative flex-1 min-h-0 flex flex-col ${
                    showDialogHero ? 'rounded-t-[1.65rem] -mt-5' : 'rounded-t-none'
                  }`}
                  style={{
                    background: 'var(--card)',
                    borderTop: showDialogHero ? undefined : `3px solid ${c.color}`,
                  }}
                >
                  <SignDetailIntro
                    sign={selected}
                    categoryLabel={catLabel(selected.category)}
                    catStyle={c}
                    canManage={canManage}
                    onEdit={() => openEdit(selected)}
                    onDelete={() => {
                      setDeleteTarget(selected);
                      setSelected(null);
                    }}
                  />

                  <div className="signs-dialog-card flex flex-col flex-shrink-0">
                    {/* Description */}
                    <section className="signs-dialog-section flex-shrink-0">
                      <div className="signs-dialog-section__head">
                        <div
                          className="signs-dialog-section__icon"
                          style={{ background: c.bg, border: `1px solid ${c.border}` }}
                        >
                          <Info size={16} style={{ color: c.color }} />
                        </div>
                        <p className="signs-dialog-section__label m-0">{t('pages.signs.description')}</p>
                      </div>
                      <div
                        className="signs-dialog-desc-box rounded-2xl"
                        style={{ background: c.bg, border: `1px solid ${c.border}` }}
                      >
                        <p className="signs-dialog-desc-text m-0">
                          {locale === 'en' && selected.description_en
                            ? selected.description_en
                            : selected.description}
                        </p>
                      </div>
                    </section>

                    {(selected.guidance || selected.guidance_en) && (
                      <section className="signs-dialog-section flex-shrink-0">
                        <div className="signs-dialog-section__head">
                          <div
                            className="signs-dialog-section__icon"
                            style={{ background: c.bg, border: `1px solid ${c.border}` }}
                          >
                            <Shield size={16} style={{ color: c.color }} />
                          </div>
                          <p className="signs-dialog-section__label m-0">{t('pages.signs.guidanceLabel')}</p>
                        </div>
                        <div
                          className="signs-dialog-desc-box rounded-2xl"
                          style={{ background: c.bg, border: `1px solid ${c.border}` }}
                        >
                          <p className="signs-dialog-desc-text m-0">
                            {locale === 'en' && selected.guidance_en
                              ? selected.guidance_en
                              : selected.guidance}
                          </p>
                        </div>
                      </section>
                    )}

                    {/* Traffic rules */}
                    {selected.rules && selected.rules.length > 0 && (
                      <section
                        className="signs-dialog-section signs-dialog-section--rules"
                        style={{ borderTop: '1px solid rgba(37,99,235,0.08)' }}
                      >
                        <div className="signs-dialog-section__head">
                          <div
                            className="signs-dialog-section__icon"
                            style={{ background: c.bg, border: `1px solid ${c.border}` }}
                          >
                            <Shield size={16} style={{ color: c.color }} />
                          </div>
                          <p className="signs-dialog-section__label m-0">{t('pages.signs.trafficRules')}</p>
                        </div>
                        <ul className="signs-dialog-rules m-0 p-0 list-none">
                          {selected.rules.map((r, i) => (
                            <li
                              key={i}
                              className="signs-dialog-rule-item flex items-start gap-3"
                              style={{ background: c.bg, border: `1px solid ${c.border}` }}
                            >
                              <span
                                className="signs-dialog-rule-num flex items-center justify-center flex-shrink-0 text-white font-bold"
                                style={{ background: c.gradient }}
                              >
                                {i + 1}
                              </span>
                              <p className="signs-dialog-rule-text m-0">{r}</p>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {/* Penalty */}
                    {selected.penalty && (
                      <section
                        className="signs-dialog-section signs-dialog-section--penalty"
                        style={{
                          borderTop: '1px solid rgba(239,68,68,0.12)',
                          background: 'linear-gradient(180deg, rgba(239,68,68,0.04) 0%, rgba(239,68,68,0.02) 100%)',
                        }}
                      >
                        <div className="signs-dialog-penalty flex items-start gap-3">
                          <div className="signs-dialog-section__icon signs-dialog-section__icon--penalty">
                            <AlertTriangle size={16} style={{ color: '#DC2626' }} />
                          </div>
                          <div className="min-w-0">
                            <p className="signs-dialog-section__label signs-dialog-section__label--penalty m-0 mb-1.5">
                              {t('pages.signs.penalty')}
                            </p>
                            <p className="signs-dialog-penalty-text m-0">{selected.penalty}</p>
                          </div>
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {canManage && (
        <>
          <SignFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            mode={formMode}
            sign={editSign}
            onSaved={handleSignSaved}
          />
          <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
            <DialogContent accent="danger" className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('pages.signs.deleteSign')}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground py-2">
                {deleteTarget
                  ? t('pages.signs.deleteConfirm')
                      .replace('{name}', deleteTarget.sign_name)
                      .replace('{code}', deleteTarget.sign_code)
                  : ''}
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {t('common.delete')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
