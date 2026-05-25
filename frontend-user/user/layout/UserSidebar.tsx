import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard, Car, FileText, Camera,
  BookOpen, BarChart3, Bell, User, LogOut,
  Activity, Zap, X,
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { SidebarBrandToggle } from '@shared/components/layout/SidebarBrandToggle';
import { NavbarProfileAvatar } from '@shared/components/NavbarProfileAvatar';
import { cn } from '@shared/components/ui/utils';

interface NavItem {
  labelKey: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: number;
  section?: string;
}

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

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'sidebar.nav.dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} strokeWidth={1.75} />, roles: ['police', 'driver'], section: 'main' },
  { labelKey: 'sidebar.nav.aiDetection', path: '/dashboard/ai-detection', icon: <Camera size={18} strokeWidth={1.75} />, roles: ['driver'], section: 'main' },
  { labelKey: 'sidebar.nav.trafficSigns', path: '/dashboard/signs', icon: <BookOpen size={18} strokeWidth={1.75} />, roles: ['police', 'driver'], section: 'main' },
  { labelKey: 'sidebar.nav.fineManagement', path: '/dashboard/fines', icon: <FileText size={18} strokeWidth={1.75} />, roles: ['police', 'driver'], section: 'manage' },
  { labelKey: 'sidebar.nav.myVehicles', path: '/dashboard/vehicles', icon: <Car size={18} strokeWidth={1.75} />, roles: ['driver'], section: 'manage' },
  { labelKey: 'sidebar.nav.detectionLogs', path: '/dashboard/ai-logs', icon: <Activity size={18} strokeWidth={1.75} />, roles: ['police'], section: 'manage' },
  { labelKey: 'sidebar.nav.reports', path: '/dashboard/reports', icon: <BarChart3 size={18} strokeWidth={1.75} />, roles: ['police'], section: 'manage' },
  { labelKey: 'sidebar.nav.notifications', path: '/dashboard/notifications', icon: <Bell size={18} strokeWidth={1.75} />, roles: ['police', 'driver'], section: 'account' },
  { labelKey: 'sidebar.nav.myProfile', path: '/dashboard/profile', icon: <User size={18} strokeWidth={1.75} />, roles: ['police', 'driver'], section: 'account' },
];

export function UserSidebar({ collapsed, onToggle, unreadCount = 0, isMobile = false }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const expanded = isMobile || !collapsed;

  const visible = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role)).map((item) =>
    item.labelKey === 'sidebar.nav.notifications' ? { ...item, badge: unreadCount } : item,
  );

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
  const roleColor = user?.role === 'police' ? '#a78bfa' : '#67e8f9';

  return (
    <aside
      className={cn(
        'app-sidebar app-sidebar--user',
        expanded ? 'app-sidebar--expanded' : 'app-sidebar--collapsed',
        isMobile && 'app-sidebar--mobile',
      )}
    >
      <div className="app-sidebar__accent-bar" aria-hidden />

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
          <div className="sidebar-user-card sidebar-fade-when-collapsed">
            <div className="flex items-center gap-3">
              <NavbarProfileAvatar
                initials={initials}
                alt={user.full_name}
                profileImage={user.profile_image}
                gradient={gradient}
                size="xs"
                showStatus
                className="[&_.app-navbar__avatar-status]:border-[#0f172a]"
              />
              <div className="min-w-0 flex-1">
                <p className="sidebar-user-card__name truncate">{user.full_name}</p>
                <p className="sidebar-user-card__role" style={{ color: roleColor }}>{roleLabel}</p>
              </div>
              <Zap size={12} className="text-slate-500 flex-shrink-0" />
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
