import { useState, useEffect, type KeyboardEvent, type ReactNode } from 'react';
import { useLanguage } from '@shared/context/LanguageContext';
import { Search, BookOpen, AlertTriangle, Shield, Info, ChevronRight, LayoutGrid, Table2, Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { SignFormDialog } from '@shared/components/signs/SignFormDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { getProfileImageUrl } from '@shared/utils/profileImage';
import {
  isPlaceholderSignGraphic,
  isSignMediaKnownInvalid,
  markSignMediaInvalid,
  markSignMediaValid,
  resolveSignMediaUrl,
  catalogIncludesSign,
  normalizeTrafficSign,
  resetSignMediaProbeForSign,
  signHasResolvableImage,
} from '@shared/utils/signImage';
import { signsAPI } from '@shared/services/api';
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

/** Sign has an image URL on record (may still be a placeholder graphic). */
function hasSignImage(sign: TrafficSign): boolean {
  return Boolean(signHasResolvableImage(sign.image));
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

function signMediaSrc(sign: TrafficSign): string | null {
  return signHasResolvableImage(sign.image);
}

/* ── Sign image with fallback ─────────────────────────── */
function SignImage({
  sign,
  size = 52,
  className = '',
  hideFallback = false,
  onUnavailable,
}: {
  sign: TrafficSign;
  size?: number;
  className?: string;
  /** When true, missing/broken images render nothing (no colored placeholder). */
  hideFallback?: boolean;
  onUnavailable?: () => void;
}) {
  const src = signMediaSrc(sign);
  const [failed, setFailed] = useState(() => (src ? isSignMediaKnownInvalid(src) : false));

  const markUnavailable = () => {
    if (src) markSignMediaInvalid(src);
    setFailed(true);
    onUnavailable?.();
  };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={sign.sign_name}
        loading="lazy"
        decoding="async"
        onLoad={e => {
          const el = e.currentTarget;
          const url = el.currentSrc || el.src;
          markSignMediaValid(url);
          const checkPlaceholder = () => {
            if (isPlaceholderSignGraphic(el)) markUnavailable();
          };
          if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(checkPlaceholder, { timeout: 400 });
          } else {
            setTimeout(checkPlaceholder, 0);
          }
        }}
        onError={markUnavailable}
        className={`object-contain flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        draggable={false}
      />
    );
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
  const [failed, setFailed] = useState(false);
  const src = resolveSignMediaUrl(sign.image) ?? getProfileImageUrl(sign.image);

  if (!src || failed) return null;

  return (
    <div
      className="signs-dialog-visual relative flex-shrink-0 flex items-center justify-center px-6 pt-10 pb-11 pr-14"
      style={{ background: c.gradient }}
    >
      <div className="signs-dialog-visual__glow signs-dialog-visual__glow--tr" />
      <div className="signs-dialog-visual__glow signs-dialog-visual__glow--bl" />
      <div className="signs-dialog-showcase relative z-[1] w-full flex items-center justify-center">
        <img
          src={src}
          alt={sign.sign_name}
          className="signs-dialog-showcase__img object-contain"
          decoding="async"
          fetchPriority="high"
          draggable={false}
          onLoad={e => {
            const el = e.currentTarget;
            if (isPlaceholderSignGraphic(el)) {
              markSignMediaInvalid(el.currentSrc || el.src);
              setFailed(true);
              onUnavailable?.();
              return;
            }
            markSignMediaValid(el.currentSrc || el.src);
          }}
          onError={() => {
            setFailed(true);
            onUnavailable?.();
          }}
        />
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
  const mediaSrc = signMediaSrc(sign);
  const [photoInvalid, setPhotoInvalid] = useState(() =>
    mediaSrc ? isSignMediaKnownInvalid(mediaSrc) : false,
  );

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
        className="signs-card__media flex flex-1 items-center justify-center px-2 py-6"
        style={{ minHeight: '13rem', background: c.bg }}
      >
        <div className="signs-card__img-wrap flex items-center justify-center w-full h-full">
          <SignImage
            sign={sign}
            size={140}
            hideFallback={!canManage}
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
        <p
          className="signs-card__name dashboard-card__title leading-snug line-clamp-2 m-0"
          style={{ color: 'var(--foreground)' }}
        >
          {sign.sign_name}
        </p>
        <p
          className="signs-card__code dashboard-text__caption font-mono mt-1.5 m-0"
          style={{ color: c.color, fontWeight: 600 }}
        >
          {sign.sign_code}
        </p>
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
          <div className="h-[13rem]" style={{ background: 'rgba(37,99,235,0.06)' }} />
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
    code: string;
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
    <div
      className="dashboard-signs-table rounded-xl overflow-hidden w-full"
      style={{ border: '1px solid rgba(37,99,235,0.08)', background: 'var(--card)' }}
    >
      <Table>
        <TableHeader>
          <TableRow
            style={{
              background: 'rgba(248,250,252,0.95)',
              borderBottom: '1px solid rgba(37,99,235,0.1)',
            }}
          >
            <TableHead className={`${thClass} w-[88px]`} style={thStyle}>{labels.image}</TableHead>
            <TableHead className={thClass} style={thStyle}>{labels.sign}</TableHead>
            <TableHead className={`${thClass} w-[120px]`} style={thStyle}>{labels.code}</TableHead>
            <TableHead className={`${thClass} w-[130px] hidden lg:table-cell`} style={thStyle}>{labels.category}</TableHead>
            <TableHead className={`${thClass} hidden md:table-cell`} style={thStyle}>{labels.description}</TableHead>
            <TableHead className={`${thClass} w-[1%] text-right whitespace-nowrap`} style={thStyle}>{labels.action}</TableHead>
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
    code: string;
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
  const mediaSrc = signMediaSrc(sign);
  const [photoInvalid, setPhotoInvalid] = useState(() =>
    mediaSrc ? isSignMediaKnownInvalid(mediaSrc) : false,
  );

  if (!catalogIncludesSign(sign, canManage)) return null;
  if (!canManage && (!hasSignImage(sign) || photoInvalid)) return null;
  const hideCard = () => {
    if (!canManage) setPhotoInvalid(true);
  };

  return (
              <TableRow
                className="transition-colors"
                style={{ borderBottom: '1px solid rgba(37,99,235,0.06)' }}
              >
                <TableCell className="py-3 px-3 align-middle">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto"
                    style={{ background: c.bg, border: `1px solid ${c.border}` }}
                  >
                    <SignImage sign={sign} size={44} hideFallback={!canManage} onUnavailable={hideCard} />
                  </div>
                </TableCell>
                <TableCell className="py-3 px-3 align-middle min-w-[140px]">
                  <p className="dashboard-card__title leading-snug">{sign.sign_name}</p>
                  <CategoryBadge category={sign.category} className="mt-1.5 lg:hidden px-2.5 py-0.5">
                    {categoryLabel}
                  </CategoryBadge>
                </TableCell>
                <TableCell className="py-3 px-3 align-middle">
                  <span className="dashboard-text__caption font-mono">{sign.sign_code}</span>
                </TableCell>
                <TableCell className="py-3 px-3 align-middle hidden lg:table-cell">
                  <CategoryBadge category={sign.category} className="px-2.5 py-1">
                    {categoryLabel}
                  </CategoryBadge>
                </TableCell>
                <TableCell className="py-3 px-3 align-middle hidden md:table-cell max-w-[280px]">
                  <p className="dashboard-text__caption line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>
                    {sign.description}
                  </p>
                </TableCell>
                <TableCell className="py-3 px-3 align-middle text-right w-[1%] whitespace-nowrap">
                  <div
                    className="signs-row-actions inline-flex items-center justify-end gap-1"
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
    <div className="rounded-xl overflow-hidden w-full" style={{ border: '1px solid rgba(37,99,235,0.08)' }}>
      <div className="px-4 py-3 border-b" style={{ background: 'rgba(248,250,252,0.9)', borderColor: 'rgba(37,99,235,0.08)' }}>
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
  const { t } = useLanguage();
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
      const data = await signsAPI.getAll();
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
    loadSigns();
  }, []);

  const openSignDetail = (sign: TrafficSign) => {
    if (!hasSignImage(sign)) return;
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
      result = result.filter(s =>
        s.sign_name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.sign_code.toLowerCase().includes(q),
      );
    }
    setFiltered(result);
  }, [signs, search, category]);

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
            {/* Left — title */}
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

            {/* Right — mini KPI pills */}
            <div className="flex flex-wrap gap-2.5 self-center">
              {CAT_KEYS.map(cat => {
                const c = CAT[cat];
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat === category ? 'all' : cat)}
                    className="px-3.5 py-2 rounded-xl text-center transition-all cursor-pointer"
                    style={active
                      ? { background: c.gradient, boxShadow: `0 4px 16px ${c.glow}`, transform: 'translateY(-1px)' }
                      : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }
                    }
                  >
                    <p className="dashboard-kpi__label" style={{ color: active ? 'rgba(255,255,255,0.8)' : 'rgba(148,163,184,0.75)' }}>
                      {catLabel(cat)}
                    </p>
                    <p className="dashboard-text__metric text-white mt-0.5">{counts[cat]}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── CATEGORY FILTER CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CAT_KEYS.map(cat => {
          const c = CAT[cat];
          const active = cat === category;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat === category ? 'all' : cat)}
              className="rounded-2xl p-4 text-left transition-all"
              style={active
                ? { background: c.gradient, boxShadow: `0 8px 24px ${c.glow}`, transform: 'translateY(-2px)' }
                : { background: 'var(--card)', border: `1px solid ${c.border}`, boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }
              }
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: active ? 'rgba(255,255,255,0.2)' : c.bg }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: active ? '#fff' : c.signBg }} />
                </div>
                <ChevronRight size={14} style={{ color: active ? 'rgba(255,255,255,0.6)' : c.color, opacity: active ? 1 : 0.5 }} />
              </div>
              <p className="dashboard-kpi__label mb-1" style={{ color: active ? 'rgba(255,255,255,0.75)' : 'var(--muted-foreground)' }}>
                {catLabel(cat)}
              </p>
              <p className="dashboard-kpi__value" style={{ color: active ? '#fff' : 'var(--foreground)' }}>
                {counts[cat]}
              </p>
              <p className="dashboard-text__caption mt-0.5" style={{ color: active ? 'rgba(255,255,255,0.55)' : 'var(--muted-foreground)' }}>
                {t('pages.signs.signsUnit')}
              </p>
            </button>
          );
        })}
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
              {filtered.map(sign => (
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
              signs={filtered}
              catLabel={catLabel}
              onSelect={openSignDetail}
              canManage={canManage}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              labels={{
                image: t('pages.signs.listColImage'),
                sign: t('pages.signs.listColSign'),
                code: t('pages.signs.listColCode'),
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
      </section>

      {/* ── DETAIL MODAL ── */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent
          className={`dashboard-signs-dialog max-w-2xl p-0 gap-0 overflow-hidden rounded-[1.35rem] border-0 ${
            selected && (!dialogHero || !hasSignImage(selected)) ? 'dashboard-signs-dialog--no-hero' : ''
          }`}
        >
          {selected && (() => {
            const c = CAT[selected.category];
            const showDialogHero = dialogHero && hasSignImage(selected);
            return (
              <div className="signs-dialog flex flex-col h-full max-h-[88vh] overflow-hidden">
                {showDialogHero && (
                  <SignDialogVisual
                    sign={selected}
                    onUnavailable={() => setDialogHero(false)}
                  />
                )}

                {/* Bottom — all text */}
                <div
                  className={`signs-dialog-body relative flex-1 min-h-0 flex flex-col overflow-hidden ${
                    showDialogHero ? 'rounded-t-[1.65rem] -mt-5' : 'rounded-t-none'
                  }`}
                  style={{
                    background: 'var(--card)',
                    borderTop: showDialogHero ? undefined : `3px solid ${c.color}`,
                  }}
                >
                  <div
                    className="signs-dialog-intro flex-shrink-0"
                    style={{ borderBottom: `1px solid ${c.border}` }}
                  >
                    <div className="signs-dialog-meta flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      <CategoryBadge category={selected.category} className="signs-dialog-meta__badge px-3 py-1">
                        {catLabel(selected.category)}
                      </CategoryBadge>
                      <span className="signs-dialog-meta__dot" style={{ color: c.color }} aria-hidden>
                        ·
                      </span>
                      <span className="signs-dialog-kingdom">{t('pages.signs.kingdom')}</span>
                    </div>
                    <h2 className="signs-dialog-title m-0">{selected.sign_name}</h2>
                    <div
                      className="signs-dialog-code inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono"
                      style={{
                        background: c.bg,
                        border: `1px solid ${c.border}`,
                        color: c.color,
                      }}
                    >
                      <span className="signs-dialog-code__label">{t('pages.signs.signCode')}</span>
                      <span className="signs-dialog-code__value">{selected.sign_code}</span>
                    </div>
                    {canManage && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 cursor-pointer"
                          onClick={() => openEdit(selected)}
                        >
                          <Pencil size={14} />
                          {t('pages.signs.editSign')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
                          onClick={() => {
                            setDeleteTarget(selected);
                            setSelected(null);
                          }}
                        >
                          <Trash2 size={14} />
                          {t('pages.signs.deleteSign')}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="signs-dialog-card flex flex-col flex-1 min-h-0 overflow-hidden">
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
                        <p className="signs-dialog-desc-text m-0 line-clamp-4">{selected.description}</p>
                      </div>
                    </section>

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
                              <p className="signs-dialog-rule-text m-0 line-clamp-2">{r}</p>
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
                            <p className="signs-dialog-penalty-text m-0 line-clamp-2">{selected.penalty}</p>
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
