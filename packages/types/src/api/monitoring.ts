/** Health and monitoring types (Task 007) */

export type HealthCheckStatus = 'ok' | 'error';

export interface DependencyCheck {
  status: HealthCheckStatus;
  latency_ms: number;
  error?: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  check?: 'liveness' | 'readiness';
  checks?: Record<string, DependencyCheck>;
  environment?: string;
}
