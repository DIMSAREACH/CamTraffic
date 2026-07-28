import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Filter, MapPin, RotateCcw } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatAppCurrency, formatAppDate } from '@shared/i18n/localeFormat';
import { CITIZEN_PORTAL_ROUTES } from '@shared/constants/portalRoutes';
import { violationsAPI } from '@shared/services/api';
import { humanizeApiError } from '@shared/utils/apiErrors';
import { toast } from 'sonner';

type MapViolation = {
  id: string;
  coordinates: { lat: number; lng: number };
  type: string;
  status: string;
  date: string;
  location: string;
  detected_sign?: string;
  camera_name?: string;
  severity: number;
  has_fine: boolean;
  fine_amount?: number;
  fine_status?: string;
};

/** Phnom Penh viewport for projecting real GPS → % position (no random mock markers). */
const PP_BOUNDS = { south: 11.48, north: 11.65, west: 104.82, east: 105.0 };

function project(lat: number, lng: number) {
  const top = ((PP_BOUNDS.north - lat) / (PP_BOUNDS.north - PP_BOUNDS.south)) * 100;
  const left = ((lng - PP_BOUNDS.west) / (PP_BOUNDS.east - PP_BOUNDS.west)) * 100;
  return {
    top: Math.min(96, Math.max(4, top)),
    left: Math.min(96, Math.max(4, left)),
  };
}

function severityClass(severity: number) {
  if (severity >= 4) return 'bg-red-500';
  if (severity >= 2) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export default function ViolationMapPage() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const [violations, setViolations] = useState<MapViolation[]>([]);
  const [selected, setSelected] = useState<MapViolation | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');
  const [status, setStatus] = useState('all');
  const [violationType, setViolationType] = useState('all');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await violationsAPI.getMap({
        days: Number(days),
        status: status === 'all' ? undefined : status,
        violation_type: violationType === 'all' ? undefined : violationType,
      });
      setViolations(data.violations || []);
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? humanizeApiError(err.message) : 'Request failed');
      setViolations([]);
    } finally {
      setLoading(false);
    }
  }, [user, days, status, violationType]);

  useEffect(() => {
    void load();
  }, [load]);

  const osmUrl = useMemo(() => {
    if (!selected) {
      return 'https://www.openstreetmap.org/export/embed.html?bbox=104.82%2C11.48%2C105.00%2C11.65&layer=mapnik';
    }
    const { lat, lng } = selected.coordinates;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.015}%2C${lng + 0.02}%2C${lat + 0.015}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [selected]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Your violations map</h1>
        <p className="text-sm text-slate-500">Live GPS points from your CamTraffic violations in Phnom Penh</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="appealed">Appealed</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={violationType} onValueChange={setViolationType}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="speeding">Speeding</SelectItem>
              <SelectItem value="red_light">Red light</SelectItem>
              <SelectItem value="no_helmet">No helmet</SelectItem>
              <SelectItem value="illegal_parking">Illegal parking</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setDays('30'); setStatus('all'); setViolationType('all'); }}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <iframe title="OpenStreetMap" src={osmUrl} className="h-72 w-full border-0" loading="lazy" />
          </div>

          <div className="relative h-64 overflow-hidden rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#e2e8f0,#f8fafc)]">
            <div className="absolute inset-0 opacity-40" style={{
              backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />
            <p className="absolute left-3 top-3 z-10 rounded bg-white/90 px-2 py-1 text-xs text-slate-600">
              Phnom Penh plot · {violations.length} points
            </p>
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              </div>
            ) : violations.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                <MapPin className="mb-2 h-8 w-8" />
                <p className="text-sm">No mapped violations in this period</p>
              </div>
            ) : (
              violations.map((v) => {
                const pos = project(v.coordinates.lat, v.coordinates.lng);
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${severityClass(v.severity)} ${selected?.id === v.id ? 'ring-2 ring-slate-800' : ''}`}
                    style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
                    title={v.location}
                    onClick={() => setSelected(v)}
                  />
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {selected ? (
            <div className="space-y-3 text-sm">
              <h2 className="text-base font-semibold capitalize text-slate-900">
                {selected.type.replace(/_/g, ' ')}
              </h2>
              <p className="text-slate-600">{selected.location}</p>
              <p className="text-slate-500">{formatAppDate(locale, selected.date)}</p>
              <p className="font-mono text-xs text-slate-500">
                {selected.coordinates.lat.toFixed(5)}, {selected.coordinates.lng.toFixed(5)}
              </p>
              {selected.has_fine ? (
                <p className="rounded bg-red-50 px-3 py-2 text-red-800">
                  Fine {formatAppCurrency(locale, Number(selected.fine_amount || 0))}
                  {selected.fine_status ? ` · ${selected.fine_status}` : ''}
                </p>
              ) : null}
              <Button className="w-full" onClick={() => navigate(CITIZEN_PORTAL_ROUTES.violations)}>
                Open violations list
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a point on the plot to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
