import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { Shield } from 'lucide-react';
import { UserSidebar } from '@user/layout/UserSidebar';
import { Navbar } from '@shared/layout/Navbar';
import { SkipToMainLink } from '@shared/components/a11y/SkipToMainLink';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useSidebarState } from '@shared/hooks/useSidebarState';
import { useLiveData } from '@shared/hooks/useLiveData';
import { notificationsAPI } from '@shared/services/api';
import { isUserPortalRouteAllowed, USER_PORTAL_ROUTES } from '@shared/constants/portalRoutes';
import { resolveUserEnterpriseModule } from '@shared/constants/enterpriseModules';
import { UserFooter } from '@user/layout/UserFooter';
import { EnterpriseModuleSubNav } from '@shared/components/layout/EnterpriseModuleSubNav';
import { cn } from '@shared/components/ui/utils';

export function UserLayout() {
  const { user, isLoading } = useAuth();
  const { locale, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, mobileOpen, toggleCollapsed, openMobile, closeMobile } = useSidebarState('user');
  const [unreadCount, setUnreadCount] = useState(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  const closeMobileWithFocus = useCallback(() => {
    closeMobile();
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, [closeMobile]);

  useEffect(() => {
    if (!isLoading && !user) navigate('/');
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!isLoading && user?.role === 'admin') {
      navigate('/', { replace: true });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      if (!isUserPortalRouteAllowed(user.role, location.pathname)) {
        navigate(USER_PORTAL_ROUTES.dashboard, { replace: true });
      }
    }
  }, [user, isLoading, location.pathname, navigate]);

  useEffect(() => {
    if (!user) return;
    notificationsAPI.getByUser(user.id)
      .then((ns) => setUnreadCount(ns.filter((n) => !n.is_read).length))
      .catch(() => { /* ignore poll errors (e.g. 429) */ });
  }, [user]);

  useLiveData(() => {
    if (!user) return;
    return notificationsAPI.getByUser(user.id)
      .then((ns) => setUnreadCount(ns.filter((n) => !n.is_read).length))
      .catch(() => undefined);
  }, 60_000, Boolean(user));

  useEffect(() => {
    closeMobile();
  }, [location.pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileWithFocus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, closeMobileWithFocus]);

  useEffect(() => {
    if (!mobileOpen) return;
    const firstLink = mobileDrawerRef.current?.querySelector<HTMLElement>('a[href], button:not([disabled])');
    firstLink?.focus();
  }, [mobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  if (isLoading) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ background: 'linear-gradient(145deg, #070F1F 0%, #1a0f2e 50%, #0D1B3E 100%)' }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
          >
            <Shield size={28} className="text-white" />
          </div>
          <p className="text-white text-[15px] font-bold">CamTraffic</p>
        </div>
      </div>
    );
  }

  if (!user || user.role === 'admin') return null;

  const isProfilePage = location.pathname.includes('/profile');
  const isCamerasPage = location.pathname.includes('/cameras');
  const activeModule = user ? resolveUserEnterpriseModule(location.pathname, user.role) : null;

  return (
    <div
      className={cn(
        'app-shell flex w-full h-full overflow-hidden',
        collapsed && 'app-shell--sidebar-collapsed',
      )}
    >
      <SkipToMainLink />
      <div className="hidden lg:flex flex-shrink-0 h-full">
        <UserSidebar
          key={locale}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          unreadCount={unreadCount}
        />
      </div>

      <div
        className={cn('sidebar-mobile-root lg:hidden', mobileOpen && 'sidebar-mobile-root--open')}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className="sidebar-mobile-backdrop"
          aria-label={t('sidebar.closeMenu')}
          tabIndex={mobileOpen ? 0 : -1}
          onClick={closeMobileWithFocus}
        />
        <div
          id="mobile-sidebar-drawer"
          ref={mobileDrawerRef}
          className="sidebar-mobile-drawer"
          role="dialog"
          aria-modal={mobileOpen}
          aria-label={t('sidebar.main')}
        >
          <UserSidebar
            key={locale}
            collapsed={false}
            onToggle={closeMobile}
            unreadCount={unreadCount}
            isMobile
          />
        </div>
      </div>

      <div className="app-layout-main flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          unreadCount={unreadCount}
          sidebarCollapsed={collapsed}
          onSidebarToggle={toggleCollapsed}
          onMobileMenuOpen={openMobile}
          mobileMenuButtonRef={menuButtonRef}
          mobileMenuOpen={mobileOpen}
        />
        <main
          id="main-content"
          className={cn(
            'flex-1 min-h-0',
            isCamerasPage ? 'overflow-hidden flex flex-col' : 'overflow-y-auto',
          )}
          tabIndex={-1}
        >
          <div
            className={cn(
              'app-dashboard app-dashboard--admin relative',
              isCamerasPage ? 'app-dashboard--cameras-route' : '',
              isProfilePage ? 'app-dashboard--profile-route' : '',
              !isCamerasPage && !isProfilePage && 'p-5 lg:p-6',
            )}
          >
            {activeModule && <EnterpriseModuleSubNav module={activeModule} />}
            <Outlet key={locale} />
          </div>
        </main>
        <UserFooter />
      </div>
    </div>
  );
}
