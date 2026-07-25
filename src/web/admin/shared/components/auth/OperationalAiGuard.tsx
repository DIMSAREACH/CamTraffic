import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@shared/context/AuthContext';
import { USER_PORTAL_ROUTES, canAccessOperationalAi } from '@shared/constants/portalRoutes';

/** Redirect drivers away from operational AI pages (detection, cameras, logs). */
export function OperationalAiGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !user) return;
    if (!canAccessOperationalAi(user.role)) {
      navigate(USER_PORTAL_ROUTES.dashboard, { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user || !canAccessOperationalAi(user.role)) {
    return null;
  }

  return <>{children}</>;
}
