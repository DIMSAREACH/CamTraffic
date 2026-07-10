import { NavLink } from 'react-router-dom';
import { useTranslation, type Dictionary } from '@camtraffic/ui';
import { DRIVER_PORTAL_BASE } from '../../lib/constants';

type NavLabelKey = keyof Dictionary['nav'];

const DRIVER_NAV_ITEMS: { to: string; labelKey: NavLabelKey }[] = [
  { to: `${DRIVER_PORTAL_BASE}/dashboard`, labelKey: 'dashboard' },
  { to: `${DRIVER_PORTAL_BASE}/profile`, labelKey: 'profile' },
  { to: `${DRIVER_PORTAL_BASE}/vehicles`, labelKey: 'vehicles' },
  { to: `${DRIVER_PORTAL_BASE}/violations`, labelKey: 'violations' },
  { to: `${DRIVER_PORTAL_BASE}/fines`, labelKey: 'fines' },
  { to: `${DRIVER_PORTAL_BASE}/appeals`, labelKey: 'appeals' },
  { to: `${DRIVER_PORTAL_BASE}/notifications`, labelKey: 'notifications' },
  { to: `${DRIVER_PORTAL_BASE}/settings`, labelKey: 'settings' },
];

export function DriverSidebarNavigation() {
  const { t } = useTranslation();

  return (
    <nav className="driver-layout__nav" aria-label="Driver navigation">
      {DRIVER_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            isActive
              ? 'driver-layout__nav-link driver-layout__nav-link--active'
              : 'driver-layout__nav-link'
          }
        >
          {t.nav[item.labelKey]}
        </NavLink>
      ))}
    </nav>
  );
}
