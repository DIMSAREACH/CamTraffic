import { useLocation } from 'react-router';
import {
  LayoutDashboard, Car, FileText, Camera, Cctv,
  BookOpen, BarChart3, Bell, User, CreditCard, MessageCircle,
  AlertTriangle, Scale, Shield, Settings2, UserSearch, Search,
  X,
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { SidebarBrandToggle } from '@shared/components/layout/SidebarBrandToggle';
import { NavbarProfileAvatar } from '@shared/components/NavbarProfileAvatar';
import { EnterpriseSidebarNav } from '@shared/components/layout/EnterpriseSidebarNav';
import { cn } from '@shared/components/ui/utils';
import {
  getNavSectionsForRole,
  getUserModuleById,
  isUserModuleActive,
} from '@shared/constants/enterpriseModules';

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

const MODULE_ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard size={18} strokeWidth={1.75} />,
  detection: <Camera size={18} strokeWidth={1.75} />,
  'ai-detection': <Camera size={18} strokeWidth={1.75} />,
  cameras: <Cctv size={18} strokeWidth={1.75} />,
  vehicles: <Car size={18} strokeWidth={1.75} />,
  drivers: <UserSearch size={18} strokeWidth={1.75} />,
  violations: <AlertTriangle size={18} strokeWidth={1.75} />,
  fines: <FileText size={18} strokeWidth={1.75} />,
  payments: <CreditCard size={18} strokeWidth={1.75} />,
  appeals: <Scale size={18} strokeWidth={1.75} />,
  reports: <BarChart3 size={18} strokeWidth={1.75} />,
  notifications: <Bell size={18} strokeWidth={1.75} />,
  profile: <User size={18} strokeWidth={1.75} />,
  signs: <BookOpen size={18} strokeWidth={1.75} />,
  'traffic-rules': <BookOpen size={18} strokeWidth={1.75} />,
  support: <MessageCircle size={18} strokeWidth={1.75} />,
  settings: <Settings2 size={18} strokeWidth={1.75} />,
};

export function UserSidebar({ collapsed, onToggle, unreadCount = 0, isMobile = false }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const expanded = isMobile || !collapsed;

  const navSections = user ? getNavSectionsForRole(user.role) : [];

  const initials = user?.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const roleLabel = user?.role ? t(ROLE_LABEL_KEY[user.role]) : '';
  const avatarGradient = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';

  const afterNavClick = () => {
    if (isMobile) onToggle();
  };

  return (
    <aside
      className={cn(
        'app-sidebar app-sidebar--admin app-sidebar--enterprise',
        expanded ? 'app-sidebar--expanded' : 'app-sidebar--collapsed',
        isMobile && 'app-sidebar--mobile',
      )}
    >
      <div className="app-sidebar__accent-bar" aria-hidden />

      <div className={cn('app-sidebar__header', !expanded && !isMobile && 'app-sidebar__header--collapsed')}>
        <SidebarBrandToggle
          collapsed={!expanded}
          variant="admin"
          homePath="/dashboard"
          onToggle={onToggle}
          isMobile={isMobile}
        />
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

      <nav className="sidebar-nav sidebar-nav--enterprise sidebar-nav--categorized" aria-label={t('sidebar.enterpriseModules')}>
        <EnterpriseSidebarNav
          sections={navSections}
          getModule={getUserModuleById}
          isActive={(mod) => isUserModuleActive(location.pathname, mod)}
          icons={MODULE_ICONS}
          fallbackIcon={<Search size={18} strokeWidth={1.75} />}
          expanded={expanded}
          unreadCount={unreadCount}
          t={t}
          onNavigate={afterNavClick}
          onLogout={logout}
        />
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
                  gradient={avatarGradient}
                  size="sm"
                  showStatus={false}
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
              gradient={avatarGradient}
              size="xs"
              showStatus={false}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
