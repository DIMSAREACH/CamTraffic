const RECENT_VIEWS_KEY = 'camtraffic_admin_recent_views_v1';
const MAX_RECENT_VIEWS = 8;

export type RecentViewItem = {
  path: string;
  title: string;
  visitedAt: string;
};

const PATH_TITLE_FALLBACK: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/officers': 'Officers',
  '/admin/drivers': 'Drivers',
  '/admin/vehicles': 'Vehicles',
  '/admin/signs': 'Traffic Signs',
  '/admin/cameras': 'Live Cameras',
  '/admin/violations': 'Violations',
  '/admin/fines': 'Fine Management',
  '/admin/appeals': 'Appeals',
  '/admin/ai-detection/new': 'AI Detection',
  '/admin/ai-logs': 'AI Detection Logs',
  '/admin/ai-models': 'AI Models',
  '/admin/reports': 'Reports',
  '/admin/reports/analytics': 'Analytics',
  '/admin/evidence': 'Evidence Archive',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/settings': 'System Settings',
  '/admin/import-data': 'Import Data',
  '/admin/notifications': 'Notifications',
};

function readStore(): RecentViewItem[] {
  try {
    const raw = localStorage.getItem(RECENT_VIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(items: RecentViewItem[]) {
  try {
    localStorage.setItem(RECENT_VIEWS_KEY, JSON.stringify(items.slice(0, MAX_RECENT_VIEWS)));
  } catch {
    /* ignore quota */
  }
}

export function titleForAdminPath(path: string): string {
  if (PATH_TITLE_FALLBACK[path]) return PATH_TITLE_FALLBACK[path];
  const normalized = path.replace(/\/$/, '') || '/admin/dashboard';
  if (PATH_TITLE_FALLBACK[normalized]) return PATH_TITLE_FALLBACK[normalized];
  const leaf = normalized.split('/').filter(Boolean).pop() || 'Page';
  return leaf.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Record a visited admin page for Recent View History. */
export function trackAdminRecentView(path: string, title?: string) {
  if (!path.startsWith('/admin')) return;
  if (path === '/admin' || path.startsWith('/admin/profile')) return;

  const item: RecentViewItem = {
    path,
    title: title || titleForAdminPath(path),
    visitedAt: new Date().toISOString(),
  };
  const next = [item, ...readStore().filter((row) => row.path !== path)];
  writeStore(next);
}

export function getAdminRecentViews(): RecentViewItem[] {
  return readStore();
}

export function clearAdminRecentViews() {
  try {
    localStorage.removeItem(RECENT_VIEWS_KEY);
  } catch {
    /* ignore */
  }
}
