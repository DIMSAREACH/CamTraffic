import { useState, useEffect } from 'react';
import { FileText, Clock, Search, Plus, MapPin, Shield, TrendingUp, AlertCircle, Car, RefreshCw } from 'lucide-react';
import { RielIcon } from '@shared/components/RielIcon';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate, formatAppCurrency, khrToUsd } from '@shared/i18n/localeFormat';
import { WelcomeProfileAvatar } from '@shared/components/WelcomeProfileAvatar';
import { dashboardAPI, finesAPI } from '@shared/services/api';
import { getSamplePoliceStats } from '@shared/services/sampleDataFallback';
import { DASHBOARD_PALETTE } from '@shared/constants/chartPalette';
import { toast } from 'sonner';
import type { Fine, User, Vehicle } from '@shared/types';

const C = DASHBOARD_PALETTE;

const STATUS_BADGE: Record<string, { bg: string; color: string; accent: string }> = {
  pending: { bg: C[4].soft, color: C[4].dark, accent: C[4].solid },
  paid: { bg: C[3].soft, color: C[3].dark, accent: C[3].solid },
  overdue: { bg: C[5].soft, color: C[5].dark, accent: C[5].solid },
  dismissed: { bg: 'rgba(100,116,139,0.12)', color: '#475569', accent: '#64748B' },
};

const VIOLATION_REASONS = [
  'Running Red Light', 'Speeding (above limit)', 'No Helmet (Motorcycle)',
  'No Seatbelt', 'Illegal Parking', 'Wrong Way on One-Way Street',
  'Using Mobile Phone While Driving', 'Failure to Stop at Stop Sign',
  'No Valid License', 'Reckless Driving', 'Speeding in School Zone',
  'No Vehicle Registration', 'Drunk Driving',
];

export function PoliceDashboard() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const [stats, setStats] = useState<{ total_issued: number; today_issued: number; pending: number; revenue: number; recent: Fine[] }>(
    () => getSamplePoliceStats(),
  );
  const [searchLicense, setSearchLicense] = useState('');
  const [searchResult, setSearchResult] = useState<{ driver: User | null; fines: Fine[]; vehicles: Vehicle[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [issueFineOpen, setIssueFineOpen] = useState(false);
  const [fineForm, setFineForm] = useState({ driver_id: '' as string, vehicle_plate: '', reason: '', amount: '', location: '' });
  const [issuing, setIssuing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadStats = () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    dashboardAPI
      .getPoliceStats(user.id)
      .then((data) => {
        setStats(data);
        setLoadError(false);
      })
      .catch(() => {
        setStats(getSamplePoliceStats(user.id));
        setLoadError(false);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStats(); }, [user]);

  const handleSearch = async () => {
    if (!searchLicense.trim()) return;
    setSearching(true);
    try {
      const result = await finesAPI.searchByLicense(searchLicense.trim());
      setSearchResult(result);
      if (!result.driver) toast.error('No driver found with that license number.');
    } catch {
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleIssueFine = async () => {
    if (!user || !fineForm.driver_id || !fineForm.reason || !fineForm.amount) {
      toast.error('Please fill all required fields.'); return;
    }
    setIssuing(true);
    try {
      await finesAPI.create({ ...fineForm, amount: khrToUsd(parseFloat(fineForm.amount)), police_id: user.id });
      toast.success('Fine issued successfully!');
      setIssueFineOpen(false);
      setFineForm({ driver_id: '', vehicle_plate: '', reason: '', amount: '', location: '' });
      setSearchResult(null);
      loadStats();
    } catch {
      toast.error('Failed to issue fine.');
    } finally {
      setIssuing(false);
    }
  };

  const openIssueFine = (driver: User) => {
    setFineForm(f => ({ ...f, driver_id: driver.id }));
    setIssueFineOpen(true);
  };

  const kpiCards = [
    { title: 'Total Issued', value: stats?.total_issued ?? 0, icon: <FileText size={19} />, palette: C[1] },
    { title: "Today's Fines", value: stats?.today_issued ?? 0, icon: <TrendingUp size={19} />, palette: C[5] },
    { title: 'Pending', value: stats?.pending ?? 0, icon: <Clock size={19} />, palette: C[4] },
    { title: 'Revenue', value: formatAppCurrency(locale, stats?.revenue ?? 0), icon: <RielIcon size={19} />, palette: C[2] },
  ];

  if (loading) {
    return (
      <div className="dashboard-home space-y-5">
        <div className="h-[100px] rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.07)' }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[100px] rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.07)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (loadError && !stats) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.1)' }}>
        <p className="text-slate-700 font-semibold mb-2">{t('dashboard.loadErrorTitle')}</p>
        <p className="text-sm text-slate-500 mb-4">{t('dashboard.loadErrorHint')}</p>
        <button
          type="button"
          onClick={loadStats}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-home space-y-5">
      <div
        className="user-dashboard-hero dashboard-welcome--hero relative overflow-hidden rounded-3xl p-6 lg:p-7"
        style={{ background: 'linear-gradient(135deg, #0B1220 0%, #312E81 45%, #134E4A 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {C.slice(0, 4).map((c, i) => (
          <div
            key={c.name}
            className="user-dashboard-hero__orb"
            style={{
              background: `radial-gradient(circle, ${c.solid}55 0%, transparent 70%)`,
              top: i % 2 === 0 ? '-15%' : 'auto',
              bottom: i % 2 === 1 ? '-20%' : 'auto',
              right: i % 2 === 0 ? `${8 + i * 10}%` : 'auto',
              left: i % 2 === 1 ? `${12 + i * 8}%` : 'auto',
              width: `${110 + i * 20}px`,
              height: `${110 + i * 20}px`,
            }}
          />
        ))}
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <WelcomeProfileAvatar role="police" variant="welcome" />
            <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C[0].grad }}>
                <Shield size={14} className="text-white" />
              </div>
              <span className="dashboard-welcome__eyebrow" style={{ color: C[0].solid }}>{t('dashboard.policePortal')}</span>
            </div>
            <h1 className="dashboard-welcome__title text-white">
              {t('dashboard.policeTitle')}
            </h1>
            <p className="dashboard-welcome__meta mt-1" style={{ color: 'rgba(148,163,184,0.75)' }}>
              {t('dashboard.policeWelcome', { name: user?.full_name ?? '' })} — {formatAppDate(locale, new Date())}
            </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIssueFineOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: C[1].grad, boxShadow: `0 8px 24px ${C[1].soft}` }}
          >
            <Plus size={16} /> Issue Fine
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <div
            key={k.title}
            className="user-dashboard-kpi relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
            style={{ background: k.palette.grad, boxShadow: `0 12px 32px ${k.palette.soft}` }}
          >
            <div className="absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-8 translate-x-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="relative z-[1] flex items-start justify-between">
              <div>
                <p className="dashboard-kpi__label">{k.title}</p>
                <p className="dashboard-kpi__value mt-2">{k.value}</p>
              </div>
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center border border-white/20">{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="user-dashboard-panel">
        <div className="user-dashboard-panel__bar" style={{ background: C[1].grad }} />
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: C[1].grad, boxShadow: `0 4px 12px ${C[1].soft}` }}>
              <Search size={16} className="text-white" />
            </div>
            <div>
              <h3 className="dashboard-section__title leading-tight">Driver License Lookup</h3>
              <p className="dashboard-section__subtitle">Search by license number to find driver records</p>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <input
                value={searchLicense}
                onChange={e => setSearchLicense(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. DL-KH-2024-001234"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 text-sm text-slate-700 outline-none transition-all"
                style={{ border: `1.5px solid ${C[1].solid}22` }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = C[1].solid; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${C[1].soft}`; }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = `${C[1].solid}22`; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-60"
              style={{ background: C[1].grad, boxShadow: `0 4px 12px ${C[1].soft}`, minWidth: 100 }}
            >
              {searching
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><Search size={14} /><span>Search</span></>
              }
            </button>
          </div>

          {searchResult?.driver && (
            <div className="rounded-xl p-4" style={{ background: C[2].soft, border: `1.5px solid ${C[2].solid}33` }}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-md flex-shrink-0"
                    style={{ background: C[1].grad }}>
                    {searchResult.driver.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-[15px]">{searchResult.driver.full_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{searchResult.driver.license_no} · {searchResult.driver.phone}</p>
                    <div className="flex gap-3 text-[12px] mt-2">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold" style={{ background: C[1].soft, color: C[1].dark }}>
                        <Car size={11} /> {searchResult.vehicles.length} vehicle(s)
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold" style={{ background: C[5].soft, color: C[5].dark }}>
                        <AlertCircle size={11} /> {searchResult.fines.filter(f => f.status !== 'paid' && f.status !== 'dismissed').length} outstanding
                      </span>
                    </div>
                    {searchResult.vehicles.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {searchResult.vehicles.map(v => (
                          <span key={v.id} className="text-[11px] px-2.5 py-1 rounded-lg text-slate-700 font-mono font-semibold"
                            style={{ background: '#fff', border: `1px solid ${C[1].solid}22`, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                            {v.plate_number} — {v.model}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openIssueFine(searchResult.driver!)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ background: C[5].grad, boxShadow: `0 4px 12px ${C[5].soft}` }}
                >
                  <Plus size={15} /> Issue Fine
                </button>
              </div>
            </div>
          )}

          {searchResult && !searchResult.driver && (
            <div className="text-center py-6 rounded-xl" style={{ background: '#FAFBFF', border: `1px dashed ${C[1].solid}33` }}>
              <Search size={28} className="mx-auto mb-2" style={{ color: `${C[1].solid}44` }} />
              <p className="text-slate-400 text-sm">No driver found for <span className="font-mono text-slate-600">{searchLicense}</span></p>
            </div>
          )}
        </div>
      </div>

      <div className="user-dashboard-panel">
        <div className="user-dashboard-panel__bar" style={{ background: C[6].grad }} />
        <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: C[6].soft, color: C[6].solid }}>
              <FileText size={16} />
            </div>
            <div>
              <h3 className="dashboard-section__title leading-tight">My Recent Fines</h3>
              <p className="dashboard-section__subtitle">Latest violations you've issued</p>
            </div>
          </div>
          {stats?.recent && stats.recent.length > 0 && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(37,99,235,0.07)', color: '#2563EB' }}>
              {stats.recent.length} total
            </span>
          )}
        </div>

        {!stats?.recent?.length ? (
          <div className="text-center py-12 rounded-xl" style={{ background: '#FAFBFF', border: '1px dashed rgba(37,99,235,0.1)' }}>
            <Shield size={36} className="mx-auto mb-3" style={{ color: 'rgba(37,99,235,0.2)' }} />
            <p className="text-slate-400 text-sm font-medium">No fines issued yet</p>
            <p className="text-slate-300 text-xs mt-1">Use the Issue Fine button to get started</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {stats.recent.map(f => {
              const badge = STATUS_BADGE[f.status] || STATUS_BADGE.dismissed;
              return (
                <div key={f.id} className="flex items-center gap-3 p-3.5 rounded-xl transition-all"
                  style={{ background: '#F8FAFC', borderLeft: `3px solid ${badge.accent}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: badge.bg, color: badge.color }}>
                    <FileText size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{f.driver_name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{f.reason}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <MapPin size={10} />{f.location}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 ml-2 flex-shrink-0">
                    <span className="font-black text-slate-900 text-sm" style={{ letterSpacing: '-0.01em' }}>{formatAppCurrency(locale, f.amount)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                      style={{ background: badge.bg, color: badge.color }}>
                      {f.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Issue Fine Dialog */}
      <Dialog open={issueFineOpen} onOpenChange={setIssueFineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
                <FileText size={15} className="text-white" />
              </div>
              Issue New Fine
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Driver License Number *</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="DL-KH-2024-XXXXXX" value={searchLicense} onChange={e => setSearchLicense(e.target.value)} className="flex-1" />
                <Button size="sm" variant="outline" onClick={async () => {
                  if (!searchLicense.trim()) return;
                  const r = await finesAPI.searchByLicense(searchLicense.trim());
                  if (r.driver) {
                    setFineForm(f => ({ ...f, driver_id: r.driver!.id }));
                    setSearchResult(r);
                    toast.success(`Found: ${r.driver.full_name}`);
                  } else toast.error('Driver not found');
                }}>Lookup</Button>
              </div>
              {searchResult?.driver && <p className="text-xs mt-1 font-semibold" style={{ color: '#059669' }}>✓ {searchResult.driver.full_name}</p>}
            </div>
            <div>
              <Label>Vehicle Plate</Label>
              <Input className="mt-1" placeholder="e.g. 2AA 1234" value={fineForm.vehicle_plate} onChange={e => setFineForm(f => ({ ...f, vehicle_plate: e.target.value }))} />
            </div>
            <div>
              <Label>Violation *</Label>
              <Select onValueChange={v => setFineForm(f => ({ ...f, reason: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select violation type" /></SelectTrigger>
                <SelectContent>
                  {VIOLATION_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('fines.amountLabel')} *</Label>
              <Input className="mt-1" type="number" min="0" step="100" placeholder={t('fines.amountPlaceholder')} value={fineForm.amount} onChange={e => setFineForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Location *</Label>
              <Input className="mt-1" placeholder="Street, District, Phnom Penh" value={fineForm.location} onChange={e => setFineForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueFineOpen(false)}>Cancel</Button>
            <button
              onClick={handleIssueFine} disabled={issuing}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
            >
              {issuing ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Issuing...</> : <><Plus size={14} />Issue Fine</>}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
