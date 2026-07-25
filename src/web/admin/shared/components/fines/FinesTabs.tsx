import { Link } from 'react-router';
import { CreditCard, FileText } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { cn } from '@shared/components/ui/utils';

export type FinesTabId = 'manage' | 'payments';

/** Admin portal fine tabs — must use /admin paths (not /dashboard). */
const ADMIN_FINES_TABS = {
  manage: '/admin/fines',
  payments: '/admin/fines',
} as const;

export function FinesTabs({ active }: { active: FinesTabId }) {
  const { t } = useLanguage();

  const tabs: { id: FinesTabId; labelKey: string; path: string; icon: typeof FileText }[] = [
    { id: 'manage', labelKey: 'fines.tabManage', path: ADMIN_FINES_TABS.manage, icon: FileText },
    { id: 'payments', labelKey: 'fines.tabPayments', path: ADMIN_FINES_TABS.payments, icon: CreditCard },
  ];

  return (
    <nav className="enforcement-page__tabs flex flex-wrap gap-2 mb-4" aria-label={t('fines.tabsLabel')}>
      {tabs.map(({ id, labelKey, path, icon: Icon }) => {
        const isActive = active === id;
        return (
          <Link
            key={id}
            to={path}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon size={16} />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
