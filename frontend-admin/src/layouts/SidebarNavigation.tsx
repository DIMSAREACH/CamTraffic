import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/portal/dashboard', label: 'Dashboard' },
  { to: '/portal/users', label: 'Users' },
  { to: '/portal/roles', label: 'Roles' },
  { to: '/portal/permissions', label: 'Permissions' },
  { to: '/portal/officers', label: 'Officers' },
  { to: '/portal/police-stations', label: 'Police Stations' },
  { to: '/portal/cameras', label: 'Cameras' },
  { to: '/portal/traffic-signs', label: 'Traffic Signs' },
  { to: '/portal/reports', label: 'Reports' },
  { to: '/portal/analytics', label: 'Analytics' },
  { to: '/portal/ai-models', label: 'AI Models' },
  { to: '/portal/audit', label: 'Audit Logs' },
  { to: '/portal/notifications', label: 'Notifications' },
  { to: '/portal/system-settings', label: 'System Settings' },
  { to: '/portal/backup', label: 'Backup' },
  { to: '/portal/profile', label: 'Profile' },
];

export function SidebarNavigation() {
  return (
    <nav className="admin-layout__nav" aria-label="Admin navigation">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            isActive ? 'admin-layout__nav-link admin-layout__nav-link--active' : 'admin-layout__nav-link'
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
