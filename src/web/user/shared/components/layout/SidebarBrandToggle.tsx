import { CamTrafficBrand } from './CamTrafficBrand';
import { CamTrafficLogo } from './CamTrafficLogo';
import { SidebarLayoutIcon } from './SidebarLayoutIcon';
import { useLanguage } from '@shared/context/LanguageContext';
import { cn } from '@shared/components/ui/utils';

type SidebarVariant = 'user' | 'admin';

const DEFAULT_HOME: Record<SidebarVariant, string> = {
  user: '/officer',
  admin: '/admin/dashboard',
};

interface SidebarBrandToggleProps {
  collapsed: boolean;
  variant: SidebarVariant;
  onToggle: () => void;
  isMobile?: boolean;
  /** App home route when the logo is clicked (defaults by portal). */
  homePath?: string;
}

export function SidebarBrandToggle({
  collapsed,
  variant,
  onToggle,
  isMobile = false,
  homePath,
}: SidebarBrandToggleProps) {
  const { t } = useLanguage();
  const home = homePath ?? DEFAULT_HOME[variant];
  const openLabel = t('sidebar.openSidebar');
  const collapseLabel = t('sidebar.collapseSidebar');

  if (isMobile) {
    return (
      <div className={cn('sidebar-header-row', 'sidebar-header-row--mobile')}>
        <CamTrafficBrand
          size="sm"
          variant={variant}
          showTagline
          to={home}
          className="sidebar-header-row__brand"
        />
      </div>
    );
  }

  /* Collapsed rail: click logo to expand (hover shows panel icon) */
  if (collapsed) {
    return (
      <button
        type="button"
        className="sidebar-brand-toggle sidebar-brand-toggle--collapsed sidebar-rail-toggle sidebar-header-rail"
        onClick={onToggle}
        aria-label={openLabel}
        title={openLabel}
        data-tooltip={openLabel}
      >
        <span className="sidebar-brand-toggle__layer sidebar-brand-toggle__layer--logo">
          <CamTrafficLogo size={36} className="sidebar-brand__mark" />
        </span>
        <span className="sidebar-brand-toggle__layer sidebar-brand-toggle__layer--panel" aria-hidden>
          <SidebarLayoutIcon size={22} />
        </span>
      </button>
    );
  }

  /* Expanded: brand → home; separate control collapses sidebar */
  return (
    <div className="sidebar-header-row">
      <CamTrafficBrand
        size="sm"
        variant={variant}
        showTagline
        to={home}
        className="sidebar-header-row__brand"
      />
      <button
        type="button"
        className="sidebar-header-toggle sidebar-rail-toggle"
        onClick={onToggle}
        aria-label={collapseLabel}
        title={collapseLabel}
        data-tooltip={collapseLabel}
      >
        <SidebarLayoutIcon size={20} />
      </button>
    </div>
  );
}
