import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@camtraffic/query';
import { dashboardAPI, camerasAPI } from '@shared/services/api';
import type { DashboardStats } from '@shared/types';

const LIVE_INTERVAL_MS = 30_000;

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.admin,
    queryFn: () => dashboardAPI.getAdminStats(),
    refetchInterval: LIVE_INTERVAL_MS,
    placeholderData: (prev) => prev,
  });
}

export function usePoliceDashboardStats(policeId?: string | number) {
  return useQuery({
    queryKey: queryKeys.dashboard.police(policeId),
    queryFn: () => dashboardAPI.getPoliceStats(policeId!),
    enabled: policeId != null,
    refetchInterval: LIVE_INTERVAL_MS,
    placeholderData: (prev) => prev,
  });
}

export function useDriverDashboardStats(driverId?: string | number) {
  return useQuery({
    queryKey: queryKeys.dashboard.driver(driverId),
    queryFn: () => dashboardAPI.getDriverStats(driverId!),
    enabled: driverId != null,
    refetchInterval: LIVE_INTERVAL_MS,
    placeholderData: (prev) => prev,
  });
}

export function usePoliceReportStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.policeReports,
    queryFn: () => dashboardAPI.getPoliceReportStats() as Promise<DashboardStats>,
    staleTime: 60_000,
  });
}

export function useCameraLiveStatus() {
  return useQuery({
    queryKey: queryKeys.cameras.liveStatus,
    queryFn: () => camerasAPI.liveStatus(),
    refetchInterval: LIVE_INTERVAL_MS,
    placeholderData: (prev) => prev,
  });
}
