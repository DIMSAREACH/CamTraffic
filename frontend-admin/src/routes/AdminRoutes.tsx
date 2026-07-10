import { Navigate, Route, Routes } from 'react-router-dom';
import App from '../App';
import { getAccessToken } from '../lib/authStorage';
import { RouteGuard } from './RouteGuard';

export function AdminRoutes() {
  const hasToken = Boolean(getAccessToken());

  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/forgot-password" element={<App />} />
      <Route path="/reset-password" element={<App />} />
      <Route path="/verify-email" element={<App />} />
      <Route
        path="/portal"
        element={
          <RouteGuard isAllowed={hasToken}>
            <Navigate to="/portal/dashboard" replace />
          </RouteGuard>
        }
      />
      <Route
        path="/portal/*"
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
