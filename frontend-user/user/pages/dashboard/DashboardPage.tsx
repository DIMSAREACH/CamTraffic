import { useAuth } from '@shared/context/AuthContext';
import { PoliceDashboard } from '@user/pages/dashboard/PoliceDashboard';
import { DriverDashboard } from '@user/pages/dashboard/DriverDashboard';

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'police') return <PoliceDashboard />;
  return <DriverDashboard />;
}
