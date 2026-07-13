export {
  getAdminPort,
  getUserPort,
  getPortalSurface,
  isAdminPortal,
} from '@camtraffic/store';

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
