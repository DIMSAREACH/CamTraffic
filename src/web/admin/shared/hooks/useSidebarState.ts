import { useCallback, useState } from 'react';

const storageKey = (portal: string) => `camtraffic-sidebar-collapsed-${portal}`;

export function useSidebarState(portal: 'user' | 'admin') {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storageKey(portal)) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const persistCollapsed = useCallback(
    (value: boolean) => {
      try {
        localStorage.setItem(storageKey(portal), value ? '1' : '0');
      } catch {
        /* ignore */
      }
    },
    [portal],
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      persistCollapsed(next);
      return next;
    });
  }, [persistCollapsed]);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen((o) => !o), []);

  return {
    collapsed,
    mobileOpen,
    toggleCollapsed,
    openMobile,
    closeMobile,
    toggleMobile,
  };
}
