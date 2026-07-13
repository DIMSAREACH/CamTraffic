import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard, Car, FileText, Camera, Cctv,
  BookOpen, BarChart3, Bell, User, LogOut,
  Activity, X, AlertTriangle, Archive, Scale, ShieldAlert, Shield, Settings2,
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { SidebarBrandToggle } from '@shared/components/layout/SidebarBrandToggle';
import { NavbarProfileAvatar } from '@shared/components/NavbarProfileAvatar';
import { cn } from '@shared/components/ui/utils';
import { getNavItemsForRole } from '@shared/constants/portalRoutes';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  unreadCount?: number;
  isMobile?: boolean;
}

const ROLE_LABEL_KEY: Record<string, string> = {
  police: 'role.police',
  driver: 'role.driver',
};

const NAV_ICONS: Record<string, React.ReactNode> = {
  'sidebar.nav.dashboard': <LayoutDashboard size={18} strokeWidth={1.75} />,
  'sidebar.nav.aiDetection': <Camera size={18} strokeWidth={1.75} />,
  'sidebar.nav.cameras': <Cctv size={18} strokeWidth={1.75} />,
  'sidebar.nav.trafficSigns': <BookOpen size={18} strokeWidth={1.75} />,
  'sidebar.nav.fineManagement': <FileText size={18} strokeWidth={1.75} />,
  'sidebar.nav.violationManagement': <AlertTriangle size={18} strokeWidth={1.75} />,
  'sidebar.nav.appeals': <Scale size={18} strokeWidth={1.75} />,
  'sidebar.nav.myVehicles': <Car size={18} strokeWidth={1.75} />,
  'sidebar.nav.detectionLogs': <Activity size={18} strokeWidth={1.75} />,
  'sidebar.nav.evidenceArchive': <Archive size={18} strokeWidth={1.75} />,
  'sidebar.nav.unknownVehicles': <Car size={18} strokeWidth={1.75} />,
  'sidebar.nav.reports': <BarChart3 size={18} strokeWidth={1.75} />,
  'sidebar.nav.settings': <Settings2 size={18} strokeWidth={1.75} />,
  'sidebar.nav.notifications': <Bell size={18} strokeWidth={1.75} />,
  'sidebar.nav.myProfile': <User size={18} strokeWidth={1.75} />,
};

interface NavItem {
  labelKey: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  section?: string;
}

export function UserSidebar({ collapsed, onToggle, unreadCount = 0, isMobile = false }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t, locale } = useLanguage();
  const location = useLocation();
  const expanded = isMobile || !collapsed;

  const visible: NavItem[] = (user ? getNavItemsForRole(user.role) : []).map((item) => ({
    labelKey: item.labelKey,
    path: item.path,
    icon: NAV_ICONS[item.labelKey] ?? <FileText size={18} strokeWidth={1.75} />,
    section: item.section,
    ...(item.labelKey === 'sidebar.nav.notifications' ? { badge: unreadCount } : {}),
  }));

  const mainItems = visible.filter((i) => i.section === 'main');
  const manageItems = visible.filter((i) => i.section === 'manage');
  const accountItems = visible.filter((i) => i.section === 'account');

  const initials = user?.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const roleLabel = user?.role ? t(ROLE_LABEL_KEY[user.role]) : '';

  const afterNavClick = () => {
    if (isMobile) onToggle();
  };

  const NavGroup = ({ labelKey, items }: { labelKey: string; items: NavItem[] }) => (
    <div>
      <p className="sidebar-nav__label sidebar-fade-when-collapsed">{t(labelKey)}</p>
      <div className="sidebar-nav__divider sidebar-show-when-collapsed" aria-hidden />
      <ul className="space-y-0.5 list-none m-0 p-0">
        {items.map((item) => {
          const isActive = item.path === '/dashboard'
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith(item.path);
          const label = t(item.labelKey);
          return (
            <li key={`${item.path}-${item.labelKey}`}>
              <Link
                to={item.path}
                title={!expanded ? label : undefined}
                onClick={afterNavClick}
                className={cn(
                  'sidebar-nav__link',
                  isActive && 'sidebar-nav__link--active',
                  !expanded && 'sidebar-nav__link--collapsed',
                )}
              >
                <span className="sidebar-nav__icon">{item.icon}</span>
                <span className="sidebar-nav__link-text sidebar-fade-when-collapsed">{label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="sidebar-nav__badge sidebar-fade-when-collapsed">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
                {item.badge != null && item.badge > 0 && (
                  <span
                    className="sidebar-nav__badge-dot sidebar-show-when-collapsed absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-[#0f172a]"
                    style={{ background: '#ef4444' }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const gradient = user?.role === 'police'
    ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
    : 'linear-gradient(135deg, #06b6d4, #0891b2)';
  return (
    <aside
      className={cn(
        'app-sidebar app-sidebar--user',
        expanded ? 'app-sidebar--expanded' : 'app-sidebar--collapsed',
        isMobile && 'app-sidebar--mobile',
      )}
    >
      <div className="app-sidebar__accent-bar app-sidebar__accent-bar--spectrum" aria-hidden>
        <span style={{ background: 'linear-gradient(90deg, #8B5CF6, #3B82F6, #06B6D4, #10B981, #F59E0B, #F43F5E, #6366F1)' }} />
      </div>

      <div className={cn('app-sidebar__header', !expanded && !isMobile && 'app-sidebar__header--collapsed')}>
        <SidebarBrandToggle collapsed={!expanded} variant="user" onToggle={onToggle} isMobile={isMobile} />
        {isMobile && (
          <button
            type="button"
            onClick={onToggle}
            className="app-sidebar__toggle app-sidebar__toggle--close"
            aria-label={t('sidebar.closeMenu')}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        <NavGroup labelKey="sidebar.main" items={mainItems} />
        {manageItems.length > 0 && <NavGroup labelKey="sidebar.management" items={manageItems} />}
        {accountItems.length > 0 && <NavGroup labelKey="sidebar.account" items={accountItems} />}
      </nav>

      <div className="sidebar-bottom">
        {user && (
          <div className="sidebar-user-section sidebar-fade-when-collapsed">
            <p className="sidebar-user-section__label">{t('sidebar.user')}</p>
            <div className="sidebar-user-section__divider" aria-hidden />
            <div className="sidebar-user-card" data-role={user.role ?? 'driver'}>
              <div className="sidebar-user-card__top">
                <NavbarProfileAvatar
                  initials={initials}
                  alt={user.full_name}
                  profileImage={user.profile_image}
                  gradient={gradient}
                  size="sm"
                  showStatus
                  className="[&_.app-navbar__avatar-status]:border-[#0f172a]"
                />
                <div className="sidebar-user-card__identity min-w-0 flex-1">
                  <p className="sidebar-user-card__name truncate" title={user.full_name}>
                    {user.full_name}
                  </p>
                  {roleLabel && (
                    <span className="sidebar-user-card__role-badge">
                      <Shield size={11} aria-hidden />
                      {roleLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="sidebar-user-card__email-block">
                <span className="sidebar-user-card__field-label">{t('users.email')}</span>
                <p className="sidebar-user-card__email truncate" title={user.email}>
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {user && (
          <div className="sidebar-user-avatar--collapsed sidebar-show-when-collapsed">
            <NavbarProfileAvatar
              initials={initials}
              alt={user.full_name}
              profileImage={user.profile_image}
              gradient={gradient}
              size="xs"
              showStatus
              className="[&_.app-navbar__avatar-status]:border-[#0f172a] [&_.app-navbar__avatar-status--sm]:w-2.5 [&_.app-navbar__avatar-status--sm]:h-2.5"
            />
          </div>
        )}

        <div className="sidebar-footer">
          <button
            type="button"
            onClick={() => {
              if (isMobile) onToggle();
              logout();
            }}
            title={!expanded ? t('sidebar.signOut') : undefined}
            className={cn('sidebar-footer__logout', !expanded && 'sidebar-footer__logout--collapsed')}
          >
            <span className="sidebar-footer__icon">
              <LogOut size={18} strokeWidth={1.75} />
            </span>
            <span className="sidebar-footer__logout-text sidebar-fade-when-collapsed">{t('sidebar.signOut')}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
