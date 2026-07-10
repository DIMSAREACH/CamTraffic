import type { ApiClient } from '../client';
import type { HealthStatus } from '@camtraffic/types';

export function createHealthEndpoints(client: ApiClient) {
  return {
    liveness: () => client.get<HealthStatus>('/api/v1/health/'),
    readiness: () => client.get<HealthStatus>('/api/v1/health/?full=1'),
    status: () => client.get<HealthStatus>('/api/v1/monitoring/status/'),
    /** @deprecated Use `liveness()` */
    backend: () => client.get<HealthStatus>('/api/v1/health/'),
  };
}
