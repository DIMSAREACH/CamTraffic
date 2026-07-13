import { useCallback, useEffect, useState } from 'react';
import { MapPin, Shield, Car, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { useLanguage } from '@shared/context/LanguageContext';
import { dashboardAPI } from '@shared/services/api';
import { ReportTemplatesManagementPanel } from '@shared/components/admin/ReportTemplatesManagementPanel';

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

export function ReportsHeatmapPanel() {
  const { t } = useLanguage();
  const tr = (key: string, fb: string) => { const v = t(key); return v !== key ? v : fb; };
  const [points, setPoints] = useState<HeatPoint[]>([]);

  useEffect(() => {
    void dashboardAPI.getHeatmap().then((res) => setPoints((res.points || []) as HeatPoint[])).catch(() => setPoints([]));
  }, []);

  const max = Math.max(...points.map((p) => p.intensity), 1);

  return (
    <div className="reports-page__section space-y-4">
      <div className="enforcement-page__panel reports-page__panel p-4">
        <div className="reports-page__chart-head reports-page__chart-head--rose mb-3">
          <div className="reports-page__chart-icon reports-page__chart-icon--rose"><MapPin size={16} /></div>
          <h3 className="reports-page__chart-title">{tr('reports.heatmapTitle', 'Violation heat map')}</h3>
        </div>
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
      <div className="enforcement-page__panel p-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('reports.location', 'Location')}</TableHead>
              <TableHead>{tr('reports.detections', 'Detections')}</TableHead>
              <TableHead>{tr('reports.violations', 'Violations')}</TableHead>
              <TableHead>{tr('reports.intensity', 'Intensity')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.detections}</TableCell>
                <TableCell>{p.violations}</TableCell>
                <TableCell>{p.intensity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ReportsOfficerPerformancePanel() {
  const { t } = useLanguage();
  const tr = (key: string, fb: string) => { const v = t(key); return v !== key ? v : fb; };
  const [rows, setRows] = useState<OfficerRow[]>([]);

  useEffect(() => {
    void dashboardAPI.getOfficerPerformance().then((res) => setRows((res.officers || []) as OfficerRow[])).catch(() => setRows([]));
  }, []);

  return (
    <div className="reports-page__section">
      <div className="enforcement-page__panel p-4 overflow-x-auto">
        <div className="reports-page__chart-head reports-page__chart-head--blue mb-3">
          <div className="reports-page__chart-icon reports-page__chart-icon--blue"><Shield size={16} /></div>
          <h3 className="reports-page__chart-title">{tr('reports.officerPerformance', 'Officer performance')}</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('reports.officer', 'Officer')}</TableHead>
              <TableHead>{tr('reports.finesIssued', 'Fines issued')}</TableHead>
              <TableHead>{tr('reports.violationsReviewed', 'Violations')}</TableHead>
              <TableHead>{tr('reports.revenue', 'Revenue')}</TableHead>
              <TableHead>{tr('reports.pending', 'Pending')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.full_name}</TableCell>
                <TableCell>{r.fines_issued}</TableCell>
                <TableCell>{r.violations_reviewed}</TableCell>
                <TableCell>{r.revenue_collected.toLocaleString()}</TableCell>
                <TableCell>{r.pending_fines}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ReportsDriverAnalyticsPanel() {
  const { t } = useLanguage();
  const tr = (key: string, fb: string) => { const v = t(key); return v !== key ? v : fb; };
  const [rows, setRows] = useState<DriverRow[]>([]);

  useEffect(() => {
    void dashboardAPI.getDriverAnalytics().then((res) => setRows((res.drivers || []) as DriverRow[])).catch(() => setRows([]));
  }, []);

  return (
    <div className="reports-page__section">
      <div className="enforcement-page__panel p-4 overflow-x-auto">
        <div className="reports-page__chart-head reports-page__chart-head--teal mb-3">
          <div className="reports-page__chart-icon reports-page__chart-icon--teal"><Car size={16} /></div>
          <h3 className="reports-page__chart-title">{tr('reports.driverStatistics', 'Driver statistics')}</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr('reports.driver', 'Driver')}</TableHead>
              <TableHead>{tr('reports.vehicles', 'Vehicles')}</TableHead>
              <TableHead>{tr('reports.totalFines', 'Total fines')}</TableHead>
              <TableHead>{tr('reports.pending', 'Pending')}</TableHead>
              <TableHead>{tr('reports.amountOwed', 'Owed')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.full_name}</TableCell>
                <TableCell>{r.vehicles}</TableCell>
                <TableCell>{r.total_fines}</TableCell>
                <TableCell>{r.pending_fines}</TableCell>
                <TableCell>{r.amount_owed.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ReportsAdminExtras({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) return null;
  return (
    <div className="reports-page__section mt-6">
      <ReportTemplatesManagementPanel />
    </div>
  );
}
