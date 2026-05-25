import { useState, useEffect } from 'react';
import { useLanguage } from '@shared/context/LanguageContext';
import { Search, BookOpen, AlertTriangle, Shield, Info, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { Dialog, DialogContent } from '@shared/components/ui/dialog';
import { getProfileImageUrl } from '@shared/utils/profileImage';
import { signsAPI } from '@shared/services/api';
import type { TrafficSign, SignCategory } from '@shared/types';

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
    gradient: 'linear-gradient(135deg,#F59E0B,#D97706)', glow: 'rgba(245,158,11,0.28)',
    bg: 'rgba(245,158,11,0.07)', color: '#D97706', border: 'rgba(245,158,11,0.18)',
    signBg: '#F59E0B', signBorder: '#D97706', signText: '#1C1917',
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

/* ── Sign image with fallback ─────────────────────────── */
function SignImage({ sign, size = 52, className = '' }: { sign: TrafficSign; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : getProfileImageUrl(sign.image);

  if (src) {
    return (
      <img
        src={src}
        alt={sign.sign_name}
        onError={() => setFailed(true)}
        className={`object-contain flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        draggable={false}
      />
    );
  }
  return <SignFallback sign={sign} size={size} />;
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
        className="dashboard-kpi__label hidden sm:inline"
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
          style={btn(mode === 'grid')}
        >
          <LayoutGrid size={14} strokeWidth={2} />
          <span className="hidden md:inline dashboard-text__caption" style={{ fontWeight: 600, color: 'inherit' }}>{cardLabel}</span>
        </button>
        <button
          type="button"
          title={listLabel}
          aria-pressed={mode === 'list'}
          onClick={() => onChange('list')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
          style={btn(mode === 'list')}
        >
          <List size={14} strokeWidth={2} />
          <span className="hidden md:inline dashboard-text__caption" style={{ fontWeight: 600, color: 'inherit' }}>{listLabel}</span>
        </button>
      </div>
    </div>
  );
}

/* ── Sign card (grid) ─────────────────────────────────── */
function SignCardItem({
  sign,
  categoryLabel,
  onSelect,
}: {
  sign: TrafficSign;
  categoryLabel: string;
  onSelect: () => void;
}) {
  const c = CAT[sign.category];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative overflow-hidden rounded-2xl text-left transition-all cursor-pointer w-full"
      style={{ background: 'var(--card)', border: `1px solid ${c.border}`, boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${c.glow}`;
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLElement).style.borderColor = `${c.color}55`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(15,23,42,0.04)';
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.borderColor = c.border;
      }}
    >
      <div className="h-1 w-full" style={{ background: c.gradient }} />
      <div className="flex items-center justify-center px-4 pt-4 pb-2" style={{ minHeight: 80, background: c.bg }}>
        <SignImage sign={sign} size={60} />
      </div>
      <div className="px-3 pb-3 pt-2">
        <p className="dashboard-text__title leading-snug line-clamp-2">{sign.sign_name}</p>
        <p className="dashboard-text__caption font-mono mt-0.5">{sign.sign_code}</p>
        <span
          className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontSize: 'var(--db-font-xs)', fontWeight: 700 }}
        >
          {categoryLabel}
        </span>
      </div>
    </button>
  );
}

/* ── Sign row (list) ──────────────────────────────────── */
function SignRowItem({
  sign,
  categoryLabel,
  onSelect,
  flat = false,
}: {
  sign: TrafficSign;
  categoryLabel: string;
  onSelect: () => void;
  flat?: boolean;
}) {
  const c = CAT[sign.category];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:px-4 sm:py-3.5 text-left transition-all cursor-pointer group ${
        flat ? 'rounded-lg md:rounded-none' : 'rounded-xl'
      }`}
      style={flat
        ? { background: 'transparent', border: 'none', boxShadow: 'none' }
        : { background: 'var(--card)', border: `1px solid ${c.border}`, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }
      }
      onMouseEnter={e => {
        if (flat) {
          (e.currentTarget as HTMLElement).style.background = c.bg;
        } else {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${c.glow}`;
          (e.currentTarget as HTMLElement).style.borderColor = `${c.color}40`;
          (e.currentTarget as HTMLElement).style.background = c.bg;
        }
      }}
      onMouseLeave={e => {
        if (flat) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        } else {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)';
          (e.currentTarget as HTMLElement).style.borderColor = c.border;
          (e.currentTarget as HTMLElement).style.background = 'var(--card)';
        }
      }}
    >
      <div className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[52px]" style={{ background: c.gradient }} />
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: c.bg, border: `1px solid ${c.border}` }}
      >
        <SignImage sign={sign} size={48} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="dashboard-card__title leading-snug truncate">{sign.sign_name}</p>
          <ChevronRight
            size={16}
            className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity mt-0.5"
            style={{ color: c.color }}
          />
        </div>
        <p className="dashboard-text__caption font-mono">{sign.sign_code}</p>
        {sign.description && (
          <p className="dashboard-text__caption mt-1 line-clamp-1 hidden sm:block" style={{ color: 'var(--muted-foreground)' }}>
            {sign.description}
          </p>
        )}
      </div>
      <span
        className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontSize: 'var(--db-font-xs)', fontWeight: 700 }}
      >
        {categoryLabel}
      </span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════ */
export function TrafficSignsPage() {
  const { t } = useLanguage();
  const [signs, setSigns] = useState<TrafficSign[]>([]);
  const [filtered, setFiltered] = useState<TrafficSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<SignCategory | 'all'>('all');
  const [selected, setSelected] = useState<TrafficSign | null>(null);
  const [viewMode, setViewMode] = useState<SignViewMode>(readSignViewMode);

  const setView = (mode: SignViewMode) => {
    setViewMode(mode);
    try { localStorage.setItem(SIGNS_VIEW_KEY, mode); } catch { /* ignore */ }
  };

  useEffect(() => {
    signsAPI.getAll().then(data => { setSigns(data); setFiltered(data); setLoading(false); });
  }, []);

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
        className="px-3 py-2 rounded-xl transition-all cursor-pointer"
        style={category === 'all'
          ? { background: 'linear-gradient(135deg,#0F172A,#1E293B)', color: '#fff', boxShadow: '0 4px 10px rgba(15,23,42,0.3)', fontSize: 'var(--db-font-xs)', fontWeight: 600 }
          : { background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid rgba(37,99,235,0.08)', fontSize: 'var(--db-font-xs)', fontWeight: 600 }
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
            className="px-3 py-2 rounded-xl transition-all cursor-pointer"
            style={active
              ? { background: c.gradient, color: '#fff', boxShadow: `0 4px 10px ${c.glow}`, fontSize: 'var(--db-font-xs)', fontWeight: 600 }
              : { background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid rgba(37,99,235,0.08)', fontSize: 'var(--db-font-xs)', fontWeight: 600 }
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
                  {t('pages.signs.eyebrow')}
                </span>
              </div>
              <h1 className="dashboard-welcome__title text-white">{t('pages.signs.title')}</h1>
              <p className="dashboard-welcome__meta mt-1" style={{ color: 'rgba(148,163,184,0.7)' }}>
                {t('pages.signs.subtitle').replace('{count}', String(signs.length))}
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 text-foreground outline-none transition-all"
                style={{ border: '1.5px solid rgba(37,99,235,0.1)', fontSize: 'var(--db-font-sm)', fontFamily: 'inherit' }}
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

        {/* Scrollable page body */}
        <div className="flex-1 min-h-[420px] overflow-y-auto px-4 pb-5 pt-3">
          {loading ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.05)' }} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-[72px] rounded-xl animate-pulse" style={{ background: 'rgba(37,99,235,0.05)' }} />
                ))}
              </div>
            )
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(37,99,235,0.06)' }}>
                <BookOpen size={28} style={{ color: 'rgba(37,99,235,0.25)' }} />
              </div>
              <p className="dashboard-card__title" style={{ color: 'var(--muted-foreground)' }}>{t('pages.signs.noResults')}</p>
              <p className="dashboard-text__caption mt-1">{t('pages.signs.noResultsHint')}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map(sign => (
                <SignCardItem
                  key={sign.id}
                  sign={sign}
                  categoryLabel={catLabel(sign.category)}
                  onSelect={() => setSelected(sign)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(37,99,235,0.08)' }}>
              <div
                className="hidden md:grid grid-cols-[minmax(0,1fr)_120px_140px_32px] gap-4 px-4 py-2.5"
                style={{ background: 'rgba(248,250,252,0.9)', borderBottom: '1px solid rgba(37,99,235,0.08)' }}
              >
                <span className="dashboard-kpi__label text-muted-foreground" style={{ textTransform: 'none', letterSpacing: '0.04em' }}>
                  {t('pages.signs.listColSign')}
                </span>
                <span className="dashboard-kpi__label text-muted-foreground" style={{ textTransform: 'none', letterSpacing: '0.04em' }}>
                  {t('pages.signs.listColCode')}
                </span>
                <span className="dashboard-kpi__label text-muted-foreground" style={{ textTransform: 'none', letterSpacing: '0.04em' }}>
                  {t('pages.signs.listColCategory')}
                </span>
                <span />
              </div>
              <div className="divide-y divide-border/60 p-2 md:p-0 md:divide-y">
                {filtered.map(sign => (
                  <SignRowItem
                    key={sign.id}
                    sign={sign}
                    flat
                    categoryLabel={catLabel(sign.category)}
                    onSelect={() => setSelected(sign)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── DETAIL MODAL ── */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
          {selected && (() => {
            const c = CAT[selected.category];
            return (
              <>
                {/* Modal header — gradient */}
                <div className="relative px-5 pt-5 pb-8"
                  style={{ background: c.gradient }}>
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 pointer-events-none"
                    style={{ background: 'rgba(255,255,255,0.1)' }} />
                  <div className="relative flex items-center gap-4 pr-8">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                      <SignImage sign={selected} size={52} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full mb-1.5"
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 'var(--db-font-xs)', fontWeight: 700 }}>
                        {catLabel(selected.category)} · {t('pages.signs.kingdom')}
                      </span>
                      <p className="dashboard-card__title text-white leading-snug">{selected.sign_name}</p>
                      <p className="dashboard-text__caption text-white/70 font-mono mt-0.5">
                        {t('pages.signs.signCode')}: {selected.sign_code}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Modal body */}
                <div className="relative -mt-4 mx-4 mb-4">
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'var(--card)', border: '1px solid rgba(37,99,235,0.08)', boxShadow: '0 4px 16px rgba(15,23,42,0.08)' }}>

                    {/* Description */}
                    <div className="px-4 py-3.5"
                      style={{ borderBottom: '1px solid rgba(37,99,235,0.06)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Info size={13} className="text-muted-foreground flex-shrink-0" />
                        <p className="dashboard-kpi__label text-muted-foreground">{t('pages.signs.description')}</p>
                      </div>
                      <p className="dashboard-text__title" style={{ fontWeight: 400, color: 'var(--foreground)' }}>
                        {selected.description}
                      </p>
                    </div>

                    {/* Traffic rules */}
                    {selected.rules && selected.rules.length > 0 && (
                      <div className="px-4 py-3.5"
                        style={{ borderBottom: '1px solid rgba(37,99,235,0.06)' }}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <Shield size={13} style={{ color: c.color }} className="flex-shrink-0" />
                          <p className="dashboard-kpi__label text-muted-foreground">{t('pages.signs.trafficRules')}</p>
                        </div>
                        <ul className="space-y-2">
                          {selected.rules.map((r, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white"
                                style={{ background: c.gradient, fontSize: 'var(--db-font-xs)', fontWeight: 800 }}>
                                {i + 1}
                              </span>
                              <p className="dashboard-text__title" style={{ fontWeight: 400, color: 'var(--foreground)' }}>{r}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Penalty */}
                    {selected.penalty && (
                      <div className="px-4 py-3.5" style={{ background: 'rgba(239,68,68,0.03)' }}>
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <p className="dashboard-kpi__label mb-1" style={{ color: '#991B1B' }}>
                              {t('pages.signs.penalty')}
                            </p>
                            <p className="dashboard-text__title" style={{ fontWeight: 500, color: '#DC2626' }}>
                              {selected.penalty}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
