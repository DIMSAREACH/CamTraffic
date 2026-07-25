import { Link } from 'react-router';
import { LogOut } from 'lucide-react';
import { cn } from '@shared/components/ui/utils';
import type { EnterpriseModule, EnterpriseNavSection } from '@shared/constants/enterpriseModules';

export interface EnterpriseSidebarNavProps {
  sections: EnterpriseNavSection[];
  getModule: (id: string) => EnterpriseModule | undefined;
  isActive: (mod: EnterpriseModule) => boolean;
  icons: Record<string, React.ReactNode>;
  fallbackIcon: React.ReactNode;
  expanded: boolean;
  unreadCount?: number;
  t: (key: string) => string;
  onNavigate?: () => void;
  onLogout?: () => void;
}

export function EnterpriseSidebarNav({
  sections,
  getModule,
  isActive,
  icons,
  fallbackIcon,
  expanded,
  unreadCount = 0,
  t,
  onNavigate,
  onLogout,
}: EnterpriseSidebarNavProps) {
  return (
    <div className="enterprise-sidebar-sections">
      {sections.map((section) => (
        <div key={section.id} className="enterprise-sidebar-section">
          <div className="enterprise-sidebar-section__header sidebar-fade-when-collapsed" aria-hidden={!expanded}>
            <span className="enterprise-sidebar-section__rule" aria-hidden />
            <span className="enterprise-sidebar-section__label">{t(section.labelKey)}</span>
            <span className="enterprise-sidebar-section__rule" aria-hidden />
          </div>
          <div className="sidebar-nav__divider sidebar-show-when-collapsed enterprise-sidebar-section__divider-collapsed" aria-hidden />

          <ul className="sidebar-nav__module-list space-y-0.5 list-none m-0 p-0">
            {section.moduleIds.map((moduleId) => {
              const mod = getModule(moduleId);
              if (!mod) return null;
              const label = t(mod.labelKey);
              const active = isActive(mod);
              const badge = mod.id === 'notifications' && unreadCount > 0 ? unreadCount : undefined;

              return (
                <li key={mod.id}>
                  <Link
                    to={mod.path}
                    title={!expanded ? label : undefined}
                    onClick={onNavigate}
                    className={cn(
                      'sidebar-nav__link',
                      active && 'sidebar-nav__link--active',
                      !expanded && 'sidebar-nav__link--collapsed',
                    )}
                  >
                    <span className="sidebar-nav__icon">{icons[mod.id] ?? fallbackIcon}</span>
                    <span className="sidebar-nav__link-text sidebar-fade-when-collapsed">{label}</span>
                    {badge != null && badge > 0 && (
                      <span className="sidebar-nav__badge sidebar-fade-when-collapsed">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}

            {section.showLogout && onLogout && (
              <li>
                <button
                  type="button"
                  title={!expanded ? t('sidebar.signOut') : undefined}
                  onClick={() => {
                    onNavigate?.();
                    onLogout();
                  }}
                  className={cn(
                    'sidebar-nav__link sidebar-nav__link--logout w-full',
                    !expanded && 'sidebar-nav__link--collapsed',
                  )}
                >
                  <span className="sidebar-nav__icon">
                    <LogOut size={18} strokeWidth={1.75} />
                  </span>
                  <span className="sidebar-nav__link-text sidebar-fade-when-collapsed">{t('sidebar.signOut')}</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
