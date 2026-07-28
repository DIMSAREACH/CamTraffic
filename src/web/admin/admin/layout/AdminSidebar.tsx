import { useLocation } from 'react-router';
import { Search, Shield, X } from 'lucide-react';
import {
  LayoutDashboard, Car, Users, FileText, Camera,
  BookOpen, BarChart3, Bell, User, Shield as ShieldIcon,
  AlertTriangle, Scale, KeyRound, Route, Brain, Settings2,
  Cctv, ShieldAlert, UserSearch,
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { SidebarBrandToggle } from '@shared/components/layout/SidebarBrandToggle';
import { NavbarProfileAvatar } from '@shared/components/NavbarProfileAvatar';
import { EnterpriseSidebarNav } from '@shared/components/layout/EnterpriseSidebarNav';
import { cn } from '@shared/components/ui/utils';
import {
  ADMIN_NAV_SECTIONS,
  getAdminModuleById,
  isAdminModuleActive,
} from '@shared/constants/enterpriseModules';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  unreadCount?: number;
  isMobile?: boolean;
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard size={18} strokeWidth={1.75} />,
  'ai-detection': <Camera size={18} strokeWidth={1.75} />,
  'ai-models': <Brain size={18} strokeWidth={1.75} />,
  'traffic-signs': <BookOpen size={18} strokeWidth={1.75} />,
  cameras: <Cctv size={18} strokeWidth={1.75} />,
  roads: <Route size={18} strokeWidth={1.75} />,
  vehicles: <Car size={18} strokeWidth={1.75} />,
  drivers: <UserSearch size={18} strokeWidth={1.75} />,
  officers: <ShieldIcon size={18} strokeWidth={1.75} />,
  violations: <AlertTriangle size={18} strokeWidth={1.75} />,
  fines: <FileText size={18} strokeWidth={1.75} />,
  appeals: <Scale size={18} strokeWidth={1.75} />,
  reports: <BarChart3 size={18} strokeWidth={1.75} />,
  notifications: <Bell size={18} strokeWidth={1.75} />,
  users: <Users size={18} strokeWidth={1.75} />,
  roles: <KeyRound size={18} strokeWidth={1.75} />,
  audit: <ShieldAlert size={18} strokeWidth={1.75} />,
  profile: <User size={18} strokeWidth={1.75} />,
  settings: <Settings2 size={18} strokeWidth={1.75} />,
};

export function AdminSidebar({ collapsed, onToggle, unreadCount = 0, isMobile = false }: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const expanded = isMobile || !collapsed;

  const initials = user?.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'A';
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
          sections={ADMIN_NAV_SECTIONS}
          getModule={getAdminModuleById}
          isActive={(mod) => isAdminModuleActive(location.pathname, mod)}
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
            <div className="sidebar-user-card" data-role="admin">
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
                  <span className="sidebar-user-card__role-badge">
                    <Shield size={11} aria-hidden />
                    {t('sidebar.systemAdmin')}
                  </span>
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
