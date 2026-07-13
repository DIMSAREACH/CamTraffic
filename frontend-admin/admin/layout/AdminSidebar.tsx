import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard, Car, Users, FileText, Camera,
  BookOpen, BarChart3, Bell, User, LogOut, Shield,
  Activity, X, Cctv, AlertTriangle, Archive, Scale, ShieldAlert,
  KeyRound, Building2, Database, Route, MapPin, Gauge,
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
  badge?: number;
  section?: string;
}

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  unreadCount?: number;
  isMobile?: boolean;
}

const ADMIN_NAV: NavItem[] = [
  { labelKey: 'sidebar.nav.dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} strokeWidth={1.75} />, section: 'main' },
  { labelKey: 'sidebar.nav.aiDashboard', path: '/admin/ai-dashboard', icon: <Gauge size={18} strokeWidth={1.75} />, section: 'main' },
  { labelKey: 'sidebar.nav.aiDetectionCenter', path: '/admin/ai-detection', icon: <Camera size={18} strokeWidth={1.75} />, section: 'main' },
  { labelKey: 'sidebar.nav.cameras', path: '/admin/cameras', icon: <Cctv size={18} strokeWidth={1.75} />, section: 'main' },
  { labelKey: 'sidebar.nav.cameraLocations', path: '/admin/camera-locations', icon: <MapPin size={18} strokeWidth={1.75} />, section: 'main' },
  { labelKey: 'sidebar.nav.trafficSigns', path: '/admin/signs', icon: <BookOpen size={18} strokeWidth={1.75} />, section: 'main' },
  { labelKey: 'sidebar.nav.fineManagement', path: '/admin/fines', icon: <FileText size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.violationManagement', path: '/admin/violations', icon: <AlertTriangle size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.appeals', path: '/admin/appeals', icon: <Scale size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.allVehicles', path: '/admin/vehicles', icon: <Car size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.vehicleOwners', path: '/admin/vehicle-owners', icon: <Users size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.unknownVehicles', path: '/admin/unknown-vehicles', icon: <Car size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.detectionLogs', path: '/admin/ai-logs', icon: <Activity size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.evidenceArchive', path: '/admin/evidence', icon: <Archive size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.auditLogs', path: '/admin/audit-logs', icon: <ShieldAlert size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.userManagement', path: '/admin/users', icon: <Users size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.roles', path: '/admin/roles', icon: <KeyRound size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.officers', path: '/admin/officers', icon: <Building2 size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.drivers', path: '/admin/drivers', icon: <Car size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.roads', path: '/admin/roads', icon: <Route size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.reports', path: '/admin/reports', icon: <BarChart3 size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.backupRestore', path: '/admin/backup-restore', icon: <Database size={18} strokeWidth={1.75} />, section: 'manage' },
  { labelKey: 'sidebar.nav.notifications', path: '/admin/notifications', icon: <Bell size={18} strokeWidth={1.75} />, section: 'account' },
  { labelKey: 'sidebar.nav.myProfile', path: '/admin/profile', icon: <User size={18} strokeWidth={1.75} />, section: 'account' },
];

export function AdminSidebar({ collapsed, onToggle, unreadCount = 0, isMobile = false }: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const { t, locale } = useLanguage();
  const location = useLocation();
  const expanded = isMobile || !collapsed;

  const navItems = ADMIN_NAV.map((item) =>
    item.labelKey === 'sidebar.nav.notifications' ? { ...item, badge: unreadCount } : item,
  );

  const initials = user?.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'A';
  const avatarGradient = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';

  const afterNavClick = () => {
    if (isMobile) onToggle();
  };

  const NavGroup = ({ labelKey, items }: { labelKey: string; items: NavItem[] }) => (
    <div>
      <p className="sidebar-nav__label sidebar-fade-when-collapsed">{t(labelKey)}</p>
      <div className="sidebar-nav__divider sidebar-show-when-collapsed" aria-hidden />
      <ul className="space-y-0.5 list-none m-0 p-0">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          const label = t(item.labelKey);
          return (
            <li key={item.path}>
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
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <aside
      className={cn(
        'app-sidebar app-sidebar--admin',
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

      <nav className="sidebar-nav">
        <NavGroup labelKey="sidebar.main" items={navItems.filter((i) => i.section === 'main')} />
        <NavGroup labelKey="sidebar.management" items={navItems.filter((i) => i.section === 'manage')} />
        <NavGroup labelKey="sidebar.account" items={navItems.filter((i) => i.section === 'account')} />
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
