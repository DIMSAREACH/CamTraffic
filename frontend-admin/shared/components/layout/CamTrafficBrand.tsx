import { Link } from 'react-router';
import { useLanguage } from '@shared/context/LanguageContext';
import { CamTrafficLogo } from './CamTrafficLogo';
import { cn } from '@shared/components/ui/utils';

const LOGO_SIZES = { sm: 40, md: 44, lg: 48 } as const;

export type CamTrafficBrandVariant = 'user' | 'admin';
export type CamTrafficBrandSize = keyof typeof LOGO_SIZES;

export interface CamTrafficBrandProps {
  size?: CamTrafficBrandSize;
  variant?: CamTrafficBrandVariant;
  showTagline?: boolean;
  className?: string;
  logoOnly?: boolean;
  textOnly?: boolean;
  showTaglineOnCompact?: boolean;
  /** When set, brand navigates to the app home (e.g. dashboard). */
  to?: string;
}

export function CamTrafficBrand({
  size = 'md',
  variant = 'user',
  showTagline = false,
  className,
  logoOnly = false,
  textOnly = false,
  showTaglineOnCompact = false,
  to,
}: CamTrafficBrandProps) {
  const { t } = useLanguage();
  const logoSize = LOGO_SIZES[size];
  const tagline = variant === 'admin' ? t('brand.taglineAdmin') : t('brand.taglineUser');
  const Root = to ? Link : 'div';

  return (
    <Root
      {...(to ? { to } : {})}
      className={cn(
        'camtraffic-brand',
        `camtraffic-brand--${size}`,
        showTagline && 'camtraffic-brand--sidebar',
        logoOnly && 'camtraffic-brand--logo-only',
        textOnly && 'camtraffic-brand--text-only',
        to && 'sidebar-brand-link',
        className,
      )}
      aria-label="CamTraffic home"
      title={to ? 'Go to dashboard' : undefined}
    >
      {!textOnly && (
        <CamTrafficLogo size={logoSize} className="sidebar-brand__mark flex-shrink-0" />
      )}
      {!logoOnly && (
        <span className="sidebar-brand__text min-w-0">
          <span className="sidebar-brand__title">CamTraffic</span>
          {showTagline && (
            <span
              className={cn(
                'sidebar-brand__tagline sidebar-brand__tagline--header',
                size === 'sm' && !showTaglineOnCompact && 'camtraffic-brand__tagline--nav',
              )}
            >
              {tagline}
            </span>
          )}
        </span>
      )}
    </Root>
  );
}
