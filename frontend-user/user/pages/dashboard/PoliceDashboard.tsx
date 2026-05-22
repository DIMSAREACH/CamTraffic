import { useState, useEffect } from 'react';
import { FileText, Clock, DollarSign, Search, Plus, MapPin, Shield, TrendingUp, AlertCircle, Car, RefreshCw } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate } from '@shared/i18n/localeFormat';
import { WelcomeProfileAvatar } from '@shared/components/WelcomeProfileAvatar';
import { dashboardAPI, finesAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Fine, User, Vehicle } from '@shared/types';

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'rgba(245,158,11,0.12)', color: '#D97706' },
  paid: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  overdue: { bg: 'rgba(239,68,68,0.12)', color: '#DC2626' },
  dismissed: { bg: 'rgba(100,116,139,0.12)', color: '#475569' },
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
  const [stats, setStats] = useState<{ total_issued: number; today_issued: number; pending: number; revenue: number; recent: Fine[] } | null>(null);
  const [searchLicense, setSearchLicense] = useState('');
  const [searchResult, setSearchResult] = useState<{ driver: User | null; fines: Fine[]; vehicles: Vehicle[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [issueFineOpen, setIssueFineOpen] = useState(false);
  const [fineForm, setFineForm] = useState({ driver_id: 0, vehicle_plate: '', reason: '', amount: '', location: '' });
  const [issuing, setIssuing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadStats = () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    dashboardAPI
      .getPoliceStats(user.id)
      .then(setStats)
      .catch(() => {
        setStats(null);
        setLoadError(true);
        toast.error('Could not load dashboard stats.');
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
      await finesAPI.create({ ...fineForm, amount: parseFloat(fineForm.amount), police_id: user.id });
      toast.success('Fine issued successfully!');
      setIssueFineOpen(false);
      setFineForm({ driver_id: 0, vehicle_plate: '', reason: '', amount: '', location: '' });
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
    { title: 'Total Issued', value: stats?.total_issued ?? 0, icon: <FileText size={19} />, gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)', glow: 'rgba(37,99,235,0.35)' },
    { title: "Today's Fines", value: stats?.today_issued ?? 0, icon: <TrendingUp size={19} />, gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', glow: 'rgba(239,68,68,0.35)' },
    { title: 'Pending', value: stats?.pending ?? 0, icon: <Clock size={19} />, gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', glow: 'rgba(245,158,11,0.35)' },
    { title: 'Revenue', value: `$${Number(stats?.revenue ?? 0).toLocaleString()}`, icon: <DollarSign size={19} />, gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)', glow: 'rgba(6,182,212,0.35)' },
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
        <p className="text-slate-700 font-semibold mb-2">Dashboard could not load</p>
        <p className="text-sm text-slate-500 mb-4">Check that the backend is running, then retry.</p>
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
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #0F172A, #162035)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-20 translate-x-20"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full translate-y-16"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <WelcomeProfileAvatar role="police" variant="welcome" />
            <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.2)' }}>
                <Shield size={14} style={{ color: '#60A5FA' }} />
              </div>
              <span className="dashboard-welcome__eyebrow" style={{ color: 'rgba(96,165,250,0.9)' }}>{t('dashboard.policePortal')}</span>
            </div>
            <h1 className="dashboard-welcome__title text-white">
              {t('dashboard.policeTitle')}
            </h1>
            <p className="dashboard-welcome__meta mt-1" style={{ color: 'rgba(148,163,184,0.7)' }}>
              {t('dashboard.policeWelcome', { name: user?.full_name ?? '' })} — {formatAppDate(locale, new Date())}
            </p>
            </div>
          </div>
          <button
            onClick={() => setIssueFineOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 16px rgba(37,99,235,0.45)' }}
          >
            <Plus size={16} /> Issue Fine
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(k => (
          <div key={k.title} className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: k.gradient, boxShadow: `0 8px 24px ${k.glow}` }}>
            <div className="absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-8 translate-x-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="dashboard-kpi__label text-white/65">{k.title}</p>
                <p className="dashboard-kpi__value text-white mt-2">{k.value}</p>
              </div>
              <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center">{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Driver Search */}
      <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
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
              style={{ border: '1.5px solid rgba(37,99,235,0.1)' }}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
              onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.1)'; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', minWidth: 100 }}
          >
            {searching
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><Search size={14} /><span>Search</span></>
            }
          </button>
        </div>

        {searchResult?.driver && (
          <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.03), rgba(6,182,212,0.03))', border: '1.5px solid rgba(37,99,235,0.12)' }}>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-md flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }}>
                  {searchResult.driver.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-[15px]">{searchResult.driver.full_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{searchResult.driver.license_no} · {searchResult.driver.phone}</p>
                  <div className="flex gap-3 text-[12px] mt-2">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
                      <Car size={11} /> {searchResult.vehicles.length} vehicle(s)
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626' }}>
                      <AlertCircle size={11} /> {searchResult.fines.filter(f => f.status !== 'paid' && f.status !== 'dismissed').length} outstanding
                    </span>
                  </div>
                  {searchResult.vehicles.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {searchResult.vehicles.map(v => (
                        <span key={v.id} className="text-[11px] px-2.5 py-1 rounded-lg text-slate-700 font-mono font-semibold"
                          style={{ background: '#fff', border: '1px solid rgba(37,99,235,0.1)', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                          {v.plate_number} — {v.model}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => openIssueFine(searchResult.driver!)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}
              >
                <Plus size={15} /> Issue Fine
              </button>
            </div>
          </div>
        )}

        {searchResult && !searchResult.driver && (
          <div className="text-center py-6 rounded-xl" style={{ background: '#FAFBFF', border: '1px dashed rgba(37,99,235,0.12)' }}>
            <Search size={28} className="mx-auto mb-2" style={{ color: 'rgba(37,99,235,0.2)' }} />
            <p className="text-slate-400 text-sm">No driver found for <span className="font-mono text-slate-600">{searchLicense}</span></p>
          </div>
        )}
      </div>

      {/* Recent Fines */}
      <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'rgba(37,99,235,0.07)', color: '#2563EB' }}>
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
                  style={{ background: '#F8FAFC', border: '1px solid rgba(37,99,235,0.05)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FAFBFF'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.05)'; }}>
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
                    <span className="font-black text-slate-900 text-sm" style={{ letterSpacing: '-0.01em' }}>${f.amount}</span>
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
              <Label>Fine Amount (USD) *</Label>
              <Input className="mt-1" type="number" placeholder="e.g. 50" value={fineForm.amount} onChange={e => setFineForm(f => ({ ...f, amount: e.target.value }))} />
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
