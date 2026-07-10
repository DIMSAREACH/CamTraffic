import { NavLink } from 'react-router-dom';
import { useTranslation, type Dictionary } from '@camtraffic/ui';
import { OFFICER_PORTAL_BASE } from '../../lib/constants';

type NavLabelKey = keyof Dictionary['nav'];

type OfficerNavItem =
  | { to: string; labelKey: NavLabelKey }
  | { to: string; label: string };

const OFFICER_NAV_ITEMS: OfficerNavItem[] = [
  { to: `${OFFICER_PORTAL_BASE}/dashboard`, labelKey: 'dashboard' },
  { to: `${OFFICER_PORTAL_BASE}/live-detection`, label: 'Live Detection' },
  { to: `${OFFICER_PORTAL_BASE}/live-camera`, label: 'Live Camera' },
  { to: `${OFFICER_PORTAL_BASE}/violations`, labelKey: 'violations' },
  { to: `${OFFICER_PORTAL_BASE}/drivers`, labelKey: 'drivers' },
  { to: `${OFFICER_PORTAL_BASE}/vehicles`, labelKey: 'vehicles' },
  { to: `${OFFICER_PORTAL_BASE}/evidence`, labelKey: 'evidence' },
  { to: `${OFFICER_PORTAL_BASE}/reports`, labelKey: 'reports' },
  { to: `${OFFICER_PORTAL_BASE}/notifications`, labelKey: 'notifications' },
  { to: `${OFFICER_PORTAL_BASE}/profile`, labelKey: 'profile' },
];

export function OfficerSidebarNavigation() {
  const { t } = useTranslation();

  return (
    <nav className="officer-layout__nav" aria-label="Officer navigation">
      {OFFICER_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            isActive
              ? 'officer-layout__nav-link officer-layout__nav-link--active'
              : 'officer-layout__nav-link'
          }
        >
          {'labelKey' in item ? t.nav[item.labelKey] : item.label}
        </NavLink>
      ))}
    </nav>
  );
}
