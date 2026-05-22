import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { Shield } from 'lucide-react';
import { AdminSidebar } from '@admin/layout/AdminSidebar';
import { Navbar } from '@shared/layout/Navbar';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useSidebarState } from '@shared/hooks/useSidebarState';
import { getUserDevUrl } from '@shared/utils/portal';
import { notificationsAPI } from '@shared/services/api';
import { cn } from '@shared/components/ui/utils';

export function AdminLayout() {
  const { user, isLoading } = useAuth();
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, mobileOpen, toggleCollapsed, openMobile, closeMobile } = useSidebarState('admin');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) navigate('/');
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      window.location.assign(getUserDevUrl('/dashboard'));
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    notificationsAPI.getByUser(user.id).then((ns) =>
      setUnreadCount(ns.filter((n) => !n.is_read).length),
    );
  }, [user]);

  useEffect(() => {
    closeMobile();
  }, [location.pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, closeMobile]);

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
          <p className="text-white text-[15px] font-bold">CamTraffic Admin</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div
      className={cn(
        'app-shell flex w-full h-full overflow-hidden',
        collapsed && 'app-shell--sidebar-collapsed',
      )}
    >
      <div className="hidden lg:flex flex-shrink-0 h-full">
        <AdminSidebar
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
          aria-label="Close menu"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={closeMobile}
        />
        <div className="sidebar-mobile-drawer">
          <AdminSidebar
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
        />
        <main className="flex-1 overflow-y-auto">
          <div className="app-dashboard app-dashboard--admin relative p-5 lg:p-6">
            <Outlet key={locale} />
          </div>
        </main>
      </div>
    </div>
  );
}
