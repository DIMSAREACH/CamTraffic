export {
  getAdminPort,
  getUserPort,
  getPortalSurface,
  isAdminPortal,
  portalBaseUrl,
  getAdminPortalUrl,
  getUserPortalUrl,
  getAdminDevUrl,
  getUserDevUrl,
} from '@camtraffic/store';

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function isUserPortalPath(pathname: string): boolean {
  return (
    pathname === '/officer'
    || pathname.startsWith('/officer/')
    || pathname === '/citizen'
    || pathname.startsWith('/citizen/')
    || pathname === '/dashboard'
    || pathname.startsWith('/dashboard/')
  );
}
