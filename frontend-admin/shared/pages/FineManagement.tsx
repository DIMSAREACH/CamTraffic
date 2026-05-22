import { useState, useEffect } from 'react';
import { Search, Plus, Eye, CheckCircle, XCircle, Clock, AlertTriangle, MapPin, FileText, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { finesAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Fine } from '@shared/types';

const STATUS_META: Record<string, { icon: React.ReactNode; bg: string; color: string; label: string; gradient: string }> = {
  pending:   { icon: <Clock size={11} />,         bg: 'rgba(245,158,11,0.1)',    color: '#D97706',  label: 'Pending',   gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  paid:      { icon: <CheckCircle size={11} />,    bg: 'rgba(16,185,129,0.1)',    color: '#059669',  label: 'Paid',      gradient: 'linear-gradient(135deg, #10B981, #059669)' },
  overdue:   { icon: <AlertTriangle size={11} />,  bg: 'rgba(239,68,68,0.1)',     color: '#DC2626',  label: 'Overdue',   gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
  dismissed: { icon: <XCircle size={11} />,        bg: 'rgba(100,116,139,0.1)',   color: '#475569',  label: 'Dismissed', gradient: 'linear-gradient(135deg, #64748B, #475569)' },
};

const VIOLATION_REASONS = [
  'Running Red Light', 'Speeding (above limit)', 'No Helmet (Motorcycle)', 'No Seatbelt',
  'Illegal Parking', 'Wrong Way on One-Way Street', 'Using Mobile Phone While Driving',
  'Failure to Stop at Stop Sign', 'No Valid License', 'Reckless Driving',
  'Speeding in School Zone', 'No Vehicle Registration',
];

const STATUS_TABS = ['all', 'pending', 'paid', 'overdue', 'dismissed'] as const;
type StatusTab = typeof STATUS_TABS[number];

export function FineManagement() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [fines, setFines] = useState<Fine[]>([]);
  const [filtered, setFiltered] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [selected, setSelected] = useState<Fine | null>(null);
  const [issueFineOpen, setIssueFineOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [fineForm, setFineForm] = useState({ driver_license: '', vehicle_plate: '', reason: '', amount: '', location: '' });
  const [searchResult, setSearchResult] = useState<{ driver: { id: number; full_name: string } | null }>({ driver: null });

  const loadFines = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let data: Fine[];
      if (user.role === 'admin') data = await finesAPI.getAll();
      else if (user.role === 'police') data = await finesAPI.getByPolice(user.id);
      else data = await finesAPI.getByDriver(user.id);
      setFines(data);
      setFiltered(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadFines(); }, [user]);

  useEffect(() => {
    let result = [...fines];
    if (statusFilter !== 'all') result = result.filter(f => f.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f =>
        f.driver_name.toLowerCase().includes(q) ||
        f.driver_license.toLowerCase().includes(q) ||
        f.vehicle_plate.toLowerCase().includes(q) ||
        f.reason.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [fines, search, statusFilter]);

  const handleStatusUpdate = async (id: number, status: Fine['status']) => {
    try {
      const updated = await finesAPI.updateStatus(id, status);
      setFines(prev => prev.map(f => f.id === id ? updated : f));
      if (selected?.id === id) setSelected(updated);
      toast.success(`Status updated to ${status}`);
    } catch { toast.error('Failed to update status'); }
  };

  const handleLookup = async () => {
    const r = await finesAPI.searchByLicense(fineForm.driver_license);
    if (r.driver) {
      setSearchResult({ driver: { id: r.driver.id, full_name: r.driver.full_name } });
      toast.success(`Found: ${r.driver.full_name}`);
    } else {
      setSearchResult({ driver: null });
      toast.error('Driver not found');
    }
  };

  const handleIssueFine = async () => {
    if (!user || !searchResult.driver || !fineForm.reason || !fineForm.amount || !fineForm.location) {
      toast.error('Fill all required fields and lookup driver first'); return;
    }
    setIssuing(true);
    try {
      await finesAPI.create({
        driver_id: searchResult.driver.id, police_id: user.id,
        vehicle_plate: fineForm.vehicle_plate, reason: fineForm.reason,
        amount: parseFloat(fineForm.amount), location: fineForm.location,
      });
      toast.success('Fine issued successfully');
      setIssueFineOpen(false);
      setFineForm({ driver_license: '', vehicle_plate: '', reason: '', amount: '', location: '' });
      setSearchResult({ driver: null });
      loadFines();
    } catch { toast.error('Failed to issue fine'); }
    finally { setIssuing(false); }
  };

  const counts = {
    all: fines.length,
    pending: fines.filter(f => f.status === 'pending').length,
    paid: fines.filter(f => f.status === 'paid').length,
    overdue: fines.filter(f => f.status === 'overdue').length,
    dismissed: fines.filter(f => f.status === 'dismissed').length,
  };

  const totalRevenue = fines.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F172A, #162035)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full -translate-y-16 translate-x-16"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full translate-y-14 -translate-x-8"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.18)' }}>
                <FileText size={14} style={{ color: '#FCA5A5' }} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(252,165,165,0.9)' }}>{t('pages.fines.eyebrow')}</span>
            </div>
            <h1 className="text-white text-[20px] font-black leading-tight" style={{ letterSpacing: '-0.02em' }}>
              {t('pages.fines.title')}
            </h1>
            <p className="mt-1 text-[12px]" style={{ color: 'rgba(148,163,184,0.7)' }}>
              {user?.role === 'driver' ? t('pages.fines.subtitleDriver') : t('pages.fines.subtitleAdmin')}
            </p>
          </div>
          {(user?.role === 'admin' || user?.role === 'police') && (
            <button
              onClick={() => setIssueFineOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 16px rgba(37,99,235,0.45)' }}
            >
              <Plus size={16} /> Issue Fine
            </button>
          )}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Fines', value: counts.all, icon: <FileText size={17} />, bg: 'rgba(37,99,235,0.08)', color: '#2563EB' },
          { label: 'Pending Payment', value: counts.pending, icon: <Clock size={17} />, bg: 'rgba(245,158,11,0.1)', color: '#D97706' },
          { label: 'Paid Fines', value: counts.paid, icon: <CheckCircle size={17} />, bg: 'rgba(16,185,129,0.1)', color: '#059669' },
          { label: 'Revenue Collected', value: `$${totalRevenue}`, icon: <DollarSign size={17} />, bg: 'rgba(139,92,246,0.1)', color: '#7C3AED' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3.5 transition-all"
            style={{ border: '1px solid rgba(37,99,235,0.07)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(37,99,235,0.08)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p className="text-[20px] font-black text-slate-900" style={{ letterSpacing: '-0.02em' }}>{s.value}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-2 flex-1">
            {STATUS_TABS.map(s => {
              const active = statusFilter === s;
              const meta = s !== 'all' ? STATUS_META[s] : null;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all"
                  style={active
                    ? { background: meta?.gradient ?? 'linear-gradient(135deg, #0F172A, #1E293B)', color: '#fff', boxShadow: `0 4px 12px ${meta ? meta.bg.replace('0.1)', '0.4)') : 'rgba(15,23,42,0.3)'}` }
                    : { background: '#F8FAFC', color: '#64748B', border: '1px solid rgba(37,99,235,0.08)' }
                  }
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                    style={active ? { background: 'rgba(255,255,255,0.25)' } : { background: '#EEF2FF', color: '#6366F1' }}>
                    {counts[s]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, plate, location..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 text-[13px] text-slate-700 outline-none transition-all"
              style={{ border: '1.5px solid rgba(37,99,235,0.08)' }}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
              onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.08)'; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ background: '#F8FAFC', borderBottom: '1px solid rgba(37,99,235,0.08)' }}>
                {['Driver', 'Vehicle', 'Violation', 'Amount', 'Date', 'Status', 'Actions'].map(h => (
                  <TableHead key={h} className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] py-3.5">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}><div className="h-4 rounded-lg animate-pulse" style={{ background: 'rgba(37,99,235,0.05)' }} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.06)' }}>
                        <FileText size={28} style={{ color: 'rgba(37,99,235,0.25)' }} />
                      </div>
                      <div>
                        <p className="text-slate-500 font-semibold text-sm">No fines found</p>
                        <p className="text-slate-300 text-xs mt-1">Try adjusting your search or filter</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(f => {
                const st = STATUS_META[f.status] || STATUS_META.dismissed;
                return (
                  <TableRow key={f.id} className="transition-all" style={{ borderBottom: '1px solid rgba(37,99,235,0.04)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFF'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #2563EB, #06B6D4)' }}>
                          {f.driver_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-[13px]">{f.driver_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{f.driver_license}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg text-slate-700"
                        style={{ background: '#F1F5F9', border: '1px solid rgba(37,99,235,0.07)' }}>
                        {f.vehicle_plate}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-[13px] text-slate-700 max-w-[160px] truncate font-medium" title={f.reason}>{f.reason}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin size={9} />{f.location}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="font-black text-slate-900 text-[14px]" style={{ letterSpacing: '-0.02em' }}>${f.amount}</span>
                    </TableCell>
                    <TableCell>
                      <p className="text-[12px] text-slate-500">{new Date(f.created_at).toLocaleDateString()}</p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
                        style={{ background: st.bg, color: st.color }}>
                        {st.icon}{st.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelected(f)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                          style={{ color: '#64748B', background: '#F8FAFC', border: '1px solid rgba(37,99,235,0.08)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EEF2FF'; (e.currentTarget as HTMLElement).style.color = '#2563EB'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLElement).style.color = '#64748B'; }}>
                          <Eye size={12} /> View
                        </button>
                        {(user?.role === 'admin' || user?.role === 'police') && f.status === 'pending' && (
                          <button onClick={() => handleStatusUpdate(f.id, 'paid')}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                            style={{ color: '#059669', background: 'rgba(16,185,129,0.08)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.15)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.08)'; }}>
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(37,99,235,0.06)', background: '#FAFBFF' }}>
            <p className="text-[12px] text-slate-400">Showing {filtered.length} of {fines.length} fines</p>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={13} style={{ color: '#059669' }} />
              <span className="text-[12px] font-semibold" style={{ color: '#059669' }}>${totalRevenue} collected</span>
            </div>
          </div>
        )}
      </div>

      {/* Fine Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>
                <FileText size={15} />
              </div>
              Fine Details — #{selected?.id}
            </DialogTitle>
          </DialogHeader>
          {selected && (() => {
            const st = STATUS_META[selected.status] || STATUS_META.dismissed;
            return (
              <div className="space-y-2 py-2">
                <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: st.bg }}>
                  <span className="text-sm text-slate-500 font-medium">Current Status</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide"
                    style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}30` }}>
                    {st.icon}{st.label}
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
                  {[
                    { label: 'Driver', value: selected.driver_name },
                    { label: 'License No.', value: selected.driver_license },
                    { label: 'Vehicle Plate', value: selected.vehicle_plate },
                    { label: 'Issued By', value: selected.police_name },
                    { label: 'Violation', value: selected.reason },
                    { label: 'Amount', value: `$${selected.amount} USD` },
                    { label: 'Location', value: selected.location },
                    { label: 'Date Issued', value: new Date(selected.created_at).toLocaleString() },
                    ...(selected.paid_at ? [{ label: 'Date Paid', value: new Date(selected.paid_at).toLocaleString() }] : []),
                  ].map((r, idx, arr) => (
                    <div key={r.label} className="flex justify-between items-center px-4 py-2.5 text-sm"
                      style={{ background: idx % 2 === 0 ? '#FAFBFF' : '#fff', borderBottom: idx < arr.length - 1 ? '1px solid rgba(37,99,235,0.05)' : 'none' }}>
                      <span className="text-slate-400 font-medium text-[12px]">{r.label}</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[55%] text-[13px]">{r.value}</span>
                    </div>
                  ))}
                </div>

                {(user?.role === 'admin' || user?.role === 'police') && selected.status !== 'paid' && selected.status !== 'dismissed' && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleStatusUpdate(selected.id, 'paid')}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                      style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                      <CheckCircle size={14} /> Mark as Paid
                    </button>
                    <button onClick={() => handleStatusUpdate(selected.id, 'dismissed')}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 text-slate-500"
                      style={{ border: '1.5px solid rgba(37,99,235,0.12)', background: '#fff' }}>
                      <XCircle size={14} /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Issue Fine Dialog */}
      <Dialog open={issueFineOpen} onOpenChange={setIssueFineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
                <Plus size={15} className="text-white" />
              </div>
              Issue New Fine
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Driver License * <span className="text-slate-400 font-normal">(lookup required)</span></Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="DL-KH-2024-XXXXXX" value={fineForm.driver_license}
                  onChange={e => setFineForm(f => ({ ...f, driver_license: e.target.value }))} className="flex-1" />
                <Button size="sm" variant="outline" onClick={handleLookup}>Lookup</Button>
              </div>
              {searchResult.driver && <p className="text-xs mt-1 font-semibold" style={{ color: '#059669' }}>✓ {searchResult.driver.full_name}</p>}
            </div>
            <div>
              <Label className="text-sm">Vehicle Plate</Label>
              <Input className="mt-1" placeholder="e.g. 2AA 1234" value={fineForm.vehicle_plate}
                onChange={e => setFineForm(f => ({ ...f, vehicle_plate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Violation *</Label>
              <Select onValueChange={v => setFineForm(f => ({ ...f, reason: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select violation" /></SelectTrigger>
                <SelectContent>{VIOLATION_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Amount (USD) *</Label>
                <Input className="mt-1" type="number" min="5" placeholder="e.g. 50" value={fineForm.amount}
                  onChange={e => setFineForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Location *</Label>
                <Input className="mt-1" placeholder="District, City" value={fineForm.location}
                  onChange={e => setFineForm(f => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueFineOpen(false)}>Cancel</Button>
            <button
              onClick={handleIssueFine} disabled={issuing}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60 transition-all"
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
