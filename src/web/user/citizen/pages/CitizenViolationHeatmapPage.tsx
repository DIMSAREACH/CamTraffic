import { useCallback, useEffect, useState } from 'react';
import { Filter, TrendingUp } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppDate } from '@shared/i18n/localeFormat';
import { violationsAPI } from '@shared/services/api';
import { humanizeApiError } from '@shared/utils/apiErrors';
import { toast } from 'sonner';

type HeatPoint = {
  lat: number;
  lng: number;
  intensity: number;
  count: number;
  avg_severity: number;
  violations: Array<{ id: string; type: string; date: string }>;
};

const PP_BOUNDS = { south: 11.48, north: 11.65, west: 104.82, east: 105.0 };

function project(lat: number, lng: number) {
  const top = ((PP_BOUNDS.north - lat) / (PP_BOUNDS.north - PP_BOUNDS.south)) * 100;
  const left = ((lng - PP_BOUNDS.west) / (PP_BOUNDS.east - PP_BOUNDS.west)) * 100;
  return {
    top: Math.min(96, Math.max(4, top)),
    left: Math.min(96, Math.max(4, left)),
  };
}

export default function CitizenViolationHeatmapPage() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const [points, setPoints] = useState<HeatPoint[]>([]);
  const [stats, setStats] = useState<{
    total_violations: number;
    unique_locations: number;
    hotspot?: { lat: number; lng: number; count: number; avg_severity: number };
    period_days: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('90');
  const [intensity, setIntensity] = useState<'count' | 'severity'>('count');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await violationsAPI.getHeatmap({ days: Number(days), intensity });
      setPoints(data.heatmap || []);
      setStats(data.statistics || null);
    } catch (err) {
      toast.error(err instanceof Error ? humanizeApiError(err.message) : 'Request failed');
      setPoints([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user, days, intensity]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxIntensity = Math.max(1, ...points.map((p) => p.intensity || p.count || 1));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <TrendingUp className="h-5 w-5" />
          Violation heatmap
        </h1>
        <p className="text-sm text-slate-500">Density of your real violations by location</p>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Period</p>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="180">6 months</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Intensity</p>
          <Select value={intensity} onValueChange={(v) => setIntensity(v as 'count' | 'severity')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="count">By count</SelectItem>
              <SelectItem value="severity">By severity</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="w-full" onClick={() => void load()}>
            <Filter className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="relative h-80 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 lg:col-span-2">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            </div>
          ) : points.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No heatmap data for this period
            </div>
          ) : (
            points.map((p, idx) => {
              const pos = project(p.lat, p.lng);
              const ratio = (p.intensity || p.count) / maxIntensity;
              const size = 28 + ratio * 48;
              const color = ratio > 0.7 ? 'rgba(239,68,68,0.45)' : ratio > 0.4 ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.35)';
              return (
                <div
                  key={`${p.lat}-${p.lng}-${idx}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-[1px]"
                  style={{
                    top: `${pos.top}%`,
                    left: `${pos.left}%`,
                    width: size,
                    height: size,
                    background: color,
                  }}
                  title={`${p.count} violations`}
                />
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-medium text-slate-800">Statistics</h2>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.total_violations ?? 0}</p>
                <p className="text-xs text-slate-500">Violations</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.unique_locations ?? 0}</p>
                <p className="text-xs text-slate-500">Locations</p>
              </div>
            </div>
            {stats?.hotspot ? (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">
                Hotspot: {stats.hotspot.count} at {stats.hotspot.lat.toFixed(4)}, {stats.hotspot.lng.toFixed(4)}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-medium text-slate-800">Recent at clusters</h2>
            <div className="space-y-2">
              {points.flatMap((p) => p.violations).slice(0, 6).map((v) => (
                <div key={v.id} className="flex justify-between text-sm">
                  <span className="capitalize text-slate-700">{v.type.replace(/_/g, ' ')}</span>
                  <span className="text-slate-500">{formatAppDate(locale, v.date)}</span>
                </div>
              ))}
              {points.length === 0 ? (
                <p className="text-sm text-slate-500">No cluster samples</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
