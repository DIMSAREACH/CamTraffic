import { useEffect, useState } from 'react';
import { Car, MapPin, Shield } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatRevenue } from '@shared/i18n/localeFormat';
import { dashboardAPI } from '@shared/services/api';

type HeatPoint = {
  id: string; name: string; road: string; lat: number; lng: number;
  detections: number; violations: number; intensity: number; status: string;
};

type OfficerRow = {
  id: string; full_name: string; email: string; badge_no?: string;
  fines_issued: number; violations_reviewed: number; revenue_collected: number; pending_fines: number;
};

type DriverRow = {
  id: string; full_name: string; email: string; vehicles: number;
  total_fines: number; pending_fines: number; amount_owed: number; paid_fines: number;
};

const LAT_MIN = 11.4;
const LAT_MAX = 11.7;
const LNG_MIN = 104.8;
const LNG_MAX = 104.95;

function toMapPos(lat: number, lng: number) {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100;
  const y = 100 - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 100;
  return { left: `${Math.min(96, Math.max(2, x))}%`, top: `${Math.min(96, Math.max(2, y))}%` };
}

function initials(name: string) {
  return name.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '—';
}

function pendingBadge(count: number) {
  const tone = count > 0
    ? { bg: 'rgba(245,158,11,0.14)', color: '#d97706' }
    : { bg: 'rgba(16,185,129,0.12)', color: '#059669' };
  return (
    <span className="enforcement-page__badge" style={{ background: tone.bg, color: tone.color }}>
      {count}
    </span>
  );
}

export function ReportsHeatmapPanel() {
  const { t } = useLanguage();
  const tr = (key: string, fb: string) => { const v = t(key); return v !== key ? v : fb; };
  const [points, setPoints] = useState<HeatPoint[]>([]);

  useEffect(() => {
    void dashboardAPI.getHeatmap().then((res) => setPoints((res.points || []) as HeatPoint[])).catch(() => setPoints([]));
  }, []);

  const max = Math.max(...points.map((p) => p.intensity), 1);
  const headers = [
    tr('reports.location', 'Location'),
    tr('reports.detections', 'Detections'),
    tr('reports.violations', 'Violations'),
    tr('reports.intensity', 'Intensity'),
  ];

  return (
    <div className="reports-page__people-stack">
      <div className="enforcement-page__panel reports-page__panel">
        <div className="reports-page__chart-head reports-page__chart-head--rose">
          <div className="reports-page__chart-icon reports-page__chart-icon--rose"><MapPin size={16} /></div>
          <h3 className="reports-page__chart-title">{tr('reports.heatmapTitle', 'Violation heat map')}</h3>
        </div>
        <div className="reports-page__chart-body">
          <div className="relative w-full rounded-xl bg-slate-900/90 border border-white/10" style={{ height: 320 }}>
            <div className="absolute inset-4 rounded-lg border border-dashed border-white/15" aria-hidden />
            {points.map((p) => {
              const pos = toMapPos(p.lat, p.lng);
              const size = 10 + (p.intensity / max) * 18;
              const alpha = 0.35 + (p.intensity / max) * 0.55;
              return (
                <span
                  key={p.id}
                  title={`${p.name} — ${p.violations} violations`}
                  className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: pos.left,
                    top: pos.top,
                    width: size,
                    height: size,
                    background: `rgba(239,68,68,${alpha})`,
                    boxShadow: `0 0 ${size}px rgba(239,68,68,${alpha})`,
                  }}
                />
              );
            })}
            {points.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
                {tr('reports.heatmapEmpty', 'Add camera coordinates to see heat points')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel enforcement-page__panel--reports">
        <div className="overflow-x-auto">
          <Table className="enforcement-page__table mgmt-table__grid reports-page__people-table">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {headers.map((h) => (
                  <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.length === 0 ? (
                <TableEmptyState
                  colSpan={headers.length}
                  tone="amber"
                  icon={<MapPin size={28} />}
                  title={tr('reports.heatmapEmpty', 'Add camera coordinates to see heat points')}
                />
              ) : points.map((p) => (
                <TableRow key={p.id} className="enforcement-page__table-row">
                  <TableCell>
                    <p className="enforcement-page__cell-primary">{p.name}</p>
                    {p.road ? <p className="enforcement-page__cell-secondary">{p.road}</p> : null}
                  </TableCell>
                  <TableCell><span className="enforcement-page__cell-body">{p.detections}</span></TableCell>
                  <TableCell><span className="enforcement-page__cell-body">{p.violations}</span></TableCell>
                  <TableCell>
                    <span className="enforcement-page__code-pill">{p.intensity}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function ReportsOfficerPerformancePanel() {
  const { t, locale } = useLanguage();
  const tr = (key: string, fb: string) => { const v = t(key); return v !== key ? v : fb; };
  const [rows, setRows] = useState<OfficerRow[]>([]);

  useEffect(() => {
    void dashboardAPI.getOfficerPerformance().then((res) => setRows((res.officers || []) as OfficerRow[])).catch(() => setRows([]));
  }, []);

  const headers = [
    tr('reports.officer', 'Officer'),
    tr('reports.finesIssued', 'Fines issued'),
    tr('reports.violationsReviewed', 'Violations'),
    tr('reports.revenue', 'Revenue'),
    tr('reports.pending', 'Pending'),
  ];

  return (
    <div className="enforcement-page__panel enforcement-page__panel--reports reports-page__people-card">
      <header className="reports-page__people-head">
        <span className="reports-page__chart-icon reports-page__chart-icon--blue" aria-hidden>
          <Shield size={16} />
        </span>
        <div>
          <h3 className="reports-page__people-title">{tr('reports.officerPerformance', 'Officer performance')}</h3>
          <p className="reports-page__people-subtitle">
            {tr('reports.officerPerformanceHint', '{count} officers').replace('{count}', String(rows.length))}
          </p>
        </div>
      </header>

      <div className="overflow-x-auto">
        <Table className="enforcement-page__table mgmt-table__grid reports-page__people-table">
          <TableHeader>
            <TableRow className="enforcement-page__table-head">
              {headers.map((h) => (
                <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmptyState
                colSpan={headers.length}
                tone="blue"
                icon={<Shield size={28} />}
                title={tr('reports.officerEmpty', 'No officer performance data yet')}
              />
            ) : rows.map((r) => (
              <TableRow key={r.id} className="enforcement-page__table-row">
                <TableCell>
                  <div className="drivers-page__user-cell">
                    <div className="drivers-page__avatar">{initials(r.full_name)}</div>
                    <div className="min-w-0">
                      <p className="enforcement-page__cell-primary drivers-page__truncate" title={r.full_name}>
                        {r.full_name}
                      </p>
                      <p className="reports-page__people-email drivers-page__truncate" title={r.badge_no || r.email}>
                        {r.badge_no || r.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="enforcement-page__code-pill">{r.fines_issued}</span>
                </TableCell>
                <TableCell>
                  <span className="enforcement-page__code-pill">{r.violations_reviewed}</span>
                </TableCell>
                <TableCell>
                  <span className="mgmt-table__amount">
                    {formatRevenue(locale, r.revenue_collected)}
                  </span>
                </TableCell>
                <TableCell>{pendingBadge(r.pending_fines)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ReportsDriverAnalyticsPanel() {
  const { t, locale } = useLanguage();
  const tr = (key: string, fb: string) => { const v = t(key); return v !== key ? v : fb; };
  const [rows, setRows] = useState<DriverRow[]>([]);

  useEffect(() => {
    void dashboardAPI.getDriverAnalytics().then((res) => setRows((res.drivers || []) as DriverRow[])).catch(() => setRows([]));
  }, []);

  const headers = [
    tr('reports.driver', 'Driver'),
    tr('reports.vehicles', 'Vehicles'),
    tr('reports.totalFines', 'Total fines'),
    tr('reports.pending', 'Pending'),
    tr('reports.amountOwed', 'Owed'),
  ];

  return (
    <div className="enforcement-page__panel enforcement-page__panel--reports reports-page__people-card">
      <header className="reports-page__people-head">
        <span className="reports-page__chart-icon reports-page__chart-icon--teal" aria-hidden>
          <Car size={16} />
        </span>
        <div>
          <h3 className="reports-page__people-title">{tr('reports.driverStatistics', 'Driver statistics')}</h3>
          <p className="reports-page__people-subtitle">
            {tr('reports.driverStatisticsHint', '{count} drivers').replace('{count}', String(rows.length))}
          </p>
        </div>
      </header>

      <div className="overflow-x-auto">
        <Table className="enforcement-page__table mgmt-table__grid reports-page__people-table">
          <TableHeader>
            <TableRow className="enforcement-page__table-head">
              {headers.map((h) => (
                <TableHead key={h} className="enforcement-page__th text-left">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmptyState
                colSpan={headers.length}
                tone="teal"
                icon={<Car size={28} />}
                title={tr('reports.driverEmpty', 'No driver statistics yet')}
              />
            ) : rows.map((r) => (
              <TableRow key={r.id} className="enforcement-page__table-row">
                <TableCell>
                  <div className="drivers-page__user-cell">
                    <div className="drivers-page__avatar">{initials(r.full_name)}</div>
                    <div className="min-w-0">
                      <p className="enforcement-page__cell-primary drivers-page__truncate" title={r.full_name}>
                        {r.full_name}
                      </p>
                      <p className="reports-page__people-email drivers-page__truncate" title={r.email}>
                        {r.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="enforcement-page__code-pill">{r.vehicles}</span>
                </TableCell>
                <TableCell>
                  <span className="enforcement-page__code-pill">{r.total_fines}</span>
                </TableCell>
                <TableCell>{pendingBadge(r.pending_fines)}</TableCell>
                <TableCell>
                  <span className="mgmt-table__amount">
                    {formatRevenue(locale, r.amount_owed)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
