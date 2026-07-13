/** Portal detection — user app (:5173) vs admin app (:5174). */

export function getAdminPort(): number {
  const raw = (import.meta.env.VITE_ADMIN_PORT || '5174').toString().trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 5174;
}

export function getUserPort(): number {
  const raw = (import.meta.env.VITE_USER_PORT || '5173').toString().trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 5173;
}

export function getPortalSurface(): 'admin' | 'user' {
  const raw = (import.meta.env.VITE_PORTAL_SURFACE || '').toString().trim().toLowerCase();
  if (raw === 'admin' || raw === 'user') return raw;
  return 'user';
}

export function isAdminPortal(): boolean {
  if (typeof window === 'undefined') {
    return getPortalSurface() === 'admin';
  }
  const forced = getPortalSurface();
  if (forced === 'admin') return true;
  if (forced === 'user') return false;
  return Number(window.location.port) === getAdminPort();
}
