import { Link } from 'react-router';
import { CamTrafficLogo } from './CamTrafficLogo';
import { cn } from '@shared/components/ui/utils';

type SidebarVariant = 'user' | 'admin';

interface SidebarBrandProps {
  collapsed: boolean;
  variant: SidebarVariant;
  homePath: string;
}

const TAGLINES: Record<SidebarVariant, string> = {
  user: 'Kingdom of Cambodia',
  admin: 'Administration',
};

export function SidebarBrand({ collapsed, variant, homePath }: SidebarBrandProps) {
  if (collapsed) {
    return (
      <Link to={homePath} className="sidebar-brand mx-auto" title="CamTraffic">
        <CamTrafficLogo size={48} className="sidebar-brand__mark" />
      </Link>
    );
  }

  return (
    <Link to={homePath} className={cn('sidebar-brand', 'min-w-0 flex-1')}>
      <CamTrafficLogo size={48} className="sidebar-brand__mark" />
      <div className="sidebar-brand__text">
        <span className="sidebar-brand__title">CamTraffic</span>
        <span className="sidebar-brand__tagline">{TAGLINES[variant]}</span>
      </div>
    </Link>
  );
}
