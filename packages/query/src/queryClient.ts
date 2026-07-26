import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 120_000,
      cacheTime: 10 * 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retryOnMount: false,
    },
  },
});

export const queryKeys = {
  dashboard: {
    admin: ['dashboard', 'admin'] as const,
    police: (policeId?: string | number) => ['dashboard', 'police', policeId] as const,
    driver: (driverId?: string | number) => ['dashboard', 'driver', driverId] as const,
    policeReports: ['dashboard', 'police', 'reports'] as const,
  },
  cameras: {
    liveStatus: ['cameras', 'live-status'] as const,
  },
};
