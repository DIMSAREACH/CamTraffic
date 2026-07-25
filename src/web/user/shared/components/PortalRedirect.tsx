import { useEffect } from 'react';
import { getAdminDevUrl, getUserDevUrl } from '@shared/utils/portal';
import {
  CITIZEN_PORTAL_BASE,
  OFFICER_PORTAL_BASE,
  homePathForRole,
} from '@shared/constants/userPortalPaths';

export function RedirectToAdminPortal() {
  useEffect(() => {
    const path = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(getAdminDevUrl(path.startsWith('/admin') ? path : '/admin/dashboard'));
  }, []);
  return (
    <p className="text-center text-slate-500 py-12 text-sm">
      Redirecting to admin portal…
    </p>
  );
}

export function RedirectToUserPortal() {
  useEffect(() => {
    const path = window.location.pathname + window.location.search + window.location.hash;
    const onDomain =
      path.startsWith(OFFICER_PORTAL_BASE)
      || path.startsWith(CITIZEN_PORTAL_BASE)
      || path.startsWith('/dashboard');
    const target = onDomain ? path : homePathForRole('police');
    window.location.replace(getUserDevUrl(target));
  }, []);
  return (
    <p className="text-center text-slate-500 py-12 text-sm">
      Redirecting to user portal…
    </p>
  );
}
