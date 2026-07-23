export const HEALTH_COMPONENT_STATUS = {
  UP: 'up',
  DOWN: 'down',
} as const;

export type HealthComponentStatus = (typeof HEALTH_COMPONENT_STATUS)[keyof typeof HEALTH_COMPONENT_STATUS];

export interface HealthComponent {
  status: HealthComponentStatus;
  latencyMs: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    mysql: HealthComponent;
    redis: HealthComponent;
  };
}
