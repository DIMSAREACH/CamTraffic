import fs from 'node:fs';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';

const root = process.cwd();
const outDir = path.join(root, 'docs', 'final-year-project');
const outFile = path.join(outDir, 'CAMTRAFFIC-FINAL-PRESENTATION.pptx');

fs.mkdirSync(outDir, { recursive: true });

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Dim Sareach';
pptx.company = 'CamTraffic';
pptx.subject = 'Final Year Project Defense';
pptx.title = 'CamTraffic Final Presentation';
pptx.revision = '1';
pptx.lang = 'en-US';
pptx.theme = {
  headFontFace: 'Calibri',
  bodyFontFace: 'Calibri',
  lang: 'en-US',
};

const color = {
  primary: '1E3A8A',
  secondary: '0F172A',
  accent: '059669',
  light: 'F8FAFC',
  muted: '475569',
  white: 'FFFFFF',
};

function titleSlide(title, subtitle = '') {
  const s = pptx.addSlide();
  s.background = { color: color.light };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: color.primary }, line: { color: color.primary } });
  s.addText(title, { x: 0.7, y: 1.2, w: 12, h: 1, fontSize: 34, bold: true, color: color.secondary });
  if (subtitle) {
    s.addText(subtitle, { x: 0.7, y: 2.4, w: 12, h: 1, fontSize: 18, color: color.muted });
  }
  return s;
}

function bulletSlide(title, bullets, footer = '') {
  const s = titleSlide(title);
  let y = 3.2;
  for (const b of bullets) {
    s.addText(`• ${b}`, { x: 1, y, w: 11.5, h: 0.55, fontSize: 19, color: color.secondary });
    y += 0.58;
  }
  if (footer) {
    s.addText(footer, { x: 0.8, y: 6.9, w: 12, h: 0.5, fontSize: 13, italic: true, color: color.muted });
  }
  return s;
}

function tableSlide(title, rows, caption = '') {
  const s = titleSlide(title);
  const data = rows.map((r) => r.map((c) => ({ text: String(c), options: { bold: false } })));
  s.addTable(data, {
    x: 0.9,
    y: 2.5,
    w: 11.6,
    h: 3.8,
    border: { type: 'solid', color: 'CBD5E1', pt: 1 },
    fill: color.white,
    fontSize: 14,
    color: color.secondary,
    valign: 'mid',
  });
  if (caption) {
    s.addText(caption, { x: 0.9, y: 6.6, w: 11.6, h: 0.5, fontSize: 12, color: color.muted, italic: true });
  }
  return s;
}

const slides = [
  {
    type: 'title',
    title: 'AI-Based Traffic Sign Detection and Traffic Law Enforcement System for Cambodia',
    subtitle: 'CamTraffic — Final Year Project Defense (2026)\nDim Sareach · Computer Science',
  },
  { type: 'bullet', title: 'Agenda', bullets: [
    '1. Problem and motivation',
    '2. Objectives and scope',
    '3. System architecture and workflow',
    '4. AI pipeline and model results',
    '5. Implementation highlights',
    '6. Testing, deployment, and conclusion',
    '7. Demo and Q&A',
  ]},
  { type: 'bullet', title: 'Problem Background', bullets: [
    'Manual traffic enforcement is labor-intensive and inconsistent.',
    'High traffic volume causes delayed violation response.',
    'Paper-based workflows reduce traceability and reporting quality.',
    'Need an integrated digital + AI pipeline for enforcement.',
  ]},
  { type: 'bullet', title: 'Project Objectives', bullets: [
    'Detect traffic signs/vehicles from camera frames (YOLOv11).',
    'Read license plates and auto-link to driver records (EasyOCR).',
    'Auto-create violations, notify officers/drivers in real-time.',
    'Provide admin/officer/driver portals with complete workflows.',
  ]},
  { type: 'bullet', title: 'Research Questions', bullets: [
    'Can YOLOv11 provide practical Cambodian traffic detection quality?',
    'Can OCR provide usable plate-reading performance in local contexts?',
    'What architecture best supports real-time, role-based enforcement?',
  ]},
  { type: 'bullet', title: 'System Architecture', bullets: [
    'Frontend Admin + Frontend User (React + Vite + TypeScript).',
    'Backend service (Django REST + JWT + RBAC).',
    'AI service (FastAPI + YOLOv11 + EasyOCR).',
    'PostgreSQL + Redis + Celery + Nginx + Docker Compose.',
  ]},
  { type: 'bullet', title: 'End-to-End Pipeline', bullets: [
    'Camera frame submitted to /integration/cameras/{id}/process-frame/.',
    'Backend dispatches Celery task for async AI processing.',
    'AI service runs detection + OCR and returns structured result.',
    'Backend persists Detection/OCR, creates Violation when matched.',
    'Officers and drivers receive in-app notifications.',
  ]},
  { type: 'table', title: 'Dataset Summary', rows: [
    ['Source', 'Images', 'Classes'],
    ['Traffic signs + augmented/synthetic', '2,980+', '19'],
    ['Vehicle classes', '4,615+', '9'],
    ['License plates', '1,253+', '3'],
    ['Combined target class space', '8,548 total', '31'],
  ], caption: 'Collection tracker: data/datasets/scripts/collection_tracker.py' },
  { type: 'table', title: 'YOLOv11 v2 Evaluation Results', rows: [
    ['Metric', 'Value'],
    ['mAP@50', '0.6081'],
    ['mAP@50-95', '0.4419'],
    ['Precision', '0.6489'],
    ['Recall', '0.6151'],
    ['F1', '0.6315'],
  ], caption: 'Source: ai-service/runs/evaluation/final/post_train_eval_v2.json' },
  { type: 'table', title: 'OCR Evaluation Results', rows: [
    ['Metric', 'Baseline', 'Improved'],
    ['CER', '0.6632', '0.3524'],
    ['Exact Match', '0.1386', '0.3168'],
    ['Delta CER', '-', '-0.3108'],
    ['Delta Exact Match', '-', '+0.1782'],
  ], caption: 'Source: ai-service/runs/evaluation/final/ocr_report_val_improved.json' },
  { type: 'table', title: 'Performance Benchmarks', rows: [
    ['Metric', 'Result'],
    ['CPU Mean Inference Latency', '69.28 ms/image'],
    ['CPU P95 Latency', '95.21 ms'],
    ['CPU Throughput', '14.43 FPS'],
    ['Integration Tests', '27/27 passed'],
    ['Software Tests', '112/112 passed'],
  ], caption: 'Sources: Stage 8/9 reports' },
  { type: 'bullet', title: 'Admin Portal Features', bullets: [
    'Dashboard analytics and AI monitoring panels.',
    'Camera management and health checks.',
    'Violation oversight and report exports.',
    'RBAC and audit log administration.',
  ]},
  { type: 'bullet', title: 'Officer & Driver Features', bullets: [
    'Officer live detection feed and violation decisions.',
    'Driver violation history, appeals, and fine payments.',
    'Real-time notifications and role-specific dashboards.',
  ]},
  { type: 'bullet', title: 'Testing and Validation', bullets: [
    'Stage 7 Integration Test: full pipeline validation.',
    'Stage 8 Functional/Performance/Security suites passed.',
    'UAT completed with 3 participants, rating 4.4/5.',
  ]},
  { type: 'bullet', title: 'Deployment and Operations', bullets: [
    'Production Docker Compose stack implemented.',
    'Nginx reverse proxy + SSL automation scripts.',
    'Health-check automation for core services.',
    'Automated PostgreSQL daily backup via cron + pg_dump.',
  ]},
  { type: 'bullet', title: 'Documentation and Thesis Outputs', bullets: [
    'Stage 11: diagrams, API examples, user manual screenshots.',
    'Stage 12: Chapters 3-6 completed with evidence-backed content.',
    'Traceable artifacts for AI evaluation and deployment.',
  ]},
  { type: 'bullet', title: 'Live Demo Flow', bullets: [
    'Admin login and dashboard overview',
    'Submit camera frame to integration endpoint',
    'Detection + OCR + violation generation',
    'Officer review and decision',
    'Driver notification and payment/appeal view',
  ]},
  { type: 'bullet', title: 'Limitations', bullets: [
    'Current YOLO accuracy below production target (>= 0.80 mAP@50).',
    'GPU runtime constraints affected benchmark completeness.',
    'RTSP resilience and some UX edge cases are future refinements.',
  ]},
  { type: 'bullet', title: 'Future Work', bullets: [
    'GPU training for 100+ epochs with class-balanced data.',
    'Expanded field-collected dataset and OCR fine-tuning.',
    'Mobile notifications and improved live-stream robustness.',
    'Registry integration for larger-scale deployment.',
  ]},
  { type: 'bullet', title: 'Project Deliverables', bullets: [
    'Full source code (frontend/backend/AI/shared packages).',
    'Final thesis with chapters and appendices.',
    'Deployment scripts and operational runbooks.',
    'Presentation deck, demo script, and defense materials.',
  ]},
  { type: 'bullet', title: 'Defense Preparation Checklist', bullets: [
    'Slides: 20-30 final deck completed.',
    'Demo script and fallback paths prepared.',
    'Rehearsal log with 3 rounds completed.',
    'Submission package manifest prepared.',
  ]},
  { type: 'bullet', title: 'Thank You', bullets: [
    'CamTraffic — AI-enabled traffic enforcement for Cambodia.',
    'Questions and discussion welcome.',
  ], footer: 'Contact: admin@camtraffic.kh' },
];

for (const slide of slides) {
  if (slide.type === 'title') {
    titleSlide(slide.title, slide.subtitle);
  } else if (slide.type === 'bullet') {
    bulletSlide(slide.title, slide.bullets, slide.footer || '');
  } else if (slide.type === 'table') {
    tableSlide(slide.title, slide.rows, slide.caption || '');
  }
}

await pptx.writeFile({ fileName: outFile });
console.log(`Generated: ${outFile}`);
console.log(`Total slides: ${slides.length}`);
