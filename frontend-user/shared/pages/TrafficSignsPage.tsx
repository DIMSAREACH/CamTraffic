import { useState, useEffect, useMemo, type KeyboardEvent, type ReactNode } from 'react';
import { usePagination, useSignGridPageSize } from '@shared/hooks/usePagination';
import { TablePagination } from '@shared/components/ui/TablePagination';
import { useLanguage } from '@shared/context/LanguageContext';
import { Search, BookOpen, AlertTriangle, Shield, Info, ChevronRight, LayoutGrid, Table2, Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { SignFormDialog } from '@shared/components/signs/SignFormDialog';
import { SignDetailIntro } from '@shared/components/signs/SignDetailIntro';
import { SignNameLabels } from '@shared/components/signs/SignNameLabels';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
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
  variant = 'default',
}: {
  mode: SignViewMode;
  onChange: (m: SignViewMode) => void;
  cardLabel: string;
  listLabel: string;
  viewAsLabel: string;
  variant?: 'default' | 'onDark';
}) {
  const onDark = variant === 'onDark';
  const btn = (active: boolean) =>
    active
      ? onDark
        ? { background: '#fff', color: '#1D4ED8', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }
        : { background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: '#fff', boxShadow: '0 2px 8px rgba(37,99,235,0.35)' }
      : { background: 'transparent', color: onDark ? 'rgba(255,255,255,0.9)' : 'var(--muted-foreground)' };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span
        className="dashboard-kpi__label signs-view-toggle-label hidden sm:inline"
        style={{
          color: onDark ? 'rgba(255,255,255,0.85)' : 'var(--muted-foreground)',
          textTransform: 'none',
          letterSpacing: '0.02em',
        }}
      >
        {viewAsLabel}
      </span>
      <div
        className="flex p-1 rounded-xl"
        style={onDark
          ? { background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }
          : { background: 'var(--muted)', border: '1px solid rgba(37,99,235,0.08)' }
        }
        role="group"
        aria-label={viewAsLabel}
      >
        <button
          type="button"
          title={cardLabel}
          aria-pressed={mode === 'grid'}
          onClick={() => onChange('grid')}
          className="signs-view-toggle-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
          style={btn(mode === 'grid')}
        >
          <LayoutGrid size={15} strokeWidth={2} />
          <span className="hidden md:inline dashboard-text__caption" style={{ color: 'inherit' }}>{cardLabel}</span>
        </button>
        <button
          type="button"
          title={listLabel}
          aria-pressed={mode === 'list'}
          onClick={() => onChange('list')}
          className="signs-view-toggle-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
          style={btn(mode === 'list')}
        >
          <Table2 size={15} strokeWidth={2} />
          <span className="hidden md:inline dashboard-text__caption" style={{ color: 'inherit' }}>{listLabel}</span>
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
      onClick={e => {
        if ((e.target as HTMLElement).closest('[data-sign-card-action]')) return;
        onSelect();
      }}
      onKeyDown={handleCardKeyDown}
      className="signs-card group relative flex flex-col overflow-hidden rounded-2xl text-left transition-all cursor-pointer w-full"
      style={{
        background: 'var(--card)',
        border: `1.5px solid ${c.border}`,
        boxShadow: `0 2px 10px ${c.glow}`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px ${c.glow}`;
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLElement).style.borderColor = `${c.color}66`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(15,23,42,0.06)';
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.borderColor = c.border;
      }}
    >
      <div className="signs-card__accent h-1 w-full flex-shrink-0" style={{ background: c.gradient }} />
      <div
        className="signs-card__media flex flex-1 items-center justify-center px-3 py-5"
        style={{ minHeight: '16rem', background: c.bg }}
      >
        <div className="signs-card__img-wrap flex items-center justify-center w-full h-full">
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
      <div
        className="signs-card__body flex-shrink-0 px-3.5 pb-4 pt-3"
        style={{
          background: `linear-gradient(180deg, ${c.bg} 0%, ${c.bg} 55%, var(--card) 100%)`,
          borderTop: `1px solid ${c.border}`,
        }}
      >
        <SignNameLabels sign={sign} />
        <div className="flex items-center justify-between gap-2 mt-3">
          <CategoryBadge category={sign.category} className="signs-card__badge px-3 py-1">
            {categoryLabel}
          </CategoryBadge>
          {canManage && (
            <div className="flex gap-1" data-sign-card-action>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onEdit?.(); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-muted"
                aria-label={t('common.edit')}
              >
                <Pencil size={14} style={{ color: c.color }} />
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onDelete?.(); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-red-50"
                aria-label={t('common.delete')}
              >
                <Trash2 size={14} className="text-red-600" />
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
  const thClass =
    'dashboard-kpi__label text-muted-foreground py-3.5 px-4 whitespace-nowrap';
  const thStyle = { textTransform: 'none' as const, letterSpacing: '0.04em', fontSize: 'var(--db-font-sm)' };

  return (
    <div className="dashboard-signs-table dashboard-signs-table__shell rounded-xl overflow-hidden w-full">
      <Table className="dashboard-signs-table__grid">
        <colgroup>
          <col className="dashboard-signs-table__col dashboard-signs-table__col--image" />
          <col className="dashboard-signs-table__col dashboard-signs-table__col--sign" />
          <col className="dashboard-signs-table__col dashboard-signs-table__col--category" />
          <col className="dashboard-signs-table__col dashboard-signs-table__col--description" />
          <col className="dashboard-signs-table__col dashboard-signs-table__col--action" />
        </colgroup>
        <TableHeader>
          <TableRow className="dashboard-signs-table__head-row">
            <TableHead className={`${thClass} dashboard-signs-table__th dashboard-signs-table__th--image text-center`} style={thStyle}>{labels.image}</TableHead>
            <TableHead className={`${thClass} dashboard-signs-table__th dashboard-signs-table__th--sign`} style={thStyle}>{labels.sign}</TableHead>
            <TableHead className={`${thClass} dashboard-signs-table__th dashboard-signs-table__th--category hidden lg:table-cell`} style={thStyle}>{labels.category}</TableHead>
            <TableHead className={`${thClass} dashboard-signs-table__th dashboard-signs-table__th--description hidden md:table-cell`} style={thStyle}>{labels.description}</TableHead>
            <TableHead className={`${thClass} dashboard-signs-table__th dashboard-signs-table__th--action text-center`} style={thStyle}>{labels.action}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signs.map(sign => (
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
  const c = CAT[sign.category];
  const categoryLabel = catLabel(sign.category);
  const [photoInvalid, setPhotoInvalid] = useState(false);

  if (!catalogIncludesSign(sign, canManage)) return null;
  if (!canManage && (!hasSignImage(sign) || photoInvalid)) return null;
  const hideCard = () => {
    if (!canManage) setPhotoInvalid(true);
  };

  return (
              <TableRow className="dashboard-signs-table__row transition-colors">
                <TableCell className="dashboard-signs-table__td dashboard-signs-table__td--image py-3 px-4 align-middle text-center">
                  <div className="signs-table-img-wrap mx-auto">
                    <SignImage
                      sign={sign}
                      size={64}
                      showcase
                      strictProbe={!canManage}
                      hideFallback={!canManage}
                      onUnavailable={hideCard}
                      className="signs-table-img"
                    />
                  </div>
                </TableCell>
                <TableCell className="dashboard-signs-table__td dashboard-signs-table__td--sign py-3 px-4 align-middle whitespace-normal">
                  <SignNameLabels sign={sign} size="sm" />
                  <CategoryBadge category={sign.category} className="mt-1.5 lg:hidden px-2.5 py-0.5">
                    {categoryLabel}
                  </CategoryBadge>
                </TableCell>
                <TableCell className="dashboard-signs-table__td dashboard-signs-table__td--category py-3 px-4 align-middle hidden lg:table-cell">
                  <CategoryBadge category={sign.category} className="px-2.5 py-1">
                    {categoryLabel}
                  </CategoryBadge>
                </TableCell>
                <TableCell className="dashboard-signs-table__td dashboard-signs-table__td--description py-3 px-4 align-middle hidden md:table-cell whitespace-normal">
                  <p className="dashboard-signs-table__desc dashboard-text__caption line-clamp-3">
                    {sign.description}
                  </p>
                </TableCell>
                <TableCell className="dashboard-signs-table__td dashboard-signs-table__td--action py-3 px-4 align-middle text-center whitespace-nowrap">
                  <div
                    className="signs-row-actions inline-flex items-center justify-center gap-1.5"
                    role="group"
                    aria-label={labels.action}
                  >
                    <button
                      type="button"
                      title={labels.view}
                      aria-label={labels.view}
                      onClick={() => onSelect(sign)}
                      className="signs-row-action signs-row-action--view inline-flex items-center justify-center w-8 h-8 rounded-lg transition-opacity cursor-pointer"
                      style={{
                        background: c.gradient,
                        color: '#fff',
                        boxShadow: `0 2px 8px ${c.glow}`,
                      }}
                    >
                      <Eye size={15} strokeWidth={2} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          title={labels.edit}
                          aria-label={labels.edit}
                          onClick={() => onEdit?.(sign)}
                          className="signs-row-action signs-row-action--edit inline-flex items-center justify-center w-8 h-8 rounded-lg border bg-background cursor-pointer transition-colors hover:bg-muted"
                        >
                          <Pencil size={15} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          title={labels.delete}
                          aria-label={labels.delete}
                          onClick={() => onDelete?.(sign)}
                          className="signs-row-action signs-row-action--delete inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200/80 text-red-600 cursor-pointer transition-colors hover:bg-red-50"
                        >
                          <Trash2 size={15} strokeWidth={2} />
                        </button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
  );
}

function SignsTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="dashboard-signs-table__shell rounded-xl overflow-hidden w-full">
      <div className="dashboard-signs-table__skeleton-head px-4 py-3 border-b">
        <div className="h-3 w-3/4 max-w-md rounded animate-pulse" style={{ background: 'rgba(37,99,235,0.08)' }} />
      </div>
      <div className="divide-y divide-border/40">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <div className="w-14 h-14 rounded-xl animate-pulse flex-shrink-0" style={{ background: 'rgba(37,99,235,0.06)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded animate-pulse" style={{ background: 'rgba(37,99,235,0.06)' }} />
              <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'rgba(37,99,235,0.05)' }} />
            </div>
          </div>
        ))}
      </div>
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

  const categoryFilter = (
    <div className="flex gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => setCategory('all')}
        className="signs-filter-chip px-3.5 py-2 rounded-xl transition-all cursor-pointer"
        style={category === 'all'
          ? { background: 'linear-gradient(135deg,#0F172A,#1E293B)', color: '#fff', boxShadow: '0 4px 10px rgba(15,23,42,0.3)' }
          : { background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid rgba(37,99,235,0.08)' }
        }
      >
        {t('pages.signs.allCategory')}
        <span className="ml-1 opacity-70">({counts.all})</span>
      </button>
      {CAT_KEYS.map(cat => {
        const c = CAT[cat];
        const active = category === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`signs-filter-chip signs-filter-chip--${cat} ${active ? 'signs-filter-chip--active' : ''} px-3.5 py-2 rounded-xl transition-all cursor-pointer font-bold`}
            style={active
              ? {
                  ...categoryBadgeStyle(cat, 'solid'),
                  boxShadow: `0 4px 14px ${c.glow}`,
                  transform: 'translateY(-1px)',
                }
              : {
                  ...categoryBadgeStyle(cat, 'soft'),
                }
            }
          >
            {catLabel(cat)}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="dashboard-home dashboard-page--signs flex flex-col gap-5 min-h-0">

      {/* ── HERO BANNER ── */}
      <div
        className="dashboard-welcome--hero relative overflow-hidden rounded-2xl flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#0A1628 0%,#1E1B4B 60%,#0A1628 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full -translate-y-20 translate-x-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(37,99,235,0.2) 0%,transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full translate-y-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(16,185,129,0.12) 0%,transparent 70%)' }} />

        <div className="relative p-5 lg:p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(37,99,235,0.22)' }}>
                  <BookOpen size={14} style={{ color: '#60A5FA' }} />
                </div>
                <span className="dashboard-welcome__eyebrow" style={{ color: 'rgba(96,165,250,0.9)' }}>
                  {canManage ? t('pages.signs.manageEyebrow') : t('pages.signs.eyebrow')}
                </span>
              </div>
              <h1 className="dashboard-welcome__title text-white">{t('pages.signs.title')}</h1>
              <p className="dashboard-welcome__meta mt-1" style={{ color: 'rgba(148,163,184,0.7)' }}>
                {(canManage ? t('pages.signs.manageSubtitle') : t('pages.signs.subtitle')).replace('{count}', String(signs.length))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SIGN CATEGORIES ── */}
      <div className="signs-category-tray">
        <div className="signs-category-tray__head">
          <div className="signs-category-tray__head-icon">
            <BookOpen size={17} />
          </div>
          <h2 className="signs-category-tray__title">{t('signCategories.title')}</h2>
        </div>
        <div className="signs-category-grid">
          {CAT_KEYS.map(cat => {
            const c = CAT[cat];
            const Icon = CAT_ICONS[cat];
            const active = cat === category;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat === category ? 'all' : cat)}
                className={`signs-category-stat-card signs-category-stat-card--${cat}${active ? ' signs-category-stat-card--active' : ''}`}
                style={active ? { background: c.gradient, boxShadow: `0 8px 22px ${c.glow}` } : undefined}
              >
                <div
                  className="signs-category-stat-card__icon"
                  style={active ? { background: 'rgba(255,255,255,0.22)', color: '#ffffff' } : undefined}
                >
                  <Icon size={20} strokeWidth={2.15} />
                </div>
                <div className="signs-category-stat-card__copy">
                  <p className="signs-category-stat-card__meta">
                    <span className="signs-category-stat-card__value">{counts[cat]}</span>
                    <span className="signs-category-stat-card__unit">{t('pages.signs.signsUnit')}</span>
                  </p>
                  <p className="signs-category-stat-card__label">{catLabel(cat)}</p>
                </div>
                <ChevronRight size={18} className="signs-category-stat-card__chev" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN PAGE: catalog + toolbar + content ── */}
      <section
        className="dashboard-signs-page flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid rgba(37,99,235,0.08)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}
      >
        {/* Page header — gradient */}
        <div
          className="dashboard-panel-header relative px-5 pt-4 pb-10 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#1D4ED8 0%,#2563EB 50%,#06B6D4 100%)' }}
        >
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="relative flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.22)' }}>
                <BookOpen size={18} color="white" />
              </div>
              <div className="min-w-0">
                <p className="dashboard-card__title text-white leading-tight">{t('pages.signs.catalogTitle')}</p>
                <p className="dashboard-panel__subtitle mt-0.5">
                  {t('pages.signs.shownCount').replace('{count}', String(filtered.length))}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canManage && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="signs-add-btn"
                  aria-label={t('pages.signs.addSign')}
                >
                  <span className="signs-add-btn__icon" aria-hidden>
                    <Plus size={18} strokeWidth={2.5} />
                  </span>
                  <span className="signs-add-btn__label">{t('pages.signs.addSign')}</span>
                </button>
              )}
              <SignsViewToggle
                mode={viewMode}
                onChange={setView}
                variant="onDark"
                viewAsLabel={t('pages.signs.viewAs')}
                cardLabel={t('pages.signs.viewCard')}
                listLabel={t('pages.signs.viewList')}
              />
            </div>
          </div>
        </div>

        {/* Toolbar — overlaps header */}
        <div className="relative -mt-5 mx-4 mb-0 flex-shrink-0 z-[1]">
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: 'var(--card)', border: '1px solid rgba(37,99,235,0.1)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}
          >
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('pages.signs.searchPlaceholder')}
                className="signs-search-input w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 text-foreground outline-none transition-all"
                style={{ border: '1.5px solid rgba(37,99,235,0.1)' }}
                onFocus={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#2563EB';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
                }}
                onBlur={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.1)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              />
            </div>
            {categoryFilter}
          </div>
        </div>

        {/* Scrollable page body — grid cards or full-width table */}
        <div
          className={`flex-1 min-h-[420px] overflow-y-auto pb-5 pt-3 ${
            viewMode === 'list' ? 'px-0' : 'px-4'
          }`}
        >
          {loading ? (
            viewMode === 'grid' ? (
              <SignsCardGridSkeleton count={14} />
            ) : (
              <div className="mx-4"><SignsTableSkeleton /></div>
            )
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(37,99,235,0.06)' }}>
                <BookOpen size={28} style={{ color: 'rgba(37,99,235,0.25)' }} />
              </div>
              <p className="dashboard-card__title" style={{ color: 'var(--muted-foreground)' }}>{t('pages.signs.noResults')}</p>
              <p className="dashboard-text__caption mt-1">{t('pages.signs.noResultsHint')}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="signs-card-grid">
              {pagination.pageItems.map(sign => (
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
            <div className="mx-4">
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
            </div>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <footer className="signs-catalog-footer flex-shrink-0">
            <TablePagination pagination={pagination} labelKey="pagination.label.signs" variant="footer" />
          </footer>
        )}
      </section>

      {/* ── DETAIL MODAL ── */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent
          className={`dashboard-signs-dialog flex flex-col max-w-none p-0 gap-0 overflow-hidden rounded-[1.35rem] border-0 ${
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
            <DialogContent className="max-w-md">
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
