import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';

interface RouteGuardProps extends PropsWithChildren {
  isAllowed: boolean;
  redirectTo?: string;
}

export function RouteGuard({ isAllowed, redirectTo = '/', children }: RouteGuardProps) {
  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
}
