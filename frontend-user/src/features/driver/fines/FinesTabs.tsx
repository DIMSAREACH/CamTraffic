import { NavLink } from 'react-router-dom';
import { DRIVER_PORTAL_BASE } from '../../../lib/constants';

export function FinesTabs() {
  return (
    <nav className="fines-tabs" aria-label="Fines navigation">
      <NavLink
        to={`${DRIVER_PORTAL_BASE}/fines`}
        end
        className={({ isActive }) => (isActive ? 'fines-tabs__link fines-tabs__link--active' : 'fines-tabs__link')}
      >
        Manage fines
      </NavLink>
      <NavLink
        to={`${DRIVER_PORTAL_BASE}/fines/payments`}
        className={({ isActive }) => (isActive ? 'fines-tabs__link fines-tabs__link--active' : 'fines-tabs__link')}
      >
        Payment history
      </NavLink>
    </nav>
  );
}
