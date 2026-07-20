import { useState, useRef, useEffect, type CSSProperties, type RefObject } from 'react';
import { Bell, Search, LogOut, User, ChevronRight, X, Menu } from 'lucide-react';
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
import { useLanguage } from '@shared/context/LanguageContext';
import { usePageTheme } from '@shared/hooks/usePageTheme';
import { getDisplayUsername } from '@shared/utils/displayUsername';

interface NavbarProps {
  unreadCount: number;
  onMenuToggle?: () => void;
  onMobileMenuOpen?: () => void;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
  mobileMenuButtonRef?: RefObject<HTMLButtonElement | null>;
  mobileMenuOpen?: boolean;
}

const ROLE_GRADIENT: Record<string, { gradient: string; glow: string; accent: string; badge: string }> = {
  admin:  { gradient: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', glow: 'rgba(139,92,246,0.35)', accent: '#A78BFA', badge: 'ADMIN' },
  police: { gradient: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', glow: 'rgba(139,92,246,0.35)', accent: '#A78BFA', badge: 'OFFICER' },
  driver: { gradient: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', glow: 'rgba(139,92,246,0.35)', accent: '#A78BFA', badge: 'DRIVER' },
};

function shortRoleLabelKey(role: string | undefined): string {
  if (role === 'admin') return 'navbar.roleAdmin';
  if (role === 'police') return 'navbar.rolePolice';
  if (role === 'driver') return 'navbar.roleDriver';
  return 'navbar.roleUser';
}

export function Navbar({
  unreadCount,
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const initials = user?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const displayUsername = getDisplayUsername(user?.email);
  const roleStyle = user?.role ? ROLE_GRADIENT[user.role] : null;
  const pathPrefix = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';
  const menuHover =
    'app-navbar__menu-item flex items-center gap-2.5 py-2.5 px-3 rounded-lg cursor-pointer bg-transparent';

  const accentStyle = {
    '--navbar-accent': page.color,
    '--navbar-accent-secondary': '#06b6d4',
    '--navbar-accent-tertiary': '#8b5cf6',
  } as CSSProperties;

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <header
      className={cn(
        'app-navbar relative flex flex-row flex-nowrap items-center flex-shrink-0 z-30',
        'app-navbar--admin',
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
        {searchOpen ? (
          <div className="app-navbar__search app-navbar__search--open flex items-center gap-2 rounded-xl px-3 py-2 w-[280px]">
            <Search size={15} className="app-navbar__search-icon" />
            <input
              ref={searchRef}
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder={t('navbar.searchPlaceholder')}
              className="bg-transparent app-navbar__search-input outline-none flex-1"
            />
            <button type="button" onClick={() => { setSearchOpen(false); setSearchVal(''); }} className="app-navbar__search-close">
              <X size={15} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="app-navbar__search flex items-center gap-2.5 rounded-xl px-3 py-2 w-[190px]"
          >
            <Search size={15} className="app-navbar__search-icon" />
            <span className="app-navbar__search-hint flex-1 text-left">{t('navbar.search')}</span>
            <kbd className="app-navbar__kbd hidden lg:flex items-center px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>
        )}
      </div>

      <div className="relative flex items-center gap-1.5 pr-4 flex-shrink-0">
        <div className="app-navbar__status-pill hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mr-1">
          <span className="app-navbar__status-dot rounded-full animate-pulse" />
          <span className="app-navbar__status">{t('navbar.online')}</span>
        </div>

        <NavbarAppearanceSettings />

        <NavbarThemeToggle />

        <NavbarLanguageSwitcher />

        <button
          type="button"
          onClick={() => navigate(`${pathPrefix}/notifications`)}
          className={cn('app-navbar__icon-btn relative cursor-pointer p-2.5 rounded-xl', unreadCount > 0 && 'app-navbar__icon-btn--active')}
          aria-label={
            unreadCount > 0
              ? t('navbar.notificationsUnread', { count: unreadCount })
              : t('navbar.notifications')
          }
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <>
              <span className="app-navbar__notif-count absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full animate-ping opacity-40 bg-red-500" />
            </>
          )}
        </button>

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
