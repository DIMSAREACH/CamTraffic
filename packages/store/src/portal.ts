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
  const { hostname, port } = window.location;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return forced === 'admin';
  }
  return Number(port) === getAdminPort();
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function configuredPortalBase(envKey: string): string {
  const raw = (import.meta.env[envKey] || '').toString().trim();
  return raw ? raw.replace(/\/$/, '') : '';
}

function inferSiblingPortalHost(hostname: string, from: 'admin' | 'user'): string | null {
  if (from === 'admin') {
    if (hostname.includes('camtraffic-admin')) {
      return hostname.replace('camtraffic-admin', 'camtraffic-user');
    }
    if (hostname.startsWith('admin.')) {
      return hostname.replace(/^admin\./, 'app.');
    }
  } else {
    if (hostname.includes('camtraffic-user')) {
      return hostname.replace('camtraffic-user', 'camtraffic-admin');
    }
    if (hostname.startsWith('app.')) {
      return hostname.replace(/^app\./, 'admin.');
    }
  }
  return null;
}

/** Base URL for admin or user static site (Render / custom domain aware). */
export function portalBaseUrl(surface: 'admin' | 'user'): string {
  const envKey = surface === 'admin' ? 'VITE_ADMIN_PORTAL_URL' : 'VITE_USER_PORTAL_URL';
  const configured = configuredPortalBase(envKey);
  if (configured) return configured;

  if (typeof window !== 'undefined') {
    const { protocol, hostname, host } = window.location;
    if (!isLocalHostname(hostname)) {
      const current = getPortalSurface();
      if (current === surface) return `${protocol}//${host}`;
      const sibling = inferSiblingPortalHost(hostname, current);
      if (sibling) return `${protocol}//${sibling}`;
      return `${protocol}//${host}`;
    }
    const port = surface === 'admin' ? getAdminPort() : getUserPort();
    return `${protocol}//${hostname}:${port}`;
  }
  const port = surface === 'admin' ? getAdminPort() : getUserPort();
  return `http://127.0.0.1:${port}`;
}

export function getAdminPortalUrl(path = '/admin/dashboard'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${portalBaseUrl('admin')}${p}`;
}

export function getUserPortalUrl(path = '/officer'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${portalBaseUrl('user')}${p}`;
}

/** @deprecated Use getAdminPortalUrl — kept for existing imports */
export const getAdminDevUrl = getAdminPortalUrl;

/** @deprecated Use getUserPortalUrl — kept for existing imports */
export const getUserDevUrl = getUserPortalUrl;
