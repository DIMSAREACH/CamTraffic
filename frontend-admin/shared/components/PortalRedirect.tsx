import { useEffect } from 'react';
import { getAdminDevUrl, getUserDevUrl } from '@shared/utils/portal';

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
    const target = path.startsWith('/dashboard') ? path : '/dashboard';
    window.location.replace(getUserDevUrl(target));
  }, []);
  return (
    <p className="text-center text-slate-500 py-12 text-sm">
      Redirecting to user portal…
    </p>
  );
}
