import type { HealthResponse } from '@frontend-study/shared-types';

const HEALTH_ENDPOINT = '/backend/health';

const getHealthEndpoint = (): string => {
  if (typeof window === 'undefined') {
    return HEALTH_ENDPOINT;
  }

  return new URL(HEALTH_ENDPOINT, window.location.origin).toString();
};

export const getHealth = async (signal?: AbortSignal): Promise<HealthResponse> => {
  const response = await fetch(getHealthEndpoint(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  const data = (await response.json()) as HealthResponse;

  if (!response.ok && response.status !== 503) {
    throw new Error('健康检查请求失败');
  }

  return data;
};
