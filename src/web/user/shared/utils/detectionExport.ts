/**
 * Client-side export helpers for AI Detection results (CSV / print-PDF / JSON).
 */
import type { CenterDetectionResult } from '@shared/components/ai/center/DetectionCenterResultsPanel';
import {
  buildDetectionObjectRows,
  type DetectionObjectRow,
} from '@shared/utils/enterpriseDetectionObjects';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

export function downloadDetectionJson(result: CenterDetectionResult, filename?: string) {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename || `detection-${result.log_id || stamp()}.json`);
}

export function exportDetectionCsv(
  result: CenterDetectionResult,
  locale: 'en' | 'km' = 'en',
  filename?: string,
) {
  const objects = buildDetectionObjectRows(result, locale);
  const headers = ['Kind', 'Name', 'Confidence', 'Status', 'Category'];
  const rows = objects.map((row: DetectionObjectRow) => [
    row.kind,
    row.name,
    Number(row.confidence ?? 0).toFixed(1),
    row.status,
    row.category || '',
  ]);

  const summary = [
    ['Field', 'Value'],
    ['Log ID', result.log_id ?? ''],
    ['Sign', result.sign_name_en || result.sign_name || result.sign_code || ''],
    ['Confidence', String(result.display_confidence ?? result.confidence ?? '')],
    ['Plate', result.detected_plate || ''],
    ['Plate confidence', String(result.plate_confidence ?? '')],
    ['Violation', result.violation_evaluation?.is_violation ? 'yes' : 'no'],
    [
      'Violation type',
      result.violation_evaluation?.title
        || result.violation_evaluation?.violation_type
        || '',
    ],
    ['Vehicles', String(result.vehicles?.length ?? 0)],
  ];

  const lines = [
    '=== Summary ===',
    ...summary.map((r) => r.map(csvEscape).join(',')),
    '',
    '=== Objects ===',
    headers.map(csvEscape).join(','),
    ...rows.map((r) => r.map(csvEscape).join(',')),
  ];

  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename || `detection-${result.log_id || stamp()}.csv`);
}

/** Spreadsheet-friendly TSV that Excel opens cleanly. */
export function exportDetectionExcelTsv(
  result: CenterDetectionResult,
  locale: 'en' | 'km' = 'en',
  filename?: string,
) {
  const objects = buildDetectionObjectRows(result, locale);
  const lines = [
    ['Kind', 'Name', 'Confidence', 'Status', 'Category'].join('\t'),
    ...objects.map((row) =>
      [row.kind, row.name, Number(row.confidence ?? 0).toFixed(1), row.status, row.category || '']
        .map((c) => String(c).replace(/\t/g, ' '))
        .join('\t'),
    ),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, filename || `detection-${result.log_id || stamp()}.xls`);
}

function escHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Opens a print-ready report window (user can Save as PDF from the browser print dialog).
 */
export function printDetectionReport(
  result: CenterDetectionResult,
  opts: {
    locale?: 'en' | 'km';
    imageSrc?: string | null;
    sourceLabel?: string;
    title?: string;
  } = {},
) {
  const locale = opts.locale === 'en' ? 'en' : 'km';
  const objects = buildDetectionObjectRows(result, locale);
  const imageSrc = opts.imageSrc || result.annotated_processed_image || result.uploaded_image || '';
  const title = opts.title || 'CamTraffic Detection Report';

  const objectRows = objects
    .map(
      (row) => `<tr>
        <td>${escHtml(row.kind)}</td>
        <td>${escHtml(row.name)}</td>
        <td>${escHtml(Number(row.confidence ?? 0).toFixed(1))}%</td>
        <td>${escHtml(row.status)}</td>
      </tr>`,
    )
    .join('');

  const violation = result.violation_evaluation;
  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${escHtml(title)}</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; color: #0f172a; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
    .card h2 { font-size: 13px; margin: 0 0 8px; color: #475569; text-transform: uppercase; letter-spacing: .04em; }
    .card p { margin: 4px 0; font-size: 14px; }
    img { max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    th { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .ok { background: #d1fae5; color: #065f46; }
    .bad { background: #fee2e2; color: #991b1b; }
    @media print {
      body { margin: 12px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:8px 14px;border-radius:8px;border:0;background:#4f46e5;color:#fff;font-weight:700;cursor:pointer">
    Print / Save as PDF
  </button>
  <h1>${escHtml(title)}</h1>
  <p class="meta">
    ${escHtml(opts.sourceLabel || 'AI Detection')}
    · Log ${escHtml(result.log_id || '—')}
    · ${escHtml(new Date().toLocaleString())}
  </p>
  <div class="grid">
    <div class="card">
      <h2>Summary</h2>
      <p><strong>Sign:</strong> ${escHtml(result.sign_name_en || result.sign_name || result.sign_code || '—')}</p>
      <p><strong>Confidence:</strong> ${escHtml(result.display_confidence ?? result.confidence ?? '—')}%</p>
      <p><strong>Plate:</strong> ${escHtml(result.detected_plate || '—')}
        ${result.plate_confidence != null ? `(${escHtml(result.plate_confidence)}%)` : ''}</p>
      <p><strong>Vehicles:</strong> ${escHtml(result.vehicles?.length ?? 0)}</p>
    </div>
    <div class="card">
      <h2>Violation</h2>
      <p>
        <span class="badge ${violation?.is_violation ? 'bad' : 'ok'}">
          ${violation?.is_violation ? 'Violation' : 'No violation'}
        </span>
      </p>
      <p>${escHtml(violation?.title || violation?.violation_type || violation?.reason || '—')}</p>
      <p>${escHtml(violation?.observed_action || '')}</p>
    </div>
  </div>
  ${imageSrc ? `<div class="card" style="margin-bottom:20px"><h2>Annotated media</h2><img src="${escHtml(imageSrc)}" alt="Detection" /></div>` : ''}
  <div class="card">
    <h2>Detected objects</h2>
    <table>
      <thead><tr><th>Kind</th><th>Name</th><th>Confidence</th><th>Status</th></tr></thead>
      <tbody>${objectRows || '<tr><td colspan="4">No objects</td></tr>'}</tbody>
    </table>
  </div>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!win) {
    throw new Error('Popup blocked — allow popups to export PDF.');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
