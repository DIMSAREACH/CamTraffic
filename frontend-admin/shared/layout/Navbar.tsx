import { useMemo, type CSSProperties, type RefObject } from 'react';
import { Bell, LogOut, User, ChevronRight, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '@shared/context/AuthContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu';
import { cn } from '@shared/components/ui/utils';
import { NavbarLanguageSwitcher } from '@shared/components/NavbarLanguageSwitcher';
import { NavbarThemeToggle } from '@shared/components/NavbarThemeToggle';
import { NavbarAppearanceSettings } from '@shared/components/NavbarAppearanceSettings';
import { NavbarProfileAvatar } from '@shared/components/NavbarProfileAvatar';
import { NavbarNotificationsDropdown } from '@shared/components/NavbarNotificationsDropdown';
import { NavbarGlobalSearch } from '@shared/components/NavbarGlobalSearch';
import { ADMIN_ENTERPRISE_MODULES } from '@shared/constants/enterpriseModules';
import { useLanguage } from '@shared/context/LanguageContext';
import { usePageTheme } from '@shared/hooks/usePageTheme';
import { getDisplayUsername } from '@shared/utils/displayUsername';
import { flattenNavSearchItems } from '@shared/utils/navSearch';

interface NavbarProps {
  unreadCount: number;
  onUnreadCountChange?: (count: number) => void;
  onMenuToggle?: () => void;
  onMobileMenuOpen?: () => void;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
  mobileMenuButtonRef?: RefObject<HTMLButtonElement | null>;
  mobileMenuOpen?: boolean;
}

const ROLE_GRADIENT: Record<string, { gradient: string; glow: string; accent: string; badge: string }> = {
  admin:  { gradient: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', glow: 'rgba(139,92,246,0.35)', accent: '#A78BFA', badge: 'ADMIN' },
  police: { gradient: 'linear-gradient(135deg,#2563EB,#1D4ED8)', glow: 'rgba(37,99,235,0.35)',   accent: '#60A5FA', badge: 'OFFICER' },
  driver: { gradient: 'linear-gradient(135deg,#06B6D4,#0891B2)', glow: 'rgba(6,182,212,0.35)',   accent: '#22D3EE', badge: 'DRIVER' },
};

function shortRoleLabelKey(role: string | undefined): string {
  if (role === 'admin') return 'navbar.roleAdmin';
  if (role === 'police') return 'navbar.rolePolice';
  if (role === 'driver') return 'navbar.roleDriver';
  return 'navbar.roleUser';
}

export function Navbar({
  unreadCount,
  onUnreadCountChange,
  onMenuToggle,
  onMobileMenuOpen,
  sidebarCollapsed = false,
  mobileMenuButtonRef,
  mobileMenuOpen = false,
}: NavbarProps) {
  const openMobileMenu = onMobileMenuOpen ?? onMenuToggle;
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const page = usePageTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const searchItems = useMemo(
    () => flattenNavSearchItems(ADMIN_ENTERPRISE_MODULES),
    [],
  );

  const initials = user?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const displayUsername = getDisplayUsername(user?.email);
  const roleStyle = user?.role ? ROLE_GRADIENT[user.role] : null;
  const pathPrefix = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';
  const isAdminPortal = location.pathname.startsWith('/admin');
  const menuHover =
    'app-navbar__menu-item flex items-center gap-2.5 py-2.5 px-3 rounded-lg cursor-pointer bg-transparent';

  const accentStyle = {
    '--navbar-accent': page.color,
    '--navbar-accent-secondary': isAdminPortal ? '#06b6d4' : '#22d3ee',
    '--navbar-accent-tertiary': isAdminPortal ? '#8b5cf6' : '#6366f1',
  } as CSSProperties;

  return (
    <header
      className={cn(
        'app-navbar relative flex flex-row flex-nowrap items-center flex-shrink-0 z-30',
        isAdminPortal ? 'app-navbar--admin' : 'app-navbar--user',
        sidebarCollapsed && 'app-navbar--sidebar-collapsed',
      )}
      style={accentStyle}
    >
      <div
        className="app-navbar__accent-bar transition-all duration-500"
        style={{ background: page.gradient }}
      />
      <div className="app-navbar__edge-accent" aria-hidden />

      <div className="app-navbar__left relative flex flex-row flex-nowrap items-center gap-0 min-w-0 flex-1 pl-3 sm:pl-5">
        {openMobileMenu && (
          <button
            ref={mobileMenuButtonRef}
            type="button"
            onClick={openMobileMenu}
            className="app-navbar__menu-btn lg:hidden p-2.5 rounded-xl mr-1 flex-shrink-0"
            aria-label={t('navbar.openMenu')}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-sidebar-drawer"
          >
            <Menu size={18} />
          </button>
        )}

        <div className="app-navbar__pill hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg mr-3 flex-shrink-0">
          <span className="app-navbar__pill-dot" aria-hidden />
          {page.icon}
          <span className="app-navbar__pill-label">{page.label}</span>
        </div>

        <nav className="hidden md:flex items-center gap-1 min-w-0">
          {page.crumb.map((segment, i) => (
            <div key={segment} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={11} className="app-navbar__crumb-sep" />}
              <span
                className={cn(
                  'app-navbar__crumb truncate transition-colors duration-300',
                  i === page.crumb.length - 1 && 'app-navbar__crumb--active',
                )}
              >
                {segment}
              </span>
            </div>
          ))}
        </nav>
      </div>

      <div className="relative flex items-center justify-center flex-shrink-0 mx-3">
        <NavbarGlobalSearch items={searchItems} />
      </div>

      <div className="relative flex items-center gap-1.5 pr-4 flex-shrink-0">
        <div className="app-navbar__status-pill hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mr-1">
          <span className="app-navbar__status-dot rounded-full animate-pulse" />
          <span className="app-navbar__status">{t('navbar.online')}</span>
        </div>

        <NavbarAppearanceSettings />

        <NavbarThemeToggle />

        <NavbarLanguageSwitcher />

        <NavbarNotificationsDropdown
          unreadCount={unreadCount}
          pathPrefix={pathPrefix}
          onUnreadCountChange={onUnreadCountChange}
        />

        <div className="app-navbar__divider w-px h-5 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="app-navbar__user-trigger app-navbar__user-trigger--avatar-only p-1 rounded-full"
              aria-label={
                displayUsername ? `${t('navbar.accountMenu')}, ${displayUsername}` : t('navbar.accountMenu')
              }
            >
              <NavbarProfileAvatar
                initials={initials}
                gradient={roleStyle?.gradient}
                profileImage={user?.profile_image}
                size="sm"
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="app-navbar__menu app-navbar__menu--account w-[272px]">
            <div className="app-navbar__menu-stripe" aria-hidden />
            <div className="app-navbar__menu-profile px-2 pt-2 pb-1">
              <div
                className="app-navbar__menu-profile-card"
                data-role={user?.role ?? ''}
              >
                <div className="app-navbar__menu-profile-row">
                  <NavbarProfileAvatar
                    initials={initials}
                    gradient={roleStyle?.gradient}
                    profileImage={user?.profile_image}
                    size="md"
                  />
                  <div className="app-navbar__menu-profile-text min-w-0 flex-1">
                    <p className="app-navbar__menu-name truncate" title={user?.full_name}>
                      {user?.full_name ?? '—'}
                    </p>
                    {user?.role && (
                      <div className="app-navbar__menu-meta">
                        <span className="app-navbar__menu-role">{t(shortRoleLabelKey(user.role))}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="app-navbar__menu-divider h-px mx-3 my-1.5" />

            <div className="app-navbar__menu-actions px-1.5">
            {[
              { icon: <User size={14} />, label: t('navbar.profileSettings'), path: `${pathPrefix}/profile` },
              { icon: <Bell size={14} />, label: t('navbar.notifications'), path: `${pathPrefix}/notifications`, badge: unreadCount },
            ].map(item => (
              <DropdownMenuItem
                key={item.path}
                onClick={() => navigate(item.path)}
                className={menuHover}
              >
                <div className="app-navbar__menu-item-icon w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <span>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="app-navbar__menu-badge ml-auto px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </DropdownMenuItem>
            ))}

            <div className="app-navbar__menu-divider h-px mx-3 my-1.5" />

            <DropdownMenuItem
              onClick={logout}
              className="app-navbar__menu-item app-navbar__menu-item--danger flex items-center gap-2.5 py-2.5 px-3 mx-1.5 mb-1.5 rounded-lg cursor-pointer bg-transparent hover:!bg-red-50 focus:!bg-red-50 data-[highlighted]:!bg-red-50"
            >
              <div className="app-navbar__menu-item-icon app-navbar__menu-item-icon--danger w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                <LogOut size={14} />
              </div>
              <span>{t('navbar.signOut')}</span>
            </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
