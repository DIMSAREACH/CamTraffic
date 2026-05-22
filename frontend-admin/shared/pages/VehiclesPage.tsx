import { useState, useEffect } from 'react';
import { Car, Plus, Trash2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { vehiclesAPI } from '@shared/services/api';
import { toast } from 'sonner';
import type { Vehicle } from '@shared/types';

const TYPE_ICON: Record<string, string> = {
  car: '🚗', motorcycle: '🏍️', truck: '🚚', bus: '🚌', 'tuk-tuk': '🛺',
};

const TYPE_COLORS: Record<string, string> = {
  car: 'bg-blue-100 text-blue-800',
  motorcycle: 'bg-orange-100 text-orange-800',
  truck: 'bg-gray-100 text-gray-800',
  bus: 'bg-purple-100 text-purple-800',
  'tuk-tuk': 'bg-emerald-100 text-emerald-800',
};

export function VehiclesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filtered, setFiltered] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ plate_number: '', vehicle_type: '', model: '', color: '', year: new Date().getFullYear().toString() });

  const loadVehicles = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = user.role === 'driver' ? await vehiclesAPI.getByOwner(user.id) : await vehiclesAPI.getAll();
      setVehicles(data);
      setFiltered(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVehicles(); }, [user]);

  useEffect(() => {
    if (!search) { setFiltered(vehicles); return; }
    const q = search.toLowerCase();
    setFiltered(vehicles.filter(v =>
      v.plate_number.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.owner_name.toLowerCase().includes(q) ||
      v.color.toLowerCase().includes(q)
    ));
  }, [search, vehicles]);

  const handleAdd = async () => {
    if (!user || !form.plate_number || !form.vehicle_type || !form.model || !form.color) {
      toast.error('Fill all required fields'); return;
    }
    setAdding(true);
    try {
      await vehiclesAPI.create({ owner_id: user.id, plate_number: form.plate_number, vehicle_type: form.vehicle_type as Vehicle['vehicle_type'], model: form.model, color: form.color, year: parseInt(form.year) });
      toast.success('Vehicle registered successfully!');
      setAddOpen(false);
      setForm({ plate_number: '', vehicle_type: '', model: '', color: '', year: new Date().getFullYear().toString() });
      loadVehicles();
    } catch {
      toast.error('Failed to register vehicle');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await vehiclesAPI.delete(id);
      toast.success('Vehicle removed');
      setDeleteId(null);
      loadVehicles();
    } catch {
      toast.error('Failed to remove vehicle');
    }
  };

  const getColorDot = (color: string) => {
    const c = color.toLowerCase();
    if (c.includes('white')) return '#fff';
    if (c.includes('black')) return '#000';
    if (c.includes('red')) return '#EF4444';
    if (c.includes('blue')) return '#2563EB';
    if (c.includes('silver') || c.includes('grey') || c.includes('gray')) return '#9CA3AF';
    return '#D1D5DB';
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F172A, #162035)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full -translate-y-16 translate-x-16"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.2)' }}>
                <Car size={14} style={{ color: '#67E8F9' }} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(103,232,249,0.9)' }}>Vehicle Registry</span>
            </div>
            <h1 className="text-white text-[20px] font-black leading-tight" style={{ letterSpacing: '-0.02em' }}>{user?.role === 'driver' ? t('pages.vehicles.titleDriver') : t('pages.vehicles.titleAdmin')}</h1>
            <p className="mt-1 text-[12px]" style={{ color: 'rgba(148,163,184,0.7)' }}>{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered</p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: '0 4px 16px rgba(6,182,212,0.45)' }}
          >
            <Plus size={16} /> Register Vehicle
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by plate, model, or owner..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-sm text-slate-700 outline-none"
          style={{ border: '1px solid rgba(37,99,235,0.1)' }}
        />
      </div>

      {user?.role === 'driver' ? (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: 'rgba(37,99,235,0.05)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Car size={48} className="mx-auto mb-3" style={{ color: 'rgba(37,99,235,0.15)' }} />
            <p className="text-slate-400 mb-4">{search ? 'No vehicles found.' : 'No vehicles registered yet.'}</p>
            {!search && (
              <button onClick={() => setAddOpen(true)}
                className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
                <Plus size={14} className="inline mr-1" /> Add First Vehicle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(v => (
              <div key={v.id} className="bg-white rounded-2xl p-5 shadow-sm transition-all"
                style={{ border: '1px solid rgba(37,99,235,0.07)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(37,99,235,0.1)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(15,23,42,0.04)'}>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{TYPE_ICON[v.vehicle_type] || '🚗'}</div>
                  <button onClick={() => setDeleteId(v.id)} className="p-1.5 rounded-lg transition-colors text-slate-300 hover:text-red-500"
                    style={{ '--tw-bg-opacity': '1' } as React.CSSProperties}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black font-mono text-sm px-2 py-0.5 rounded-lg text-slate-700" style={{ background: '#F1F5F9' }}>{v.plate_number}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>{v.vehicle_type}</span>
                  </div>
                  <p className="font-semibold text-slate-800">{v.model}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: getColorDot(v.color) }} />
                    {v.color} · {v.year}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ background: '#F8FAFC', borderBottom: '1px solid rgba(37,99,235,0.07)' }}>
                  {['Plate', 'Type', 'Model', 'Color', 'Year', 'Owner', 'Registered', 'Action'].map(h => (
                    <TableHead key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? [...Array(5)].map((_, i) => (
                  <TableRow key={i}>{[...Array(8)].map((_, j) => <TableCell key={j}><div className="h-4 rounded-lg animate-pulse" style={{ background: 'rgba(37,99,235,0.05)' }} /></TableCell>)}</TableRow>
                )) : filtered.map(v => (
                  <TableRow key={v.id} style={{ borderBottom: '1px solid rgba(37,99,235,0.04)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFF'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <TableCell><span className="font-mono font-semibold text-slate-700 text-xs px-2 py-1 rounded-lg" style={{ background: '#F1F5F9' }}>{v.plate_number}</span></TableCell>
                    <TableCell><span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(37,99,235,0.07)', color: '#2563EB' }}>{TYPE_ICON[v.vehicle_type]} {v.vehicle_type}</span></TableCell>
                    <TableCell className="text-sm text-slate-700">{v.model}</TableCell>
                    <TableCell className="text-sm text-slate-500">{v.color}</TableCell>
                    <TableCell className="text-sm text-slate-500">{v.year}</TableCell>
                    <TableCell className="text-sm font-semibold text-slate-700">{v.owner_name}</TableCell>
                    <TableCell className="text-sm text-slate-400">{new Date(v.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <button onClick={() => setDeleteId(v.id)} className="p-1.5 rounded-lg transition-colors text-slate-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add Vehicle Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Register New Vehicle</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Plate Number *</Label>
              <Input className="mt-1" placeholder="e.g. 2AA 1234" value={form.plate_number} onChange={e => setForm(f => ({ ...f, plate_number: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Vehicle Type *</Label>
              <Select onValueChange={v => setForm(f => ({ ...f, vehicle_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {['car', 'motorcycle', 'truck', 'bus', 'tuk-tuk'].map(t => <SelectItem key={t} value={t}>{TYPE_ICON[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Model *</Label>
              <Input className="mt-1" placeholder="e.g. Toyota Camry 2022" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Color *</Label>
                <Input className="mt-1" placeholder="e.g. Silver" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Year</Label>
                <Input className="mt-1" type="number" min="2000" max="2025" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <button onClick={handleAdd} disabled={adding}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
              {adding ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Registering...</> : 'Register'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove Vehicle?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500 py-2">This will permanently remove the vehicle from the system.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-600 hover:bg-red-700 text-white">Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
