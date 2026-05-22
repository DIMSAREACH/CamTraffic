import { useState, useEffect } from 'react';
import { useLanguage } from '@shared/context/LanguageContext';
import { Activity, Search, CheckCircle, Camera, Users, BarChart2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { aiAPI } from '@shared/services/api';
import type { AIDetectionLog } from '@shared/types';

export function AILogsPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AIDetectionLog[]>([]);
  const [filtered, setFiltered] = useState<AIDetectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    aiAPI.getLogs().then(data => { setLogs(data); setFiltered(data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!search) { setFiltered(logs); return; }
    const q = search.toLowerCase();
    setFiltered(logs.filter(l => l.detected_sign.toLowerCase().includes(q) || l.user_name.toLowerCase().includes(q)));
  }, [search, logs]);

  const avgConfidence = logs.length ? (logs.reduce((s, l) => s + l.confidence, 0) / logs.length).toFixed(1) : '—';
  const uniqueUsers = new Set(logs.map(l => l.user_id)).size;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F172A, #162035)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full -translate-y-16 translate-x-16"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}>
              <Activity size={14} style={{ color: '#C4B5FD' }} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(196,181,253,0.9)' }}>AI System Logs</span>
          </div>
          <h1 className="text-white text-[20px] font-black leading-tight" style={{ letterSpacing: '-0.02em' }}>{t('pages.aiLogs.title')}</h1>
          <p className="mt-1 text-[12px]" style={{ color: 'rgba(148,163,184,0.7)' }}>All traffic sign detection events across the system</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Detections', value: logs.length, icon: <Camera size={18} />, gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
          { label: 'Avg Confidence', value: avgConfidence === '—' ? '—' : `${avgConfidence}%`, icon: <BarChart2 size={18} />, gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)' },
          { label: 'Unique Users', value: uniqueUsers, icon: <Users size={18} />, gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
        ].map(s => (
          <div key={s.label} className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: s.gradient }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-5 translate-x-5" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-white/65 text-[11px] font-semibold uppercase tracking-widest">{s.label}</p>
                <p className="text-3xl font-black mt-1.5 leading-none" style={{ letterSpacing: '-0.02em' }}>{s.value}</p>
              </div>
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by sign or user..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-sm text-slate-700 outline-none"
          style={{ border: '1px solid rgba(37,99,235,0.1)' }}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(37,99,235,0.07)' }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ background: '#F8FAFC', borderBottom: '1px solid rgba(37,99,235,0.07)' }}>
                {['User', 'Detected Sign', 'Confidence', 'Description', 'Date'].map(h => (
                  <TableHead key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? [...Array(4)].map((_, i) => (
                <TableRow key={i}>{[...Array(5)].map((_, j) => <TableCell key={j}><div className="h-4 rounded-lg animate-pulse" style={{ background: 'rgba(37,99,235,0.05)' }} /></TableCell>)}</TableRow>
              )) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">No detection logs found.</TableCell></TableRow>
              ) : filtered.map(log => (
                <TableRow key={log.id}
                  style={{ borderBottom: '1px solid rgba(37,99,235,0.04)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFF'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                        {log.user_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{log.user_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-800">{log.detected_sign}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(139,92,246,0.15)' }}>
                        <div className="h-full rounded-full" style={{ width: `${log.confidence}%`, background: 'linear-gradient(90deg, #8B5CF6, #2563EB)' }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#7C3AED' }}>{log.confidence.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 max-w-[220px] truncate">{log.description}</TableCell>
                  <TableCell className="text-sm text-slate-400">{new Date(log.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
