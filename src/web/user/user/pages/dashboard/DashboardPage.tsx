import { useAuth } from '@shared/context/AuthContext';
import { OfficerDashboard } from '@officer/pages/dashboard/OfficerDashboard';
import { CitizenDashboard } from '@citizen/pages/dashboard/CitizenDashboard';

/** Role switcher for /officer and /citizen dashboard index routes. */
export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'police') return <OfficerDashboard />;
  return <CitizenDashboard />;
}
