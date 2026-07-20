import * as _store from '@camtraffic/store';

const _getAdminPort = (_store as any).getAdminPort;
const _getUserPort = (_store as any).getUserPort;
const _getPortalSurface = (_store as any).getPortalSurface;
const _isAdminPortal = (_store as any).isAdminPortal;

export function getAdminPort(): number {
  if (typeof _getAdminPort === 'function') return _getAdminPort();
  const raw = (import.meta.env.VITE_ADMIN_PORT || '5174').toString().trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 5174;
}

export function getUserPort(): number {
  if (typeof _getUserPort === 'function') return _getUserPort();
  const raw = (import.meta.env.VITE_USER_PORT || '5173').toString().trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 5173;
}

export function getPortalSurface(): 'admin' | 'user' {
  if (typeof _getPortalSurface === 'function') return _getPortalSurface();
  const raw = (import.meta.env.VITE_PORTAL_SURFACE || '').toString().trim().toLowerCase();
  if (raw === 'admin' || raw === 'user') return raw as 'admin' | 'user';
  return 'user';
}

export function isAdminPortal(): boolean {
  if (typeof _isAdminPortal === 'function') return _isAdminPortal();
  const forced = getPortalSurface();
  if (forced === 'admin') return true;
  if (forced === 'user') return false;
  return Number(window.location.port) === getAdminPort();
}

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function isUserPortalPath(pathname: string): boolean {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

export function portalOrigin(port: number): string {
  if (typeof window === 'undefined') {
    return `http://localhost:${port}`;
  }
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

export function getAdminDevUrl(path = '/admin/dashboard'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${portalOrigin(getAdminPort())}${p}`;
}

export function getUserDevUrl(path = '/dashboard'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${portalOrigin(getUserPort())}${p}`;
}
