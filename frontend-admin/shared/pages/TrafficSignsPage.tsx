import { useState, useEffect } from 'react';
import { useLanguage } from '@shared/context/LanguageContext';
import { Search, BookOpen, AlertTriangle, Shield, Zap, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { signsAPI } from '@shared/services/api';
import type { TrafficSign, SignCategory } from '@shared/types';

const CATEGORY_STYLE: Record<SignCategory, { label: string; gradient: string; glow: string; bg: string; color: string; border: string; shape: string; signBg: string; signBorder: string; signText: string }> = {
  prohibitory: {
    label: 'Prohibitory', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', glow: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.07)', color: '#DC2626', border: 'rgba(239,68,68,0.15)',
    shape: 'rounded-full', signBg: '#DC2626', signBorder: '#B91C1C', signText: '#FFFFFF',
  },
  warning: {
    label: 'Warning', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', glow: 'rgba(245,158,11,0.35)',
    bg: 'rgba(245,158,11,0.07)', color: '#D97706', border: 'rgba(245,158,11,0.15)',
    shape: 'rotate-45 rounded', signBg: '#F59E0B', signBorder: '#D97706', signText: '#1C1917',
  },
  mandatory: {
    label: 'Mandatory', gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)', glow: 'rgba(37,99,235,0.35)',
    bg: 'rgba(37,99,235,0.07)', color: '#2563EB', border: 'rgba(37,99,235,0.15)',
    shape: 'rounded-full', signBg: '#2563EB', signBorder: '#1D4ED8', signText: '#FFFFFF',
  },
  informative: {
    label: 'Informative', gradient: 'linear-gradient(135deg, #10B981, #059669)', glow: 'rgba(16,185,129,0.35)',
    bg: 'rgba(16,185,129,0.07)', color: '#059669', border: 'rgba(16,185,129,0.15)',
    shape: 'rounded', signBg: '#059669', signBorder: '#047857', signText: '#FFFFFF',
  },
};

function SignIcon({ sign, size = 52 }: { sign: TrafficSign; size?: number }) {
  const s = CATEGORY_STYLE[sign.category];
  const short = sign.sign_name.split(' ').slice(0, 2).join('\n');
  return (
    <div className={`flex items-center justify-center ${s.shape} shadow-md flex-shrink-0`}
      style={{ width: size, height: size, backgroundColor: s.signBg, border: `3px solid ${s.signBorder}` }}>
      {sign.category === 'warning' ? (
        <div className="-rotate-45 flex items-center justify-center w-full h-full">
          <span className="text-[9px] font-black text-center leading-tight px-1" style={{ color: s.signText }}>{short}</span>
        </div>
      ) : (
        <span className="text-[8px] font-black text-center leading-tight px-1.5" style={{ color: s.signText }}>{short}</span>
      )}
    </div>
  );
}

export function TrafficSignsPage() {
  const { t } = useLanguage();
  const [signs, setSigns] = useState<TrafficSign[]>([]);
  const [filtered, setFiltered] = useState<TrafficSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<SignCategory | 'all'>('all');
  const [selected, setSelected] = useState<TrafficSign | null>(null);

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
        s.sign_code.toLowerCase().includes(q)
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

  const categories: (SignCategory | 'all')[] = ['all', 'prohibitory', 'warning', 'mandatory', 'informative'];

  return (
    <div className="space-y-5">
      {/* Header with hero banner */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0A1628, #0D1B3E)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full -translate-y-12 translate-x-12"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.2)' }}>
                <BookOpen size={14} style={{ color: '#60A5FA' }} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(96,165,250,0.9)' }}>{t('pages.signs.eyebrow')}</span>
            </div>
            <h1 className="text-white text-[20px] font-black leading-tight" style={{ letterSpacing: '-0.02em' }}>
              {t('pages.signs.title')}
            </h1>
            <p className="mt-1 text-[12px]" style={{ color: 'rgba(148,163,184,0.7)' }}>
              {t('pages.signs.subtitle', { count: signs.length })}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {(['prohibitory', 'warning', 'mandatory', 'informative'] as SignCategory[]).map(cat => {
              const s = CATEGORY_STYLE[cat];
              return (
                <div key={cat} className="px-3 py-2 rounded-xl text-center cursor-pointer transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onClick={() => setCategory(cat === category ? 'all' : cat)}>
                  <p className="text-[10px] font-semibold" style={{ color: 'rgba(148,163,184,0.7)' }}>{s.label}</p>
                  <p className="text-white text-[16px] font-black" style={{ letterSpacing: '-0.02em' }}>{counts[cat]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category filter cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(['prohibitory', 'warning', 'mandatory', 'informative'] as SignCategory[]).map(cat => {
          const s = CATEGORY_STYLE[cat];
          const active = cat === category;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat === category ? 'all' : cat)}
              className="p-4 rounded-2xl text-left transition-all"
              style={active
                ? { background: s.gradient, boxShadow: `0 8px 24px ${s.glow}`, transform: 'translateY(-2px)' }
                : { background: '#fff', border: '1px solid rgba(37,99,235,0.07)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }
              }
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(15,23,42,0.04)'; (e.currentTarget as HTMLElement).style.transform = ''; } }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: active ? 'rgba(255,255,255,0.2)' : s.bg }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: active ? '#fff' : s.signBg }} />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: active ? 'rgba(255,255,255,0.8)' : '#94A3B8' }}>
                  {s.label}
                </p>
              </div>
              <p className="text-[26px] font-black" style={{ color: active ? '#fff' : '#0F172A', letterSpacing: '-0.03em' }}>
                {counts[cat]}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: active ? 'rgba(255,255,255,0.6)' : '#94A3B8' }}>signs</p>
            </button>
          );
        })}
      </div>

      {/* Search and filter bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search signs by name or code..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 text-[13px] text-slate-700 outline-none transition-all"
            style={{ border: '1.5px solid rgba(37,99,235,0.08)' }}
            onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
            onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.08)'; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
          />
        </div>
        <div className="flex gap-2">
          {categories.map(cat => {
            const active = category === cat;
            const style = cat !== 'all' ? CATEGORY_STYLE[cat] : null;
            return (
              <button key={cat} onClick={() => setCategory(cat)}
                className="px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
                style={active
                  ? { background: style?.gradient ?? 'linear-gradient(135deg, #0F172A, #1E293B)', color: '#fff', boxShadow: `0 4px 10px ${style?.glow ?? 'rgba(15,23,42,0.3)'}` }
                  : { background: '#F8FAFC', color: '#64748B', border: '1px solid rgba(37,99,235,0.08)' }
                }>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                {cat === 'all' && <span className="ml-1 opacity-70">({counts.all})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Signs Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.05)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(37,99,235,0.06)' }}>
            <BookOpen size={28} style={{ color: 'rgba(37,99,235,0.25)' }} />
          </div>
          <p className="text-slate-500 font-semibold">No signs found</p>
          <p className="text-slate-300 text-sm mt-1">Try different search terms or clear the filter</p>
        </div>
      ) : (
        <>
          <p className="text-[12px] text-slate-400 font-medium">{filtered.length} sign{filtered.length !== 1 ? 's' : ''} shown</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(sign => {
              const s = CATEGORY_STYLE[sign.category];
              return (
                <button
                  key={sign.id}
                  onClick={() => setSelected(sign)}
                  className="bg-white rounded-2xl p-4 text-center cursor-pointer text-left group relative overflow-hidden transition-all"
                  style={{ border: `1px solid ${s.border}`, boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${s.glow}`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.borderColor = s.color + '40'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(15,23,42,0.04)'; (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.borderColor = s.border; }}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: s.gradient }} />
                  <div className="flex items-center justify-center h-16 mb-3">
                    <SignIcon sign={sign} size={50} />
                  </div>
                  <p className="text-[12px] font-bold text-slate-800 leading-tight">{sign.sign_name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{sign.sign_code}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (() => {
            const s = CATEGORY_STYLE[selected.category];
            return (
              <>
                <div className="h-1 -mx-6 -mt-6 mb-4 rounded-t-lg" style={{ background: s.gradient }} />
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <SignIcon sign={selected} size={44} />
                    <div>
                      <div className="text-[16px] font-bold text-slate-900">{selected.sign_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono font-normal mt-0.5">{selected.sign_code}</div>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-1">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold"
                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    {s.label} Sign — Kingdom of Cambodia
                  </div>

                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
                    <div className="px-4 py-3" style={{ background: '#F8FAFC', borderBottom: '1px solid rgba(37,99,235,0.06)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Info size={13} style={{ color: '#64748B' }} />
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</p>
                      </div>
                      <p className="text-[13px] text-slate-700 mt-1">{selected.description}</p>
                    </div>

                    {selected.rules && (
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(37,99,235,0.06)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Shield size={13} style={{ color: '#2563EB' }} />
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Traffic Rules</p>
                        </div>
                        <ul className="space-y-2">
                          {selected.rules.map((r, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-[13px] text-slate-700">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 text-white"
                                style={{ background: s.gradient }}>{i + 1}</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selected.penalty && (
                      <div className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#991B1B' }}>Penalty</p>
                            <p className="text-[13px]" style={{ color: '#DC2626' }}>{selected.penalty}</p>
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
