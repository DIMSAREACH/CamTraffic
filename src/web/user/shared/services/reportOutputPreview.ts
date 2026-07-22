import type { DashboardStats, Fine } from '@shared/types';
import { mockFines } from './mockData';
import { DEMO_DRIVER_FINES } from './sampleDataFallback';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export type ReportExcelRow = {
  date: string;
  driver: string;
  plate: string;
  reason: string;
  amount: number;
  status: string;
  officer: string;
};

export type ReportOutputPreview = {
  periodLabel: string;
  pdfFilename: string;
  excelFilename: string;
  kpis: Array<{ id: string; value: string }>;
  topReasons: Array<{ reason: string; count: number }>;
  topViolations: Array<{ type: string; count: number }>;
  excelRows: ReportExcelRow[];
  totals: {
    finesInPeriod: number;
    revenueInPeriod: number;
    detectionsInPeriod: number;
    violationsInPeriod: number;
  };
};

const SYNTHETIC_FINES: Omit<Fine, 'id' | 'driver_id' | 'police_id' | 'created_at'>[] = [
  { driver_name: 'Kosal Pich', driver_license: 'DL-KH-2024-001234', police_name: 'Dara Chan', amount: 100, reason: 'Speeding (80km/h in 60km/h zone)', status: 'pending', location: 'Russian Blvd, Phnom Penh', vehicle_plate: '2AK 7788' },
  { driver_name: 'Vanna Sok', driver_license: 'DL-KH-2024-002345', police_name: 'Srey Neang', amount: 25, reason: 'Failure to Stop at Stop Sign (M-032)', status: 'paid', location: 'Monivong Blvd, Phnom Penh', vehicle_plate: '1CC 9012', paid_at: '2026-06-02T10:00:00Z' },
  { driver_name: 'Ratana Heng', driver_license: 'DL-KH-2024-004567', police_name: 'Bora Keo', amount: 50, reason: 'No Entry (R1-04)', status: 'pending', location: 'Street 271, Sen Sok', vehicle_plate: '2EE 7890' },
  { driver_name: 'Chenda Ros', driver_license: 'DL-KH-2024-006789', police_name: 'Dara Chan', amount: 30, reason: 'No U-Turn at R1-03', status: 'overdue', location: 'Sihanouk Blvd, Phnom Penh', vehicle_plate: '3FF 2345' },
  { driver_name: 'Pisey Mao', driver_license: 'DL-KH-2024-003456', police_name: 'Srey Neang', amount: 15, reason: 'Illegal Parking (R2-10)', status: 'paid', location: 'Central Market, Phnom Penh', vehicle_plate: '2BB 5566', paid_at: '2026-06-12T09:00:00Z' },
  { driver_name: 'Demo Driver', driver_license: 'DRV-DEMO-001', police_name: 'Dara Chan', amount: 20, reason: 'Speed Limit 20 km/h Exceeded (P-029)', status: 'dismissed', location: 'School zone, Sen Sok', vehicle_plate: '1PP 4455' },
  { driver_name: 'Kosal Pich', driver_license: 'DL-KH-2024-001234', police_name: 'Bora Keo', amount: 30, reason: 'No Left Turn (R1-01)', status: 'pending', location: 'Norodom Blvd, Phnom Penh', vehicle_plate: '2AA 1234' },
  { driver_name: 'Vanna Sok', driver_license: 'DL-KH-2024-002345', police_name: 'Dara Chan', amount: 10, reason: 'No Helmet (Motorcycle)', status: 'paid', location: 'Street 271, Sen Sok', vehicle_plate: '1CC 9012', paid_at: '2026-06-18T14:00:00Z' },
];

function monthSlice(stats: DashboardStats, month: number) {
  const label = MONTH_ABBR[month - 1];
  const fines = stats.monthly_fines?.find((m) => m.month === label);
  const detections = stats.monthly_detections?.find((m) => m.month === label);
  const violations = stats.monthly_violations?.find((m) => m.month === label);
  return {
    label,
    finesCount: fines?.count ?? 0,
    revenue: fines?.revenue ?? 0,
    detections: detections?.count ?? 0,
    violations: violations?.count ?? 0,
  };
}

function allSampleFines(): Fine[] {
  const seen = new Set<number>();
  const merged: Fine[] = [];
  for (const fine of [...mockFines, ...DEMO_DRIVER_FINES]) {
    if (seen.has(fine.id)) continue;
    seen.add(fine.id);
    merged.push(fine);
  }
  return merged;
}

function finesForPeriod(year: number, month: number): Fine[] {
  const matched = allSampleFines().filter((fine) => {
    const d = new Date(fine.created_at);
    return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month;
  });
  if (matched.length >= 4) {
    return matched.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 8);
  }

  return SYNTHETIC_FINES.map((row, index) => ({
    id: 9000 + index,
    driver_id: index + 4,
    police_id: index % 2 === 0 ? 2 : 3,
    created_at: `${year}-${String(month).padStart(2, '0')}-${String(3 + index * 2).padStart(2, '0')}T${String(9 + (index % 6)).padStart(2, '0')}:30:00Z`,
    ...row,
  }));
}

function fineToExcelRow(fine: Fine): ReportExcelRow {
  const d = new Date(fine.created_at);
  return {
    date: d.toISOString().slice(0, 10),
    driver: fine.driver_name,
    plate: fine.vehicle_plate,
    reason: fine.reason,
    amount: fine.amount,
    status: fine.status,
    officer: fine.police_name,
  };
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

export function buildReportOutputPreview(
  stats: DashboardStats,
  year: number,
  month: number,
): ReportOutputPreview {
  const period = monthSlice(stats, month);
  const periodLabel = `${MONTH_FULL[month - 1]} ${year}`;
  const excelSource = finesForPeriod(year, month);
  const excelRows = excelSource.map(fineToExcelRow);

  const topReasons = (stats.fine_by_reason ?? []).slice(0, 5);
  const topViolations = (stats.violation_by_type ?? [])
    .slice(0, 5)
    .map((row) => ({
      type: row.violation_type ?? row.reason ?? 'Unknown',
      count: row.count,
    }));

  return {
    periodLabel,
    pdfFilename: `camtraffic-report-${year}.pdf`,
    excelFilename: `camtraffic-enforcement-${year}-${String(month).padStart(2, '0')}.xlsx`,
    totals: {
      finesInPeriod: period.finesCount,
      revenueInPeriod: period.revenue,
      detectionsInPeriod: period.detections,
      violationsInPeriod: period.violations,
    },
    kpis: [
      { id: 'periodFines', value: String(period.finesCount) },
      { id: 'periodRevenue', value: formatUsd(period.revenue) },
      { id: 'periodDetections', value: String(period.detections) },
      { id: 'periodViolations', value: String(period.violations) },
      { id: 'accuracy', value: `${stats.detection_accuracy ?? 0}%` },
      { id: 'totalFines', value: String(stats.total_fines ?? 0) },
    ],
    topReasons,
    topViolations,
    excelRows,
  };
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildSampleReportPdfBlob(
  preview: ReportOutputPreview,
  scopeLabel = 'CamTraffic',
): Blob {
  const lines = [
    'CamTraffic Analytics Report',
    `Period: ${preview.periodLabel}`,
    `Scope: ${scopeLabel}`,
    '',
    `Fines this period: ${preview.totals.finesInPeriod}`,
    `Revenue collected: ${formatUsd(preview.totals.revenueInPeriod)}`,
    `AI detections: ${preview.totals.detectionsInPeriod}`,
    `Violations logged: ${preview.totals.violationsInPeriod}`,
    '',
    'Top fine reasons:',
    ...preview.topReasons.map((r) => `  - ${r.reason}: ${r.count}`),
    '',
    'Violation types:',
    ...preview.topViolations.map((v) => `  - ${v.type}: ${v.count}`),
    '',
    '(Sample export — connect live API for full PDF)',
  ];

  let streamOps = 'BT /F1 10 Tf 48 760 Td ';
  lines.forEach((line, index) => {
    if (index > 0) streamOps += '0 -13 Td ';
    streamOps += `(${escapePdfText(line.slice(0, 96))}) Tj `;
  });
  streamOps += 'ET';

  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${streamOps.length}>>stream
${streamOps}
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000${(320 + streamOps.length).toString().padStart(3, '0')} 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
${360 + streamOps.length}
%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

function xmlCell(value: string | number): string {
  const text = String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const type = typeof value === 'number' ? 'Number' : 'String';
  return `<Cell><Data ss:Type="${type}">${text}</Data></Cell>`;
}

export function buildSampleEnforcementExcelBlob(
  rows: ReportExcelRow[],
  year: number,
  month: number,
): Blob {
  const header = ['Date', 'Driver', 'Plate', 'Reason', 'Amount (USD)', 'Status', 'Officer'];
  const tableRows = [
    `<Row>${header.map((h) => xmlCell(h)).join('')}</Row>`,
    ...rows.map(
      (row) => `<Row>${[
        xmlCell(row.date),
        xmlCell(row.driver),
        xmlCell(row.plate),
        xmlCell(row.reason),
        xmlCell(row.amount),
        xmlCell(row.status),
        xmlCell(row.officer),
      ].join('')}</Row>`,
    ),
  ].join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Enforcement ${year}-${String(month).padStart(2, '0')}">
  <Table>
   ${tableRows}
  </Table>
 </Worksheet>
</Workbook>`;

  return new Blob([xml], { type: 'application/vnd.ms-excel' });
}
