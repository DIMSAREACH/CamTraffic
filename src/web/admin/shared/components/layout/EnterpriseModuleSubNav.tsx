import { Link, useLocation } from 'react-router';
import { useLanguage } from '@shared/context/LanguageContext';
import { isEnterpriseSubNavItemActive } from '@shared/constants/enterpriseSubNav';
import type { EnterpriseModule } from '@shared/constants/enterpriseModules';
import { cn } from '@shared/components/ui/utils';

interface EnterpriseModuleSubNavProps {
  module: EnterpriseModule;
  className?: string;
}

export function EnterpriseModuleSubNav({ module, className }: EnterpriseModuleSubNavProps) {
  const { t } = useLanguage();
  const location = useLocation();
  const items = module.subNav ?? [];

  if (items.length < 2) return null;

  const paths = items.map((item) => item.path);

  return (
    <nav
      className={cn('enterprise-module-subnav', className)}
      aria-label={t('sidebar.moduleSubNav', { module: t(module.labelKey) })}
    >
      <div className="enterprise-module-subnav__inner">
        {items.map((item) => {
          const isActive = isEnterpriseSubNavItemActive(location.pathname, item.path, paths);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'enterprise-module-subnav__link',
                isActive && 'enterprise-module-subnav__link--active',
              )}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
