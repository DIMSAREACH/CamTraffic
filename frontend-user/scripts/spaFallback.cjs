/**
 * Post-Vite helpers for Render / static hosts:
 * - 404.html fallback
 * - ensure _redirects
 * - materialize deep-link routes as real index.html (HTTP 200)
 */
const fs = require('fs');
const path = require('path');

const dist = path.resolve(__dirname, '..', 'dist');
const indexHtml = path.join(dist, 'index.html');

if (!fs.existsSync(indexHtml)) {
  console.error('spaFallback: dist/index.html missing — run vite build first');
  process.exit(1);
}

fs.copyFileSync(indexHtml, path.join(dist, '404.html'));

const redirects = [
  '/favicon.ico  /favicon.svg  200',
  '/auth/oauth/callback  /index.html  200',
  '/reset-password  /index.html  200',
  '/forgot-password  /index.html  200',
  '/verify-email  /index.html  200',
  '/dashboard  /index.html  200',
  '/dashboard/*  /index.html  200',
  '/*  /index.html  200',
  '',
].join('\n');
fs.writeFileSync(path.join(dist, '_redirects'), redirects, 'utf8');

/** Paths email/OAuth/bookmarks deep-link into — must be real files when host ignores _redirects. */
const SPA_PATHS = [
  'auth/oauth/callback',
  'reset-password',
  'forgot-password',
  'verify-email',
  'dashboard',
  'dashboard/ai-detection',
  'dashboard/ai-detection/new',
  'dashboard/cameras',
  'dashboard/violations',
  'dashboard/fines',
  'dashboard/fines/payments',
  'dashboard/evidence',
  'dashboard/vehicles',
  'dashboard/appeals',
  'dashboard/reports',
  'dashboard/notifications',
  'dashboard/profile',
  'dashboard/settings',
  'dashboard/signs',
  'dashboard/traffic-rules',
  'dashboard/support',
  'dashboard/unknown-vehicles',
  'dashboard/driver-search',
];

for (const route of SPA_PATHS) {
  const dir = path.join(dist, ...route.split('/'));
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(indexHtml, path.join(dir, 'index.html'));
}

console.log(`spaFallback: ready (${SPA_PATHS.length} deep-link routes)`);
