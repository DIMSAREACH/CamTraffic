import type { DashboardStats, Fine } from '@shared/types';

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

/** Production: no synthetic fine rows — Report Center uses live PDF/Excel APIs. */
function finesForPeriod(_year: number, _month: number): Fine[] {
  return [];
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
