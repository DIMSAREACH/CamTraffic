import { Navigate, Route, Routes } from 'react-router-dom';
import App from '../App';
import { DRIVER_DEFAULT_ROUTE, OFFICER_DEFAULT_ROUTE } from '../lib/constants';
import { getAccessToken } from '../lib/authStorage';
import { RouteGuard } from './RouteGuard';

export function UserRoutes() {
  const hasToken = Boolean(getAccessToken());

  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/forgot-password" element={<App />} />
      <Route path="/reset-password" element={<App />} />
      <Route path="/verify-email" element={<App />} />
      <Route
        path="/officer"
        element={
          <RouteGuard isAllowed={hasToken}>
            <Navigate to={OFFICER_DEFAULT_ROUTE} replace />
          </RouteGuard>
        }
      />
      <Route
        path="/officer/*"
        element={
          <RouteGuard isAllowed={hasToken}>
            <App />
          </RouteGuard>
        }
      />
      <Route
        path="/driver"
        element={
          <RouteGuard isAllowed={hasToken}>
            <Navigate to={DRIVER_DEFAULT_ROUTE} replace />
          </RouteGuard>
        }
      />
      <Route
        path="/driver/*"
        element={
          <RouteGuard isAllowed={hasToken}>
            <App />
          </RouteGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
